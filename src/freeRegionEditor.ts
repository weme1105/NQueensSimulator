import { RegionEditorSession, type CellPosition } from './application/editor/RegionEditorSession';
import { installPlayPointerGuard } from './playPointerGuard';
import type { BoardSnapshot } from './core/board/types';

type RegionEditorBridge = {
  getBoard(): BoardSnapshot;
  getSize(): number;
  isPlayMode(): boolean;
  installBoard(board: BoardSnapshot): void;
};

export function installFreeRegionEditor(app: RegionEditorBridge): void {
  installPlayPointerGuard(app);

  const board = document.querySelector<HTMLElement>('#board');
  const palette = document.querySelector<HTMLElement>('#palette');
  if (!board || !palette) return;

  const editor = new RegionEditorSession(app.getBoard());

  const hitCell = (clientX: number, clientY: number): CellPosition | null => {
    const element = document.elementFromPoint(clientX, clientY);
    const cell = element?.closest<HTMLElement>('.cell');
    if (!cell || !board.contains(cell)) return null;
    return { row: Number(cell.dataset.row), col: Number(cell.dataset.col) };
  };

  const syncFromApp = (): void => {
    editor.setBoard(app.getBoard());
  };

  const syncPaletteSelection = (): void => {
    const selectedRegion = editor.snapshot().selectedRegion;
    const buttons = Array.from(palette.querySelectorAll<HTMLElement>('.colorBtn'));
    buttons.forEach((button, index) => {
      const expected = selectedRegion < 0 ? index === app.getSize() : index === selectedRegion;
      button.classList.toggle('selected', expected);
    });
  };

  const installIfChanged = (next: BoardSnapshot | null): void => {
    if (!next) return;
    app.installBoard(next);
    requestAnimationFrame(syncPaletteSelection);
  };

  palette.addEventListener('pointerdown', (event) => {
    if (app.isPlayMode()) return;
    const button = (event.target as Element | null)?.closest<HTMLElement>('.colorBtn');
    if (!button || !palette.contains(button)) return;
    const buttons = Array.from(palette.querySelectorAll<HTMLElement>('.colorBtn'));
    const index = buttons.indexOf(button);
    if (index < 0) return;
    syncFromApp();
    editor.selectRegion(index >= app.getSize() ? -1 : index);
    requestAnimationFrame(syncPaletteSelection);
  }, true);

  board.addEventListener('pointerdown', (event) => {
    if (app.isPlayMode()) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const hit = hitCell(event.clientX, event.clientY);
    if (!hit) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    syncFromApp();
    board.setPointerCapture?.(event.pointerId);
    installIfChanged(editor.beginStroke(hit));
  }, true);

  board.addEventListener('pointermove', (event) => {
    if (!editor.snapshot().dragging || app.isPlayMode()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const hit = hitCell(event.clientX, event.clientY);
    if (!hit) return;
    installIfChanged(editor.moveStroke(hit));
  }, true);

  const finish = (event: PointerEvent): void => {
    if (!editor.snapshot().dragging || app.isPlayMode()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    try { board.releasePointerCapture?.(event.pointerId); } catch { /* ignore */ }
    installIfChanged(editor.endStroke());
  };

  board.addEventListener('pointerup', finish, true);
  board.addEventListener('pointercancel', (event) => {
    if (!editor.snapshot().dragging || app.isPlayMode()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    editor.cancelStroke();
  }, true);

  document.querySelector('#new')?.addEventListener('click', () => {
    syncFromApp();
    editor.resetSelection();
    requestAnimationFrame(syncPaletteSelection);
  });
  document.querySelector('#edit')?.addEventListener('click', () => {
    syncFromApp();
    requestAnimationFrame(syncPaletteSelection);
  });
  requestAnimationFrame(syncPaletteSelection);
}
