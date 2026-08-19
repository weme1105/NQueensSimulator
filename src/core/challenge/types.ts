import type { BoardSnapshot } from '../board/types';

export type ChallengeId = string;
export type ChallengeKind = 'daily-ranked' | 'timed-single' | 'queen-rush' | 'special';
export type ChallengeAttemptKind = 'ranked' | 'practice';

export type BoardModifier =
  | { type: 'blocked-cells'; cells: Array<{ row: number; col: number }> }
  | { type: 'uncolored-cells'; cells: Array<{ row: number; col: number }> }
  | { type: 'preset-queens'; cells: Array<{ row: number; col: number }> };

export interface ChallengeDefinition {
  id: ChallengeId;
  kind: ChallengeKind;
  board?: BoardSnapshot;
  boardModifiers?: BoardModifier[];
  timeLimitMs?: number;
  rankedAssistAllowed: boolean;
}

export interface ChallengeAttempt {
  challengeId: ChallengeId;
  attemptKind: ChallengeAttemptKind;
  startedAt: string;
  completedAt?: string;
  failed: boolean;
  assistUsed: boolean;
}

export interface DailyChallengeState {
  challengeId: ChallengeId;
  rankedAttemptUsed: boolean;
  rankedCompleted: boolean;
  practiceUnlocked: boolean;
}
