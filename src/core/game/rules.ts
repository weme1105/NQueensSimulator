import { CellState, type BoardSnapshot } from '../board/types';
import type { DeductionResult } from '../solver/types';

export function queenConflictMessage(board: BoardSnapshot): string | null {
  const queens = board.cells.filter((cell) => cell.state === CellState.Queen);
  for (let i = 0; i < queens.length; i++) for (let j = i + 1; j < queens.length; j++) {
    const a = queens[i], b = queens[j];
    if (a.row === b.row) return `矛盾：Row ${a.row + 1} 有多個皇后。請先修正皇后位置。`;
    if (a.col === b.col) return `矛盾：Column ${a.col + 1} 有多個皇后。請先修正皇后位置。`;
    if (a.regionId >= 0 && a.regionId === b.regionId) return `矛盾：Region ${a.regionId + 1} 有多個皇后。請先修正皇后位置。`;
    if (Math.abs(a.row - b.row) <= 1 && Math.abs(a.col - b.col) <= 1) return `矛盾：皇后 (${a.col + 1},${a.row + 1}) 與 (${b.col + 1},${b.row + 1}) 相鄰。請先修正皇后位置。`;
  }
  return null;
}

export function immediateExclusions(board: BoardSnapshot): DeductionResult | null {
  const queens = board.cells.filter((cell) => cell.state === CellState.Queen);
  if (!queens.length) return null;
  const changes: DeductionResult['changes'] = [];
  for (const cell of board.cells) {
    if (cell.state !== CellState.Empty) continue;
    const blocked = queens.some((queen) =>
      cell.row === queen.row || cell.col === queen.col ||
      (cell.regionId >= 0 && cell.regionId === queen.regionId) ||
      (Math.abs(cell.row - queen.row) <= 1 && Math.abs(cell.col - queen.col) <= 1),
    );
    if (blocked) changes.push({ row: cell.row, col: cell.col, newState: CellState.Excluded });
  }
  if (!changes.length) return null;
  return { rule: 'basic', label: `優先排除 ${changes.length} 個與既有皇后衝突的格子`, changes, producesQueen: false };
}
