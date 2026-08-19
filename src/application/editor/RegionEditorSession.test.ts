import { describe, expect, it } from 'vitest';
import { CellState, type BoardSnapshot } from '../../core/board/types';
import { RegionEditorSession } from './RegionEditorSession';

function board(size = 3): BoardSnapshot {
  return {
    size,
    cells: Array.from({ length: size * size }, (_, index) => ({
      row: Math.floor(index / size),
      col: index % size,
      regionId: -1,
      state: CellState.Empty,
    })),
  };
}

describe('RegionEditorSession', () => {
  it('toggles one cell on a click', () => {
    const editor = new RegionEditorSession(board());
    editor.selectRegion(1);
    expect(editor.beginStroke({ row: 1, col: 1 })).toBeNull();
    const changed = editor.endStroke();
    expect(changed?.cells.find((cell) => cell.row === 1 && cell.col === 1)?.regionId).toBe(1);

    editor.beginStroke({ row: 1, col: 1 });
    const toggled = editor.endStroke();
    expect(toggled?.cells.find((cell) => cell.row === 1 && cell.col === 1)?.regionId).toBe(-1);
  });

  it('paints the start cell and visited cells while dragging', () => {
    const editor = new RegionEditorSession(board());
    editor.selectRegion(2);
    editor.beginStroke({ row: 0, col: 0 });
    const drag = editor.moveStroke({ row: 0, col: 1 });
    expect(drag?.cells.find((cell) => cell.row === 0 && cell.col === 0)?.regionId).toBe(2);
    expect(drag?.cells.find((cell) => cell.row === 0 && cell.col === 1)?.regionId).toBe(2);
    editor.endStroke();
  });

  it('erases immediately with the erase selection', () => {
    const seeded = board();
    const target = seeded.cells.find((cell) => cell.row === 2 && cell.col === 2);
    if (target) target.regionId = 0;
    const editor = new RegionEditorSession(seeded);
    editor.selectRegion(-1);
    const changed = editor.beginStroke({ row: 2, col: 2 });
    expect(changed?.cells.find((cell) => cell.row === 2 && cell.col === 2)?.regionId).toBe(-1);
  });
});
