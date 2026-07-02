"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useState, useTransition } from "react";
import {
  BarChart3,
  BriefcaseBusiness,
  Check,
  ExternalLink,
  Newspaper,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";

type Market = "KR" | "US";
type Currency = "KRW" | "USD";

type WatchlistItem = {
  id: number;
  market: Market;
  ticker: string;
  name: string;
  note: string | null;
  tags: string;
};

type Quote = {
  market: Market;
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  previousClose: number;
  source: string;
};

type CachedQuote = {
  data: Quote;
  cached: boolean;
  fetchedAt: string | null;
  error?: string;
};

type Holding = {
  id: number;
  market: Market;
  ticker: string;
  name: string;
  quantity: number;
  average_cost: number;
  currency: Currency;
  note: string | null;
  quote: Quote | null;
  marketValue: number;
  costBasis: number;
  unrealizedGain: number;
  returnPercent: number;
  quoteError?: string;
};

type FxRate = {
  pair: "USD/KRW";
  rate: number;
  source: string;
  cached: boolean;
  fetchedAt: string | null;
  error?: string;
};

type PortfolioResponse = {
  items: Holding[];
  summary: {
    marketValue: number;
    costBasis: number;
    unrealizedGain: number;
    returnPercent: number;
    currency?: "KRW";
  };
  fx?: {
    usdKrw: FxRate;
  };
};

type Briefing = {
  generatedAt: string;
  observations: string[];
  failures: unknown[];
};

type NewsItem = {
  title: string;
  link: string;
  source: string;
  pubDate: string;
  summary: string;
};

type StockDetail = {
  quote: CachedQuote;
  news: { data: NewsItem[]; cached: boolean; error?: string };
  watchlistItem: WatchlistItem | null;
  holding: Holding | null;
  references: { tradingView: string; investing: string };
};

type PricePoint = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
};

type PriceHistory = {
  market: Market;
  ticker: string;
  range: string;
  interval: string;
  currency: string;
  source: string;
  points: PricePoint[];
};

type SymbolSearchResult = {
  market: Market;
  ticker: string;
  name: string;
  exchange?: string;
  source: "local" | "yahoo";
};

type StockFormValues = {
  market: Market;
  ticker: string;
  name: string;
  tags: string;
  note: string;
};

type HoldingFormValues = {
  market: Market;
  ticker: string;
  name: string;
  quantity: string;
  averageCost: string;
  currency: Currency;
  note: string;
};

const emptyPortfolio: PortfolioResponse = {
  items: [],
  summary: { marketValue: 0, costBasis: 0, unrealizedGain: 0, returnPercent: 0 },
};

const chartRanges = [
  { label: "1개월", value: "1mo" },
  { label: "3개월", value: "3mo" },
  { label: "6개월", value: "6mo" },
  { label: "1년", value: "1y" },
];

function formatMoney(value: number, currency = "KRW") {
  if (currency === "USD") {
    return `$${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  }
  return `${value.toLocaleString("ko-KR", { maximumFractionDigits: 0 })}원`;
}

function formatPrice(quote: Quote) {
  return formatMoney(quote.price, quote.currency);
}

function tone(value: number) {
  if (value > 0) return "text-red-600";
  if (value < 0) return "text-blue-600";
  return "text-zinc-500";
}

function badgeTone(market: Market) {
  return market === "KR" ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700";
}

function currencyForMarket(market: Market): Currency {
  return market === "US" ? "USD" : "KRW";
}

export function Watchlist() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [quotes, setQuotes] = useState<Record<string, CachedQuote | { error: string }>>({});
  const [portfolio, setPortfolio] = useState<PortfolioResponse>(emptyPortfolio);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [selected, setSelected] = useState<WatchlistItem | null>(null);
  const [detail, setDetail] = useState<StockDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, startRefresh] = useTransition();
  const [resolvingTicker, setResolvingTicker] = useState<string | null>(null);
  const [editingHoldingId, setEditingHoldingId] = useState<number | null>(null);
  const [editHolding, setEditHolding] = useState<HoldingFormValues | null>(null);
  const [watchSearchQuery, setWatchSearchQuery] = useState("");
  const [holdingSearchQuery, setHoldingSearchQuery] = useState("");
  const [watchSuggestions, setWatchSuggestions] = useState<SymbolSearchResult[]>([]);
  const [holdingSuggestions, setHoldingSuggestions] = useState<SymbolSearchResult[]>([]);
  const [searchingSymbol, setSearchingSymbol] = useState<"watch" | "holding" | null>(null);
  const [charts, setCharts] = useState<Record<string, PriceHistory | { error: string }>>({});
  const [chartRange, setChartRange] = useState("6mo");

  const [watchForm, setWatchForm] = useState<StockFormValues>({
    market: "KR",
    ticker: "",
    name: "",
    tags: "",
    note: "",
  });
  const [holdingForm, setHoldingForm] = useState<HoldingFormValues>({
    market: "KR",
    ticker: "",
    name: "",
    quantity: "",
    averageCost: "",
    currency: "KRW",
    note: "",
  });
  const [formError, setFormError] = useState<string | null>(null);

  async function searchSymbols(scope: "watch" | "holding", query: string, market: Market) {
    const trimmed = query.trim();
    if (!trimmed) return;

    setSearchingSymbol(scope);
    setFormError(null);
    try {
      const res = await fetch(
        `/api/symbols/search?q=${encodeURIComponent(trimmed)}&market=${market}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      const items = (data.items ?? []) as SymbolSearchResult[];
      if (scope === "watch") setWatchSuggestions(items);
      else setHoldingSuggestions(items);
      if (items.length === 0) setFormError("검색 결과가 없습니다. 시장과 검색어를 확인해 주세요.");
    } catch {
      setFormError("종목 검색에 실패했습니다.");
    } finally {
      setSearchingSymbol(null);
    }
  }

  async function resolveTickerName(
    market: Market,
    ticker: string,
    onResolved: (quote: Quote) => void
  ) {
    const normalizedTicker = ticker.trim().toUpperCase();
    if (!normalizedTicker) return;

    const key = `${market}:${normalizedTicker}`;
    setResolvingTicker(key);
    setFormError(null);
    try {
      const res = await fetch(`/api/quote/${market}/${normalizedTicker}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data?.data?.name) {
        setFormError("종목 정보를 찾지 못했습니다. 코드와 시장을 확인해 주세요.");
        return;
      }
      onResolved(data.data as Quote);
    } catch {
      setFormError("종목 정보를 불러오지 못했습니다.");
    } finally {
      setResolvingTicker(null);
    }
  }

  async function loadQuotes(items: WatchlistItem[]) {
    const entries = await Promise.all(
      items.map(async (item) => {
        const key = `${item.market}:${item.ticker}`;
        try {
          const res = await fetch(`/api/quote/${item.market}/${item.ticker}`, { cache: "no-store" });
          const data = await res.json();
          if (!res.ok) return [key, { error: data.error ?? "시세 오류" }] as const;
          return [key, data as CachedQuote] as const;
        } catch (e) {
          return [key, { error: e instanceof Error ? e.message : "시세 오류" }] as const;
        }
      })
    );
    setQuotes(Object.fromEntries(entries));
  }

  async function loadCharts(stocks: Array<{ market: Market; ticker: string }>, range = chartRange) {
    const unique = Array.from(
      new Map(stocks.map((item) => [`${item.market}:${item.ticker}`, item])).values()
    );
    const entries = await Promise.all(
      unique.map(async (item) => {
        const key = `${item.market}:${item.ticker}`;
        try {
          const res = await fetch(`/api/chart/${item.market}/${item.ticker}?range=${range}&interval=1d`, {
            cache: "no-store",
          });
          const data = await res.json();
          if (!res.ok) return [key, { error: data.error ?? "차트 오류" }] as const;
          return [key, data as PriceHistory] as const;
        } catch (e) {
          return [key, { error: e instanceof Error ? e.message : "차트 오류" }] as const;
        }
      })
    );
    setCharts(Object.fromEntries(entries));
  }

  async function loadAll() {
    setFormError(null);
    const [watchRes, portfolioRes, briefingRes] = await Promise.all([
      fetch("/api/watchlist", { cache: "no-store" }),
      fetch("/api/portfolio", { cache: "no-store" }),
      fetch("/api/briefing", { cache: "no-store" }),
    ]);
    const watchJson = await watchRes.json();
    const portfolioJson = await portfolioRes.json();
    const briefingJson = await briefingRes.json();
    const items = (watchJson.items ?? []) as WatchlistItem[];
    setWatchlist(items);
    setPortfolio(portfolioJson.items ? portfolioJson : emptyPortfolio);
    setBriefing(briefingJson.observations ? briefingJson : null);
    setSelected((prev) => prev ?? items[0] ?? null);
    await loadQuotes(items);
    await loadCharts([
      ...items.map((item) => ({ market: item.market, ticker: item.ticker })),
      ...((portfolioJson.items ?? []) as Holding[]).map((item) => ({
        market: item.market,
        ticker: item.ticker,
      })),
    ]);
    setLoading(false);
  }

  async function loadDetail(item: WatchlistItem) {
    setDetailLoading(true);
    try {
      const res = await fetch(
        `/api/stocks/${item.market}/${item.ticker}?name=${encodeURIComponent(item.name)}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      setDetail(res.ok ? (data as StockDetail) : null);
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    // Initial client-side data hydration for the local dashboard.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Load detail after the user-selected stock changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (selected) loadDetail(selected);
  }, [selected]);

  function refresh() {
    startRefresh(async () => {
      await loadAll();
      if (selected) await loadDetail(selected);
    });
  }

  function changeChartRange(nextRange: string) {
    setChartRange(nextRange);
    startRefresh(async () => {
      await loadCharts([
        ...watchlist.map((item) => ({ market: item.market, ticker: item.ticker })),
        ...portfolio.items.map((item) => ({ market: item.market, ticker: item.ticker })),
      ], nextRange);
    });
  }

  function pickWatchSymbol(item: SymbolSearchResult) {
    setWatchForm((prev) => ({
      ...prev,
      market: item.market,
      ticker: item.ticker,
      name: item.name,
    }));
    setWatchSearchQuery(item.name);
    setWatchSuggestions([]);
  }

  function pickHoldingSymbol(item: SymbolSearchResult) {
    setHoldingForm((prev) => ({
      ...prev,
      market: item.market,
      ticker: item.ticker,
      name: item.name,
      currency: currencyForMarket(item.market),
    }));
    setHoldingSearchQuery(item.name);
    setHoldingSuggestions([]);
  }

  async function addWatchlist(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const res = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(watchForm),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setFormError(data.error === "duplicate" ? "이미 등록된 관심종목입니다." : "관심종목 추가에 실패했습니다.");
      return;
    }
    setWatchForm({ ...watchForm, ticker: "", name: "", tags: "", note: "" });
    setWatchSearchQuery("");
    await loadAll();
  }

  async function addHolding(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const res = await fetch("/api/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(holdingForm),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setFormError(data.error === "duplicate" ? "이미 등록된 보유 종목입니다." : "보유 종목 추가에 실패했습니다.");
      return;
    }
    setHoldingForm({
      ...holdingForm,
      ticker: "",
      name: "",
      quantity: "",
      averageCost: "",
      note: "",
    });
    setHoldingSearchQuery("");
    await loadAll();
  }

  async function removeWatchlist(id: number) {
    if (!confirm("관심종목에서 삭제할까요?")) return;
    await fetch(`/api/watchlist/${id}`, { method: "DELETE" });
    if (selected?.id === id) {
      setSelected(null);
      setDetail(null);
    }
    await loadAll();
  }

  function startEditHolding(item: Holding) {
    setEditingHoldingId(item.id);
    setEditHolding({
      market: item.market,
      ticker: item.ticker,
      name: item.name,
      quantity: String(item.quantity),
      averageCost: String(item.average_cost),
      currency: item.currency,
      note: item.note ?? "",
    });
  }

  async function saveHolding(id: number) {
    if (!editHolding) return;
    setFormError(null);
    const res = await fetch(`/api/portfolio/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editHolding),
    });
    if (!res.ok) {
      setFormError("보유 종목 수정에 실패했습니다.");
      return;
    }
    setEditingHoldingId(null);
    setEditHolding(null);
    await loadAll();
  }

  async function removeHolding(id: number) {
    if (!confirm("보유 종목에서 삭제할까요?")) return;
    await fetch(`/api/portfolio/${id}`, { method: "DELETE" });
    await loadAll();
  }

  const holdingChartStocks = portfolio.items.map((item) => ({
    key: `${item.market}:${item.ticker}`,
    market: item.market,
    ticker: item.ticker,
    name: item.name,
    group: "보유",
  }));
  const watchChartStocks = watchlist.map((item) => ({
    key: `${item.market}:${item.ticker}`,
    market: item.market,
    ticker: item.ticker,
    name: item.name,
    group: "관심",
  }));

  return (
    <div className="min-h-screen bg-[#f6f7f9] text-zinc-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Personal Market Desk
            </div>
            <h1 className="mt-1 text-2xl font-bold">Stock Briefing</h1>
            <p className="mt-1 text-sm text-zinc-500">
              관심종목, 보유 포트폴리오, 뉴스, 관찰 요약을 한 화면에서 확인합니다.
            </p>
          </div>
          <button
            onClick={refresh}
            disabled={refreshing}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-zinc-950 px-4 text-sm font-medium text-white disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            새로고침
          </button>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Panel title="오늘의 관찰 요약" icon={<BarChart3 size={18} />}>
            <div className="grid gap-3 md:grid-cols-3">
              {(briefing?.observations ?? ["데이터를 불러오는 중입니다."]).map((text, idx) => (
                <div key={idx} className="rounded-2xl bg-zinc-50 p-4 text-sm leading-6 text-zinc-700">
                  {text}
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="포트폴리오 요약" icon={<BriefcaseBusiness size={18} />}>
            <div className="grid grid-cols-2 gap-3">
              <Metric label="평가금액" value={formatMoney(portfolio.summary.marketValue, "KRW")} />
              <Metric label="원금" value={formatMoney(portfolio.summary.costBasis, "KRW")} />
              <Metric
                label="평가손익"
                value={formatMoney(portfolio.summary.unrealizedGain, "KRW")}
                className={tone(portfolio.summary.unrealizedGain)}
              />
              <Metric
                label="수익률"
                value={`${portfolio.summary.returnPercent.toFixed(2)}%`}
                className={tone(portfolio.summary.returnPercent)}
              />
            </div>
            <div className="mt-3 rounded-2xl bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
              USD/KRW {portfolio.fx?.usdKrw.rate.toLocaleString("ko-KR", { maximumFractionDigits: 2 }) ?? "-"}
              {portfolio.fx?.usdKrw.cached ? " · 캐시/대체값" : " · 실시간 참고값"}
            </div>
          </Panel>
        </section>

        {formError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {formError}
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <aside className="space-y-6">
            <Panel title="관심종목 추가" icon={<Star size={17} />}>
              <StockForm
                values={watchForm}
                onChange={setWatchForm}
                onSubmit={addWatchlist}
                submitLabel="관심종목 추가"
                searchQuery={watchSearchQuery}
                onSearchQueryChange={setWatchSearchQuery}
                suggestions={watchSuggestions}
                searching={searchingSymbol === "watch"}
                onSearch={() => searchSymbols("watch", watchSearchQuery, watchForm.market)}
                onPick={pickWatchSymbol}
                resolving={resolvingTicker === `${watchForm.market}:${watchForm.ticker.trim().toUpperCase()}`}
                onResolveName={() =>
                  resolveTickerName(watchForm.market, watchForm.ticker, (quote) =>
                    setWatchForm((prev) => ({
                      ...prev,
                      ticker: quote.ticker,
                      name: quote.name,
                    }))
                  )
                }
                includeTags
              />
            </Panel>

            <Panel title="보유 종목 추가" icon={<BriefcaseBusiness size={17} />}>
              <HoldingForm
                values={holdingForm}
                onChange={setHoldingForm}
                onSubmit={addHolding}
                searchQuery={holdingSearchQuery}
                onSearchQueryChange={setHoldingSearchQuery}
                suggestions={holdingSuggestions}
                searching={searchingSymbol === "holding"}
                onSearch={() => searchSymbols("holding", holdingSearchQuery, holdingForm.market)}
                onPick={pickHoldingSymbol}
                resolving={resolvingTicker === `${holdingForm.market}:${holdingForm.ticker.trim().toUpperCase()}`}
                onResolveName={() =>
                  resolveTickerName(holdingForm.market, holdingForm.ticker, (quote) =>
                    setHoldingForm((prev) => ({
                      ...prev,
                      ticker: quote.ticker,
                      name: quote.name,
                      currency: quote.currency === "USD" ? "USD" : "KRW",
                    }))
                  )
                }
              />
            </Panel>
          </aside>

          <main className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <Panel title="관심종목" icon={<Star size={17} />}>
              {loading ? (
                <EmptyState text="관심종목을 불러오는 중입니다." />
              ) : watchlist.length === 0 ? (
                <EmptyState text="관심종목이 없습니다. 삼성전자 005930 또는 AAPL을 추가해 보세요." />
              ) : (
                <div className="overflow-hidden rounded-2xl border border-zinc-200">
                  {watchlist.map((item) => {
                    const key = `${item.market}:${item.ticker}`;
                    const quote = quotes[key];
                    const isQuote = quote && "data" in quote;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setSelected(item)}
                        className={`grid w-full grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-zinc-100 px-4 py-3 text-left last:border-b-0 hover:bg-zinc-50 ${
                          selected?.id === item.id ? "bg-emerald-50" : "bg-white"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeTone(item.market)}`}>
                              {item.market}
                            </span>
                            <span className="truncate font-medium">{item.name}</span>
                            <span className="text-xs text-zinc-500">{item.ticker}</span>
                          </div>
                          {item.tags && <div className="mt-1 text-xs text-zinc-500">{item.tags}</div>}
                        </div>
                        <div className="text-right">
                          {isQuote ? (
                            <>
                              <div className="font-mono text-sm font-semibold">{formatPrice(quote.data)}</div>
                              <div className={`font-mono text-xs ${tone(quote.data.changePercent)}`}>
                                {quote.data.changePercent.toFixed(2)}%
                              </div>
                            </>
                          ) : (
                            <div className="text-xs text-zinc-400">시세 대기</div>
                          )}
                        </div>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            removeWatchlist(item.id);
                          }}
                          className="rounded-full p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={16} />
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </Panel>

            <Panel title="종목 상세" icon={<Newspaper size={17} />}>
              {!selected ? (
                <EmptyState text="관심종목을 선택하면 상세 정보가 표시됩니다." />
              ) : detailLoading ? (
                <EmptyState text="종목 상세를 불러오는 중입니다." />
              ) : detail ? (
                <StockDetailPanel
                  detail={detail}
                  selected={selected}
                  chart={charts[`${selected.market}:${selected.ticker}`]}
                />
              ) : (
                <EmptyState text="상세 정보를 불러오지 못했습니다." />
              )}
            </Panel>
          </main>
        </section>

        <Panel title="차트 분석" icon={<BarChart3 size={17} />}>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-zinc-500">
              캔들, 거래량, 날짜별 가격을 간단히 확인합니다.
            </div>
            <div className="inline-flex rounded-full bg-zinc-100 p-1">
              {chartRanges.map((range) => (
                <button
                  key={range.value}
                  type="button"
                  onClick={() => changeChartRange(range.value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    chartRange === range.value
                      ? "bg-zinc-950 text-white"
                      : "text-zinc-500 hover:text-zinc-900"
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          <ChartGroup title="보유 종목" items={holdingChartStocks} charts={charts} emptyText="보유 종목 차트가 없습니다." />
          <div className="mt-6">
            <ChartGroup title="관심종목" items={watchChartStocks} charts={charts} emptyText="관심종목 차트가 없습니다." />
          </div>
        </Panel>

        <Panel title="보유 포트폴리오" icon={<BriefcaseBusiness size={17} />}>
          {portfolio.items.length === 0 ? (
            <EmptyState text="보유 종목이 없습니다. 수량과 평균단가를 입력하면 평가손익을 계산합니다." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                    <th className="py-2">종목</th>
                    <th className="py-2 text-right">수량</th>
                    <th className="py-2 text-right">평단</th>
                    <th className="py-2 text-right">현재가</th>
                    <th className="py-2 text-right">평가금액</th>
                    <th className="py-2 text-right">손익</th>
                    <th className="py-2 text-right">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.items.map((item) => (
                    <tr key={item.id} className="border-b border-zinc-100 last:border-0">
                      {editingHoldingId === item.id && editHolding ? (
                        <EditableHoldingRow
                          item={item}
                          values={editHolding}
                          onChange={setEditHolding}
                          onSave={() => saveHolding(item.id)}
                          onCancel={() => {
                            setEditingHoldingId(null);
                            setEditHolding(null);
                          }}
                        />
                      ) : (
                        <ReadOnlyHoldingRow
                          item={item}
                          onEdit={() => startEditHolding(item)}
                          onRemove={() => removeHolding(item.id)}
                        />
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Metric({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-2xl bg-zinc-50 p-3">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={`mt-1 font-mono text-base font-semibold ${className}`}>{value}</div>
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-700">
        {icon}
        {title}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
      {text}
    </div>
  );
}

type ChartListItem = {
  key: string;
  market: Market;
  ticker: string;
  name: string;
  group: string;
};

function formatVolume(value: number | null) {
  if (!value) return "-";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString("ko-KR");
}

function ChartGroup({
  title,
  items,
  charts,
  emptyText,
}: {
  title: string;
  items: ChartListItem[];
  charts: Record<string, PriceHistory | { error: string }>;
  emptyText: string;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-800">{title}</h3>
        <span className="text-xs text-zinc-400">{items.length}개</span>
      </div>
      {items.length === 0 ? (
        <EmptyState text={emptyText} />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {items.map((item) => (
            <ChartCard
              key={item.key}
              name={item.name}
              market={item.market}
              ticker={item.ticker}
              group={item.group}
              chart={charts[item.key]}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CandlestickChart({ chart }: { chart: PriceHistory }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const points = chart.points.slice(-90);
  const lows = points.map((point) => point.low);
  const highs = points.map((point) => point.high);
  const volumes = points.map((point) => point.volume ?? 0);
  const min = Math.min(...lows);
  const max = Math.max(...highs);
  const maxVolume = Math.max(...volumes, 1);
  const width = 720;
  const priceHeight = 230;
  const volumeTop = 250;
  const volumeHeight = 72;
  const height = 340;
  const range = max - min || 1;
  const candleGap = width / Math.max(points.length, 1);
  const candleWidth = Math.max(3, Math.min(10, candleGap * 0.55));
  const hovered = hoverIndex === null ? points[points.length - 1] : points[hoverIndex];

  function xOf(index: number) {
    return points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
  }

  function yOf(value: number) {
    return 14 + ((max - value) / range) * (priceHeight - 28);
  }

  function indexFromClientX(clientX: number, target: SVGSVGElement) {
    const rect = target.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(ratio * (points.length - 1));
  }

  return (
    <div className="rounded-2xl bg-[#111217] p-3 text-white">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="font-semibold text-zinc-200">
          {hovered?.date ?? "-"} · {hovered ? formatMoney(hovered.close, chart.currency) : "-"}
        </div>
        {hovered && (
          <div className="text-zinc-400">
            시 {formatMoney(hovered.open, chart.currency)} · 고 {formatMoney(hovered.high, chart.currency)} · 저{" "}
            {formatMoney(hovered.low, chart.currency)} · 거래량 {formatVolume(hovered.volume)}
          </div>
        )}
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-72 w-full touch-none"
        onMouseMove={(e) => setHoverIndex(indexFromClientX(e.clientX, e.currentTarget))}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {[0, 1, 2, 3].map((line) => {
          const y = 18 + line * 54;
          return <line key={line} x1="0" x2={width} y1={y} y2={y} stroke="#272a31" strokeWidth="1" />;
        })}
        <line x1="0" x2={width} y1={volumeTop - 8} y2={volumeTop - 8} stroke="#3f424b" strokeWidth="1" />
        {points.map((point, index) => {
          const x = xOf(index);
          const up = point.close >= point.open;
          const color = up ? "#ef4444" : "#3b82f6";
          const highY = yOf(point.high);
          const lowY = yOf(point.low);
          const openY = yOf(point.open);
          const closeY = yOf(point.close);
          const bodyY = Math.min(openY, closeY);
          const bodyHeight = Math.max(2, Math.abs(closeY - openY));
          const barHeight = ((point.volume ?? 0) / maxVolume) * volumeHeight;
          return (
            <g key={`${point.date}-${index}`}>
              <line x1={x} x2={x} y1={highY} y2={lowY} stroke={color} strokeWidth="1.4" />
              <rect
                x={x - candleWidth / 2}
                y={bodyY}
                width={candleWidth}
                height={bodyHeight}
                rx="1"
                fill={color}
              />
              <rect
                x={x - candleWidth / 2}
                y={volumeTop + (volumeHeight - barHeight)}
                width={candleWidth}
                height={barHeight}
                rx="1"
                fill={color}
                opacity="0.82"
              />
            </g>
          );
        })}
        {hoverIndex !== null && (
          <>
            <line
              x1={xOf(hoverIndex)}
              x2={xOf(hoverIndex)}
              y1="0"
              y2={height}
              stroke="#a1a1aa"
              strokeDasharray="4 4"
              strokeWidth="1"
            />
            <circle cx={xOf(hoverIndex)} cy={yOf(points[hoverIndex].close)} r="3" fill="#f8fafc" />
          </>
        )}
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-zinc-500">
        <span>{points[0]?.date}</span>
        <span>{chart.source}</span>
        <span>{points[points.length - 1]?.date}</span>
      </div>
    </div>
  );
}

function ChartCard({
  name,
  market,
  ticker,
  group,
  chart,
}: {
  name: string;
  market: Market;
  ticker: string;
  group: string;
  chart: PriceHistory | { error: string } | undefined;
}) {
  const isChart = chart && "points" in chart;
  const first = isChart ? chart.points[chart.points.length - 2] ?? chart.points[0] : null;
  const last = isChart ? chart.points[chart.points.length - 1] : null;
  const changePercent =
    first && last && first.close > 0 ? ((last.close - first.close) / first.close) * 100 : 0;

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeTone(market)}`}>
              {market}
            </span>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-600">
              {group}
            </span>
          </div>
          <div className="mt-2 truncate font-semibold">{name}</div>
          <div className="text-xs text-zinc-500">{ticker}</div>
        </div>
        {isChart && last && (
          <div className="text-right">
            <div className="font-mono text-sm font-semibold">{formatMoney(last.close, chart.currency)}</div>
            <div className={`font-mono text-xs ${tone(changePercent)}`}>전일 대비 {changePercent.toFixed(2)}%</div>
          </div>
        )}
      </div>
      <div className="mt-3">
        {isChart ? (
          <>
            <CandlestickChart chart={chart} />
          </>
        ) : (
          <EmptyState text={chart?.error ? "차트를 불러오지 못했습니다." : "차트 대기 중입니다."} />
        )}
      </div>
    </div>
  );
}

function SymbolSearchBox({
  market,
  query,
  onQueryChange,
  suggestions,
  searching,
  onSearch,
  onPick,
}: {
  market: Market;
  query: string;
  onQueryChange: (value: string) => void;
  suggestions: SymbolSearchResult[];
  searching: boolean;
  onSearch: () => void;
  onPick: (item: SymbolSearchResult) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_42px] gap-2">
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSearch();
            }
          }}
          placeholder={market === "KR" ? "종목명 검색 예: SK하이닉스" : "Search name or symbol"}
          className="rounded-2xl border border-zinc-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={onSearch}
          disabled={searching || !query.trim()}
          className="inline-flex items-center justify-center rounded-2xl border border-zinc-300 text-zinc-600 disabled:opacity-40"
          aria-label="종목 검색"
        >
          <Search size={16} />
        </button>
      </div>
      {suggestions.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          {suggestions.map((item) => (
            <button
              type="button"
              key={`${item.market}:${item.ticker}`}
              onClick={() => onPick(item)}
              className="flex w-full items-center justify-between gap-3 border-b border-zinc-100 px-3 py-2 text-left last:border-b-0 hover:bg-zinc-50"
            >
              <span>
                <span className="text-sm font-medium">{item.name}</span>
                <span className="ml-2 text-xs text-zinc-500">{item.ticker}</span>
              </span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeTone(item.market)}`}>
                {item.market}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StockForm({
  values,
  onChange,
  onSubmit,
  submitLabel,
  includeTags,
  resolving,
  onResolveName,
  searchQuery,
  onSearchQueryChange,
  suggestions,
  searching,
  onSearch,
  onPick,
}: {
  values: StockFormValues;
  onChange: (next: StockFormValues) => void;
  onSubmit: (e: FormEvent) => void;
  submitLabel: string;
  includeTags?: boolean;
  resolving: boolean;
  onResolveName: () => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  suggestions: SymbolSearchResult[];
  searching: boolean;
  onSearch: () => void;
  onPick: (item: SymbolSearchResult) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <SymbolSearchBox
        market={values.market}
        query={searchQuery}
        onQueryChange={onSearchQueryChange}
        suggestions={suggestions}
        searching={searching}
        onSearch={onSearch}
        onPick={onPick}
      />
      <div className="grid grid-cols-[78px_1fr_42px] gap-2">
        <select
          value={values.market}
          onChange={(e) => onChange({ ...values, market: e.target.value as Market })}
          className="rounded-2xl border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="KR">KR</option>
          <option value="US">US</option>
        </select>
        <input
          value={values.ticker}
          onBlur={() => {
            if (!values.name) onResolveName();
          }}
          onChange={(e) => onChange({ ...values, ticker: e.target.value.toUpperCase() })}
          placeholder={values.market === "KR" ? "005930" : "AAPL"}
          required
          className="rounded-2xl border border-zinc-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={onResolveName}
          disabled={resolving || !values.ticker.trim()}
          className="inline-flex items-center justify-center rounded-2xl border border-zinc-300 text-zinc-600 disabled:opacity-40"
          aria-label="종목명 자동 입력"
        >
          <Search size={16} />
        </button>
      </div>
      <input
        value={values.name}
        onChange={(e) => onChange({ ...values, name: e.target.value })}
        placeholder={resolving ? "종목명 확인 중..." : "종목명"}
        required
        className="w-full rounded-2xl border border-zinc-300 px-3 py-2 text-sm"
      />
      {includeTags && (
        <input
          value={values.tags}
          onChange={(e) => onChange({ ...values, tags: e.target.value })}
          placeholder="태그 예: 반도체, 장기"
          className="w-full rounded-2xl border border-zinc-300 px-3 py-2 text-sm"
        />
      )}
      <input
        value={values.note}
        onChange={(e) => onChange({ ...values, note: e.target.value })}
        placeholder="메모"
        className="w-full rounded-2xl border border-zinc-300 px-3 py-2 text-sm"
      />
      <button className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-700 px-3 py-2 text-sm font-medium text-white">
        <Plus size={16} />
        {submitLabel}
      </button>
    </form>
  );
}

function HoldingForm({
  values,
  onChange,
  onSubmit,
  resolving,
  onResolveName,
  searchQuery,
  onSearchQueryChange,
  suggestions,
  searching,
  onSearch,
  onPick,
}: {
  values: HoldingFormValues;
  onChange: (next: HoldingFormValues) => void;
  onSubmit: (e: FormEvent) => void;
  resolving: boolean;
  onResolveName: () => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  suggestions: SymbolSearchResult[];
  searching: boolean;
  onSearch: () => void;
  onPick: (item: SymbolSearchResult) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <SymbolSearchBox
        market={values.market}
        query={searchQuery}
        onQueryChange={onSearchQueryChange}
        suggestions={suggestions}
        searching={searching}
        onSearch={onSearch}
        onPick={onPick}
      />
      <div className="grid grid-cols-[78px_1fr_42px] gap-2">
        <select
          value={values.market}
          onChange={(e) => {
            const market = e.target.value as Market;
            onChange({ ...values, market, currency: currencyForMarket(market) });
          }}
          className="rounded-2xl border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="KR">KR</option>
          <option value="US">US</option>
        </select>
        <input
          value={values.ticker}
          onBlur={() => {
            if (!values.name) onResolveName();
          }}
          onChange={(e) => onChange({ ...values, ticker: e.target.value.toUpperCase() })}
          placeholder={values.market === "KR" ? "005930" : "AAPL"}
          required
          className="rounded-2xl border border-zinc-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={onResolveName}
          disabled={resolving || !values.ticker.trim()}
          className="inline-flex items-center justify-center rounded-2xl border border-zinc-300 text-zinc-600 disabled:opacity-40"
          aria-label="종목명 자동 입력"
        >
          <Search size={16} />
        </button>
      </div>
      <input
        value={values.name}
        onChange={(e) => onChange({ ...values, name: e.target.value })}
        placeholder={resolving ? "종목명 확인 중..." : "종목명"}
        required
        className="w-full rounded-2xl border border-zinc-300 px-3 py-2 text-sm"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          value={values.quantity}
          onChange={(e) => onChange({ ...values, quantity: e.target.value })}
          placeholder="수량"
          required
          inputMode="decimal"
          className="rounded-2xl border border-zinc-300 px-3 py-2 text-sm"
        />
        <input
          value={values.averageCost}
          onChange={(e) => onChange({ ...values, averageCost: e.target.value })}
          placeholder="평균단가"
          required
          inputMode="decimal"
          className="rounded-2xl border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>
      <input
        value={values.note}
        onChange={(e) => onChange({ ...values, note: e.target.value })}
        placeholder="보유 메모"
        className="w-full rounded-2xl border border-zinc-300 px-3 py-2 text-sm"
      />
      <button className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-zinc-950 px-3 py-2 text-sm font-medium text-white">
        <Plus size={16} />
        보유 종목 추가
      </button>
    </form>
  );
}

function ReadOnlyHoldingRow({
  item,
  onEdit,
  onRemove,
}: {
  item: Holding;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <>
      <td className="py-3">
        <div className="font-medium">{item.name}</div>
        <div className="text-xs text-zinc-500">
          {item.market} {item.ticker}
        </div>
      </td>
      <td className="py-3 text-right font-mono">{item.quantity}</td>
      <td className="py-3 text-right font-mono">{formatMoney(item.average_cost, item.currency)}</td>
      <td className="py-3 text-right font-mono">{item.quote ? formatPrice(item.quote) : "-"}</td>
      <td className="py-3 text-right font-mono">{formatMoney(item.marketValue, item.currency)}</td>
      <td className={`py-3 text-right font-mono ${tone(item.unrealizedGain)}`}>
        {formatMoney(item.unrealizedGain, item.currency)}
        <div className="text-xs">{item.returnPercent.toFixed(2)}%</div>
      </td>
      <td className="py-3 text-right">
        <div className="inline-flex gap-1">
          <button
            onClick={onEdit}
            className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800"
            aria-label="보유 종목 수정"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={onRemove}
            className="rounded-full p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600"
            aria-label="보유 종목 삭제"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </>
  );
}

function EditableHoldingRow({
  item,
  values,
  onChange,
  onSave,
  onCancel,
}: {
  item: Holding;
  values: HoldingFormValues;
  onChange: (next: HoldingFormValues) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      <td className="py-3">
        <div className="font-medium">{item.name}</div>
        <input
          value={values.note}
          onChange={(e) => onChange({ ...values, note: e.target.value })}
          placeholder="메모"
          className="mt-1 w-full rounded-xl border border-zinc-300 px-2 py-1 text-xs"
        />
      </td>
      <td className="py-3 text-right">
        <input
          value={values.quantity}
          onChange={(e) => onChange({ ...values, quantity: e.target.value })}
          className="w-24 rounded-xl border border-zinc-300 px-2 py-1 text-right font-mono"
          inputMode="decimal"
        />
      </td>
      <td className="py-3 text-right">
        <input
          value={values.averageCost}
          onChange={(e) => onChange({ ...values, averageCost: e.target.value })}
          className="w-28 rounded-xl border border-zinc-300 px-2 py-1 text-right font-mono"
          inputMode="decimal"
        />
      </td>
      <td className="py-3 text-right font-mono">{item.quote ? formatPrice(item.quote) : "-"}</td>
      <td className="py-3 text-right font-mono">{formatMoney(item.marketValue, item.currency)}</td>
      <td className={`py-3 text-right font-mono ${tone(item.unrealizedGain)}`}>
        {formatMoney(item.unrealizedGain, item.currency)}
        <div className="text-xs">{item.returnPercent.toFixed(2)}%</div>
      </td>
      <td className="py-3 text-right">
        <div className="inline-flex gap-1">
          <button
            type="button"
            onClick={onSave}
            className="rounded-full p-1 text-emerald-700 hover:bg-emerald-50"
            aria-label="수정 저장"
          >
            <Check size={17} />
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full p-1 text-zinc-500 hover:bg-zinc-100"
            aria-label="수정 취소"
          >
            <X size={17} />
          </button>
        </div>
      </td>
    </>
  );
}

function StockDetailPanel({
  detail,
  selected,
  chart,
}: {
  detail: StockDetail;
  selected: WatchlistItem;
  chart: PriceHistory | { error: string } | undefined;
}) {
  const quote = detail.quote.data;
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-zinc-50 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeTone(selected.market)}`}>
                {selected.market}
              </span>
              <h2 className="font-semibold">{selected.name}</h2>
              <span className="text-xs text-zinc-500">{selected.ticker}</span>
            </div>
            <div className="mt-2 font-mono text-2xl font-bold">{formatPrice(quote)}</div>
            <div className={`mt-1 font-mono text-sm ${tone(quote.changePercent)}`}>
              {quote.change.toLocaleString("ko-KR", { maximumFractionDigits: 2 })} / {quote.changePercent.toFixed(2)}%
            </div>
          </div>
          {detail.quote.cached && (
            <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
              캐시
            </span>
          )}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <Metric label="전일 종가" value={formatMoney(quote.previousClose, quote.currency)} />
          <Metric label="데이터 소스" value={quote.source} />
        </div>
      </div>

      <div>
        <div className="mb-2 text-sm font-semibold text-zinc-700">가격/거래량 차트</div>
        {chart && "points" in chart ? (
          <CandlestickChart chart={chart} />
        ) : (
          <EmptyState text="차트를 불러오는 중입니다." />
        )}
      </div>

      <div>
        <div className="mb-2 text-sm font-semibold text-zinc-700">관련 뉴스</div>
        {detail.news.data.length === 0 ? (
          <EmptyState text="관련 뉴스가 없습니다." />
        ) : (
          <ul className="space-y-3">
            {detail.news.data.slice(0, 5).map((news, index) => (
              <li key={index} className="rounded-2xl border border-zinc-200 p-3">
                <a href={news.link} target="_blank" rel="noreferrer" className="group block">
                  <div className="flex items-start gap-2 text-sm font-medium group-hover:underline">
                    <span>{news.title}</span>
                    <ExternalLink size={12} className="mt-1 shrink-0 text-zinc-400" />
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {[news.source, news.pubDate && new Date(news.pubDate).toLocaleDateString("ko-KR")]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <a
          href={detail.references.tradingView}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-zinc-200 px-3 py-2 text-center text-sm font-medium hover:bg-zinc-50"
        >
          TradingView
        </a>
        <a
          href={detail.references.investing}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-zinc-200 px-3 py-2 text-center text-sm font-medium hover:bg-zinc-50"
        >
          Investing.com
        </a>
      </div>
    </div>
  );
}
