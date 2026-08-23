import { CellState, type BoardSnapshot } from './types';

export interface PuzzleCoordinate {
  row: number;
  col: number;
}

export interface PuzzleDefinition {
  size: number;
  /** Row-major region/color id for each cell. */
  regionMap: number[];
  /** Fixed queens that belong to the puzzle itself, not to player history. */
  givenQueens?: PuzzleCoordinate[];
  /** Optional fixed forbidden cells for future puzzle variants. */
  initialExcluded?: PuzzleCoordinate[];
}

function key(row: number, col: number): string {
  return `${row},${col}`;
}

export function puzzleDefinitionToBoard(definition: PuzzleDefinition): BoardSnapshot {
  const { size } = definition;
  if (!Number.isInteger(size) || size < 1 || size > 20) throw new Error('Puzzle size must be between 1 and 20.');
  if (definition.regionMap.length !== size * size) throw new Error('regionMap length must equal size × size.');

  const given = new Set((definition.givenQueens ?? []).map((c) => key(c.row, c.col)));
  const excluded = new Set((definition.initialExcluded ?? []).map((c) => key(c.row, c.col)));

  for (const coordinate of [...(definition.givenQueens ?? []), ...(definition.initialExcluded ?? [])]) {
    if (coordinate.row < 0 || coordinate.col < 0 || coordinate.row >= size || coordinate.col >= size) {
      throw new Error('Puzzle coordinate is outside the board.');
    }
  }

  for (const coordinate of definition.givenQueens ?? []) {
    if (excluded.has(key(coordinate.row, coordinate.col))) throw new Error('A given queen cannot also be excluded.');
  }

  const cells = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const regionId = definition.regionMap[row * size + col];
      const coordinateKey = key(row, col);
      cells.push({
        row,
        col,
        regionId,
        state: given.has(coordinateKey)
          ? CellState.Queen
          : excluded.has(coordinateKey)
            ? CellState.Excluded
            : CellState.Empty,
      });
    }
  }

  return { size, cells };
}
