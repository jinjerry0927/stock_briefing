import { db, type Holding, type Market, type WatchlistItem } from "@/lib/db";
import { searchNews, type NewsItem } from "@/lib/news";
import { getQuote, type Quote } from "@/lib/stocks";

type CacheRow = {
  payload: string;
  fetched_at: string;
};

export type Cached<T> = {
  data: T;
  cached: boolean;
  fetchedAt: string | null;
  error?: string;
};

function nowIso() {
  return new Date().toISOString();
}

export async function getCachedQuote(market: Market, ticker: string): Promise<Cached<Quote>> {
  const normalizedTicker = ticker.trim().toUpperCase();
  try {
    const quote = await getQuote(market, normalizedTicker);
    db.prepare(
      `INSERT INTO quote_cache (market, ticker, payload, fetched_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(market, ticker) DO UPDATE SET
       payload = excluded.payload,
       fetched_at = excluded.fetched_at`
    ).run(market, normalizedTicker, JSON.stringify(quote));
    return { data: quote, cached: false, fetchedAt: nowIso() };
  } catch (e) {
    const row = db
      .prepare("SELECT payload, fetched_at FROM quote_cache WHERE market = ? AND ticker = ?")
      .get(market, normalizedTicker) as CacheRow | undefined;
    if (row) {
      return {
        data: JSON.parse(row.payload) as Quote,
        cached: true,
        fetchedAt: row.fetched_at,
        error: e instanceof Error ? e.message : String(e),
      };
    }
    throw e;
  }
}

export async function getCachedNews(
  market: Market,
  ticker: string,
  name: string,
  limit = 8
): Promise<Cached<NewsItem[]>> {
  const normalizedTicker = ticker.trim().toUpperCase();
  try {
    const items = await searchNews(market, normalizedTicker, name, limit);
    db.prepare(
      `INSERT INTO news_cache (market, ticker, payload, fetched_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(market, ticker) DO UPDATE SET
       payload = excluded.payload,
       fetched_at = excluded.fetched_at`
    ).run(market, normalizedTicker, JSON.stringify(items));
    return { data: items, cached: false, fetchedAt: nowIso() };
  } catch (e) {
    const row = db
      .prepare("SELECT payload, fetched_at FROM news_cache WHERE market = ? AND ticker = ?")
      .get(market, normalizedTicker) as CacheRow | undefined;
    if (row) {
      return {
        data: JSON.parse(row.payload) as NewsItem[],
        cached: true,
        fetchedAt: row.fetched_at,
        error: e instanceof Error ? e.message : String(e),
      };
    }
    throw e;
  }
}

export type HoldingWithValuation = Holding & {
  quote: Quote | null;
  marketValue: number;
  costBasis: number;
  unrealizedGain: number;
  returnPercent: number;
  quoteError?: string;
};

export async function valueHolding(holding: Holding): Promise<HoldingWithValuation> {
  try {
    const quote = await getCachedQuote(holding.market, holding.ticker);
    const marketValue = quote.data.price * holding.quantity;
    const costBasis = holding.average_cost * holding.quantity;
    const unrealizedGain = marketValue - costBasis;
    const returnPercent = costBasis > 0 ? (unrealizedGain / costBasis) * 100 : 0;
    return {
      ...holding,
      quote: quote.data,
      marketValue,
      costBasis,
      unrealizedGain,
      returnPercent,
      quoteError: quote.error,
    };
  } catch (e) {
    return {
      ...holding,
      quote: null,
      marketValue: 0,
      costBasis: holding.average_cost * holding.quantity,
      unrealizedGain: 0,
      returnPercent: 0,
      quoteError: e instanceof Error ? e.message : String(e),
    };
  }
}

export function listWatchlist(): WatchlistItem[] {
  return db
    .prepare(
      `SELECT id, market, ticker, name, note, tags, display_order, created_at, updated_at
       FROM watchlist
       ORDER BY display_order ASC, market ASC, ticker ASC`
    )
    .all() as WatchlistItem[];
}

export function listHoldings(): Holding[] {
  return db
    .prepare(
      `SELECT id, market, ticker, name, quantity, average_cost, currency, note, created_at, updated_at
       FROM holdings
       ORDER BY market ASC, ticker ASC`
    )
    .all() as Holding[];
}
