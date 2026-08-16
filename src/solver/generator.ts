import { SolverEngine } from './engine';
import { CellState, type BoardSnapshot } from './types';

export interface GeneratedPuzzle {
  board: BoardSnapshot;
  attempts: number;
}

/**
 * Generate a connected-region puzzle with exactly one solution.
 *
 * The old generator only created a completely random partition and then
 * rejected it when it was not unique.  That works reasonably well at 8x8,
 * but uniqueness becomes rare at 11x11/12x12.  We now keep the known legal
 * queen layout as immutable region seeds and refine region boundaries when a
 * random partition has multiple solutions.
 */
export function generateUniquePuzzle(size: number, maxAttempts = 150): GeneratedPuzzle | null {
  if (size < 4 || size > 12) throw new Error('隨機唯一題目只支援 4×4 到 12×12。');

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const queens = randomQueenLayout(size);
    if (!queens) continue;

    const board = growConnectedRegions(size, queens);
    if (!board) continue;

    const directCount = new SolverEngine(board).countSolutions(2);
    if (directCount === 1) return { board, attempts: attempt };

    // Large boards are much more likely to be multi-solution.  Instead of
    // throwing the whole partition away, move non-seed boundary cells between
    // adjacent regions while preserving connectivity.  Prefer mutations that
    // reduce the number of solutions (capped because we only need a heuristic).
    const refined = refineToUnique(board, queens, size >= 10 ? 420 : 180);
    if (refined) return { board: refined, attempts: attempt };
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
    for (const [dr, dc] of ORTHOGONAL) {
      const rr = row + dr, cc = col + dc;
      if (rr >= 0 && cc >= 0 && rr < size && cc < size && regions[rr][cc] < 0) frontier.add(key(rr, cc));
    }
  };

  for (let region = 0; region < size; region++) regions[region][queens[region]] = region;
  for (let region = 0; region < size; region++) addFrontier(region, queens[region]);

  let remaining = size * size - size;
  while (remaining > 0) {
    const choices: Array<[number, number, number, number]> = [];
    for (const encoded of frontier) {
      const row = Math.floor(encoded / size), col = encoded % size;
      if (regions[row][col] >= 0) { frontier.delete(encoded); continue; }
      const adjacentRegions = new Set<number>();
      for (const [dr, dc] of ORTHOGONAL) {
        const rr = row + dr, cc = col + dc;
        if (rr >= 0 && cc >= 0 && rr < size && cc < size && regions[rr][cc] >= 0) adjacentRegions.add(regions[rr][cc]);
      }
      for (const region of adjacentRegions) {
        // Mild compactness bias: prefer the seed whose Manhattan distance is
        // smaller, but retain randomness so repeated clicks produce new boards.
        const distance = Math.abs(row - region) + Math.abs(col - queens[region]);
        choices.push([row, col, region, distance]);
      }
    }
    if (!choices.length) return null;

    choices.sort((a, b) => a[3] - b[3]);
    const pool = choices.slice(0, Math.max(1, Math.ceil(choices.length * 0.35)));
    const [row, col, region] = pool[Math.floor(Math.random() * pool.length)];
    regions[row][col] = region;
    frontier.delete(key(row, col));
    addFrontier(row, col);
    remaining--;
  }

  return boardFromRegions(regions, size);
}

function refineToUnique(source: BoardSnapshot, queens: readonly number[], mutationBudget: number): BoardSnapshot | null {
  const size = source.size;
  const regions = Array.from({ length: size }, () => new Int16Array(size));
  for (const cell of source.cells) regions[cell.row][cell.col] = cell.regionId;

  const isSeed = (row: number, col: number) => queens[row] === col;
  let board = boardFromRegions(regions, size);
  let score = new SolverEngine(board).countSolutions(24);
  if (score === 1) return board;

  for (let mutation = 0; mutation < mutationBudget; mutation++) {
    const candidates: Array<[number, number, number]> = [];
    for (let row = 0; row < size; row++) for (let col = 0; col < size; col++) {
      if (isSeed(row, col)) continue;
      const from = regions[row][col];
      const neighbors = new Set<number>();
      for (const [dr, dc] of ORTHOGONAL) {
        const rr = row + dr, cc = col + dc;
        if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue;
        const to = regions[rr][cc];
        if (to !== from) neighbors.add(to);
      }
      for (const to of neighbors) candidates.push([row, col, to]);
    }
    if (!candidates.length) break;

    // Try several random boundary moves before spending a solution count.
    let changed = false;
    for (let trial = 0; trial < Math.min(32, candidates.length); trial++) {
      const [row, col, to] = candidates[Math.floor(Math.random() * candidates.length)];
      const from = regions[row][col];
      if (from === to || !canRemoveWithoutDisconnect(regions, size, row, col, from)) continue;

      regions[row][col] = to;
      const nextBoard = boardFromRegions(regions, size);
      const nextScore = new SolverEngine(nextBoard).countSolutions(24);

      if (nextScore === 1) return nextBoard;

      // Prefer improvements.  Accept a small fraction of equal-score moves to
      // escape plateaus caused by the capped solution count.
      if (nextScore > 0 && (nextScore < score || (nextScore === score && Math.random() < 0.12))) {
        board = nextBoard;
        score = nextScore;
        changed = true;
        break;
      }

      regions[row][col] = from;
    }

    if (!changed && mutation % 24 === 23) {
      // A plateau is a signal to stop refining this partition and let the
      // outer loop start from another legal queen layout/region growth.
      break;
    }
  }
  return null;
}

function canRemoveWithoutDisconnect(
  regions: readonly Int16Array[], size: number, removeRow: number, removeCol: number, region: number,
): boolean {
  let start = -1;
  let total = 0;
  for (let row = 0; row < size; row++) for (let col = 0; col < size; col++) {
    if (row === removeRow && col === removeCol) continue;
    if (regions[row][col] !== region) continue;
    total++;
    if (start < 0) start = row * size + col;
  }
  if (total === 0) return false;

  const seen = new Uint8Array(size * size);
  const queue = new Int16Array(size * size);
  let head = 0, tail = 0, reached = 0;
  queue[tail++] = start;
  seen[start] = 1;

  while (head < tail) {
    const encoded = queue[head++];
    reached++;
    const row = Math.floor(encoded / size), col = encoded % size;
    for (const [dr, dc] of ORTHOGONAL) {
      const rr = row + dr, cc = col + dc;
      if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue;
      if (rr === removeRow && cc === removeCol) continue;
      const next = rr * size + cc;
      if (!seen[next] && regions[rr][cc] === region) {
        seen[next] = 1;
        queue[tail++] = next;
      }
    }
  }
  return reached === total;
}

function boardFromRegions(regions: readonly Int16Array[], size: number): BoardSnapshot {
  const cells = [];
  for (let row = 0; row < size; row++) for (let col = 0; col < size; col++) {
    cells.push({ row, col, regionId: regions[row][col], state: CellState.Empty });
  }
  return { size, cells };
}

const ORTHOGONAL = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;

function shuffle<T>(items: readonly T[]): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
