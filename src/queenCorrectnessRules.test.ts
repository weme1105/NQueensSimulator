import { describe, expect, it } from 'vitest';
import { boardWithOnlyQueen, queenKey, structurallyConflictingQueenKeys } from './queenCorrectnessRules';
import { CellState, type BoardSnapshot } from './solver/types';

function board(states: Array<[number, number, CellState]> = []): BoardSnapshot {
  const stateMap = new Map(states.map(([row, col, state]) => [`${row},${col}`, state]));
  return {
    size: 4,
    cells: Array.from({ length: 16 }, (_, index) => {
      const row = Math.floor(index / 4), col = index % 4;
      return { row, col, regionId: row, state: stateMap.get(`${row},${col}`) ?? CellState.Empty };
    }),
  };
}

describe('queen correctness rules', () => {
  it('isolates one queen and clears all other play marks before validation', () => {
    const source = board([
      [0, 0, CellState.Excluded],
      [1, 2, CellState.Queen],
      [3, 3, CellState.Queen],
    ]);
    const isolated = boardWithOnlyQueen(source, 2, 1);
    expect(isolated.cells.filter((cell) => cell.state === CellState.Queen)).toEqual([
      expect.objectContaining({ row: 2, col: 1 }),
    ]);
    expect(isolated.cells.filter((cell) => cell.state === CellState.Excluded)).toHaveLength(0);
  });

  it('marks both queens when they structurally conflict', () => {
    const source = board([
      [0, 0, CellState.Queen],
      [0, 3, CellState.Queen],
      [2, 1, CellState.Queen],
    ]);
    const conflicts = structurallyConflictingQueenKeys(source);
    expect(conflicts.has(queenKey(0, 0))).toBe(true);
    expect(conflicts.has(queenKey(0, 3))).toBe(true);
    expect(conflicts.has(queenKey(2, 1))).toBe(false);
  });

  it('treats adjacent queens as a conflict', () => {
    const source = board([
      [1, 1, CellState.Queen],
      [2, 2, CellState.Queen],
    ]);
    expect(structurallyConflictingQueenKeys(source)).toEqual(new Set(['1,1', '2,2']));
  });
});
