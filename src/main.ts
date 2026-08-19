import { installAnnotationCanvas } from './annotationCanvas';
import { GameController } from './application/game/GameController';
import { GameSession } from './application/game/GameSession';
import { GameViewModel } from './application/game/GameViewModel';
import { installCellLabels } from './cellLabels';
import { installCoordinateDisplayNormalization } from './coordinateDisplay';
import { installDeductionHighlight } from './deductionHighlight';
import { installFreeRegionEditor } from './freeRegionEditor';
import { installPlayGuide } from './playGuide';
import { installRegionColors } from './regionColors';
import { installSolverButtonLayout } from './solverButtonLayout';
import { SolverWorkerClient } from './solver/workerClient';
import type { BoardSnapshot, DeductionResult } from './solver/types';
import { installUiLayout } from './uiLayout';

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

declare global { interface Window { nqApp?: NQueensBridge; } }

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
installUiLayout(app);
const deductionHighlight = installDeductionHighlight();

const worker = new SolverWorkerClient();
const session = new GameSession(app.getBoard());
const controller = new GameController(session, worker, {
  onDeduction(result, source) {
    app.applyDeduction(result, source);
    deductionHighlight.show(result.changes);
  },
});
const game = new GameViewModel(session, controller);

game.subscribe((state) => {
  app.setSolverBusy(state.solverBusy);
  if (state.status) app.showStatus(state.status.message, state.status.kind);
});

const stepButton = document.querySelector<HTMLButtonElement>('#stepSolve');
const autoButton = document.querySelector<HTMLButtonElement>('#autoQueen');
const playButton = document.querySelector<HTMLButtonElement>('#play');
const randomButton = document.querySelector<HTMLButtonElement>('#random');

function syncFromLegacy(): void {
  game.syncExternalState(app.getBoard(), app.isPlayMode() ? 'play' : 'edit');
}

async function validatePuzzle(enterPlay = false): Promise<void> {
  syncFromLegacy();
  const solutionType = enterPlay ? await game.enterPlay() : await game.validate();
  if (enterPlay && (solutionType === 'unique' || solutionType === 'multiple')) {
    app.activatePlay(solutionType);
    game.session.syncMode('play');
  }
}

async function runStep(): Promise<void> {
  deductionHighlight.clear();
  syncFromLegacy();
  await game.step();
}

async function runAuto(): Promise<void> {
  deductionHighlight.clear();
  syncFromLegacy();
  await game.auto();
}

async function generateRandom(): Promise<void> {
  deductionHighlight.clear();
  syncFromLegacy();
  if (randomButton) randomButton.disabled = true;
  try {
    const generated = await game.generate(app.getSize());
    if (generated) app.installBoard(generated);
  } finally {
    if (randomButton) randomButton.disabled = false;
  }
}

if (stepButton) stepButton.onclick = () => { void runStep(); };
if (autoButton) autoButton.onclick = () => { void runAuto(); };
if (playButton) playButton.onclick = () => { deductionHighlight.clear(); void validatePuzzle(true); };
if (randomButton) randomButton.onclick = () => { void generateRandom(); };
window.addEventListener('nq:validate', () => { void validatePuzzle(false); });
window.addEventListener('beforeunload', () => game.dispose());
