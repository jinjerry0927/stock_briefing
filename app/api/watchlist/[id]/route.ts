import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function DELETE(
  _req: Request,
  ctx: RouteContext<"/api/watchlist/[id]">
) {
  const { id } = await ctx.params;
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }
  const info = db.prepare("DELETE FROM watchlist WHERE id = ?").run(n);
  if (info.changes === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
