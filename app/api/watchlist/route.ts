import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db, type WatchlistItem } from "@/lib/db";

const PostSchema = z.object({
  market: z.enum(["KR", "US"]),
  ticker: z
    .string()
    .min(1)
    .max(16)
    .transform((s) => s.trim().toUpperCase()),
  name: z.string().min(1).max(100),
  note: z.string().max(500).optional().nullable(),
});

export async function GET() {
  const rows = db
    .prepare(
      "SELECT id, market, ticker, name, note, created_at FROM watchlist ORDER BY market, ticker"
    )
    .all() as WatchlistItem[];
  return NextResponse.json({ items: rows });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { market, ticker, name, note } = parsed.data;
  try {
    const stmt = db.prepare(
      "INSERT INTO watchlist (market, ticker, name, note) VALUES (?, ?, ?, ?)"
    );
    const info = stmt.run(market, ticker, name, note ?? null);
    return NextResponse.json({ id: info.lastInsertRowid }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("UNIQUE")) {
      return NextResponse.json({ error: "duplicate" }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
