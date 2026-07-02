import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const dbPath = path.join(DATA_DIR, "stocks.db");

declare global {
  var __db: Database.Database | undefined;
}

export const db = global.__db ?? new Database(dbPath);

function hasColumn(table: string, column: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return rows.some((row) => row.name === column);
}

function addColumn(table: string, column: string, definition: string) {
  if (!hasColumn(table, column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

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

    CREATE TABLE IF NOT EXISTS holdings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      market TEXT NOT NULL CHECK(market IN ('KR','US')),
      ticker TEXT NOT NULL,
      name TEXT NOT NULL,
      quantity REAL NOT NULL CHECK(quantity >= 0),
      average_cost REAL NOT NULL CHECK(average_cost >= 0),
      currency TEXT NOT NULL CHECK(currency IN ('KRW','USD')),
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(market, ticker)
    );

    CREATE TABLE IF NOT EXISTS quote_cache (
      market TEXT NOT NULL CHECK(market IN ('KR','US')),
      ticker TEXT NOT NULL,
      payload TEXT NOT NULL,
      fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (market, ticker)
    );

    CREATE TABLE IF NOT EXISTS news_cache (
      market TEXT NOT NULL CHECK(market IN ('KR','US')),
      ticker TEXT NOT NULL,
      payload TEXT NOT NULL,
      fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (market, ticker)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS briefings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  addColumn("watchlist", "tags", "TEXT NOT NULL DEFAULT ''");
  addColumn("watchlist", "display_order", "INTEGER NOT NULL DEFAULT 0");
  addColumn("watchlist", "updated_at", "TEXT");

  global.__db = db;
}

export type Market = "KR" | "US";
export type Currency = "KRW" | "USD";

export type WatchlistItem = {
  id: number;
  market: Market;
  ticker: string;
  name: string;
  note: string | null;
  tags: string;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type Holding = {
  id: number;
  market: Market;
  ticker: string;
  name: string;
  quantity: number;
  average_cost: number;
  currency: Currency;
  note: string | null;
  created_at: string;
  updated_at: string;
};
