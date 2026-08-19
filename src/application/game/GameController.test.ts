import { describe, expect, it } from 'vitest';
import { CellState, type BoardSnapshot, type DeductionResult } from '../../core';
import type { GeneratedPuzzleResult, SolverService } from '../solver/SolverService';
import { GameController } from './GameController';
import { GameSession } from './GameSession';

class FakeSolver implements SolverService {
  countCalls = 0;
  solutionCount = 1;

  async solveStep(_board: BoardSnapshot): Promise<DeductionResult | null> { return null; }
  async autoToQueen(_board: BoardSnapshot): Promise<DeductionResult | null> { return null; }
  async countSolutions(_board: BoardSnapshot): Promise<number> { this.countCalls++; return this.solutionCount; }
  async generateUnique(_size: number): Promise<GeneratedPuzzleResult | null> { return null; }
  cancel(): void {}
}

function connectedBoard(): BoardSnapshot {
  const size = 4;
  return {
    size,
    cells: Array.from({ length: size * size }, (_, index) => ({
      row: Math.floor(index / size),
      col: index % size,
      regionId: Math.floor(index / size),
      state: CellState.Empty,
    })),
  };
}

describe('GameController', () => {
  it('rejects incomplete regions before invoking the solver', async () => {
    const board = connectedBoard();
    board.cells[0].regionId = -1;
    const solver = new FakeSolver();
    const session = new GameSession(board);
    const controller = new GameController(session, solver);

    expect(await controller.validatePuzzle()).toBe('none');
    expect(solver.countCalls).toBe(0);
    expect(session.snapshot().status?.kind).toBe('bad');
  });

  it('enters play after a valid unique puzzle', async () => {
    const solver = new FakeSolver();
    const session = new GameSession(connectedBoard());
    const controller = new GameController(session, solver);

    expect(await controller.validatePuzzle(true)).toBe('unique');
    expect(solver.countCalls).toBe(1);
    expect(session.snapshot().mode).toBe('play');
    expect(session.snapshot().solutionType).toBe('unique');
  });
});
