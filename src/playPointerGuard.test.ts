import { describe, expect, it } from 'vitest';
import { isSamePointerCell } from './playPointerGuard';

describe('play pointer guard', () => {
  it('recognizes a zero-distance move in the same cell', () => {
    expect(isSamePointerCell({ row: 2, col: 3 }, { row: 2, col: 3 })).toBe(true);
  });

  it('allows a real move to another cell', () => {
    expect(isSamePointerCell({ row: 2, col: 3 }, { row: 2, col: 4 })).toBe(false);
    expect(isSamePointerCell({ row: 2, col: 3 }, { row: 3, col: 3 })).toBe(false);
  });

  it('does not match missing pointer positions', () => {
    expect(isSamePointerCell(null, { row: 2, col: 3 })).toBe(false);
    expect(isSamePointerCell({ row: 2, col: 3 }, null)).toBe(false);
  });
});
