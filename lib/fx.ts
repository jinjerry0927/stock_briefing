import { db } from "@/lib/db";

export type FxRate = {
  pair: "USD/KRW";
  rate: number;
  source: string;
  cached: boolean;
  fetchedAt: string | null;
  error?: string;
};

type SettingRow = {
  value: string;
  updated_at: string;
};

function readCachedUsdKrw(error?: string): FxRate | null {
  const row = db
    .prepare("SELECT value, updated_at FROM settings WHERE key = ?")
    .get("fx:USD/KRW") as SettingRow | undefined;
  if (!row) return null;
  const parsed = JSON.parse(row.value) as { rate: number; source: string };
  return {
    pair: "USD/KRW",
    rate: parsed.rate,
    source: parsed.source,
    cached: true,
    fetchedAt: row.updated_at,
    error,
  };
}

function writeCachedUsdKrw(rate: number, source: string) {
  db.prepare(
    `INSERT INTO settings (key, value, updated_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).run("fx:USD/KRW", JSON.stringify({ rate, source }));
}

export async function getUsdKrw(): Promise<FxRate> {
  try {
    const res = await fetch("https://query1.finance.yahoo.com/v8/finance/chart/KRW=X", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Yahoo FX ${res.status}`);
    const json = await res.json();
    const rate = Number(json?.chart?.result?.[0]?.meta?.regularMarketPrice);
    if (!Number.isFinite(rate) || rate <= 0) throw new Error("Yahoo FX no rate");

    writeCachedUsdKrw(rate, "Yahoo Finance");
    return {
      pair: "USD/KRW",
      rate,
      source: "Yahoo Finance",
      cached: false,
      fetchedAt: new Date().toISOString(),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const cached = readCachedUsdKrw(msg);
    if (cached) return cached;
    return {
      pair: "USD/KRW",
      rate: 1300,
      source: "fallback",
      cached: true,
      fetchedAt: null,
      error: msg,
    };
  }
}
