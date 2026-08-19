export const DEFAULT_REGION_COLORS = [
  '#9cc7e8', '#b97a56', '#38a8bb', '#ce6585', '#d6a900',
  '#7d68cf', '#2f8f55', '#85cf72', '#ffd97d', '#e983d3',
  '#64c96d', '#7bb2d8', '#ef8a62', '#9b8ad6', '#5bb7a7',
  '#d77c94', '#6f9fd8', '#a7c957', '#f2a65a', '#8d99ae',
] as const;

export interface RegionColorRepository {
  load(): Promise<string[] | null>;
  save(colors: readonly string[]): Promise<void>;
}

export class RegionColorSettings {
  private colors: string[];

  constructor(initial: readonly string[] = DEFAULT_REGION_COLORS) {
    this.colors = normalizeColors(initial);
  }

  static async load(repository: RegionColorRepository): Promise<RegionColorSettings> {
    const stored = await repository.load();
    return new RegionColorSettings(stored ?? DEFAULT_REGION_COLORS);
  }

  snapshot(size?: number): string[] {
    if (size !== undefined) this.ensureCapacity(size);
    return this.colors.slice();
  }

  colorAt(index: number): string {
    if (index < 0) return DEFAULT_REGION_COLORS[0];
    this.ensureCapacity(index + 1);
    return this.colors[index];
  }

  setColor(index: number, color: string): void {
    if (index < 0) throw new Error(`Invalid color index: ${index}`);
    if (!isHexColor(color)) throw new Error(`Invalid region color: ${color}`);
    this.ensureCapacity(index + 1);
    this.colors[index] = color.toLowerCase();
  }

  reset(): void {
    this.colors = [...DEFAULT_REGION_COLORS];
  }

  async persist(repository: RegionColorRepository): Promise<void> {
    await repository.save(this.colors);
  }

  ensureCapacity(size: number): void {
    while (this.colors.length < size) {
      this.colors.push(DEFAULT_REGION_COLORS[this.colors.length % DEFAULT_REGION_COLORS.length]);
    }
  }
}

function normalizeColors(values: readonly string[]): string[] {
  const result: string[] = [...DEFAULT_REGION_COLORS];
  for (let index = 0; index < values.length; index++) {
    const value = values[index];
    if (!isHexColor(value)) continue;
    while (result.length <= index) {
      result.push(DEFAULT_REGION_COLORS[result.length % DEFAULT_REGION_COLORS.length]);
    }
    result[index] = value.toLowerCase();
  }
  return result;
}

function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
}
