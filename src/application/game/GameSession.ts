import type { BoardSnapshot, CellChange } from '../../core/board/types';

export type GameMode = 'edit' | 'play';
export type PuzzleSolutionType = 'unknown' | 'unique' | 'multiple';
export type GameStatusKind = 'info' | 'warn' | 'bad' | 'ok';

export interface GameStatus {
  message: string;
  kind: GameStatusKind;
}

export interface GameSessionState {
  board: BoardSnapshot;
  mode: GameMode;
  solutionType: PuzzleSolutionType;
  solverBusy: boolean;
  status: GameStatus | null;
}

export type GameSessionListener = (state: Readonly<GameSessionState>) => void;

/**
 * Platform-independent application state for the active puzzle session.
 * It deliberately knows nothing about DOM, Web Workers, localStorage or routing.
 */
export class GameSession {
  private state: GameSessionState;
  private readonly listeners = new Set<GameSessionListener>();

  constructor(board: BoardSnapshot) {
    this.state = {
      board: cloneBoard(board),
      mode: 'edit',
      solutionType: 'unknown',
      solverBusy: false,
      status: null,
    };
  }

  snapshot(): Readonly<GameSessionState> {
    return {
      ...this.state,
      board: cloneBoard(this.state.board),
      status: this.state.status ? { ...this.state.status } : null,
    };
  }

  subscribe(listener: GameSessionListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  setBoard(board: BoardSnapshot): void {
    this.state = { ...this.state, board: cloneBoard(board), solutionType: 'unknown' };
    this.emit();
  }

  /** Transitional adapter hook while the legacy Web shell still owns mode changes. */
  syncMode(mode: GameMode): void {
    if (this.state.mode === mode) return;
    this.state = {
      ...this.state,
      mode,
      solutionType: mode === 'edit' ? 'unknown' : this.state.solutionType,
    };
    this.emit();
  }

  applyChanges(changes: readonly CellChange[]): void {
    if (!changes.length) return;
    const byKey = new Map(changes.map((change) => [`${change.row},${change.col}`, change] as const));
    this.state = {
      ...this.state,
      board: {
        size: this.state.board.size,
        cells: this.state.board.cells.map((cell) => {
          const change = byKey.get(`${cell.row},${cell.col}`);
          return change ? { ...cell, state: change.newState } : { ...cell };
        }),
      },
    };
    this.emit();
  }

  enterPlay(solutionType: Exclude<PuzzleSolutionType, 'unknown'>): void {
    this.state = { ...this.state, mode: 'play', solutionType };
    this.emit();
  }

  enterEdit(): void {
    this.state = { ...this.state, mode: 'edit', solutionType: 'unknown' };
    this.emit();
  }

  setSolverBusy(solverBusy: boolean): void {
    if (this.state.solverBusy === solverBusy) return;
    this.state = { ...this.state, solverBusy };
    this.emit();
  }

  setStatus(message: string, kind: GameStatusKind = 'info'): void {
    this.state = { ...this.state, status: { message, kind } };
    this.emit();
  }

  clearStatus(): void {
    if (!this.state.status) return;
    this.state = { ...this.state, status: null };
    this.emit();
  }

  private emit(): void {
    const snapshot = this.snapshot();
    for (const listener of this.listeners) listener(snapshot);
  }
}

function cloneBoard(board: BoardSnapshot): BoardSnapshot {
  return { size: board.size, cells: board.cells.map((cell) => ({ ...cell })) };
}
