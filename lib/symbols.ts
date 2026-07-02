import type { Market } from "@/lib/db";

export type SymbolSearchResult = {
  market: Market;
  ticker: string;
  name: string;
  exchange?: string;
  source: "local" | "yahoo";
};

const LOCAL_SYMBOLS: SymbolSearchResult[] = [
  { market: "KR", ticker: "005930", name: "삼성전자", exchange: "KOSPI", source: "local" },
  { market: "KR", ticker: "000660", name: "SK하이닉스", exchange: "KOSPI", source: "local" },
  { market: "KR", ticker: "035420", name: "NAVER", exchange: "KOSPI", source: "local" },
  { market: "KR", ticker: "035720", name: "카카오", exchange: "KOSPI", source: "local" },
  { market: "KR", ticker: "005380", name: "현대차", exchange: "KOSPI", source: "local" },
  { market: "KR", ticker: "000270", name: "기아", exchange: "KOSPI", source: "local" },
  { market: "KR", ticker: "373220", name: "LG에너지솔루션", exchange: "KOSPI", source: "local" },
  { market: "KR", ticker: "068270", name: "셀트리온", exchange: "KOSPI", source: "local" },
  { market: "KR", ticker: "207940", name: "삼성바이오로직스", exchange: "KOSPI", source: "local" },
  { market: "KR", ticker: "005490", name: "POSCO홀딩스", exchange: "KOSPI", source: "local" },
  { market: "KR", ticker: "012330", name: "현대모비스", exchange: "KOSPI", source: "local" },
  { market: "KR", ticker: "028260", name: "삼성물산", exchange: "KOSPI", source: "local" },
  { market: "KR", ticker: "105560", name: "KB금융", exchange: "KOSPI", source: "local" },
  { market: "KR", ticker: "055550", name: "신한지주", exchange: "KOSPI", source: "local" },
  { market: "KR", ticker: "0183J0", name: "TIGER 미국우주테크", exchange: "KOSPI", source: "local" },
  { market: "US", ticker: "AAPL", name: "Apple", exchange: "NASDAQ", source: "local" },
  { market: "US", ticker: "MSFT", name: "Microsoft", exchange: "NASDAQ", source: "local" },
  { market: "US", ticker: "NVDA", name: "NVIDIA", exchange: "NASDAQ", source: "local" },
  { market: "US", ticker: "TSLA", name: "Tesla", exchange: "NASDAQ", source: "local" },
  { market: "US", ticker: "GOOGL", name: "Alphabet", exchange: "NASDAQ", source: "local" },
  { market: "US", ticker: "AMZN", name: "Amazon", exchange: "NASDAQ", source: "local" },
  { market: "US", ticker: "META", name: "Meta Platforms", exchange: "NASDAQ", source: "local" },
  { market: "US", ticker: "BRK-B", name: "Berkshire Hathaway", exchange: "NYSE", source: "local" },
  { market: "US", ticker: "SPY", name: "SPDR S&P 500 ETF", exchange: "NYSEARCA", source: "local" },
  { market: "US", ticker: "QQQ", name: "Invesco QQQ Trust", exchange: "NASDAQ", source: "local" },
];

function includesQuery(value: string, query: string) {
  return value.toLowerCase().includes(query.toLowerCase());
}

async function searchYahoo(query: string, market?: Market): Promise<SymbolSearchResult[]> {
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
    query
  )}&quotesCount=8&newsCount=0`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
    cache: "no-store",
  });
  if (!res.ok) return [];

  const json = (await res.json()) as {
    quotes?: Array<{
      symbol?: string;
      shortname?: string;
      longname?: string;
      exchange?: string;
      quoteType?: string;
    }>;
  };

  return (json.quotes ?? [])
    .filter((item) => item.symbol && (item.shortname || item.longname))
    .map((item) => {
      const isKr = item.symbol?.endsWith(".KS") || item.symbol?.endsWith(".KQ");
      const mappedMarket: Market = isKr ? "KR" : "US";
      const ticker = isKr ? item.symbol!.replace(/\.(KS|KQ)$/u, "") : item.symbol!;
      return {
        market: mappedMarket,
        ticker,
        name: item.shortname ?? item.longname ?? ticker,
        exchange: item.exchange,
        source: "yahoo" as const,
      };
    })
    .filter((item) => !market || item.market === market);
}

export async function searchSymbols(
  query: string,
  market?: Market,
  limit = 8
): Promise<SymbolSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const local = LOCAL_SYMBOLS.filter(
    (item) =>
      (!market || item.market === market) &&
      (includesQuery(item.ticker, q) || includesQuery(item.name, q))
  );
  const yahoo = await searchYahoo(q, market).catch(() => []);

  const merged: SymbolSearchResult[] = [];
  const seen = new Set<string>();
  for (const item of [...local, ...yahoo]) {
    const key = `${item.market}:${item.ticker}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  return merged.slice(0, limit);
}
