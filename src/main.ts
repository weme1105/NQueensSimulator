import { SolverWorkerClient } from './solver/workerClient';
import type { BoardSnapshot, DeductionResult } from './solver/types';

type RegionValidation = { ok: boolean; msg?: string };
type SolutionType = 'unique' | 'multiple';
type NQueensBridge = {
  getBoard(): BoardSnapshot;
  isPlayMode(): boolean;
  validateRegions(): RegionValidation;
  activatePlay(solutionType: SolutionType): void;
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

const worker = new SolverWorkerClient();
const stepButton = document.querySelector<HTMLButtonElement>('#stepSolve');
const autoButton = document.querySelector<HTMLButtonElement>('#autoQueen');
const playButton = document.querySelector<HTMLButtonElement>('#play');
let validationSequence = 0;

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
  if (!app.isPlayMode()) {
    app.showStatus('請先進入推演模式。', 'bad');
    return;
  }
  app.setSolverBusy(true);
  try {
    const result = await worker.solveStep(app.getBoard());
    if (!result) {
      app.showStatus('目前沒有能證明的下一步；程式不會猜。', 'info');
      return;
    }
    app.applyDeduction(result, 'step');
  } catch (error) {
    app.showStatus(error instanceof Error ? error.message : String(error), 'bad');
  } finally {
    app.setSolverBusy(false);
  }
}

async function runAuto(): Promise<void> {
  validationSequence++;
  if (!app.isPlayMode()) {
    app.showStatus('請先進入推演模式。', 'bad');
    return;
  }
  app.setSolverBusy(true);
  try {
    const result = await worker.autoToQueen(app.getBoard(), 5000);
    if (!result) {
      app.showStatus('已停止：基本規則、Hall 2、Hall 3、基本反證、Hall 2~3 輔助反證都沒有推出下一個皇后。', 'info');
      return;
    }
    app.applyDeduction(result, 'auto');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    app.showStatus(message.includes('timeout') ? '已停止：推演超過 5 秒。' : message, message.includes('timeout') ? 'warn' : 'bad');
  } finally {
    app.setSolverBusy(false);
  }
}

if (stepButton) stepButton.onclick = () => { void runStep(); };
if (autoButton) autoButton.onclick = () => { void runAuto(); };
if (playButton) playButton.onclick = () => { void validatePuzzle(true); };
window.addEventListener('nq:validate', () => { void validatePuzzle(false); });
window.addEventListener('beforeunload', () => worker.cancel());
