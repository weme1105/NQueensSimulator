import { boardWithOnlyQueen, queenKey, structurallyConflictingQueenKeys } from './queenCorrectnessRules';
import { CellState, type BoardSnapshot } from './solver/types';
import { SolverWorkerClient } from './solver/workerClient';

type QueenCorrectnessBridge = {
  getBoard(): BoardSnapshot;
  isPlayMode(): boolean;
};

type PointerStart = { row: number; col: number; state: CellState };

export function installQueenCorrectness(app: QueenCorrectnessBridge): void {
  const board = document.querySelector<HTMLElement>('#board');
  if (!board) return;

  const wrongQueens = new Set<string>();
  let pointerStart: PointerStart | null = null;

  const cellAt = (snapshot: BoardSnapshot, row: number, col: number) =>
    snapshot.cells.find((cell) => cell.row === row && cell.col === col);

  const paint = (): void => {
    const snapshot = app.getBoard();
    if (!app.isPlayMode()) wrongQueens.clear();

    const structural = structurallyConflictingQueenKeys(snapshot);
    const currentQueens = new Set(
      snapshot.cells
        .filter((cell) => cell.state === CellState.Queen)
        .map((cell) => queenKey(cell.row, cell.col)),
    );

    for (const key of [...wrongQueens]) if (!currentQueens.has(key)) wrongQueens.delete(key);

    for (const cell of snapshot.cells) {
      const element = board.querySelector<HTMLElement>(`.cell[data-row="${cell.row}"][data-col="${cell.col}"]`);
      if (!element) continue;
      const key = queenKey(cell.row, cell.col);
      const isQueen = cell.state === CellState.Queen;
      const wrong = isQueen && wrongQueens.has(key);
      element.dataset.wrongQueen = wrong ? 'true' : 'false';
      element.classList.toggle('conflict', isQueen && (wrong || structural.has(key)));
    }
  };

  const validateQueen = (row: number, col: number): void => {
    const snapshot = app.getBoard();
    const target = cellAt(snapshot, row, col);
    if (!target || target.state !== CellState.Queen) return;

    const puzzleSignature = `${snapshot.size}|${snapshot.cells.map((cell) => cell.regionId).join(',')}`;
    const worker = new SolverWorkerClient();
    void worker.countSolutions(boardWithOnlyQueen(snapshot, row, col), 1, 3000)
      .then((count) => {
        const current = app.getBoard();
        const currentTarget = cellAt(current, row, col);
        const currentSignature = `${current.size}|${current.cells.map((cell) => cell.regionId).join(',')}`;
        if (!app.isPlayMode() || currentSignature !== puzzleSignature || currentTarget?.state !== CellState.Queen) return;
        const key = queenKey(row, col);
        if (count === 0) wrongQueens.add(key);
        else wrongQueens.delete(key);
        paint();
      })
      .catch(() => {
        // A timeout or cancelled background check must never mark a queen as wrong.
      });
  };

  board.addEventListener('pointerdown', (event) => {
    if (!app.isPlayMode()) { pointerStart = null; return; }
    const cell = (event.target as Element | null)?.closest<HTMLElement>('.cell');
    if (!cell || !board.contains(cell)) { pointerStart = null; return; }
    const row = Number(cell.dataset.row), col = Number(cell.dataset.col);
    const snapshot = app.getBoard();
    const state = cellAt(snapshot, row, col)?.state;
    pointerStart = state === undefined ? null : { row, col, state };
  });

  board.addEventListener('pointerup', () => {
    const start = pointerStart;
    pointerStart = null;
    if (!start || !app.isPlayMode()) { paint(); return; }
    const after = cellAt(app.getBoard(), start.row, start.col);
    if (start.state === CellState.Excluded && after?.state === CellState.Queen) {
      validateQueen(start.row, start.col);
    } else {
      paint();
    }
  });

  board.addEventListener('pointercancel', () => { pointerStart = null; paint(); });

  const observer = new MutationObserver(() => paint());
  observer.observe(board, { childList: true });
  paint();
}
