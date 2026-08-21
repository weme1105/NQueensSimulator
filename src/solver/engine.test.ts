import { describe, expect, it } from 'vitest';
import { SolverEngine } from './engine';
import { AUTO_PIPELINE, STEP_PIPELINE } from './pipeline';
import { CellState, type BoardSnapshot } from './types';

function board(size: number, states: Record<string, CellState> = {}): BoardSnapshot {
  const cells = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      cells.push({
        row,
        col,
        regionId: row,
        state: states[`${row},${col}`] ?? CellState.Empty,
      });
    }
  }
  return { size, cells };
}

describe('solver cost pipeline', () => {
  it('uses the requested full step order', () => {
    expect(STEP_PIPELINE).toEqual([
      'basic',
      'hall-2',
      'hall-3',
      'basic-proof',
      'hall-2-3-proof',
      'hall-4',
      'hall-5',
      'hall-4-5-proof',
    ]);
  });

  it('keeps auto mode capped at Hall 2~3 assisted proof', () => {
    expect(AUTO_PIPELINE).toEqual([
      'basic',
      'hall-2',
      'hall-3',
      'basic-proof',
      'hall-2-3-proof',
    ]);
  });
});

describe('basic deductions', () => {
  it('excludes cells attacked by an existing queen', () => {
    const engine = new SolverEngine(board(4, { '0,0': CellState.Queen }));
    const result = engine.runRule('basic');
    expect(result).not.toBeNull();
    expect(result?.producesQueen).toBe(false);
    expect(result?.changes.some((c) => c.row === 0 && c.col === 1 && c.newState === CellState.Excluded)).toBe(true);
    expect(result?.changes.some((c) => c.row === 1 && c.col === 1 && c.newState === CellState.Excluded)).toBe(true);
  });

  it('promotes a sole row candidate to queen', () => {
    const engine = new SolverEngine(board(4, {
      '0,0': CellState.Excluded,
      '0,1': CellState.Excluded,
      '0,2': CellState.Excluded,
    }));
    const result = engine.runRule('basic');
    expect(result?.producesQueen).toBe(true);
    expect(result?.changes).toEqual([{ row: 0, col: 3, newState: CellState.Queen }]);
  });

  it('does not guess when a rule has no provable deduction', () => {
    const engine = new SolverEngine(board(4));
    expect(engine.runRule('basic')).toBeNull();
  });
});

describe('state application', () => {
  it('applies only real state changes and preserves board coordinates', () => {
    const engine = new SolverEngine(board(4));
    const applied = engine.apply([
      { row: 1, col: 2, newState: CellState.Excluded },
      { row: 1, col: 2, newState: CellState.Excluded },
    ]);

    expect(applied).toEqual([{ row: 1, col: 2, newState: CellState.Excluded }]);
    expect(engine.toBoard().cells.find((c) => c.row === 1 && c.col === 2)?.state).toBe(CellState.Excluded);
  });

  it('counts queens from current state', () => {
    const engine = new SolverEngine(board(4, {
      '0,0': CellState.Queen,
      '2,2': CellState.Queen,
    }));
    expect(engine.countQueens()).toBe(2);
  });
});

describe('contradiction protection', () => {
  it('rejects two queens in the same row before solving', () => {
    const engine = new SolverEngine(board(4, {
      '0,0': CellState.Queen,
      '0,2': CellState.Queen,
    }));
    expect(() => engine.nextStep()).toThrow(/Row 1 有多個皇后/);
  });

  it('rejects two queens in the same column before auto solving', () => {
    const engine = new SolverEngine(board(4, {
      '0,1': CellState.Queen,
      '2,1': CellState.Queen,
    }));
    expect(() => engine.nextAutoDeduction()).toThrow(/Column 2 有多個皇后/);
  });
});

describe('solution counter', () => {
  it('stops at the requested solution limit', () => {
    const engine = new SolverEngine(board(4));
    expect(engine.countSolutions(2)).toBe(2);
  });

  it('honors a limit of one without continuing search', () => {
    const engine = new SolverEngine(board(4));
    expect(engine.countSolutions(1)).toBe(1);
  });
});
