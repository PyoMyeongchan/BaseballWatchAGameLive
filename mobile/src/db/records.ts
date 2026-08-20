import type { SQLiteDatabase } from 'expo-sqlite';

import type { GameRecord, GameRecordInput, HomeAway } from './types';

type RecordRow = {
  id: number;
  date: string;
  ballpark: string;
  opponent: string;
  home_away: HomeAway;
  my_score: number | null;
  opponent_score: number | null;
  seat: string | null;
  memo: string | null;
  photo_uris: string | null;
  created_at: string;
};

function mapRow(row: RecordRow): GameRecord {
  return {
    id: row.id,
    date: row.date,
    ballpark: row.ballpark,
    opponent: row.opponent,
    homeAway: row.home_away,
    myScore: row.my_score,
    opponentScore: row.opponent_score,
    seat: row.seat,
    memo: row.memo,
    photoUris: row.photo_uris ? JSON.parse(row.photo_uris) : [],
    createdAt: row.created_at,
  };
}

export async function insertRecord(db: SQLiteDatabase, input: GameRecordInput): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO records (date, ballpark, opponent, home_away, my_score, opponent_score, seat, memo, photo_uris)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    input.date,
    input.ballpark,
    input.opponent,
    input.homeAway,
    input.myScore ?? null,
    input.opponentScore ?? null,
    input.seat ?? null,
    input.memo ?? null,
    input.photoUris && input.photoUris.length > 0 ? JSON.stringify(input.photoUris) : null
  );
  return result.lastInsertRowId;
}

export async function listRecords(db: SQLiteDatabase): Promise<GameRecord[]> {
  const rows = await db.getAllAsync<RecordRow>('SELECT * FROM records ORDER BY date DESC, id DESC');
  return rows.map(mapRow);
}

export async function getRecord(db: SQLiteDatabase, id: number): Promise<GameRecord | null> {
  const row = await db.getFirstAsync<RecordRow>('SELECT * FROM records WHERE id = ?', id);
  return row ? mapRow(row) : null;
}

export async function updateRecord(
  db: SQLiteDatabase,
  id: number,
  input: GameRecordInput
): Promise<void> {
  await db.runAsync(
    `UPDATE records
     SET date = ?, ballpark = ?, opponent = ?, home_away = ?, my_score = ?, opponent_score = ?, seat = ?, memo = ?, photo_uris = ?
     WHERE id = ?`,
    input.date,
    input.ballpark,
    input.opponent,
    input.homeAway,
    input.myScore ?? null,
    input.opponentScore ?? null,
    input.seat ?? null,
    input.memo ?? null,
    input.photoUris && input.photoUris.length > 0 ? JSON.stringify(input.photoUris) : null,
    id
  );
}

export async function deleteRecord(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM records WHERE id = ?', id);
}
