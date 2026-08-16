import { installAnnotationCanvas } from './annotationCanvas';
import { installCellLabels } from './cellLabels';
import { installCoordinateDisplayNormalization } from './coordinateDisplay';
import { installDeductionHighlight } from './deductionHighlight';
import { installFreeRegionEditor } from './freeRegionEditor';
import { installPlayGuide } from './playGuide';
import { installRegionColors } from './regionColors';
import { installSolverButtonLayout } from './solverButtonLayout';
import { SolverWorkerClient } from './solver/workerClient';
import { CellState, type BoardSnapshot, type DeductionResult } from './solver/types';

type RegionValidation = { ok: boolean; msg?: string };
type SolutionType = 'unique' | 'multiple';
type NQueensBridge = {
  getBoard(): BoardSnapshot;
  getSize(): number;
  isPlayMode(): boolean;
  validateRegions(): RegionValidation;
  activatePlay(solutionType: SolutionType): void;
  installBoard(board: BoardSnapshot): void;
  applyDeduction(result: DeductionResult, source: 'step' | 'auto'): void;
  showStatus(message: string, kind?: 'info' | 'warn' | 'bad' | 'ok'): void;
  setSolverBusy(busy: boolean): void;
};

declare global {
  interface Window {
    nqApp?: NQueensBridge;
  }
}

const bridge = window.nqApp;
if (!bridge) throw new Error('NQueens legacy UI bridge was not initialized');
const app: NQueensBridge = bridge;
installCellLabels(app);
installPlayGuide(app);
installAnnotationCanvas(app);
installCoordinateDisplayNormalization();
installRegionColors(app);
installSolverButtonLayout();
installFreeRegionEditor(app);
const deductionHighlight = installDeductionHighlight();

const worker = new SolverWorkerClient();
const stepButton = document.querySelector<HTMLButtonElement>('#stepSolve');
const autoButton = document.querySelector<HTMLButtonElement>('#autoQueen');
const playButton = document.querySelector<HTMLButtonElement>('#play');
const randomButton = document.querySelector<HTMLButtonElement>('#random');
let validationSequence = 0;

function queenConflictMessage(board: BoardSnapshot): string | null {
  const queens = board.cells.filter((cell) => cell.state === CellState.Queen);
  for (let i = 0; i < queens.length; i++) {
    for (let j = i + 1; j < queens.length; j++) {
      const a = queens[i], b = queens[j];
      if (a.row === b.row) return `矛盾：Row ${a.row + 1} 有多個皇后。請先修正皇后位置。`;
      if (a.col === b.col) return `矛盾：Column ${a.col + 1} 有多個皇后。請先修正皇后位置。`;
      if (a.regionId >= 0 && a.regionId === b.regionId) return `矛盾：Region ${a.regionId + 1} 有多個皇后。請先修正皇后位置。`;
      if (Math.abs(a.row - b.row) <= 1 && Math.abs(a.col - b.col) <= 1) {
        return `矛盾：皇后 (${a.col + 1},${a.row + 1}) 與 (${b.col + 1},${b.row + 1}) 相鄰。請先修正皇后位置。`;
      }
    }
  }
  return null;
}

function immediateExclusions(board: BoardSnapshot): DeductionResult | null {
  const n = board.size;
  const byKey = new Map(board.cells.map((cell) => [`${cell.row},${cell.col}`, cell]));
  const queens = board.cells.filter((cell) => cell.state === CellState.Queen);
  if (!queens.length) return null;

  const changes: DeductionResult['changes'] = [];
  for (const cell of board.cells) {
    if (cell.state !== CellState.Empty) continue;
    let blocked = false;
    for (const queen of queens) {
      if (
        cell.row === queen.row ||
        cell.col === queen.col ||
        (cell.regionId >= 0 && cell.regionId === queen.regionId) ||
        (Math.abs(cell.row - queen.row) <= 1 && Math.abs(cell.col - queen.col) <= 1)
      ) {
        blocked = true;
        break;
      }
    }
    if (blocked && byKey.has(`${cell.row},${cell.col}`)) {
      changes.push({ row: cell.row, col: cell.col, newState: CellState.Excluded });
    }
  }

  if (!changes.length) return null;
  return {
    rule: 'basic',
    label: `優先排除 ${changes.length} 個與既有皇后衝突的格子`,
    changes,
    producesQueen: false,
  };
}

function applyAndHighlight(result: DeductionResult, source: 'step' | 'auto'): void {
  app.applyDeduction(result, source);
  deductionHighlight.show(result.changes);
}

async function validatePuzzle(enterPlay = false): Promise<void> {
  const token = ++validationSequence;
  const region = app.validateRegions();
  if (!region.ok) {
    app.showStatus(region.msg ?? '色塊設定不完整。', 'bad');
    return;
  }

  app.setSolverBusy(true);
  try {
    const count = await worker.countSolutions(app.getBoard(), 2, 10000);
    if (token !== validationSequence) return;
    if (count === 0) {
      app.showStatus('此色塊配置無解，請調整色塊。', 'bad');
      return;
    }
    const solutionType: SolutionType = count === 1 ? 'unique' : 'multiple';
    if (enterPlay) app.activatePlay(solutionType);
    else if (solutionType === 'unique') app.showStatus('✓ 題目驗證通過：唯一解。', 'ok');
    else app.showStatus('△ 題目可解，但存在多組解，不是唯一解。', 'warn');
  } catch (error) {
    if (token !== validationSequence) return;
    const message = error instanceof Error ? error.message : String(error);
    app.showStatus(message.includes('timeout') ? '題目驗證超過 10 秒，已停止背景搜尋。' : message, message.includes('timeout') ? 'warn' : 'bad');
  } finally {
    if (token === validationSequence) app.setSolverBusy(false);
  }
}

async function runStep(): Promise<void> {
  validationSequence++;
  deductionHighlight.clear();
  if (!app.isPlayMode()) {
    app.showStatus('請先進入推演模式。', 'bad');
    return;
  }

  const board = app.getBoard();
  const conflict = queenConflictMessage(board);
  if (conflict) {
    app.showStatus(conflict, 'bad');
    return;
  }

  const immediate = immediateExclusions(board);
  if (immediate) {
    applyAndHighlight(immediate, 'step');
    return;
  }

  app.setSolverBusy(true);
  try {
    const result = await worker.solveStep(board);
    if (!result) {
      app.showStatus('目前沒有能證明的下一步；程式不會猜。', 'info');
      return;
    }
    applyAndHighlight(result, 'step');
  } catch (error) {
    app.showStatus(error instanceof Error ? error.message : String(error), 'bad');
  } finally {
    app.setSolverBusy(false);
  }
}

async function runAuto(): Promise<void> {
  validationSequence++;
  deductionHighlight.clear();
  if (!app.isPlayMode()) {
    app.showStatus('請先進入推演模式。', 'bad');
    return;
  }

  const board = app.getBoard();
  const conflict = queenConflictMessage(board);
  if (conflict) {
    app.showStatus(conflict, 'bad');
    return;
  }

  const immediate = immediateExclusions(board);
  if (immediate) {
    applyAndHighlight(immediate, 'auto');
    return;
  }

  app.setSolverBusy(true);
  try {
    const result = await worker.autoToQueen(board, 5000);
    if (!result) {
      app.showStatus('已停止：基本規則、Hall 2、Hall 3、基本反證、Hall 2~3 輔助反證都沒有推出下一個皇后。', 'info');
      return;
    }
    applyAndHighlight(result, 'auto');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    app.showStatus(message.includes('timeout') ? '已停止：推演超過 5 秒。' : message, message.includes('timeout') ? 'warn' : 'bad');
  } finally {
    app.setSolverBusy(false);
  }
}

async function generateRandom(): Promise<void> {
  validationSequence++;
  deductionHighlight.clear();
  const size = app.getSize();
  if (size > 12) {
    app.showStatus('隨機唯一題目最大支援 12×12；手動棋盤可使用到 20×20。', 'warn');
    return;
  }
  app.setSolverBusy(true);
  if (randomButton) randomButton.disabled = true;
  app.showStatus(`正在背景產生 ${size}×${size} 隨機唯一題目…`, 'info');
  try {
    const generated = await worker.generateUnique(size, size >= 11 ? 80 : 50, 10000);
    if (!generated) {
      app.showStatus('這次沒有產生成功，請再按一次「隨機唯一題目」。', 'warn');
      return;
    }
    app.installBoard(generated.board);
    app.showStatus(`✓ 已產生 ${size}×${size} 隨機唯一解題目（第 ${generated.attempts} 次嘗試）。`, 'ok');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    app.showStatus(message.includes('timeout') ? '隨機題目產生超過 10 秒，已停止背景運算。' : message, message.includes('timeout') ? 'warn' : 'bad');
  } finally {
    app.setSolverBusy(false);
    if (randomButton) randomButton.disabled = false;
  }
}

if (stepButton) stepButton.onclick = () => { void runStep(); };
if (autoButton) autoButton.onclick = () => { void runAuto(); };
if (playButton) playButton.onclick = () => { deductionHighlight.clear(); void validatePuzzle(true); };
if (randomButton) randomButton.onclick = () => { void generateRandom(); };
window.addEventListener('nq:validate', () => { void validatePuzzle(false); });
window.addEventListener('beforeunload', () => worker.cancel());
