type PointerCell = { row: number; col: number };

type PlayPointerBridge = {
  isPlayMode(): boolean;
};

export function isSamePointerCell(start: PointerCell | null, current: PointerCell | null): boolean {
  return !!start && !!current && start.row === current.row && start.col === current.col;
}

export function installPlayPointerGuard(app: PlayPointerBridge): void {
  const board = document.querySelector<HTMLElement>('#board');
  if (!board) return;

  let start: PointerCell | null = null;

  const hitCell = (clientX: number, clientY: number): PointerCell | null => {
    const element = document.elementFromPoint(clientX, clientY);
    const cell = element?.closest<HTMLElement>('.cell');
    if (!cell || !board.contains(cell)) return null;
    return { row: Number(cell.dataset.row), col: Number(cell.dataset.col) };
  };

  board.addEventListener('pointerdown', (event) => {
    if (!app.isPlayMode()) {
      start = null;
      return;
    }
    start = hitCell(event.clientX, event.clientY);
  }, true);

  board.addEventListener('pointermove', (event) => {
    if (!app.isPlayMode() || !start) return;
    const current = hitCell(event.clientX, event.clientY);
    if (!isSamePointerCell(start, current)) return;

    // Some browsers emit pointermove before the pointer has actually left the
    // pressed cell. The legacy board handler treats any pointermove as a drag,
    // which can turn a normal click into an unintended X paint. Suppress only
    // this zero-distance move; real moves to another cell continue normally.
    event.stopImmediatePropagation();
  }, true);

  const clear = (): void => { start = null; };
  board.addEventListener('pointerup', clear, true);
  board.addEventListener('pointercancel', clear, true);
}
