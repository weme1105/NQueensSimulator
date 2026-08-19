import type { BoardSnapshot } from './types';

export interface BoardValidationResult {
  ok: boolean;
  message?: string;
}

/** Validate the standard puzzle region contract without relying on UI state. */
export function validateRegions(board: BoardSnapshot): BoardValidationResult {
  const { size, cells } = board;
  const unassigned = cells.reduce((count, cell) => count + (cell.regionId < 0 ? 1 : 0), 0);
  if (unassigned > 0) return { ok: false, message: `還有 ${unassigned} 格尚未設定顏色。` };

  for (let regionId = 0; regionId < size; regionId++) {
    const regionCells = cells.filter((cell) => cell.regionId === regionId);
    if (regionCells.length === 0) return { ok: false, message: `色塊 ${regionId + 1} 尚未使用。` };
    if (!isRegionConnected(regionCells)) return { ok: false, message: `色塊 ${regionId + 1} 不相連。` };
  }

  return { ok: true };
}

function isRegionConnected(cells: readonly { row: number; col: number }[]): boolean {
  if (cells.length <= 1) return true;
  const all = new Set(cells.map((cell) => key(cell.row, cell.col)));
  const visited = new Set<string>();
  const queue: Array<{ row: number; col: number }> = [{ row: cells[0].row, col: cells[0].col }];
  visited.add(key(cells[0].row, cells[0].col));

  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];
    for (const [dr, dc] of ORTHOGONAL) {
      const row = current.row + dr;
      const col = current.col + dc;
      const candidate = key(row, col);
      if (!all.has(candidate) || visited.has(candidate)) continue;
      visited.add(candidate);
      queue.push({ row, col });
    }
  }

  return visited.size === cells.length;
}

const ORTHOGONAL = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
const key = (row: number, col: number): string => `${row},${col}`;
