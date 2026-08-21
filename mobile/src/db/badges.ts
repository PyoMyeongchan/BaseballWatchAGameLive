import type { SQLiteDatabase } from 'expo-sqlite';

import { KBO_BALLPARKS } from '@/constants/kbo';

type BadgeStats = {
  total: number;
  uniqueBallparks: number;
  allBallparksVisited: boolean;
  scoredGames: number;
  winRate: number | null;
  maxWinStreak: number;
  activeMonths: number;
  costRecords: number;
  awayGames: number;
};

export type Badge = {
  id: string;
  icon: string;
  title: string;
  description: string;
  unlocked: boolean;
};

const BADGE_DEFS: {
  id: string;
  icon: string;
  title: string;
  description: string;
  check: (s: BadgeStats) => boolean;
}[] = [
  {
    id: 'first_game',
    icon: '⚾',
    title: '첫 직관',
    description: '처음으로 기록을 남겼어요',
    check: (s) => s.total >= 1,
  },
  {
    id: 'ten_games',
    icon: '🎟️',
    title: '단골 관중',
    description: '직관 10회 달성',
    check: (s) => s.total >= 10,
  },
  {
    id: 'thirty_games',
    icon: '🔥',
    title: '열혈 팬',
    description: '직관 30회 달성',
    check: (s) => s.total >= 30,
  },
  {
    id: 'five_parks',
    icon: '🗺️',
    title: '구장 탐험가',
    description: '5개 구장 방문',
    check: (s) => s.uniqueBallparks >= 5,
  },
  {
    id: 'all_parks',
    icon: '🏆',
    title: '전구장 제패',
    description: '모든 KBO 구장 방문',
    check: (s) => s.allBallparksVisited,
  },
  {
    id: 'win_rate',
    icon: '💪',
    title: '승리의 여신',
    description: '직관 승률 60% 이상 (10경기+)',
    check: (s) => s.scoredGames >= 10 && s.winRate !== null && s.winRate >= 0.6,
  },
  {
    id: 'streak_3',
    icon: '⚡',
    title: '연승 행진',
    description: '3연승 달성',
    check: (s) => s.maxWinStreak >= 3,
  },
  {
    id: 'streak_5',
    icon: '👑',
    title: '무적의 팬',
    description: '5연승 달성',
    check: (s) => s.maxWinStreak >= 5,
  },
  {
    id: 'four_months',
    icon: '🌸',
    title: '사계절 팬',
    description: '4개 이상의 달에 직관',
    check: (s) => s.activeMonths >= 4,
  },
  {
    id: 'cost_tracker',
    icon: '💰',
    title: '알뜰 직관러',
    description: '비용을 5회 이상 기록',
    check: (s) => s.costRecords >= 5,
  },
  {
    id: 'away_fan',
    icon: '✈️',
    title: '원정 매니아',
    description: '원정 직관 5회',
    check: (s) => s.awayGames >= 5,
  },
];

async function computeStats(db: SQLiteDatabase): Promise<BadgeStats> {
  const row = await db.getFirstAsync<{
    total: number;
    unique_ballparks: number;
    scored_games: number;
    wins: number;
    losses: number;
    away_games: number;
    active_months: number;
    cost_records: number;
  }>(`
    SELECT
      COUNT(*) AS total,
      COUNT(DISTINCT ballpark) AS unique_ballparks,
      COUNT(CASE WHEN my_score IS NOT NULL AND opponent_score IS NOT NULL THEN 1 END) AS scored_games,
      COUNT(CASE WHEN my_score > opponent_score THEN 1 END) AS wins,
      COUNT(CASE WHEN my_score < opponent_score THEN 1 END) AS losses,
      COUNT(CASE WHEN home_away = 'AWAY' THEN 1 END) AS away_games,
      COUNT(DISTINCT strftime('%Y-%m', date)) AS active_months,
      COUNT(CASE WHEN ticket_price IS NOT NULL OR transport_cost IS NOT NULL OR food_cost IS NOT NULL THEN 1 END) AS cost_records
    FROM records
  `);

  if (!row || row.total === 0) {
    return {
      total: 0,
      uniqueBallparks: 0,
      allBallparksVisited: false,
      scoredGames: 0,
      winRate: null,
      maxWinStreak: 0,
      activeMonths: 0,
      costRecords: 0,
      awayGames: 0,
    };
  }

  const visitedRows = await db.getAllAsync<{ ballpark: string }>(
    'SELECT DISTINCT ballpark FROM records'
  );
  const visited = new Set(visitedRows.map((r) => r.ballpark));
  const allBallparksVisited = KBO_BALLPARKS.every((b) => visited.has(b));

  const wins = row.wins;
  const losses = row.losses;
  const winRate = wins + losses > 0 ? wins / (wins + losses) : null;

  const games = await db.getAllAsync<{ my_score: number; opponent_score: number }>(`
    SELECT my_score, opponent_score
    FROM records
    WHERE my_score IS NOT NULL AND opponent_score IS NOT NULL
    ORDER BY date ASC, id ASC
  `);

  let maxWinStreak = 0;
  let streak = 0;
  for (const g of games) {
    if (g.my_score > g.opponent_score) {
      streak++;
      if (streak > maxWinStreak) maxWinStreak = streak;
    } else {
      streak = 0;
    }
  }

  return {
    total: row.total,
    uniqueBallparks: row.unique_ballparks,
    allBallparksVisited,
    scoredGames: row.scored_games,
    winRate,
    maxWinStreak,
    activeMonths: row.active_months,
    costRecords: row.cost_records,
    awayGames: row.away_games,
  };
}

export async function getBadges(db: SQLiteDatabase): Promise<Badge[]> {
  const stats = await computeStats(db);
  return BADGE_DEFS.map((def) => ({
    id: def.id,
    icon: def.icon,
    title: def.title,
    description: def.description,
    unlocked: def.check(stats),
  }));
}
