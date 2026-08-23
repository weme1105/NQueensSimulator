import { describe, expect, it } from 'vitest';
import { puzzleDefinitionToBoard } from './puzzleDefinition';
import { CellState } from './types';

describe('puzzle definition', () => {
  it('converts fixed queens and exclusions into a board snapshot', () => {
    const board = puzzleDefinitionToBoard({
      size: 4,
      regionMap: [
        0, 0, 0, 0,
        1, 1, 1, 1,
        2, 2, 2, 2,
        3, 3, 3, 3,
      ],
      givenQueens: [{ row: 0, col: 1 }],
      initialExcluded: [{ row: 1, col: 0 }],
    });

    expect(board.cells.find((c) => c.row === 0 && c.col === 1)?.state).toBe(CellState.Queen);
    expect(board.cells.find((c) => c.row === 1 && c.col === 0)?.state).toBe(CellState.Excluded);
  });

  it('rejects a coordinate that is both a given queen and excluded', () => {
    expect(() => puzzleDefinitionToBoard({
      size: 4,
      regionMap: Array.from({ length: 16 }, (_, i) => Math.floor(i / 4)),
      givenQueens: [{ row: 0, col: 1 }],
      initialExcluded: [{ row: 0, col: 1 }],
    })).toThrow(/cannot also be excluded/);
  });
});
