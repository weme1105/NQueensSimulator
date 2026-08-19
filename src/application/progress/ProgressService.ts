import { createAnonymousProgress, linkProgressToUser, type AuthenticatedUserId, type PlayerProgress } from './PlayerProgress';
import type { ProgressRepository } from './ProgressRepository';

export interface PlayerIdFactory {
  create(): string;
}

export interface Clock {
  nowIso(): string;
}

export const systemClock: Clock = {
  nowIso: () => new Date().toISOString(),
};

/** Local-first progress lifecycle independent of browser/native storage. */
export class ProgressService {
  private current: PlayerProgress | null = null;

  constructor(
    private readonly repository: ProgressRepository,
    private readonly playerIds: PlayerIdFactory,
    private readonly clock: Clock = systemClock,
  ) {}

  get progress(): PlayerProgress | null {
    return this.current ? clone(this.current) : null;
  }

  async loadOrCreate(): Promise<PlayerProgress> {
    const existing = await this.repository.load();
    this.current = existing ?? createAnonymousProgress(this.playerIds.create(), this.clock.nowIso());
    if (!existing) await this.repository.save(this.current);
    return clone(this.current);
  }

  async save(progress: PlayerProgress): Promise<PlayerProgress> {
    const next = { ...clone(progress), updatedAt: this.clock.nowIso() };
    this.current = next;
    await this.repository.save(next);
    return clone(next);
  }

  async linkAuthenticatedUser(userId: AuthenticatedUserId): Promise<PlayerProgress> {
    const progress = this.current ?? await this.loadOrCreate();
    const linked = linkProgressToUser(progress, userId, this.clock.nowIso());
    this.current = linked;
    await this.repository.save(linked);
    return clone(linked);
  }

  async clearLocal(): Promise<void> {
    this.current = null;
    await this.repository.clear();
  }
}

function clone<T>(value: T): T {
  return structuredClone(value);
}
