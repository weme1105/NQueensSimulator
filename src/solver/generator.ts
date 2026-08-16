import { SolverEngine } from './engine';
import { CellState, type BoardSnapshot } from './types';

export interface GeneratedPuzzle {
  board: BoardSnapshot;
  attempts: number;
}

export function generateUniquePuzzle(size: number, maxAttempts = 150): GeneratedPuzzle | null {
  if (size < 4 || size > 12) throw new Error('隨機唯一題目只支援 4×4 到 12×12。');

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const queens = randomQueenLayout(size);
    if (!queens) continue;
    const board = growConnectedRegions(size, queens);
    if (!board) continue;
    if (new SolverEngine(board).countSolutions(2) === 1) return { board, attempts: attempt };
  }
  return null;
}

function randomQueenLayout(size: number): number[] | null {
  const base = Array.from({ length: size }, (_, i) => i);
  for (let attempt = 0; attempt < 5000; attempt++) {
    const cols = shuffle(base);
    let ok = true;
    for (let row = 1; row < size; row++) {
      if (Math.abs(cols[row] - cols[row - 1]) <= 1) { ok = false; break; }
    }
    if (ok) return cols;
  }
  return null;
}

function growConnectedRegions(size: number, queens: readonly number[]): BoardSnapshot | null {
  const regions = Array.from({ length: size }, () => new Int16Array(size).fill(-1));
  const frontier = new Set<number>();
  const key = (row: number, col: number) => row * size + col;

  const addFrontier = (row: number, col: number) => {
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const rr = row + dr, cc = col + dc;
      if (rr >= 0 && cc >= 0 && rr < size && cc < size && regions[rr][cc] < 0) frontier.add(key(rr, cc));
    }
  };

  for (let region = 0; region < size; region++) regions[region][queens[region]] = region;
  for (let region = 0; region < size; region++) addFrontier(region, queens[region]);

  let remaining = size * size - size;
  while (remaining > 0) {
    const choices: Array<[number, number, number]> = [];
    for (const encoded of frontier) {
      const row = Math.floor(encoded / size), col = encoded % size;
      if (regions[row][col] >= 0) { frontier.delete(encoded); continue; }
      const adjacentRegions = new Set<number>();
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const rr = row + dr, cc = col + dc;
        if (rr >= 0 && cc >= 0 && rr < size && cc < size && regions[rr][cc] >= 0) adjacentRegions.add(regions[rr][cc]);
      }
      for (const region of adjacentRegions) choices.push([row, col, region]);
    }
    if (!choices.length) return null;
    const [row, col, region] = choices[Math.floor(Math.random() * choices.length)];
    regions[row][col] = region;
    frontier.delete(key(row, col));
    addFrontier(row, col);
    remaining--;
  }

  const cells = [];
  for (let row = 0; row < size; row++) for (let col = 0; col < size; col++) {
    cells.push({ row, col, regionId: regions[row][col], state: CellState.Empty });
  }
  return { size, cells };
}

function shuffle<T>(items: readonly T[]): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
