import { XMLParser } from "fast-xml-parser";

export type NewsItem = {
  title: string;
  link: string;
  source: string;
  pubDate: string;
  summary: string;
};

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function asArray<T>(v: T | T[] | undefined): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

type RssItem = {
  title?: string;
  link?: string;
  pubDate?: string;
  description?: string;
  source?: string | { "#text"?: string };
};

async function fetchRss(url: string): Promise<RssItem[]> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`RSS ${url} ${res.status}`);
  const xml = await res.text();
  const j = parser.parse(xml);
  return asArray<RssItem>(j?.rss?.channel?.item);
}

function normalizeRss(item: RssItem): NewsItem {
  const sourceRaw =
    typeof item.source === "string"
      ? item.source
      : item.source?.["#text"] ?? "";
  return {
    title: stripHtml(item.title ?? ""),
    link: item.link ?? "",
    source: sourceRaw,
    pubDate: item.pubDate ?? "",
    summary: stripHtml(item.description ?? "").slice(0, 300),
  };
}

type NewsApiArticle = {
  source: { name: string };
  title: string;
  description: string | null;
  url: string;
  publishedAt: string;
};

async function fetchNewsApi(
  market: "KR" | "US",
  ticker: string,
  name: string,
  limit: number
): Promise<NewsItem[]> {
  const key = process.env.NEWSAPI_KEY;
  if (!key || key.startsWith("여기에")) return [];

  const query = market === "KR" ? name : ticker;
  const language = market === "KR" ? "" : "en";
  const url = `https://newsapi.org/v2/everything?qInTitle=${encodeURIComponent(
    query
  )}${language ? `&language=${language}` : ""}&sortBy=publishedAt&pageSize=${limit}`;
  const res = await fetch(url, {
    headers: { "X-Api-Key": key },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`NewsAPI ${res.status}`);
  const j = (await res.json()) as { articles?: NewsApiArticle[] };
  return (j.articles ?? []).map((a) => ({
    title: stripHtml(a.title ?? ""),
    link: a.url,
    source: a.source?.name ?? "",
    pubDate: a.publishedAt,
    summary: stripHtml(a.description ?? "").slice(0, 300),
  }));
}

async function fetchGoogleNews(
  market: "KR" | "US",
  ticker: string,
  name: string,
  limit: number
): Promise<NewsItem[]> {
  const url =
    market === "KR"
      ? `https://news.google.com/rss/search?q=${encodeURIComponent(name)}&hl=ko&gl=KR&ceid=KR:ko`
      : `https://news.google.com/rss/search?q=${encodeURIComponent(`${ticker} ${name} stock`)}&hl=en-US&gl=US&ceid=US:en`;
  const items = await fetchRss(url);
  return items.slice(0, limit).map(normalizeRss);
}

async function fetchYahooFinance(
  ticker: string,
  limit: number
): Promise<NewsItem[]> {
  const url = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(
    ticker
  )}&region=US&lang=en-US`;
  const items = await fetchRss(url);
  return items.slice(0, limit).map(normalizeRss);
}

function timeOf(s: string): number {
  const t = new Date(s).getTime();
  return Number.isFinite(t) ? t : 0;
}

export async function searchNews(
  market: "KR" | "US",
  ticker: string,
  name: string,
  limit = 8
): Promise<NewsItem[]> {
  const half = Math.ceil(limit / 2);

  const [fromApi, fromGoogle] = await Promise.all([
    fetchNewsApi(market, ticker, name, half).catch(() => []),
    fetchGoogleNews(market, ticker, name, half).catch(() => []),
  ]);

  const merged: NewsItem[] = [];
  const seen = new Set<string>();
  for (const it of [...fromApi, ...fromGoogle]) {
    if (!it.title || !it.link) continue;
    if (seen.has(it.title)) continue;
    seen.add(it.title);
    merged.push(it);
  }

  if (merged.length < limit && market === "US") {
    try {
      const fallback = await fetchYahooFinance(ticker, limit - merged.length);
      for (const it of fallback) {
        if (!it.title || !it.link || seen.has(it.title)) continue;
        seen.add(it.title);
        merged.push(it);
      }
    } catch {
      // ignore
    }
  }

  merged.sort((a, b) => timeOf(b.pubDate) - timeOf(a.pubDate));
  return merged.slice(0, limit);
}
