import type { CompletedGameResult, GameMode, ScoreVersion } from '../../core/scoring/types';

export type LeaderboardPeriod = 'daily' | 'weekly' | 'all-time';

export interface LeaderboardQuery {
  mode: GameMode;
  period: LeaderboardPeriod;
  levelId?: string;
  difficulty?: string;
  scoreVersion?: ScoreVersion;
  limit?: number;
  aroundPlayerId?: string;
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  displayName: string;
  score: number;
  scoreVersion: ScoreVersion;
  moves: number;
  elapsedMs: number;
  completedAt: string;
}

export interface LeaderboardPage {
  entries: LeaderboardEntry[];
  totalPlayers?: number;
  playerEntry?: LeaderboardEntry;
}

/**
 * Global ranking boundary. A Web/App adapter can later implement this with a backend.
 * Local progress remains usable even when this service is unavailable.
 */
export interface LeaderboardRepository {
  submit(result: CompletedGameResult): Promise<void>;
  query(request: LeaderboardQuery): Promise<LeaderboardPage>;
}
