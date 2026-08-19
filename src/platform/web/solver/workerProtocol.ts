import type { BoardSnapshot } from '../../../core/board/types';
import type { DeductionResult } from '../../../core/solver/types';

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
