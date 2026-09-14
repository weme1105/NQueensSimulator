import { describe, expect, it } from 'vitest';
import { canonicalRegionFingerprint, canonicalSymmetryFingerprint, fingerprintPuzzle } from './puzzleFingerprint';

describe('puzzleFingerprint', () => {
  it('canonicalizes region labels', () => {
    const a = [0, 0, 1, 1, 0, 2, 2, 1, 3];
    const b = [7, 7, 4, 4, 7, 9, 9, 4, 8];
    expect(canonicalRegionFingerprint(a, 3)).toBe(canonicalRegionFingerprint(b, 3));
  });

  it('canonicalizes rotations and reflections', () => {
    const board = [0, 0, 1, 0, 2, 1, 2, 2, 1];
    const rotated = [1, 2, 0, 2, 2, 0, 1, 1, 0];
    expect(canonicalSymmetryFingerprint(board, 3)).toBe(canonicalSymmetryFingerprint(rotated, 3));
  });

  it('keeps solution and structural fingerprints separate', () => {
    const result = fingerprintPuzzle([0, 0, 1, 0, 2, 1, 2, 2, 1], 3, [2, 0, 2]);
    expect(result.region).toBe('0,0,1,0,2,1,2,2,1');
    expect(result.solution).toBe('2,0,2');
    expect(result.regionSizeHistogram).toBe('3,3,3');
    expect(result.rowTransitions).toBe('1,2,1');
    expect(result.columnTransitions).toBe('1,2,1');
  });
});
