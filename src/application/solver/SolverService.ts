import type { BoardSnapshot } from '../../core/board/types';
import type { DeductionResult } from '../../core/solver/types';

export type GeneratedPuzzleResult = {
  board: BoardSnapshot;
  attempts: number;
};

export interface SolverService {
  solveStep(board: BoardSnapshot): Promise<DeductionResult | null>;
  autoToQueen(board: BoardSnapshot, timeoutMs?: number): Promise<DeductionResult | null>;
  countSolutions(board: BoardSnapshot, limit?: number, timeoutMs?: number): Promise<number>;
  generateUnique(size: number, maxAttempts?: number, timeoutMs?: number): Promise<GeneratedPuzzleResult | null>;
  cancel(reason?: string): void;
}
