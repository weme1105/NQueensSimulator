import type { CompletedGameResult } from '../../core/scoring/types';

export type AnonymousPlayerId = string;
export type AuthenticatedUserId = string;

export type PlayerIdentity =
  | { kind: 'anonymous'; playerId: AnonymousPlayerId }
  | { kind: 'authenticated'; playerId: AnonymousPlayerId; userId: AuthenticatedUserId };

export interface TutorialProgress {
  completedLevelIds: string[];
  skipped: boolean;
}

export interface LevelProgressEntry {
  levelId: string;
  completed: boolean;
  bestMoves?: number;
  bestTimeMs?: number;
  bestScore?: number;
  scoreVersion?: number;
  hintsUsed?: number;
  completedAt?: string;
}

export interface PlayerStatistics {
  gamesStarted: number;
  gamesCompleted: number;
  hintsUsed: number;
  currentStreak: number;
  bestStreak: number;
  totalScore: number;
  bestSingleGameScore: number;
}

export interface PlayerProgress {
  schemaVersion: 1;
  identity: PlayerIdentity;
  tutorial: TutorialProgress;
  levels: LevelProgressEntry[];
  statistics: PlayerStatistics;
  /** Local-first score history. Can be associated with an account after login. */
  completedResults: CompletedGameResult[];
  createdAt: string;
  updatedAt: string;
}

export function createAnonymousProgress(playerId: AnonymousPlayerId, nowIso = new Date().toISOString()): PlayerProgress {
  return {
    schemaVersion: 1,
    identity: { kind: 'anonymous', playerId },
    tutorial: { completedLevelIds: [], skipped: false },
    levels: [],
    statistics: {
      gamesStarted: 0,
      gamesCompleted: 0,
      hintsUsed: 0,
      currentStreak: 0,
      bestStreak: 0,
      totalScore: 0,
      bestSingleGameScore: 0,
    },
    completedResults: [],
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export function linkProgressToUser(progress: PlayerProgress, userId: AuthenticatedUserId, nowIso = new Date().toISOString()): PlayerProgress {
  return {
    ...progress,
    identity: { kind: 'authenticated', playerId: progress.identity.playerId, userId },
    updatedAt: nowIso,
  };
}
