import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCachedNews, getCachedQuote, listHoldings, listWatchlist } from "@/lib/market-data";

const QuerySchema = z.object({
  name: z.string().trim().max(100).optional(),
});

export async function GET(
  req: NextRequest,
  ctx: RouteContext<"/api/stocks/[market]/[ticker]">
) {
  const { market, ticker } = await ctx.params;
  if (market !== "KR" && market !== "US") {
    return NextResponse.json({ error: "invalid_market" }, { status: 400 });
  }

  const normalizedTicker = ticker.toUpperCase();
  const parsed = QuerySchema.safeParse({
    name: req.nextUrl.searchParams.get("name") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const nameFromQuery = parsed.data.name || normalizedTicker;

  try {
    const [quote, news] = await Promise.all([
      getCachedQuote(market, normalizedTicker),
      getCachedNews(market, normalizedTicker, nameFromQuery),
    ]);
    const watchlistItem =
      listWatchlist().find(
        (item) => item.market === market && item.ticker === normalizedTicker
      ) ?? null;
    const holding =
      listHoldings().find(
        (item) => item.market === market && item.ticker === normalizedTicker
      ) ?? null;

    return NextResponse.json({
      quote,
      news,
      watchlistItem,
      holding,
      references: {
        tradingView: `https://www.tradingview.com/symbols/${
          market === "KR" ? "KRX" : "NASDAQ"
        }-${normalizedTicker}/`,
        investing: `https://www.investing.com/search/?q=${encodeURIComponent(
          normalizedTicker
        )}`,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("stock_detail_fetch_failed", msg);
    return NextResponse.json({ error: "data_source_failed" }, { status: 502 });
  }
}
