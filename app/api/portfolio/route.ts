import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUsdKrw } from "@/lib/fx";
import { listHoldings, valueHolding } from "@/lib/market-data";

const HoldingSchema = z.object({
  market: z.enum(["KR", "US"]),
  ticker: z
    .string()
    .min(1)
    .max(16)
    .transform((s) => s.trim().toUpperCase()),
  name: z.string().trim().min(1).max(100),
  quantity: z.coerce.number().min(0),
  averageCost: z.coerce.number().min(0),
  currency: z.enum(["KRW", "USD"]),
  note: z.string().max(500).optional().nullable(),
});

export async function GET() {
  const [holdings, usdKrw] = await Promise.all([
    Promise.all(listHoldings().map(valueHolding)),
    getUsdKrw(),
  ]);
  const summary = holdings.reduce(
    (acc, item) => {
      const rate = item.currency === "USD" ? usdKrw.rate : 1;
      acc.marketValue += item.marketValue * rate;
      acc.costBasis += item.costBasis * rate;
      acc.unrealizedGain += item.unrealizedGain * rate;
      return acc;
    },
    { marketValue: 0, costBasis: 0, unrealizedGain: 0 }
  );
  const returnPercent =
    summary.costBasis > 0 ? (summary.unrealizedGain / summary.costBasis) * 100 : 0;
  return NextResponse.json({
    items: holdings,
    summary: { ...summary, returnPercent, currency: "KRW" },
    fx: { usdKrw },
  });
}

export async function POST(req: NextRequest) {
  const parsed = HoldingSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { market, ticker, name, quantity, averageCost, currency, note } = parsed.data;
  try {
    const info = db
      .prepare(
        `INSERT INTO holdings
         (market, ticker, name, quantity, average_cost, currency, note, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      )
      .run(market, ticker, name, quantity, averageCost, currency, note ?? null);
    return NextResponse.json({ id: info.lastInsertRowid }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("UNIQUE")) {
      return NextResponse.json({ error: "duplicate" }, { status: 409 });
    }
    console.error("holding_create_failed", msg);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
