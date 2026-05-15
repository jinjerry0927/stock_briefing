import { NextResponse, type NextRequest } from "next/server";
import { searchNews } from "@/lib/news";

export async function GET(
  req: NextRequest,
  ctx: RouteContext<"/api/news/[market]/[ticker]">
) {
  const { market, ticker } = await ctx.params;
  if (market !== "KR" && market !== "US") {
    return NextResponse.json({ error: "invalid_market" }, { status: 400 });
  }
  const name = req.nextUrl.searchParams.get("name") ?? ticker;
  try {
    const items = await searchNews(market, ticker, name);
    return NextResponse.json({ items });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
