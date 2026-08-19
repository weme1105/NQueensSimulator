import type { CompletedGameResult, GameMode, ScoreVersion } from '../../core/scoring/types';

export type LeaderboardPeriod = 'daily' | 'weekly' | 'all-time';

export interface LeaderboardQuery {
  mode: GameMode;
  period: LeaderboardPeriod;
  levelId?: string;
  difficulty?: string;
  scoreVersion?: ScoreVersion;
  limit?: number;
  aroundUserId?: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
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
 * A score is globally rankable only when it was earned by an authenticated user.
 * Anonymous/local scores remain part of PlayerProgress but are never retroactively
 * submitted to the global leaderboard after login.
 */
export interface AuthenticatedScoreSubmission {
  userId: string;
  result: CompletedGameResult;
}

/**
 * Global ranking boundary. A Web/App adapter can later implement this with a backend.
 * Local progress remains usable even when this service is unavailable.
 */
export interface LeaderboardRepository {
  submit(submission: AuthenticatedScoreSubmission): Promise<void>;
  query(request: LeaderboardQuery): Promise<LeaderboardPage>;
}
