import type { RegionColorRepository } from '../../../application/settings/RegionColorSettings';

const DEFAULT_KEY = 'nq-region-colors-v1';

export class LocalStorageRegionColorRepository implements RegionColorRepository {
  constructor(
    private readonly storage: Storage = window.localStorage,
    private readonly key: string = DEFAULT_KEY,
  ) {}

  async load(): Promise<string[] | null> {
    const raw = this.storage.getItem(this.key);
    if (!raw) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : null;
    } catch {
      return null;
    }
  }

  async save(colors: readonly string[]): Promise<void> {
    this.storage.setItem(this.key, JSON.stringify(colors));
  }
}
