import { describe, expect, it } from 'vitest';
import { canAssignRegion, nextTappedRegionId } from './regionEditRules';

describe('canAssignRegion',()=>{
  it('rejects no-op assignments',()=>expect(canAssignRegion(2,2)).toBe(false));
  it('allows filling empty cells while dragging',()=>expect(canAssignRegion(-1,2)).toBe(true));
  it('preserves an existing different region while dragging',()=>expect(canAssignRegion(1,2)).toBe(false));
  it('allows explicit tap overwrite',()=>expect(canAssignRegion(1,2,true)).toBe(true));
  it('allows erase',()=>expect(canAssignRegion(1,-1)).toBe(true));
});

describe('nextTappedRegionId',()=>{
  it('toggles selected region off when tapping same region',()=>expect(nextTappedRegionId(3,3)).toBe(-1));
  it('recolors to selected region when tapping a different region',()=>expect(nextTappedRegionId(1,3)).toBe(3));
});
