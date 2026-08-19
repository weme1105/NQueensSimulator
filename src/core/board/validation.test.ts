import { describe, expect, it } from 'vitest';
import { CellState, type BoardSnapshot } from './types';
import { validateRegions } from './validation';

function makeBoard(regions: number[][]): BoardSnapshot {
  const size = regions.length;
  return {
    size,
    cells: regions.flatMap((row, r) => row.map((regionId, c) => ({ row: r, col: c, regionId, state: CellState.Empty }))),
  };
}

describe('validateRegions', () => {
  it('rejects unassigned cells', () => {
    expect(validateRegions(makeBoard([[0, -1], [1, 1]]))).toEqual({ ok: false, message: '還有 1 格尚未設定顏色。' });
  });

  it('rejects an unused region', () => {
    const result = validateRegions(makeBoard([[0, 0], [0, 0]]));
    expect(result.ok).toBe(false);
    expect(result.message).toBe('色塊 2 尚未使用。');
  });

  it('rejects a disconnected region', () => {
    const result = validateRegions(makeBoard([[0, 1], [1, 0]]));
    expect(result.ok).toBe(false);
    expect(result.message).toBe('色塊 1 不相連。');
  });

  it('accepts connected complete regions', () => {
    expect(validateRegions(makeBoard([[0, 0], [1, 1]]))).toEqual({ ok: true });
  });
});
