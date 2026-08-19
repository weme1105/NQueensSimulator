import type { ChallengeAttempt, ChallengeDefinition, ChallengeId, DailyChallengeState } from '../../core/challenge/types';

export interface ChallengeRepository {
  getDailyChallenge(dayKey: string): Promise<ChallengeDefinition>;
  getChallenge(challengeId: ChallengeId): Promise<ChallengeDefinition>;
  loadDailyState(dayKey: string): Promise<DailyChallengeState | null>;
  saveDailyState(dayKey: string, state: DailyChallengeState): Promise<void>;
  saveAttempt(attempt: ChallengeAttempt): Promise<void>;
}
