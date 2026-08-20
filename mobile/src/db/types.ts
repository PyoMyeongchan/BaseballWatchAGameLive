export type HomeAway = 'HOME' | 'AWAY';
export type GameResult = 'WIN' | 'LOSS' | 'DRAW';

export interface GameRecord {
  id: number;
  date: string; // 'YYYY-MM-DD'
  ballpark: string;
  opponent: string;
  homeAway: HomeAway;
  myScore: number | null;
  opponentScore: number | null;
  seat: string | null;
  memo: string | null;
  photoUris: string[]; // 표/경기장 사진, 1~2장
  createdAt: string;
}

export type GameRecordInput = {
  date: string;
  ballpark: string;
  opponent: string;
  homeAway: HomeAway;
  myScore?: number | null;
  opponentScore?: number | null;
  seat?: string | null;
  memo?: string | null;
  photoUris?: string[];
};

export function getGameResult(
  record: Pick<GameRecord, 'myScore' | 'opponentScore'>
): GameResult | null {
  if (record.myScore == null || record.opponentScore == null) return null;
  if (record.myScore > record.opponentScore) return 'WIN';
  if (record.myScore < record.opponentScore) return 'LOSS';
  return 'DRAW';
}
