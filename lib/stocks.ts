export type Quote = {
  market: "KR" | "US";
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  previousClose: number;
  marketState?: string;
};

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
  const price = parseFloat(j.closePrice?.replace(/,/g, "") ?? "0");
  const change = parseFloat(j.compareToPreviousClosePrice?.replace(/,/g, "") ?? "0");
  const previousClose = price - change;
  const changePercent =
    previousClose > 0 ? (change / previousClose) * 100 : 0;
  return {
    market: "KR",
    ticker,
    name: j.stockName ?? ticker,
    price,
    change,
    changePercent,
    currency: "KRW",
    previousClose,
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
  };
}

export async function getQuote(
  market: "KR" | "US",
  ticker: string
): Promise<Quote> {
  return market === "KR" ? fetchNaverKR(ticker) : fetchYahooUS(ticker);
}

export function formatPrice(q: Pick<Quote, "price" | "currency">): string {
  if (q.currency === "KRW") return `₩${q.price.toLocaleString("ko-KR")}`;
  return `$${q.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}
