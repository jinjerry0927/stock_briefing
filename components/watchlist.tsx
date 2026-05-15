"use client";

import { useEffect, useState, useTransition } from "react";
import { Trash2, Plus, RefreshCw, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";

type Item = {
  id: number;
  market: "KR" | "US";
  ticker: string;
  name: string;
  note: string | null;
};

type Quote = {
  market: "KR" | "US";
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
};

type NewsItem = {
  title: string;
  link: string;
  source: string;
  pubDate: string;
  summary: string;
};

function formatPrice(q: Quote) {
  if (q.currency === "KRW") return `₩${q.price.toLocaleString("ko-KR")}`;
  return `$${q.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function formatDate(s: string): string {
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  const now = Date.now();
  const diff = now - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  return d.toLocaleDateString("ko-KR");
}

export function Watchlist() {
  const [items, setItems] = useState<Item[]>([]);
  const [quotes, setQuotes] = useState<Record<string, Quote | { error: string }>>({});
  const [news, setNews] = useState<Record<string, NewsItem[] | "loading" | { error: string }>>({});
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, startRefresh] = useTransition();

  const [market, setMarket] = useState<"KR" | "US">("KR");
  const [ticker, setTicker] = useState("");
  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function loadItems() {
    const r = await fetch("/api/watchlist", { cache: "no-store" });
    const j = await r.json();
    setItems(j.items ?? []);
    setLoading(false);
    return j.items as Item[];
  }

  async function loadQuotes(list: Item[]) {
    const entries = await Promise.all(
      list.map(async (it) => {
        const key = `${it.market}:${it.ticker}`;
        try {
          const r = await fetch(`/api/quote/${it.market}/${it.ticker}`, {
            cache: "no-store",
          });
          const j = await r.json();
          if (!r.ok) return [key, { error: j.error ?? "error" }] as const;
          return [key, j as Quote] as const;
        } catch (e) {
          return [key, { error: e instanceof Error ? e.message : "error" }] as const;
        }
      })
    );
    setQuotes(Object.fromEntries(entries));
  }

  async function loadNews(it: Item) {
    const key = `${it.market}:${it.ticker}`;
    if (news[key] && news[key] !== "loading" && !("error" in (news[key] as object))) return;
    setNews((prev) => ({ ...prev, [key]: "loading" }));
    try {
      const r = await fetch(
        `/api/news/${it.market}/${it.ticker}?name=${encodeURIComponent(it.name)}`,
        { cache: "no-store" }
      );
      const j = await r.json();
      if (!r.ok) {
        setNews((prev) => ({ ...prev, [key]: { error: j.error ?? "error" } }));
        return;
      }
      setNews((prev) => ({ ...prev, [key]: j.items as NewsItem[] }));
    } catch (e) {
      setNews((prev) => ({
        ...prev,
        [key]: { error: e instanceof Error ? e.message : "error" },
      }));
    }
  }

  useEffect(() => {
    loadItems().then(loadQuotes);
  }, []);

  function refresh() {
    startRefresh(async () => {
      const list = await loadItems();
      setNews({});
      await loadQuotes(list);
    });
  }

  function toggleExpand(it: Item) {
    if (expandedId === it.id) {
      setExpandedId(null);
    } else {
      setExpandedId(it.id);
      loadNews(it);
    }
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const r = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ market, ticker, name }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setFormError(j.error === "duplicate" ? "이미 등록된 종목" : j.error ?? "추가 실패");
        return;
      }
      setTicker("");
      setName("");
      const list = await loadItems();
      await loadQuotes(list);
    } finally {
      setSubmitting(false);
    }
  }

  async function removeItem(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("삭제할까요?")) return;
    if (expandedId === id) setExpandedId(null);
    await fetch(`/api/watchlist/${id}`, { method: "DELETE" });
    const list = await loadItems();
    await loadQuotes(list);
  }

  return (
    <div className="w-full max-w-3xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">📈 Stock Briefing</h1>
          <p className="text-sm text-zinc-500 mt-1">
            관심 종목을 등록하고 아침 브리핑을 받아보세요
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900 disabled:opacity-50"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          새로고침
        </button>
      </header>

      <form
        onSubmit={addItem}
        className="flex flex-col sm:flex-row gap-2 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900"
      >
        <select
          value={market}
          onChange={(e) => setMarket(e.target.value as "KR" | "US")}
          className="px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950"
        >
          <option value="KR">KR 한국</option>
          <option value="US">US 미국</option>
        </select>
        <input
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          placeholder={market === "KR" ? "005930" : "AAPL"}
          required
          className="flex-1 px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950"
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="이름 (예: 삼성전자)"
          required
          className="flex-1 px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950"
        />
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-black text-white dark:bg-white dark:text-black hover:opacity-80 disabled:opacity-50"
        >
          <Plus size={16} />
          추가
        </button>
      </form>
      {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}

      {loading ? (
        <p className="text-center py-8 text-zinc-500">불러오는 중...</p>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-zinc-500 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg">
          <p>관심 종목이 비어 있습니다.</p>
          <p className="text-sm mt-1">예시: 한국 005930 (삼성전자), 미국 AAPL (Apple)</p>
        </div>
      ) : (
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
          {items.map((it) => {
            const key = `${it.market}:${it.ticker}`;
            const q = quotes[key];
            const isQuote = q && !("error" in q);
            const up = isQuote && (q as Quote).change > 0;
            const down = isQuote && (q as Quote).change < 0;
            const isExpanded = expandedId === it.id;
            const itemNews = news[key];
            return (
              <li key={it.id} className="bg-white dark:bg-zinc-950">
                <button
                  onClick={() => toggleExpand(it)}
                  className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-left"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {isExpanded ? (
                      <ChevronDown size={16} className="text-zinc-400 flex-shrink-0" />
                    ) : (
                      <ChevronRight size={16} className="text-zinc-400 flex-shrink-0" />
                    )}
                    <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800">
                      {it.market}
                    </span>
                    <span className="font-medium">{it.name}</span>
                    <span className="text-sm text-zinc-500">{it.ticker}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    {isQuote ? (
                      <div className="text-right">
                        <div className="font-mono font-medium">{formatPrice(q as Quote)}</div>
                        <div
                          className={`text-sm font-mono ${
                            up
                              ? "text-red-600 dark:text-red-400"
                              : down
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-zinc-500"
                          }`}
                        >
                          {up ? "▲" : down ? "▼" : ""}
                          {(q as Quote).changePercent.toFixed(2)}%
                        </div>
                      </div>
                    ) : q && "error" in q ? (
                      <span className="text-sm text-red-500">시세 오류</span>
                    ) : (
                      <span className="text-sm text-zinc-400">...</span>
                    )}
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => removeItem(it.id, e)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ")
                          removeItem(it.id, e as unknown as React.MouseEvent);
                      }}
                      className="text-zinc-400 hover:text-red-500 cursor-pointer p-1"
                      aria-label="삭제"
                    >
                      <Trash2 size={18} />
                    </span>
                  </div>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 pl-12 border-t border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/40">
                    {itemNews === "loading" || itemNews === undefined ? (
                      <p className="py-4 text-sm text-zinc-500">뉴스 불러오는 중...</p>
                    ) : "error" in (itemNews as object) ? (
                      <p className="py-4 text-sm text-red-500">
                        뉴스를 가져올 수 없어요: {(itemNews as { error: string }).error}
                      </p>
                    ) : (itemNews as NewsItem[]).length === 0 ? (
                      <p className="py-4 text-sm text-zinc-500">관련 뉴스가 없습니다.</p>
                    ) : (
                      <ul className="py-3 space-y-3">
                        {(itemNews as NewsItem[]).map((n, idx) => (
                          <li key={idx} className="text-sm">
                            <a
                              href={n.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group block"
                            >
                              <div className="flex items-start gap-2">
                                <span className="font-medium group-hover:underline">
                                  {n.title}
                                </span>
                                <ExternalLink
                                  size={12}
                                  className="text-zinc-400 mt-1 flex-shrink-0"
                                />
                              </div>
                              <div className="text-xs text-zinc-500 mt-1">
                                {n.source && <span>{n.source}</span>}
                                {n.source && n.pubDate && <span> · </span>}
                                {n.pubDate && <span>{formatDate(n.pubDate)}</span>}
                              </div>
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
