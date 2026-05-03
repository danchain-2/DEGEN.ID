import Database from "better-sqlite3";
import path from "path";
import type { CachedReport, LeaderboardEntry, WalletReport } from "./types";

function getDbPath(): string {
  const isVercel = process.env.VERCEL === "1" || process.env.VERCEL_ENV;
  if (isVercel) return "/tmp/degen-id.sqlite";
  const dataDir = path.join(process.cwd(), ".data");
  return path.join(dataDir, "degen-id.sqlite");
}

function ensureDir(filePath: string): void {
  const dir = path.dirname(filePath);
  try {
    const fs = require("fs") as typeof import("fs");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch {
    // directory may already exist or fs unavailable
  }
}

let dbInstance: Database.Database | null = null;

function getDb(): Database.Database {
  if (dbInstance) return dbInstance;

  const dbPath = getDbPath();
  ensureDir(dbPath);

  dbInstance = new Database(dbPath);
  dbInstance.pragma("journal_mode = WAL");

  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS wallet_reports (
      address TEXT PRIMARY KEY,
      report TEXT NOT NULL,
      win_rate REAL DEFAULT 0,
      total_volume REAL DEFAULT 0,
      degen_index REAL DEFAULT 0,
      diamond_hands REAL DEFAULT 0,
      archetype_emoji TEXT DEFAULT '',
      archetype_name TEXT DEFAULT '',
      archetype_title TEXT DEFAULT '',
      archetype_desc TEXT DEFAULT '',
      demo_mode INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  return dbInstance;
}

function getCacheDuration(): number {
  const env = process.env.CACHE_DURATION_MS;
  return env ? parseInt(env, 10) : 600000;
}

/** Gets a cached wallet report if fresh enough */
export function getCachedReport(address: string): WalletReport | null {
  try {
    const db = getDb();
    const row = db
      .prepare(
        "SELECT report, created_at AS createdAt, updated_at AS updatedAt FROM wallet_reports WHERE address = ?"
      )
      .get(address) as CachedReport | undefined;

    if (!row) return null;

    const age = Date.now() - row.updatedAt;
    if (age > getCacheDuration()) return null;

    return JSON.parse(row.report) as WalletReport;
  } catch {
    return null;
  }
}

/** Caches a wallet report with extracted leaderboard fields */
export function cacheReport(report: WalletReport): void {
  try {
    const db = getDb();
    const now = Date.now();

    const winRate = report.stats.winRate;
    const totalVolume = report.stats.totalVolume;
    const degenIndex =
      report.scores.find((s) => s.label === "Degen Index")?.score ?? 0;
    const diamondHands =
      report.scores.find((s) => s.label === "Diamond Hands Score")?.score ?? 0;

    db.prepare(
      `INSERT INTO wallet_reports 
        (address, report, win_rate, total_volume, degen_index, diamond_hands,
         archetype_emoji, archetype_name, archetype_title, archetype_desc,
         demo_mode, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(address) DO UPDATE SET
        report = excluded.report,
        win_rate = excluded.win_rate,
        total_volume = excluded.total_volume,
        degen_index = excluded.degen_index,
        diamond_hands = excluded.diamond_hands,
        archetype_emoji = excluded.archetype_emoji,
        archetype_name = excluded.archetype_name,
        archetype_title = excluded.archetype_title,
        archetype_desc = excluded.archetype_desc,
        demo_mode = excluded.demo_mode,
        updated_at = excluded.updated_at`
    ).run(
      report.address,
      JSON.stringify(report),
      winRate,
      totalVolume,
      degenIndex,
      diamondHands,
      report.archetype.emoji,
      report.archetype.name,
      report.archetype.title,
      report.archetype.description,
      report.demoMode ? 1 : 0,
      now,
      now
    );
  } catch (err) {
    console.error("Cache write failed:", err);
  }
}

type LeaderboardCategory = "winRate" | "volume" | "degen" | "diamondHands";

const SORT_COLUMNS: Record<LeaderboardCategory, string> = {
  winRate: "win_rate",
  volume: "total_volume",
  degen: "degen_index",
  diamondHands: "diamond_hands",
};

/** Fetches top 10 wallets for a given leaderboard category */
export function getLeaderboard(
  category: LeaderboardCategory
): LeaderboardEntry[] {
  try {
    const db = getDb();
    const col = SORT_COLUMNS[category];
    const rows = db
      .prepare(
        `SELECT address, win_rate, total_volume, degen_index, diamond_hands,
                archetype_emoji, archetype_name, archetype_title, archetype_desc, demo_mode
         FROM wallet_reports
         ORDER BY ${col} DESC
         LIMIT 10`
      )
      .all() as Array<{
        address: string;
        win_rate: number;
        total_volume: number;
        degen_index: number;
        diamond_hands: number;
        archetype_emoji: string;
        archetype_name: string;
        archetype_title: string;
        archetype_desc: string;
        demo_mode: number;
      }>;

    return rows.map((r) => ({
      address: r.address,
      archetype: {
        emoji: r.archetype_emoji,
        name: r.archetype_name,
        title: r.archetype_title,
        description: r.archetype_desc,
      },
      winRate: r.win_rate,
      totalVolume: r.total_volume,
      degenIndex: r.degen_index,
      diamondHandsScore: r.diamond_hands,
      demoMode: r.demo_mode === 1,
    }));
  } catch {
    return [];
  }
}
