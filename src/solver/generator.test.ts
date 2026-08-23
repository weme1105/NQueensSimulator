import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateUniquePuzzle } from './generator';
import { SolverEngine } from './engine';

function seededRandom(seed:number):()=>number {
  let state=seed>>>0;
  return ()=>{
    state=(Math.imul(state,1664525)+1013904223)>>>0;
    return state/0x100000000;
  };
}

afterEach(()=>vi.restoreAllMocks());

describe('generateUniquePuzzle',()=>{
  it('rejects unsupported sizes',()=>{
    expect(()=>generateUniquePuzzle(3)).toThrow(/4×4 到 12×12/);
    expect(()=>generateUniquePuzzle(13)).toThrow(/4×4 到 12×12/);
  });

  it.each([4,5])('generates a complete unique %ix%i puzzle',size=>{
    vi.spyOn(Math,'random').mockImplementation(seededRandom(1000+size));
    const result=generateUniquePuzzle(size,120);
    expect(result).not.toBeNull();
    const board=result!.board;
    expect(board.size).toBe(size);
    expect(board.cells).toHaveLength(size*size);
    expect(board.cells.every(c=>c.regionId>=0&&c.regionId<size)).toBe(true);
    expect(new Set(board.cells.map(c=>c.regionId)).size).toBe(size);
    expect(new SolverEngine(board).countSolutions(2)).toBe(1);
    expect(result!.attempts).toBeGreaterThanOrEqual(1);
  });

  it('returns null when no attempts are allowed',()=>{
    expect(generateUniquePuzzle(4,0)).toBeNull();
  });
});
