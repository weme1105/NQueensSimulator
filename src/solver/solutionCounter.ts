import { CellState, type BoardSnapshot } from './types';

type RowOption = { col: number; region: number };

type PreparedSearch = {
  size: number;
  rowOptions: RowOption[][];
};

function prepare(board: BoardSnapshot): PreparedSearch | null {
  const size = board.size;
  if (size < 1 || size > 30) return null;

  const cells = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ regionId: -1, state: CellState.Empty })),
  );

  for (const cell of board.cells) {
    if (cell.row < 0 || cell.col < 0 || cell.row >= size || cell.col >= size) continue;
    cells[cell.row][cell.col] = { regionId: cell.regionId, state: cell.state };
  }

  const rowOptions: RowOption[][] = Array.from({ length: size }, () => []);

  for (let row = 0; row < size; row++) {
    const fixed = cells[row]
      .map((cell, col) => ({ cell, col }))
      .filter(({ cell }) => cell.state === CellState.Queen);

    if (fixed.length > 1) return null;

    if (fixed.length === 1) {
      const { cell, col } = fixed[0];
      if (cell.regionId < 0 || cell.regionId >= size) return null;
      rowOptions[row].push({ col, region: cell.regionId });
      continue;
    }

    for (let col = 0; col < size; col++) {
      const cell = cells[row][col];
      if (cell.state === CellState.Excluded) continue;
      if (cell.regionId < 0 || cell.regionId >= size) continue;
      rowOptions[row].push({ col, region: cell.regionId });
    }

    if (rowOptions[row].length === 0) return null;
  }

  return { size, rowOptions };
}

/**
 * Counts legal solutions using the puzzle's three independent dimensions:
 * row (implicit DFS depth), column bitmask, and region/color bitmask.
 *
 * Adjacent-row queen contact only depends on the previous row's column, so the
 * complete memo state is (row, usedColumns, usedRegions, previousColumn).
 * Existing Queen cells are treated as fixed/given placements; Excluded cells
 * are forbidden candidates.
 */
export function countSolutionsBitmask(board: BoardSnapshot, requestedLimit = 2): number {
  const prepared = prepare(board);
  if (!prepared) return 0;

  const { size, rowOptions } = prepared;
  const limit = Math.max(1, Math.floor(requestedLimit));
  const memo = new Map<string, number>();

  const search = (row: number, usedColumns: number, usedRegions: number, previousColumn: number): number => {
    if (row === size) return 1;

    const key = `${row}|${usedColumns >>> 0}|${usedRegions >>> 0}|${previousColumn}`;
    const cached = memo.get(key);
    if (cached !== undefined) return cached;

    let count = 0;
    for (const option of rowOptions[row]) {
      const columnBit = 1 << option.col;
      const regionBit = 1 << option.region;
      if (usedColumns & columnBit) continue;
      if (usedRegions & regionBit) continue;
      if (previousColumn >= 0 && Math.abs(option.col - previousColumn) <= 1) continue;

      count += search(
        row + 1,
        (usedColumns | columnBit) >>> 0,
        (usedRegions | regionBit) >>> 0,
        option.col,
      );
      if (count >= limit) {
        count = limit;
        break;
      }
    }

    memo.set(key, count);
    return count;
  };

  return search(0, 0, 0, -1);
}
