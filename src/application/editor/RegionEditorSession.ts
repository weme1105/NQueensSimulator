import type { BoardSnapshot } from '../../core/board/types';

export interface CellPosition {
  row: number;
  col: number;
}

export interface RegionEditorState {
  selectedRegion: number;
  dragging: boolean;
  moved: boolean;
  start: CellPosition | null;
}

/**
 * Platform-independent interaction state for editing region assignments.
 * Pointer hit-testing stays in the platform adapter; this class only receives cells.
 */
export class RegionEditorSession {
  private board: BoardSnapshot;
  private selectedRegion = 0;
  private dragging = false;
  private moved = false;
  private start: CellPosition | null = null;
  private visited = new Set<string>();
  private working: BoardSnapshot | null = null;

  constructor(board: BoardSnapshot) {
    this.board = cloneBoard(board);
    this.normalizeSelection();
  }

  snapshot(): Readonly<RegionEditorState> {
    return {
      selectedRegion: this.selectedRegion,
      dragging: this.dragging,
      moved: this.moved,
      start: this.start ? { ...this.start } : null,
    };
  }

  getBoard(): BoardSnapshot {
    return cloneBoard(this.working ?? this.board);
  }

  setBoard(board: BoardSnapshot): void {
    this.board = cloneBoard(board);
    this.cancelStroke();
    this.normalizeSelection();
  }

  resetSelection(): void {
    this.selectedRegion = 0;
    this.normalizeSelection();
  }

  selectRegion(regionId: number): void {
    if (regionId < -1 || regionId >= this.board.size) throw new Error(`Invalid region id: ${regionId}`);
    this.selectedRegion = regionId;
  }

  beginStroke(position: CellPosition): BoardSnapshot | null {
    if (!this.contains(position)) return null;
    this.dragging = true;
    this.moved = false;
    this.start = { ...position };
    this.visited = new Set<string>();
    this.working = cloneBoard(this.board);

    if (this.selectedRegion < 0) {
      this.visited.add(keyOf(position));
      return this.assign(position, -1);
    }
    return null;
  }

  moveStroke(position: CellPosition): BoardSnapshot | null {
    if (!this.dragging || !this.start || !this.working || !this.contains(position)) return null;

    if (position.row !== this.start.row || position.col !== this.start.col) this.moved = true;
    if (!this.moved && this.selectedRegion >= 0) return null;

    let changed: BoardSnapshot | null = null;
    if (this.selectedRegion >= 0 && this.visited.size === 0) {
      this.visited.add(keyOf(this.start));
      changed = this.assign(this.start, this.selectedRegion) ?? changed;
    }

    const key = keyOf(position);
    if (this.visited.has(key)) return changed;
    this.visited.add(key);
    return this.assign(position, this.selectedRegion) ?? changed;
  }

  endStroke(): BoardSnapshot | null {
    if (!this.dragging) return null;
    let changed: BoardSnapshot | null = null;

    if (this.start && !this.moved && this.selectedRegion >= 0) {
      this.working ??= cloneBoard(this.board);
      const cell = findCell(this.working, this.start);
      if (cell) {
        const nextRegion = cell.regionId === this.selectedRegion ? -1 : this.selectedRegion;
        changed = this.assign(this.start, nextRegion);
      }
    }

    if (this.working) this.board = cloneBoard(this.working);
    this.cancelStroke();
    return changed ? cloneBoard(this.board) : null;
  }

  cancelStroke(): void {
    this.dragging = false;
    this.moved = false;
    this.start = null;
    this.visited.clear();
    this.working = null;
  }

  private assign(position: CellPosition, regionId: number): BoardSnapshot | null {
    if (!this.working) return null;
    const cell = findCell(this.working, position);
    if (!cell || cell.regionId === regionId) return null;
    cell.regionId = regionId;
    return cloneBoard(this.working);
  }

  private contains(position: CellPosition): boolean {
    return position.row >= 0 && position.col >= 0 && position.row < this.board.size && position.col < this.board.size;
  }

  private normalizeSelection(): void {
    if (this.selectedRegion >= this.board.size) this.selectedRegion = 0;
  }
}

function keyOf(position: CellPosition): string {
  return `${position.row},${position.col}`;
}

function findCell(board: BoardSnapshot, position: CellPosition) {
  return board.cells.find((cell) => cell.row === position.row && cell.col === position.col);
}

function cloneBoard(board: BoardSnapshot): BoardSnapshot {
  return { size: board.size, cells: board.cells.map((cell) => ({ ...cell })) };
}
