/// <reference lib="webworker" />
import type { WorkerRequest, WorkerResponse } from '../platform/web/solver/workerProtocol';
import { SolverEngine } from '../solver/engine';
import { generateUniquePuzzle } from '../solver/generator';
import type { CellChange, DeductionResult } from '../solver/types';

declare const self: DedicatedWorkerGlobalScope;

function post(response: WorkerResponse): void {
  self.postMessage(response);
}

function autoToQueen(request: Extract<WorkerRequest, { type: 'AUTO_TO_QUEEN' }>): DeductionResult | null {
  const engine = new SolverEngine(request.board);
  const startQueens = engine.countQueens();
  const allChanges: CellChange[] = [];
  let last: DeductionResult | null = null;
  const limit = request.board.size * request.board.size * 20;

  for (let i = 0; i < limit; i++) {
    last = engine.nextAutoDeduction();
    if (!last) break;
    const applied = engine.apply(last.changes);
    allChanges.push(...applied);
    if (engine.countQueens() > startQueens) {
      return {
        rule: last.rule,
        label: `自動推演到下一個皇后：${last.label}`,
        changes: allChanges,
        producesQueen: true,
      };
    }
  }
  return null;
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  try {
    if (request.type === 'COUNT_SOLUTIONS') {
      const engine = new SolverEngine(request.board);
      post({ id: request.id, type: 'SOLUTION_COUNT', count: engine.countSolutions(request.limit) });
      return;
    }

    if (request.type === 'GENERATE_UNIQUE') {
      const generated = generateUniquePuzzle(request.size, request.maxAttempts);
      if (!generated) {
        post({ id: request.id, type: 'NO_RESULT' });
        return;
      }
      post({ id: request.id, type: 'GENERATED_PUZZLE', board: generated.board, attempts: generated.attempts });
      return;
    }

    const result = request.type === 'STEP'
      ? new SolverEngine(request.board).nextStep()
      : autoToQueen(request);

    if (result) post({ id: request.id, type: 'DEDUCTION', result });
    else post({ id: request.id, type: 'NO_RESULT' });
  } catch (error) {
    post({
      id: request.id,
      type: 'ERROR',
      message: error instanceof Error ? error.message : String(error),
    });
  }
};

export {};
