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

/**
 * Returns the first complete solution. The caller has already established
 * uniqueness, so this is only a reconstruction pass for the saved answer.
 */
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
  const seeds = shuffle(Array.from({ length: total }, (_, index) => index)).slice(0, size);
  const frontier = new Set<number>();

  for (let region = 0; region < size; region++) regions[seeds[region]] = region;
  for (const seed of seeds) addFrontier(seed, size, regions, frontier);

  let remaining = total - size;
  while (remaining > 0) {
    const options: Array<{ cell: number; region: number; score: number }> = [];

    for (const cell of frontier) {
      if (regions[cell] >= 0) continue;
      const adjacent = new Set<number>();
      for (const neighbor of orthogonalNeighbors(cell, size)) {
        const region = regions[neighbor];
        if (region >= 0) adjacent.add(region);
      }
      for (const region of adjacent) {
        // Mild balancing prevents one seed from swallowing most of the board,
        // while the random jitter keeps the bank diverse.
        const score = regionSizes[region] * 2 + Math.random() * 6;
        options.push({ cell, region, score });
      }
    }

    if (!options.length) return null;
    options.sort((a, b) => a.score - b.score);
    const pool = options.slice(0, Math.min(options.length, Math.max(12, size * 3)));
    const choice = pool[Math.floor(Math.random() * pool.length)];

    regions[choice.cell] = choice.region;
    regionSizes[choice.region]++;
    frontier.delete(choice.cell);
    addFrontier(choice.cell, size, regions, frontier);
    remaining--;
  }

  // Canonicalize region IDs so identical partitions reached through different
  // seed labels are treated as the same puzzle during bank de-duplication.
  return canonicalize(regions);
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
