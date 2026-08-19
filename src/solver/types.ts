import { CellState, type BoardSnapshot, type CellChange, type CellSnapshot } from '../core/board/types';

export { CellState };
export type { BoardSnapshot, CellChange, CellSnapshot };

export type SolverRule =
  | 'basic'
  | 'hall-2'
  | 'hall-3'
  | 'basic-proof'
  | 'hall-2-3-proof'
  | 'hall-4'
  | 'hall-5'
  | 'hall-4-5-proof';

export interface DeductionResult {
  rule: SolverRule;
  label: string;
  changes: CellChange[];
  producesQueen: boolean;
}

export type WorkerRequest =
  | { id: number; type: 'STEP'; board: BoardSnapshot }
  | { id: number; type: 'AUTO_TO_QUEEN'; board: BoardSnapshot; timeoutMs: number }
  | { id: number; type: 'COUNT_SOLUTIONS'; board: BoardSnapshot; limit: number }
  | { id: number; type: 'GENERATE_UNIQUE'; size: number; maxAttempts: number };

export type WorkerResponse =
  | { id: number; type: 'DEDUCTION'; result: DeductionResult }
  | { id: number; type: 'NO_RESULT' }
  | { id: number; type: 'SOLUTION_COUNT'; count: number }
  | { id: number; type: 'GENERATED_PUZZLE'; board: BoardSnapshot; attempts: number }
  | { id: number; type: 'ERROR'; message: string };
