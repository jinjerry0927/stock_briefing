import { NextResponse } from "next/server";
import { getUsdKrw } from "@/lib/fx";

export async function GET() {
  const usdKrw = await getUsdKrw();
  return NextResponse.json({ usdKrw });
}
