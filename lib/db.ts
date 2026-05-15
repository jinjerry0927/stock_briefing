import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const dbPath = path.join(DATA_DIR, "stocks.db");

declare global {
  // eslint-disable-next-line no-var
  var __db: Database.Database | undefined;
}

export const db = global.__db ?? new Database(dbPath);
if (!global.__db) {
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS watchlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      market TEXT NOT NULL CHECK(market IN ('KR','US')),
      ticker TEXT NOT NULL,
      name TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(market, ticker)
    );

    CREATE TABLE IF NOT EXISTS briefings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  global.__db = db;
}

export type WatchlistItem = {
  id: number;
  market: "KR" | "US";
  ticker: string;
  name: string;
  note: string | null;
  created_at: string;
};
