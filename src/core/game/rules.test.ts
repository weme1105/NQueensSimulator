import { describe, expect, it } from 'vitest';
import { CellState, type BoardSnapshot } from '../board/types';
import { immediateExclusions, queenConflictMessage } from './rules';

const board = (size: number, cells: BoardSnapshot['cells']): BoardSnapshot => ({ size, cells });

describe('queenConflictMessage', () => {
  it('detects two queens in the same row', () => {
    const snapshot = board(4, [
      { row: 0, col: 0, regionId: 0, state: CellState.Queen },
      { row: 0, col: 2, regionId: 1, state: CellState.Queen },
    ]);
    expect(queenConflictMessage(snapshot)).toContain('Row 1');
  });

  it('returns null when queens do not conflict', () => {
    const snapshot = board(4, [
      { row: 0, col: 0, regionId: 0, state: CellState.Queen },
      { row: 2, col: 3, regionId: 1, state: CellState.Queen },
    ]);
    expect(queenConflictMessage(snapshot)).toBeNull();
  });
});

describe('immediateExclusions', () => {
  it('excludes empty cells blocked by an existing queen', () => {
    const snapshot = board(3, [
      { row: 0, col: 0, regionId: 0, state: CellState.Queen },
      { row: 0, col: 1, regionId: 1, state: CellState.Empty },
      { row: 1, col: 1, regionId: 2, state: CellState.Empty },
      { row: 2, col: 2, regionId: 2, state: CellState.Empty },
    ]);
    const result = immediateExclusions(snapshot);
    expect(result?.changes).toEqual(expect.arrayContaining([
      { row: 0, col: 1, newState: CellState.Excluded },
      { row: 1, col: 1, newState: CellState.Excluded },
    ]));
  });
});
