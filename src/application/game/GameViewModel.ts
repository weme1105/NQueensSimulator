import type { BoardSnapshot } from '../../core/board/types';
import { GameController } from './GameController';
import { GameSession, type GameMode, type GameSessionListener, type GameSessionState } from './GameSession';

/**
 * UI-facing application facade. Web, iOS and Android adapters should bind to this
 * rather than reaching into solver/domain modules directly.
 */
export class GameViewModel {
  constructor(
    readonly session: GameSession,
    readonly controller: GameController,
  ) {}

  get state(): Readonly<GameSessionState> {
    return this.session.snapshot();
  }

  subscribe(listener: GameSessionListener): () => void {
    return this.session.subscribe(listener);
  }

  setBoard(board: BoardSnapshot): void {
    this.session.setBoard(board);
  }

  /** Transitional bridge while the existing Web shell still owns manual edits/mode. */
  syncExternalState(board: BoardSnapshot, mode: GameMode): void {
    this.session.setBoard(board);
    this.session.syncMode(mode);
  }

  exitPlay(): void {
    this.controller.cancel();
    this.session.enterEdit();
  }

  validate(): Promise<'unknown' | 'unique' | 'multiple' | 'none'> {
    return this.controller.validatePuzzle(false);
  }

  enterPlay(): Promise<'unknown' | 'unique' | 'multiple' | 'none'> {
    return this.controller.validatePuzzle(true);
  }

  step(): Promise<DeductionResult | null> {
    return this.controller.runStep();
  }

  auto(): Promise<DeductionResult | null> {
    return this.controller.runAuto();
  }

  generate(size: number): Promise<BoardSnapshot | null> {
    return this.controller.generateUnique(size);
  }

  dispose(): void {
    this.controller.cancel();
  }
}

import type { DeductionResult } from '../../core/solver/types';
