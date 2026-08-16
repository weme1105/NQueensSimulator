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
});

describe('solution counter', () => {
  it('stops at the requested solution limit', () => {
    const engine = new SolverEngine(board(4));
    expect(engine.countSolutions(2)).toBe(2);
  });
});
