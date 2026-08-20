import type { SQLiteDatabase } from 'expo-sqlite';

export type TeamStat = {
  opponent: string;
  total: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number | null; // wins / (wins + losses), decided games only
};

export type BallparkStat = {
  ballpark: string;
  count: number;
};

export type MonthlyStat = {
  month: string; // 'YYYY-MM'
  count: number;
};

export async function getTotalCount(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM records');
  return row?.count ?? 0;
}

export async function getTeamStats(db: SQLiteDatabase): Promise<TeamStat[]> {
  const rows = await db.getAllAsync<Omit<TeamStat, 'winRate'>>(`
    SELECT
      opponent,
      COUNT(*) as total,
      SUM(CASE WHEN my_score > opponent_score THEN 1 ELSE 0 END) as wins,
      SUM(CASE WHEN my_score < opponent_score THEN 1 ELSE 0 END) as losses,
      SUM(CASE WHEN my_score = opponent_score THEN 1 ELSE 0 END) as draws
    FROM records
    WHERE my_score IS NOT NULL AND opponent_score IS NOT NULL
    GROUP BY opponent
    ORDER BY total DESC
  `);
  return rows.map((row) => ({
    ...row,
    winRate: row.wins + row.losses > 0 ? row.wins / (row.wins + row.losses) : null,
  }));
}

export async function getBallparkStats(db: SQLiteDatabase): Promise<BallparkStat[]> {
  return db.getAllAsync<BallparkStat>(`
    SELECT ballpark, COUNT(*) as count
    FROM records
    GROUP BY ballpark
    ORDER BY count DESC
  `);
}

export async function getMonthlyStats(db: SQLiteDatabase): Promise<MonthlyStat[]> {
  return db.getAllAsync<MonthlyStat>(`
    SELECT strftime('%Y-%m', date) as month, COUNT(*) as count
    FROM records
    GROUP BY month
    ORDER BY month ASC
  `);
}
