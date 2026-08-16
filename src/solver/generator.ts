import { SolverEngine } from './engine';
import { CellState, type BoardSnapshot } from './types';

export interface GeneratedPuzzle {
  board: BoardSnapshot;
  attempts: number;
}

/**
 * Constraint-guided unique puzzle generator.
 *
 * Invariant:
 * 1. Start from one known legal queen layout. Each queen is the seed of its region.
 * 2. Unassigned cells are not playable, so the seed-only board has exactly that solution.
 * 3. When adding one cell to a region, any newly-created second solution MUST use that
 *    newly-added cell. We therefore only need to ask whether a complete solution exists
 *    with a queen forced on that cell, instead of recounting all solutions from scratch.
 * 4. Reject that region assignment if the forced solution exists. Accepted growth keeps
 *    the known solution unique by construction.
 *
 * This changes generation from random-partition + reject to incremental constraint-guided
 * construction, which is substantially cheaper for 11x11 and 12x12 boards.
 */
export function generateUniquePuzzle(size: number, maxAttempts = 80): GeneratedPuzzle | null {
  if (size < 4 || size > 12) throw new Error('隨機唯一題目只支援 4×4 到 12×12。');

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const queens = randomQueenLayout(size);
    if (!queens) continue;

    const board = buildUniqueRegions(size, queens);
    if (!board) continue;

    // Safety verification only once at the end. The construction itself preserves
    // uniqueness incrementally, so this is not part of the hot growth loop.
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

function buildUniqueRegions(size: number, queens: readonly number[]): BoardSnapshot | null {
  const regions = Array.from({ length: size }, () => new Int16Array(size).fill(-1));
  const regionSizes = new Int16Array(size);
  const frontier = new Set<number>();
  const key = (row: number, col: number) => row * size + col;

  const addFrontier = (row: number, col: number) => {
    for (const [dr, dc] of ORTHOGONAL) {
      const rr = row + dr, cc = col + dc;
      if (rr >= 0 && cc >= 0 && rr < size && cc < size && regions[rr][cc] < 0) frontier.add(key(rr, cc));
    }
  };

  // Region id intentionally equals the seed queen's row. This gives us a stable
  // target solution: row r -> col queens[r] -> region r.
  for (let region = 0; region < size; region++) {
    regions[region][queens[region]] = region;
    regionSizes[region] = 1;
  }
  for (let region = 0; region < size; region++) addFrontier(region, queens[region]);

  let remaining = size * size - size;
  while (remaining > 0) {
    const frontierCells = shuffle(Array.from(frontier));
    const options: GrowthOption[] = [];

    for (const encoded of frontierCells) {
      const row = Math.floor(encoded / size), col = encoded % size;
      if (regions[row][col] >= 0) {
        frontier.delete(encoded);
        continue;
      }

      const adjacentRegions = new Set<number>();
      for (const [dr, dc] of ORTHOGONAL) {
        const rr = row + dr, cc = col + dc;
        if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue;
        const region = regions[rr][cc];
        if (region >= 0) adjacentRegions.add(region);
      }

      for (const region of adjacentRegions) {
        const distance = Math.abs(row - region) + Math.abs(col - queens[region]);
        const balance = regionSizes[region];
        const sameRowPenalty = row === region ? 5 : 0;
        const sameColPenalty = col === queens[region] ? 3 : 0;
        const jitter = Math.random() * 3;
        options.push({
          row,
          col,
          region,
          score: distance * 3 + balance * 1.5 + sameRowPenalty + sameColPenalty + jitter,
        });
      }
    }

    if (!options.length) return null;
    options.sort((a, b) => a.score - b.score);

    // Prefer compact/balanced growth, but inspect a wider low-cost window so a
    // locally attractive assignment cannot easily trap the remaining frontier.
    const windowSize = Math.min(options.length, Math.max(18, size * 4));
    let accepted: GrowthOption | null = null;

    for (let i = 0; i < windowSize; i++) {
      const option = options[i];
      regions[option.row][option.col] = option.region;

      // Before this assignment the puzzle has exactly one solution. Therefore a
      // new second solution can only exist if it uses this newly available cell.
      const createsAlternative = canCompleteWithForcedQueen(
        regions,
        size,
        option.row,
        option.col,
        option.region,
      );

      if (!createsAlternative) {
        accepted = option;
        break;
      }
      regions[option.row][option.col] = -1;
    }

    // If the cheap window is blocked, scan the rest before abandoning this seed.
    if (!accepted) {
      for (let i = windowSize; i < options.length; i++) {
        const option = options[i];
        regions[option.row][option.col] = option.region;
        const createsAlternative = canCompleteWithForcedQueen(
          regions,
          size,
          option.row,
          option.col,
          option.region,
        );
        if (!createsAlternative) {
          accepted = option;
          break;
        }
        regions[option.row][option.col] = -1;
      }
    }

    if (!accepted) return null;

    regionSizes[accepted.region]++;
    frontier.delete(key(accepted.row, accepted.col));
    addFrontier(accepted.row, accepted.col);
    remaining--;
  }

  return boardFromRegions(regions, size);
}

/**
 * Search for any complete solution containing the newly-added cell as a queen.
 * Finding one means the assignment creates a second solution and must be rejected.
 * This is much cheaper than countSolutions(2), because the new cell is forced.
 */
function canCompleteWithForcedQueen(
  regions: readonly Int16Array[],
  size: number,
  forcedRow: number,
  forcedCol: number,
  forcedRegion: number,
): boolean {
  const assignedRows = new Uint8Array(size);
  const placedCols = new Int16Array(size);
  placedCols.fill(-1);

  assignedRows[forcedRow] = 1;
  placedCols[forcedRow] = forcedCol;
  let usedCols = 1 << forcedCol;
  let usedRegions = 1 << forcedRegion;

  type Candidate = { row: number; col: number; region: number };

  const valid = (row: number, col: number, region: number): boolean => {
    if (region < 0 || assignedRows[row]) return false;
    if (usedCols & (1 << col)) return false;
    if (usedRegions & (1 << region)) return false;
    if (row > 0 && placedCols[row - 1] >= 0 && Math.abs(placedCols[row - 1] - col) <= 1) return false;
    if (row + 1 < size && placedCols[row + 1] >= 0 && Math.abs(placedCols[row + 1] - col) <= 1) return false;
    return true;
  };

  const candidatesForRow = (row: number): Candidate[] => {
    const result: Candidate[] = [];
    for (let col = 0; col < size; col++) {
      const region = regions[row][col];
      if (valid(row, col, region)) result.push({ row, col, region });
    }
    return result;
  };

  const chooseRow = (): Candidate[] | null => {
    let best: Candidate[] | null = null;
    for (let row = 0; row < size; row++) {
      if (assignedRows[row]) continue;
      const candidates = candidatesForRow(row);
      if (!candidates.length) return [];
      if (!best || candidates.length < best.length) {
        best = candidates;
        if (best.length === 1) break;
      }
    }
    return best;
  };

  const dfs = (depth: number): boolean => {
    if (depth === size) return true;
    const candidates = chooseRow();
    if (!candidates?.length) return false;

    // Low branching first. A little randomization avoids generating identical
    // shapes without changing correctness.
    for (const cell of candidates) {
      assignedRows[cell.row] = 1;
      placedCols[cell.row] = cell.col;
      usedCols |= 1 << cell.col;
      usedRegions |= 1 << cell.region;

      if (dfs(depth + 1)) return true;

      usedRegions &= ~(1 << cell.region);
      usedCols &= ~(1 << cell.col);
      placedCols[cell.row] = -1;
      assignedRows[cell.row] = 0;
    }
    return false;
  };

  return dfs(1);
}

function boardFromRegions(regions: readonly Int16Array[], size: number): BoardSnapshot {
  const cells = [];
  for (let row = 0; row < size; row++) for (let col = 0; col < size; col++) {
    cells.push({ row, col, regionId: regions[row][col], state: CellState.Empty });
  }
  return { size, cells };
}

type GrowthOption = {
  row: number;
  col: number;
  region: number;
  score: number;
};

const ORTHOGONAL = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;

function shuffle<T>(items: readonly T[]): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
