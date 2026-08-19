import type { PlayerProgress } from '../../../application/progress/PlayerProgress';
import type { ProgressRepository } from '../../../application/progress/ProgressRepository';

const DEFAULT_KEY = 'nq.player-progress';

/** Web-only persistence adapter. Application code depends only on ProgressRepository. */
export class LocalStorageProgressRepository implements ProgressRepository {
  constructor(
    private readonly storage: Storage = window.localStorage,
    private readonly key: string = DEFAULT_KEY,
  ) {}

  async load(): Promise<PlayerProgress | null> {
    const raw = this.storage.getItem(this.key);
    if (!raw) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      return isPlayerProgress(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  async save(progress: PlayerProgress): Promise<void> {
    this.storage.setItem(this.key, JSON.stringify(progress));
  }

  async clear(): Promise<void> {
    this.storage.removeItem(this.key);
  }
}

function isPlayerProgress(value: unknown): value is PlayerProgress {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<PlayerProgress>;
  return candidate.schemaVersion === 1
    && !!candidate.identity
    && !!candidate.tutorial
    && Array.isArray(candidate.levels)
    && !!candidate.statistics
    && Array.isArray(candidate.inventory)
    && !!candidate.dailyReward
    && Array.isArray(candidate.completedResults)
    && typeof candidate.createdAt === 'string'
    && typeof candidate.updatedAt === 'string';
}
