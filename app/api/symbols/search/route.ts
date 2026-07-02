import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { searchSymbols } from "@/lib/symbols";

const QuerySchema = z.object({
  q: z.string().trim().min(1).max(60),
  market: z.enum(["KR", "US"]).optional(),
});

export async function GET(req: NextRequest) {
  const parsed = QuerySchema.safeParse({
    q: req.nextUrl.searchParams.get("q") ?? "",
    market: req.nextUrl.searchParams.get("market") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const items = await searchSymbols(parsed.data.q, parsed.data.market);
  return NextResponse.json({ items });
}
