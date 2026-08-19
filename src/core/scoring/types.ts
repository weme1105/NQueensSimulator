import type { AssistUsage } from '../economy/types';

export type ScoreVersion = number;

export type GameMode = 'level' | 'difficulty' | 'custom';

export interface ScoreBreakdown {
  scoreVersion: ScoreVersion;
  baseScore: number;
  difficultyBonus: number;
  timeBonus: number;
  moveBonus: number;
  hintPenalty: number;
  mistakePenalty: number;
  totalScore: number;
}

export interface CompletedGameResult {
  resultId: string;
  playerId: string;
  mode: GameMode;
  levelId?: string;
  puzzleId?: string;
  difficulty?: string;
  moves: number;
  elapsedMs: number;
  hintsUsed: number;
  mistakes: number;
  /** Consumable solver assists used during this game. Kept separate from generic hints for scoring/ranking policy. */
  assistsUsed: AssistUsage[];
  completedAt: string;
  score: ScoreBreakdown;
}

export interface ScoreInput {
  mode: GameMode;
  difficulty?: string;
  moves: number;
  elapsedMs: number;
  hintsUsed: number;
  mistakes: number;
  assistsUsed: AssistUsage[];
}

/**
 * Platform-independent scoring contract.
 * Concrete weights are intentionally versioned so score rules can evolve without
 * making old leaderboard entries ambiguous.
 */
export interface ScorePolicy {
  readonly version: ScoreVersion;
  calculate(input: ScoreInput): ScoreBreakdown;
}
