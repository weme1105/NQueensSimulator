import { CellState, type BoardSnapshot } from './types';

export interface SolverTelemetry {
  solutions: number;
  nodesVisited: number;
  candidateChecks: number;
  deadEnds: number;
  forcedNodes: number;
  maxDepth: number;
  columnBlocks: number;
  regionBlocks: number;
  adjacencyBlocks: number;
}

type RowOption = { col: number; region: number };

/**
 * Runs the same legal search model as the solution counter, but records
 * search-shape statistics for puzzle-bank analysis. This is intentionally
 * separate from the production counter so telemetry cannot alter solver
 * semantics or generation correctness.
 */
export function analyzeSolutionSearch(board: BoardSnapshot, limit = 2): SolverTelemetry {
  const size = board.size;
  const empty: RowOption[][] = Array.from({ length: size }, () => []);
  const cells = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ regionId: -1, state: CellState.Empty })),
  );

  for (const cell of board.cells) {
    if (cell.row < 0 || cell.col < 0 || cell.row >= size || cell.col >= size) continue;
    cells[cell.row][cell.col] = { regionId: cell.regionId, state: cell.state };
  }

  for (let row = 0; row < size; row++) {
    const fixed = cells[row].filter((cell) => cell.state === CellState.Queen);
    if (fixed.length > 1) return zeroTelemetry();
    if (fixed.length === 1) {
      const col = cells[row].findIndex((cell) => cell.state === CellState.Queen);
      const region = fixed[0].regionId;
      if (region < 0 || region >= size) return zeroTelemetry();
      empty[row].push({ col, region });
      continue;
    }
    for (let col = 0; col < size; col++) {
      const cell = cells[row][col];
      if (cell.state !== CellState.Excluded && cell.regionId >= 0 && cell.regionId < size) {
        empty[row].push({ col, region: cell.regionId });
      }
    }
    if (!empty[row].length) return zeroTelemetry();
  }

  const telemetry = zeroTelemetry();
  const cappedLimit = Math.max(1, Math.floor(limit));
  const memo = new Map<string, number>();

  const search = (row: number, usedColumns: number, usedRegions: number, previousColumn: number): number => {
    telemetry.nodesVisited++;
    telemetry.maxDepth = Math.max(telemetry.maxDepth, row);
    if (row === size) return 1;

    const key = `${row}|${usedColumns >>> 0}|${usedRegions >>> 0}|${previousColumn}`;
    const cached = memo.get(key);
    if (cached !== undefined) return cached;

    let legalOptions = 0;
    let count = 0;
    for (const option of empty[row]) {
      telemetry.candidateChecks++;
      const columnBit = 1 << option.col;
      const regionBit = 1 << option.region;
      if (usedColumns & columnBit) {
        telemetry.columnBlocks++;
        continue;
      }
      if (usedRegions & regionBit) {
        telemetry.regionBlocks++;
        continue;
      }
      if (previousColumn >= 0 && Math.abs(option.col - previousColumn) <= 1) {
        telemetry.adjacencyBlocks++;
        continue;
      }

      legalOptions++;
      count += search(row + 1, (usedColumns | columnBit) >>> 0, (usedRegions | regionBit) >>> 0, option.col);
      if (count >= cappedLimit) {
        count = cappedLimit;
        break;
      }
    }

    if (legalOptions === 1) telemetry.forcedNodes++;
    if (legalOptions === 0) telemetry.deadEnds++;
    memo.set(key, count);
    return count;
  };

  telemetry.solutions = search(0, 0, 0, -1);
  return telemetry;
}

function zeroTelemetry(): SolverTelemetry {
  return {
    solutions: 0,
    nodesVisited: 0,
    candidateChecks: 0,
    deadEnds: 0,
    forcedNodes: 0,
    maxDepth: 0,
    columnBlocks: 0,
    regionBlocks: 0,
    adjacencyBlocks: 0,
  };
}
