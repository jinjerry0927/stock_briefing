import { NextResponse } from "next/server";
import { getCachedQuote } from "@/lib/market-data";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/quote/[market]/[ticker]">
) {
  const { market, ticker } = await ctx.params;
  if (market !== "KR" && market !== "US") {
    return NextResponse.json({ error: "invalid_market" }, { status: 400 });
  }

  try {
    const quote = await getCachedQuote(market, ticker);
    return NextResponse.json(quote);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("quote_fetch_failed", msg);
    return NextResponse.json({ error: "data_source_failed" }, { status: 502 });
  }
}
