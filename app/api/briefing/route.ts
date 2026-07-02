import { NextResponse } from "next/server";
import {
  getCachedQuote,
  listHoldings,
  listWatchlist,
  valueHolding,
  type Cached,
} from "@/lib/market-data";
import type { WatchlistItem } from "@/lib/db";
import type { Quote } from "@/lib/stocks";

type WatchQuoteResult =
  | { item: WatchlistItem; quote: Cached<Quote> }
  | { item: WatchlistItem; error: string };

function hasQuote(entry: WatchQuoteResult): entry is { item: WatchlistItem; quote: Cached<Quote> } {
  return "quote" in entry;
}

export async function GET() {
  const watchlist = listWatchlist();
  const holdings = await Promise.all(listHoldings().map(valueHolding));
  const watchQuotes: WatchQuoteResult[] = await Promise.all(
    watchlist.map(async (item) => {
      try {
        return { item, quote: await getCachedQuote(item.market, item.ticker) };
      } catch (e) {
        return { item, error: e instanceof Error ? e.message : String(e) };
      }
    })
  );

  const movers = watchQuotes
    .filter(hasQuote)
    .sort((a, b) => Math.abs(b.quote.data.changePercent) - Math.abs(a.quote.data.changePercent))
    .slice(0, 3);

  const portfolio = holdings.reduce(
    (acc, item) => {
      acc.marketValue += item.marketValue;
      acc.costBasis += item.costBasis;
      acc.unrealizedGain += item.unrealizedGain;
      if (item.quoteError) acc.failures += 1;
      return acc;
    },
    { marketValue: 0, costBasis: 0, unrealizedGain: 0, failures: 0 }
  );
  const returnPercent =
    portfolio.costBasis > 0 ? (portfolio.unrealizedGain / portfolio.costBasis) * 100 : 0;

  const observations = [
    holdings.length > 0
      ? `보유 ${holdings.length}개 종목의 평가손익은 ${portfolio.unrealizedGain.toLocaleString(
          "ko-KR",
          { maximumFractionDigits: 0 }
        )}원 수준입니다.`
      : "등록된 보유 종목이 없습니다.",
    movers.length > 0
      ? `관심종목 중 변동이 큰 종목은 ${movers
          .map((m) =>
            `${m.item.name} ${m.quote.data.changePercent.toFixed(2)}%`
          )
          .join(", ")}입니다.`
      : "관심종목 시세를 아직 확인하지 못했습니다.",
    portfolio.failures > 0
      ? `${portfolio.failures}개 보유 종목은 최신 시세 확인에 실패했습니다.`
      : "보유 종목 시세 확인이 완료되었습니다.",
  ];

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    summary: { ...portfolio, returnPercent },
    observations,
    movers: movers.map((m) => ({ item: m.item, quote: m.quote.data, cached: m.quote.cached })),
    failures: watchQuotes.filter((entry) => "error" in entry),
  });
}
