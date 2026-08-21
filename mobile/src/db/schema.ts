import type { SQLiteDatabase } from 'expo-sqlite';

const DB_VERSION = 5;

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;

  if (currentVersion < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        ballpark TEXT NOT NULL,
        opponent TEXT NOT NULL,
        home_away TEXT NOT NULL CHECK (home_away IN ('HOME', 'AWAY')),
        my_score INTEGER,
        opponent_score INTEGER,
        seat TEXT,
        memo TEXT,
        photo_uris TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_records_date ON records(date);`);
    await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_records_opponent ON records(opponent);`);
  }

  if (currentVersion < 2) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  }

  if (currentVersion < 3) {
    await db.execAsync(`ALTER TABLE records ADD COLUMN ticket_price INTEGER;`);
    await db.execAsync(`ALTER TABLE records ADD COLUMN transport_cost INTEGER;`);
    await db.execAsync(`ALTER TABLE records ADD COLUMN food_cost INTEGER;`);
  }

  // 버전 체크와 무관하게 항상 companion 컬럼 존재를 보장
  const cols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(records)');
  if (!cols.find((c) => c.name === 'companion')) {
    await db.execAsync(`ALTER TABLE records ADD COLUMN companion TEXT;`);
  }

  if (currentVersion < DB_VERSION) {
    await db.execAsync(`PRAGMA user_version = ${DB_VERSION}`);
  }
}
