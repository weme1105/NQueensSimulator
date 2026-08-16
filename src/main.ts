import { SolverWorkerClient } from './solver/workerClient';
import type { BoardSnapshot, DeductionResult } from './solver/types';

declare global {
  interface Window {
    nqApp?: {
      getBoard(): BoardSnapshot;
      isPlayMode(): boolean;
      applyDeduction(result: DeductionResult, source: 'step' | 'auto'): void;
      showStatus(message: string, kind?: 'info' | 'warn' | 'bad' | 'ok'): void;
      setSolverBusy(busy: boolean): void;
    };
  }
}

const app = window.nqApp;
if (!app) throw new Error('NQueens legacy UI bridge was not initialized');

const worker = new SolverWorkerClient();
const stepButton = document.querySelector<HTMLButtonElement>('#stepSolve');
const autoButton = document.querySelector<HTMLButtonElement>('#autoQueen');

async function runStep(): Promise<void> {
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

window.addEventListener('beforeunload', () => worker.cancel());
