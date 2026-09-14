import { describe, expect, it } from 'vitest';
import { countSolutionsBitmask } from './solutionCounter';
import { generateColorFirstPuzzle } from './colorFirstGenerator';

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

describe('generateColorFirstPuzzle', () => {
  it('rejects unsupported sizes', () => {
    expect(() => generateColorFirstPuzzle(3)).toThrow(/4×4 到 12×12/);
    expect(() => generateColorFirstPuzzle(13)).toThrow(/4×4 到 12×12/);
  });

  it.each([4, 5, 6, 7])('generates a connected-region unique %ix%i puzzle', (size) => {
    const originalRandom = Math.random;
    Math.random = seededRandom(20260914 + size);
    try {
      const result = generateColorFirstPuzzle(size, { maxAttempts: 3000 });
      expect(result).not.toBeNull();
      const board = result!.board;
      expect(board.cells).toHaveLength(size * size);
      expect(new Set(board.cells.map((cell) => cell.regionId)).size).toBe(size);
      expect(countSolutionsBitmask(board, 2)).toBe(1);
      expect(result!.solution).toHaveLength(size);
      expect(new Set(result!.solution).size).toBe(size);
    } finally {
      Math.random = originalRandom;
    }
  });

  it('does not depend on a queen layout during region generation', () => {
    const originalRandom = Math.random;
    Math.random = seededRandom(77);
    try {
      const result = generateColorFirstPuzzle(6, { maxAttempts: 1 });
      expect(result === null || result.board.cells.every((cell) => cell.state === 0)).toBe(true);
    } finally {
      Math.random = originalRandom;
    }
  });

  it('returns null when no attempts are allowed', () => {
    expect(generateColorFirstPuzzle(6, { maxAttempts: 0 })).toBeNull();
  });
});
