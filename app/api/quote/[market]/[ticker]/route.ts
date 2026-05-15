import { NextResponse } from "next/server";
import { getQuote } from "@/lib/stocks";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/quote/[market]/[ticker]">
) {
  const { market, ticker } = await ctx.params;
  if (market !== "KR" && market !== "US") {
    return NextResponse.json({ error: "invalid_market" }, { status: 400 });
  }
  try {
    const q = await getQuote(market, ticker);
    return NextResponse.json(q);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
