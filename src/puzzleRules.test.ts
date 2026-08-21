import { describe, expect, it } from 'vitest';
import { immediateExclusions, queenConflictMessage } from './puzzleRules';
import { CellState, type BoardSnapshot } from './solver/types';

function board(size:number, cells: Array<[number,number,number,CellState]>): BoardSnapshot {
  const map = new Map(cells.map(([r,c,region,state])=>[`${r},${c}`,{region,state}]));
  return { size, cells: Array.from({length:size*size},(_,i)=>{
    const row=Math.floor(i/size), col=i%size, hit=map.get(`${row},${col}`);
    return { row, col, regionId: hit?.region ?? row, state: hit?.state ?? CellState.Empty };
  })};
}

describe('queenConflictMessage',()=>{
  it('detects row conflict',()=>expect(queenConflictMessage(board(4,[[0,0,0,CellState.Queen],[0,2,1,CellState.Queen]]))).toMatch(/Row 1/));
  it('detects column conflict',()=>expect(queenConflictMessage(board(4,[[0,1,0,CellState.Queen],[2,1,2,CellState.Queen]]))).toMatch(/Column 2/));
  it('detects region conflict',()=>expect(queenConflictMessage(board(4,[[0,0,1,CellState.Queen],[2,3,1,CellState.Queen]]))).toMatch(/Region 2/));
  it('detects adjacent queens',()=>expect(queenConflictMessage(board(4,[[0,0,0,CellState.Queen],[1,1,1,CellState.Queen]]))).toMatch(/相鄰/));
  it('returns null for a legal pair',()=>expect(queenConflictMessage(board(4,[[0,0,0,CellState.Queen],[2,3,2,CellState.Queen]]))).toBeNull());
});

describe('immediateExclusions',()=>{
  it('returns null without queens',()=>expect(immediateExclusions(board(4,[]))).toBeNull());
  it('excludes row, column, region and adjacent cells while preserving non-empty cells',()=>{
    const b=board(4,[[1,1,1,CellState.Queen],[0,0,0,CellState.Excluded]]);
    const result=immediateExclusions(b);
    expect(result?.producesQueen).toBe(false);
    expect(result?.changes.length).toBeGreaterThan(0);
    expect(result?.changes).toContainEqual({row:1,col:3,newState:CellState.Excluded});
    expect(result?.changes).toContainEqual({row:3,col:1,newState:CellState.Excluded});
    expect(result?.changes.some(c=>c.row===0&&c.col===0)).toBe(false);
  });
});
