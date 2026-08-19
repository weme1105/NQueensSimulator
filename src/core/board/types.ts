export const enum CellState {
  Empty = 0,
  Excluded = 1,
  Queen = 2,
}

export interface CellSnapshot {
  row: number;
  col: number;
  regionId: number;
  state: CellState;
}

export interface BoardSnapshot {
  size: number;
  cells: CellSnapshot[];
}

export interface CellChange {
  row: number;
  col: number;
  newState: CellState;
}
