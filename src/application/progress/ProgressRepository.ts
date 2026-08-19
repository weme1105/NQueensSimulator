import type { PlayerProgress } from './PlayerProgress';

export interface ProgressRepository {
  load(): Promise<PlayerProgress | null>;
  save(progress: PlayerProgress): Promise<void>;
  clear(): Promise<void>;
}

export interface ProgressSyncRepository {
  loadRemote(userId: string): Promise<PlayerProgress | null>;
  saveRemote(userId: string, progress: PlayerProgress): Promise<void>;
}

export type ProgressMergeStrategy = 'prefer-local' | 'prefer-remote' | 'merge-best-results';
