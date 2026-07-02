import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getPriceHistory } from "@/lib/stocks";

const QuerySchema = z.object({
  range: z.enum(["1mo", "3mo", "6mo", "1y"]).default("3mo"),
  interval: z.enum(["1d"]).default("1d"),
});

export async function GET(
  req: NextRequest,
  ctx: RouteContext<"/api/chart/[market]/[ticker]">
) {
  const { market, ticker } = await ctx.params;
  if (market !== "KR" && market !== "US") {
    return NextResponse.json({ error: "invalid_market" }, { status: 400 });
  }

  const parsed = QuerySchema.safeParse({
    range: req.nextUrl.searchParams.get("range") ?? undefined,
    interval: req.nextUrl.searchParams.get("interval") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const chart = await getPriceHistory(market, ticker, parsed.data.range, parsed.data.interval);
    return NextResponse.json(chart);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("chart_fetch_failed", msg);
    return NextResponse.json({ error: "data_source_failed" }, { status: 502 });
  }
}
