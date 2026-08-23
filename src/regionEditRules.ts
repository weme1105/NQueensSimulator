export function canAssignRegion(currentRegionId: number, targetRegionId: number, allowOverwrite = false): boolean {
  if (currentRegionId === targetRegionId) return false;
  if (!allowOverwrite && targetRegionId >= 0 && currentRegionId >= 0 && currentRegionId !== targetRegionId) return false;
  return true;
}

export function nextTappedRegionId(currentRegionId: number, selectedRegionId: number): number {
  return currentRegionId === selectedRegionId ? -1 : selectedRegionId;
}
