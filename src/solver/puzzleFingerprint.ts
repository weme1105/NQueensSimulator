export interface PuzzleFingerprint {
  region: string;
  solution: string;
  symmetry: string;
  regionSizeHistogram: string;
  regionAdjacency: string;
  rowTransitions: string;
  columnTransitions: string;
}

/**
 * Analysis-only fingerprints. They never participate in puzzle validity or
 * solver semantics; they are used to measure structural diversity in banks.
 */
export function fingerprintPuzzle(regions: readonly number[], size: number, solution: readonly number[]): PuzzleFingerprint {
  validate(regions, size);
  if (solution.length !== size) throw new Error('Solution length must equal board size.');

  return {
    region: canonicalRegionFingerprint(regions, size),
    solution: solution.join(','),
    symmetry: canonicalSymmetryFingerprint(regions, size),
    regionSizeHistogram: regionSizeHistogram(regions, size),
    regionAdjacency: regionAdjacencyFingerprint(regions, size),
    rowTransitions: transitionFingerprint(regions, size, false),
    columnTransitions: transitionFingerprint(regions, size, true),
  };
}

export function canonicalRegionFingerprint(regions: readonly number[], size: number): string {
  validate(regions, size);
  return canonicalize(regions).join(',');
}

export function canonicalSymmetryFingerprint(regions: readonly number[], size: number): string {
  validate(regions, size);
  const candidates: string[] = [];
  for (let rotation = 0; rotation < 4; rotation++) {
    const rotated = transform(regions, size, rotation, false);
    candidates.push(canonicalize(rotated).join(','));
    candidates.push(canonicalize(transform(rotated, size, 0, true)).join(','));
  }
  candidates.sort();
  return candidates[0];
}

function regionSizeHistogram(regions: readonly number[], size: number): string {
  const counts = Array<number>(size).fill(0);
  for (const region of regions) {
    if (region >= 0 && region < size) counts[region]++;
  }
  return counts.sort((a, b) => a - b).join(',');
}

function regionAdjacencyFingerprint(regions: readonly number[], size: number): string {
  const edges = new Set<string>();
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const current = regions[row * size + col];
      if (col + 1 < size) addEdge(edges, current, regions[row * size + col + 1]);
      if (row + 1 < size) addEdge(edges, current, regions[(row + 1) * size + col]);
    }
  }
  return [...edges].sort().join('|');
}

function transitionFingerprint(regions: readonly number[], size: number, byColumn: boolean): string {
  const counts = Array<number>(size).fill(0);
  for (let line = 0; line < size; line++) {
    let transitions = 0;
    for (let offset = 1; offset < size; offset++) {
      const a = byColumn ? regions[(offset - 1) * size + line] : regions[line * size + offset - 1];
      const b = byColumn ? regions[offset * size + line] : regions[line * size + offset];
      if (a !== b) transitions++;
    }
    counts[line] = transitions;
  }
  return counts.join(',');
}

function addEdge(edges: Set<string>, a: number, b: number): void {
  if (a === b || a < 0 || b < 0) return;
  const low = Math.min(a, b);
  const high = Math.max(a, b);
  edges.add(`${low}-${high}`);
}

function transform(regions: readonly number[], size: number, rotation: number, reflect: boolean): number[] {
  const result = Array<number>(regions.length).fill(-1);
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      let r = row;
      let c = col;
      if (reflect) c = size - 1 - c;
      for (let i = 0; i < rotation; i++) [r, c] = [c, size - 1 - r];
      result[r * size + c] = regions[row * size + col];
    }
  }
  return result;
}

function canonicalize(regions: readonly number[]): number[] {
  const mapping = new Map<number, number>();
  const result = Array<number>(regions.length);
  let next = 0;
  for (let index = 0; index < regions.length; index++) {
    const old = regions[index];
    let canonical = mapping.get(old);
    if (canonical === undefined) {
      canonical = next++;
      mapping.set(old, canonical);
    }
    result[index] = canonical;
  }
  return result;
}

function validate(regions: readonly number[], size: number): void {
  if (!Number.isInteger(size) || size < 1) throw new Error('Invalid board size.');
  if (regions.length !== size * size) throw new Error('Region array length must equal size².');
}
