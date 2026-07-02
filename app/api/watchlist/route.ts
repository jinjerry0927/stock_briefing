import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { listWatchlist } from "@/lib/market-data";

const WatchlistSchema = z.object({
  market: z.enum(["KR", "US"]),
  ticker: z
    .string()
    .min(1)
    .max(16)
    .transform((s) => s.trim().toUpperCase()),
  name: z.string().trim().min(1).max(100),
  note: z.string().max(500).optional().nullable(),
  tags: z.string().max(200).optional().default(""),
});

export async function GET() {
  return NextResponse.json({ items: listWatchlist() });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = WatchlistSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { market, ticker, name, note, tags } = parsed.data;
  const nextOrder = db
    .prepare("SELECT COALESCE(MAX(display_order), 0) + 1 AS value FROM watchlist")
    .get() as { value: number };

  try {
    const info = db
      .prepare(
        `INSERT INTO watchlist (market, ticker, name, note, tags, display_order, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
      )
      .run(market, ticker, name, note ?? null, tags, nextOrder.value);
    return NextResponse.json({ id: info.lastInsertRowid }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("UNIQUE")) {
      return NextResponse.json({ error: "duplicate" }, { status: 409 });
    }
    console.error("watchlist_create_failed", msg);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
