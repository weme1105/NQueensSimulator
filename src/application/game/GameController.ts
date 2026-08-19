import { validateRegions, type BoardSnapshot, type DeductionResult } from '../../core';
import { immediateExclusions, queenConflictMessage } from '../../core/game/rules';
import type { SolverService } from '../solver/SolverService';
import { GameSession, type PuzzleSolutionType } from './GameSession';

export type DeductionSource = 'step' | 'auto';

export interface GameControllerHooks {
  onDeduction?(result: DeductionResult, source: DeductionSource): void;
}

/**
 * Application use-cases for validating, solving and generating puzzles.
 * UI adapters call this controller and observe GameSession; no DOM dependency here.
 */
export class GameController {
  private validationSequence = 0;

  constructor(
    readonly session: GameSession,
    private readonly solver: SolverService,
    private readonly hooks: GameControllerHooks = {},
  ) {}

  cancel(): void {
    this.validationSequence++;
    this.solver.cancel();
    this.session.setSolverBusy(false);
  }

  async validatePuzzle(enterPlay = false): Promise<PuzzleSolutionType | 'none'> {
    const board = this.session.snapshot().board;
    const regionValidation = validateRegions(board);
    if (!regionValidation.ok) {
      this.session.setStatus(regionValidation.message ?? '色塊設定不完整。', 'bad');
      return 'none';
    }

    const token = ++this.validationSequence;
    this.session.setSolverBusy(true);
    try {
      const count = await this.solver.countSolutions(board, 2, 10_000);
      if (token !== this.validationSequence) return 'none';
      if (count === 0) {
        this.session.setStatus('此色塊配置無解，請調整色塊。', 'bad');
        return 'none';
      }
      const solutionType: Exclude<PuzzleSolutionType, 'unknown'> = count === 1 ? 'unique' : 'multiple';
      if (enterPlay) this.session.enterPlay(solutionType);
      this.session.setStatus(
        solutionType === 'unique' ? '✓ 題目驗證通過：唯一解。' : '△ 題目可解，但存在多組解，不是唯一解。',
        solutionType === 'unique' ? 'ok' : 'warn',
      );
      return solutionType;
    } catch (error) {
      if (token !== this.validationSequence) return 'none';
      this.setError(error, '題目驗證超過 10 秒，已停止背景搜尋。');
      return 'none';
    } finally {
      if (token === this.validationSequence) this.session.setSolverBusy(false);
    }
  }

  async runStep(): Promise<DeductionResult | null> {
    this.validationSequence++;
    const board = this.session.snapshot().board;
    if (this.session.snapshot().mode !== 'play') {
      this.session.setStatus('請先進入推演模式。', 'bad');
      return null;
    }
    const conflict = queenConflictMessage(board);
    if (conflict) {
      this.session.setStatus(conflict, 'bad');
      return null;
    }
    const immediate = immediateExclusions(board);
    if (immediate) return this.apply(immediate, 'step');

    this.session.setSolverBusy(true);
    try {
      const result = await this.solver.solveStep(board);
      if (!result) {
        this.session.setStatus('目前沒有能證明的下一步；程式不會猜。', 'info');
        return null;
      }
      return this.apply(result, 'step');
    } catch (error) {
      this.setError(error);
      return null;
    } finally {
      this.session.setSolverBusy(false);
    }
  }

  async runAuto(): Promise<DeductionResult | null> {
    this.validationSequence++;
    const board = this.session.snapshot().board;
    if (this.session.snapshot().mode !== 'play') {
      this.session.setStatus('請先進入推演模式。', 'bad');
      return null;
    }
    const conflict = queenConflictMessage(board);
    if (conflict) {
      this.session.setStatus(conflict, 'bad');
      return null;
    }
    const immediate = immediateExclusions(board);
    if (immediate) return this.apply(immediate, 'auto');

    this.session.setSolverBusy(true);
    try {
      const result = await this.solver.autoToQueen(board, 5_000);
      if (!result) {
        this.session.setStatus('已停止：目前的可證明規則沒有推出下一個皇后。', 'info');
        return null;
      }
      return this.apply(result, 'auto');
    } catch (error) {
      this.setError(error, '已停止：推演超過 5 秒。');
      return null;
    } finally {
      this.session.setSolverBusy(false);
    }
  }

  async generateUnique(size: number): Promise<BoardSnapshot | null> {
    this.validationSequence++;
    if (size > 12) {
      this.session.setStatus('隨機唯一題目最大支援 12×12；手動棋盤可使用到 20×20。', 'warn');
      return null;
    }
    this.session.setSolverBusy(true);
    this.session.setStatus(`正在背景產生 ${size}×${size} 隨機唯一題目…`, 'info');
    try {
      const generated = await this.solver.generateUnique(size, size >= 11 ? 80 : 50, 10_000);
      if (!generated) {
        this.session.setStatus('這次沒有產生成功，請再試一次。', 'warn');
        return null;
      }
      this.session.setBoard(generated.board);
      this.session.setStatus(`✓ 已產生 ${size}×${size} 隨機唯一解題目（第 ${generated.attempts} 次嘗試）。`, 'ok');
      return generated.board;
    } catch (error) {
      this.setError(error, '隨機題目產生超過 10 秒，已停止背景運算。');
      return null;
    } finally {
      this.session.setSolverBusy(false);
    }
  }

  private apply(result: DeductionResult, source: DeductionSource): DeductionResult {
    this.session.applyChanges(result.changes);
    this.hooks.onDeduction?.(result, source);
    return result;
  }

  private setError(error: unknown, timeoutMessage?: string): void {
    const message = error instanceof Error ? error.message : String(error);
    const timeout = message.includes('timeout');
    this.session.setStatus(timeout && timeoutMessage ? timeoutMessage : message, timeout ? 'warn' : 'bad');
  }
}
