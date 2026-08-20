import type { SQLiteDatabase } from 'expo-sqlite';

const DB_VERSION = 1;

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;
  if (currentVersion >= DB_VERSION) return;

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
      CREATE INDEX IF NOT EXISTS idx_records_date ON records(date);
      CREATE INDEX IF NOT EXISTS idx_records_opponent ON records(opponent);
    `);
  }

  await db.execAsync(`PRAGMA user_version = ${DB_VERSION}`);
}
