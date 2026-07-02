import type { Market } from "@/lib/db";

export type Quote = {
  market: Market;
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: "KRW" | "USD" | string;
  previousClose: number;
  marketState?: string;
  source: string;
};

export type PricePoint = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
};

export type PriceHistory = {
  market: Market;
  ticker: string;
  range: string;
  interval: string;
  currency: string;
  source: string;
  points: PricePoint[];
};

async function fetchYahooChart(symbol: string, range: string, interval: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?interval=${encodeURIComponent(interval)}&range=${encodeURIComponent(range)}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Yahoo chart ${symbol} ${res.status}`);

  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(`Yahoo chart ${symbol} no result`);
  return result;
}

async function fetchNaverKR(ticker: string): Promise<Quote> {
  const url = `https://m.stock.naver.com/api/stock/${ticker}/basic`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      Accept: "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Naver ${ticker} ${res.status}`);

  const j = await res.json();
  const price = parseFloat(String(j.closePrice ?? "0").replace(/,/g, ""));
  const change = parseFloat(
    String(j.compareToPreviousClosePrice ?? "0").replace(/,/g, "")
  );
  const previousClose = price - change;
  const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

  return {
    market: "KR",
    ticker,
    name: j.stockName ?? ticker,
    price,
    change,
    changePercent,
    currency: "KRW",
    previousClose,
    source: "Naver",
  };
}

async function fetchYahooUS(ticker: string): Promise<Quote> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    ticker
  )}?interval=1d&range=5d`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Yahoo ${ticker} ${res.status}`);

  const j = await res.json();
  const meta = j?.chart?.result?.[0]?.meta;
  if (!meta) throw new Error(`Yahoo ${ticker} no meta`);

  const price = meta.regularMarketPrice ?? 0;
  const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
  const change = price - previousClose;
  const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

  return {
    market: "US",
    ticker,
    name: meta.longName ?? meta.shortName ?? ticker,
    price,
    change,
    changePercent,
    currency: meta.currency ?? "USD",
    previousClose,
    marketState: meta.marketState,
    source: "Yahoo Finance",
  };
}

export async function getQuote(market: Market, ticker: string): Promise<Quote> {
  const normalizedTicker = ticker.trim().toUpperCase();
  return market === "KR" ? fetchNaverKR(normalizedTicker) : fetchYahooUS(normalizedTicker);
}

export async function getPriceHistory(
  market: Market,
  ticker: string,
  range = "3mo",
  interval = "1d"
): Promise<PriceHistory> {
  const normalizedTicker = ticker.trim().toUpperCase();
  const symbols =
    market === "KR"
      ? [`${normalizedTicker}.KS`, `${normalizedTicker}.KQ`, normalizedTicker]
      : [normalizedTicker];

  let result: unknown;
  let usedSymbol = symbols[0];
  let lastError: unknown;
  for (const symbol of symbols) {
    try {
      result = await fetchYahooChart(symbol, range, interval);
      usedSymbol = symbol;
      break;
    } catch (e) {
      lastError = e;
    }
  }
  if (!result) throw lastError instanceof Error ? lastError : new Error("chart_unavailable");

  const chart = result as {
    meta?: { currency?: string };
    timestamp?: number[];
    indicators?: {
      quote?: Array<{
        open?: Array<number | null>;
        high?: Array<number | null>;
        low?: Array<number | null>;
        close?: Array<number | null>;
        volume?: Array<number | null>;
      }>;
    };
  };
  const timestamps = chart.timestamp ?? [];
  const quote = chart.indicators?.quote?.[0];
  const opens = quote?.open ?? [];
  const highs = quote?.high ?? [];
  const lows = quote?.low ?? [];
  const closes = quote?.close ?? [];
  const volumes = quote?.volume ?? [];
  const points = timestamps
    .map((time, index) => ({
      date: new Date(time * 1000).toISOString().slice(0, 10),
      open: opens[index],
      high: highs[index],
      low: lows[index],
      close: closes[index],
      volume: volumes[index] ?? null,
    }))
    .filter(
      (point): point is PricePoint =>
        typeof point.open === "number" &&
        typeof point.high === "number" &&
        typeof point.low === "number" &&
        typeof point.close === "number"
    );

  if (points.length === 0) throw new Error(`Yahoo chart ${usedSymbol} no points`);

  return {
    market,
    ticker: normalizedTicker,
    range,
    interval,
    currency: chart.meta?.currency ?? (market === "KR" ? "KRW" : "USD"),
    source: `Yahoo Finance (${usedSymbol})`,
    points,
  };
}

export function formatPrice(q: Pick<Quote, "price" | "currency">): string {
  if (q.currency === "KRW") return `${q.price.toLocaleString("ko-KR")}원`;
  return `$${q.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}
