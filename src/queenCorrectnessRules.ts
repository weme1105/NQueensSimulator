import { CellState, type BoardSnapshot } from './solver/types';

export const queenKey = (row: number, col: number): string => `${row},${col}`;

export function boardWithOnlyQueen(board: BoardSnapshot, row: number, col: number): BoardSnapshot {
  return {
    size: board.size,
    cells: board.cells.map((cell) => ({
      ...cell,
      state: cell.row === row && cell.col === col ? CellState.Queen : CellState.Empty,
    })),
  };
}

export function structurallyConflictingQueenKeys(board: BoardSnapshot): Set<string> {
  const queens = board.cells.filter((cell) => cell.state === CellState.Queen);
  const conflicts = new Set<string>();
  for (let i = 0; i < queens.length; i++) {
    for (let j = i + 1; j < queens.length; j++) {
      const a = queens[i], b = queens[j];
      const conflict = a.row === b.row
        || a.col === b.col
        || a.regionId === b.regionId
        || (Math.abs(a.row - b.row) <= 1 && Math.abs(a.col - b.col) <= 1);
      if (!conflict) continue;
      conflicts.add(queenKey(a.row, a.col));
      conflicts.add(queenKey(b.row, b.col));
    }
  }
  return conflicts;
}
