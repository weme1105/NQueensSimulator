import { describe, expect, it } from 'vitest';
import { countSolutionsBitmask } from './solutionCounter';
import { CellState, type BoardSnapshot } from './types';

function rowRegionBoard(size: number, states: Record<string, CellState> = {}): BoardSnapshot {
  const cells = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      cells.push({ row, col, regionId: row, state: states[`${row},${col}`] ?? CellState.Empty });
    }
  }
  return { size, cells };
}

describe('bitmask solution counter', () => {
  it('counts with row, column and region constraints and respects the cap', () => {
    const board = rowRegionBoard(4);
    expect(countSolutionsBitmask(board, 1)).toBe(1);
    expect(countSolutionsBitmask(board, 2)).toBe(2);
  });

  it('treats an existing queen as a fixed placement', () => {
    const board = rowRegionBoard(4, { '0,1': CellState.Queen });
    expect(countSolutionsBitmask(board, 2)).toBe(1);
  });

  it('returns zero for a fixed queen that makes the puzzle impossible', () => {
    const board = rowRegionBoard(4, { '0,0': CellState.Queen });
    expect(countSolutionsBitmask(board, 2)).toBe(0);
  });

  it('honors excluded cells', () => {
    const board = rowRegionBoard(4, {
      '0,1': CellState.Excluded,
      '0,2': CellState.Excluded,
    });
    expect(countSolutionsBitmask(board, 2)).toBe(0);
  });

  it('rejects multiple fixed queens in one row', () => {
    const board = rowRegionBoard(4, {
      '0,1': CellState.Queen,
      '0,3': CellState.Queen,
    });
    expect(countSolutionsBitmask(board, 2)).toBe(0);
  });
});
