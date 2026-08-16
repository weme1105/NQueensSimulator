/// <reference lib="webworker" />
import { AUTO_PIPELINE, STEP_PIPELINE } from '../solver/pipeline';
import type { DeductionResult, SolverRule, WorkerRequest, WorkerResponse } from '../solver/types';

declare const self: DedicatedWorkerGlobalScope;

function runRule(_request: WorkerRequest, _rule: SolverRule): DeductionResult | null {
  // Migration seam: existing optimized JS rules are moved here tier-by-tier.
  // Keeping this explicit prevents the UI thread from owning solver code again.
  return null;
}

function post(response: WorkerResponse): void {
  self.postMessage(response);
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  try {
    if (request.type === 'COUNT_SOLUTIONS') {
      // Solution counter will be migrated after deduction parity tests are green.
      post({ id: request.id, type: 'SOLUTION_COUNT', count: 0 });
      return;
    }

    const pipeline = request.type === 'STEP' ? STEP_PIPELINE : AUTO_PIPELINE;
    for (const rule of pipeline) {
      const result = runRule(request, rule);
      if (result) {
        post({ id: request.id, type: 'DEDUCTION', result });
        return;
      }
    }
    post({ id: request.id, type: 'NO_RESULT' });
  } catch (error) {
    post({
      id: request.id,
      type: 'ERROR',
      message: error instanceof Error ? error.message : String(error),
    });
  }
};

export {};
