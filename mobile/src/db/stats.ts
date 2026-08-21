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

export type CostStats = {
  total: number;
  ticketTotal: number;
  transportTotal: number;
  foodTotal: number;
  recordsWithCost: number;
  average: number;
};

export async function getAvailableYears(db: SQLiteDatabase): Promise<string[]> {
  const rows = await db.getAllAsync<{ year: string }>(
    "SELECT DISTINCT strftime('%Y', date) as year FROM records ORDER BY year DESC"
  );
  return rows.map((r) => r.year);
}

export async function getTotalCount(db: SQLiteDatabase, year?: string | null): Promise<number> {
  const where = year ? `WHERE strftime('%Y', date) = '${year}'` : '';
  const row = await db.getFirstAsync<{ count: number }>(`SELECT COUNT(*) as count FROM records ${where}`);
  return row?.count ?? 0;
}

export async function getTeamStats(db: SQLiteDatabase, year?: string | null): Promise<TeamStat[]> {
  const yearAnd = year ? `AND strftime('%Y', date) = '${year}'` : '';
  const rows = await db.getAllAsync<Omit<TeamStat, 'winRate'>>(`
    SELECT
      opponent,
      COUNT(*) as total,
      SUM(CASE WHEN my_score > opponent_score THEN 1 ELSE 0 END) as wins,
      SUM(CASE WHEN my_score < opponent_score THEN 1 ELSE 0 END) as losses,
      SUM(CASE WHEN my_score = opponent_score THEN 1 ELSE 0 END) as draws
    FROM records
    WHERE my_score IS NOT NULL AND opponent_score IS NOT NULL ${yearAnd}
    GROUP BY opponent
    ORDER BY total DESC
  `);
  return rows.map((row) => ({
    ...row,
    winRate: row.wins + row.losses > 0 ? row.wins / (row.wins + row.losses) : null,
  }));
}

export async function getBallparkStats(db: SQLiteDatabase, year?: string | null): Promise<BallparkStat[]> {
  const where = year ? `WHERE strftime('%Y', date) = '${year}'` : '';
  return db.getAllAsync<BallparkStat>(`
    SELECT ballpark, COUNT(*) as count
    FROM records
    ${where}
    GROUP BY ballpark
    ORDER BY count DESC
  `);
}

export async function getMonthlyStats(db: SQLiteDatabase, year?: string | null): Promise<MonthlyStat[]> {
  const where = year ? `WHERE strftime('%Y', date) = '${year}'` : '';
  return db.getAllAsync<MonthlyStat>(`
    SELECT strftime('%Y-%m', date) as month, COUNT(*) as count
    FROM records
    ${where}
    GROUP BY month
    ORDER BY month ASC
  `);
}

export async function getCostStats(db: SQLiteDatabase, year?: string | null): Promise<CostStats> {
  const where = year ? `WHERE strftime('%Y', date) = '${year}'` : '';
  const row = await db.getFirstAsync<{
    total: number;
    ticket_total: number;
    transport_total: number;
    food_total: number;
    records_with_cost: number;
  }>(`
    SELECT
      COALESCE(SUM(COALESCE(ticket_price, 0) + COALESCE(transport_cost, 0) + COALESCE(food_cost, 0)), 0) AS total,
      COALESCE(SUM(ticket_price), 0) AS ticket_total,
      COALESCE(SUM(transport_cost), 0) AS transport_total,
      COALESCE(SUM(food_cost), 0) AS food_total,
      COUNT(CASE WHEN ticket_price IS NOT NULL OR transport_cost IS NOT NULL OR food_cost IS NOT NULL THEN 1 END) AS records_with_cost
    FROM records
    ${where}
  `);

  const total = row?.total ?? 0;
  const count = row?.records_with_cost ?? 0;

  return {
    total,
    ticketTotal: row?.ticket_total ?? 0,
    transportTotal: row?.transport_total ?? 0,
    foodTotal: row?.food_total ?? 0,
    recordsWithCost: count,
    average: count > 0 ? Math.round(total / count) : 0,
  };
}
