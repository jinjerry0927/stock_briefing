import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const PatchSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  quantity: z.coerce.number().min(0).optional(),
  averageCost: z.coerce.number().min(0).optional(),
  currency: z.enum(["KRW", "USD"]).optional(),
  note: z.string().max(500).optional().nullable(),
});

function parseId(id: string) {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function PATCH(
  req: NextRequest,
  ctx: RouteContext<"/api/portfolio/[id]">
) {
  const { id } = await ctx.params;
  const n = parseId(id);
  if (!n) return NextResponse.json({ error: "invalid_id" }, { status: 400 });

  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const current = db.prepare("SELECT * FROM holdings WHERE id = ?").get(n) as
    | {
        name: string;
        quantity: number;
        average_cost: number;
        currency: "KRW" | "USD";
        note: string | null;
      }
    | undefined;
  if (!current) return NextResponse.json({ error: "not_found" }, { status: 404 });

  db.prepare(
    `UPDATE holdings
     SET name = ?, quantity = ?, average_cost = ?, currency = ?, note = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    parsed.data.name ?? current.name,
    parsed.data.quantity ?? current.quantity,
    parsed.data.averageCost ?? current.average_cost,
    parsed.data.currency ?? current.currency,
    "note" in parsed.data ? parsed.data.note ?? null : current.note,
    n
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  ctx: RouteContext<"/api/portfolio/[id]">
) {
  const { id } = await ctx.params;
  const n = parseId(id);
  if (!n) return NextResponse.json({ error: "invalid_id" }, { status: 400 });

  const info = db.prepare("DELETE FROM holdings WHERE id = ?").run(n);
  if (info.changes === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
