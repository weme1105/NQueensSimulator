import { countSolutionsBitmask } from './solutionCounter';
import { CellState, type BoardSnapshot } from './types';

export interface ColorFirstPuzzle {
  board: BoardSnapshot;
  solution: number[];
  attempts: number;
}

export interface ColorFirstGenerationOptions {
  maxAttempts?: number;
  maxSolutions?: number;
}

/**
 * Generates the region/color map first. No queen position is used during
 * generation. A candidate is accepted only after the existing solver finds
 * exactly one legal queen placement.
 */
export function generateColorFirstPuzzle(
  size: number,
  options: ColorFirstGenerationOptions = {},
): ColorFirstPuzzle | null {
  if (size < 4 || size > 12) throw new Error('色塊唯一題目只支援 4×4 到 12×12。');

  const maxAttempts = Math.max(0, Math.floor(options.maxAttempts ?? 1000));
  const maxSolutions = Math.max(2, Math.floor(options.maxSolutions ?? 2));

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const regions = randomConnectedPartition(size);
    if (!regions) continue;

    const board = boardFromRegions(regions, size);
    const count = countSolutionsBitmask(board, maxSolutions);
    if (count !== 1) continue;

    const solution = findUniqueSolution(board);
    if (solution) return { board, solution, attempts: attempt };
  }

  return null;
}

export function findUniqueSolution(board: BoardSnapshot): number[] | null {
  const size = board.size;
  const cells = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ regionId: -1, state: CellState.Empty })),
  );
  for (const cell of board.cells) {
    if (cell.row < 0 || cell.col < 0 || cell.row >= size || cell.col >= size) continue;
    cells[cell.row][cell.col] = { regionId: cell.regionId, state: cell.state };
  }

  const answer = Array<number>(size).fill(-1);
  const search = (row: number, usedColumns: number, usedRegions: number, previousColumn: number): boolean => {
    if (row === size) return true;
    for (let col = 0; col < size; col++) {
      const region = cells[row][col].regionId;
      if (region < 0 || region >= size) continue;
      if (usedColumns & (1 << col)) continue;
      if (usedRegions & (1 << region)) continue;
      if (previousColumn >= 0 && Math.abs(col - previousColumn) <= 1) continue;
      answer[row] = col;
      if (search(row + 1, usedColumns | (1 << col), usedRegions | (1 << region), col)) return true;
    }
    answer[row] = -1;
    return false;
  };

  return search(0, 0, 0, -1) ? answer.slice() : null;
}

function randomConnectedPartition(size: number): number[] | null {
  const total = size * size;
  const regions = Array<number>(total).fill(-1);
  const regionSizes = Array<number>(size).fill(1);
  const seeds = chooseSeparatedSeeds(size);
  const frontier = new Set<number>();

  for (let region = 0; region < size; region++) regions[seeds[region]] = region;
  for (const seed of seeds) addFrontier(seed, size, regions, frontier);

  let remaining = total - size;
  while (remaining > 0) {
    const options: Array<{ cell: number; region: number; score: number }> = [];
    const targetMin = Math.max(1, Math.floor(size * 0.45));
    const targetMax = Math.min(size * 2 + 2, Math.ceil(size * 1.8));

    for (const cell of frontier) {
      if (regions[cell] >= 0) continue;
      const adjacent = new Set<number>();
      for (const neighbor of orthogonalNeighbors(cell, size)) {
        const region = regions[neighbor];
        if (region >= 0) adjacent.add(region);
      }
      for (const region of adjacent) {
        const current = regionSizes[region];
        if (current >= targetMax && remaining > size) continue;
        const balance = current < targetMin ? -8 : current >= targetMax ? 8 : 0;
        const edgePenalty = boundaryExposure(cell, size, regions, region) * 0.25;
        const score = current * 3 + balance + edgePenalty + Math.random() * 3;
        options.push({ cell, region, score });
      }
    }

    if (!options.length) return null;
    options.sort((a, b) => a.score - b.score);
    const pool = options.slice(0, Math.min(options.length, Math.max(16, size * 4)));
    const choice = pool[Math.floor(Math.random() * pool.length)];

    regions[choice.cell] = choice.region;
    regionSizes[choice.region]++;
    frontier.delete(choice.cell);
    addFrontier(choice.cell, size, regions, frontier);
    remaining--;
  }

  return canonicalize(regions);
}

/** Prefer seeds with a little spacing so early growth does not create thin,
 * highly unbalanced regions. This does not impose any solution information. */
function chooseSeparatedSeeds(size: number): number[] {
  const cells = shuffle(Array.from({ length: size * size }, (_, index) => index));
  const selected: number[] = [];
  const minDistance = Math.max(1, Math.floor(size / 3));
  for (const cell of cells) {
    const row = Math.floor(cell / size), col = cell % size;
    if (selected.every((other) => {
      const otherRow = Math.floor(other / size), otherCol = other % size;
      return Math.abs(row - otherRow) + Math.abs(col - otherCol) >= minDistance;
    })) selected.push(cell);
    if (selected.length === size) return selected;
  }
  return cells.slice(0, size);
}

function boundaryExposure(cell: number, size: number, regions: readonly number[], region: number): number {
  let exposure = 0;
  for (const neighbor of orthogonalNeighbors(cell, size)) {
    if (regions[neighbor] >= 0 && regions[neighbor] !== region) exposure++;
  }
  return exposure;
}

function addFrontier(cell: number, size: number, regions: readonly number[], frontier: Set<number>): void {
  for (const neighbor of orthogonalNeighbors(cell, size)) {
    if (regions[neighbor] < 0) frontier.add(neighbor);
  }
}

function orthogonalNeighbors(cell: number, size: number): number[] {
  const row = Math.floor(cell / size);
  const col = cell % size;
  const result: number[] = [];
  if (row > 0) result.push(cell - size);
  if (row + 1 < size) result.push(cell + size);
  if (col > 0) result.push(cell - 1);
  if (col + 1 < size) result.push(cell + 1);
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

function boardFromRegions(regions: readonly number[], size: number): BoardSnapshot {
  return {
    size,
    cells: regions.map((regionId, index) => ({
      row: Math.floor(index / size),
      col: index % size,
      regionId,
      state: CellState.Empty,
    })),
  };
}

function shuffle<T>(items: readonly T[]): T[] {
  const result = items.slice();
  for (let index = result.length - 1; index > 0; index--) {
    const swap = Math.floor(Math.random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}
