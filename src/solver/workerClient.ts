import type { GeneratedPuzzleResult, SolverService } from '../application/solver/SolverService';
import type { WorkerRequest, WorkerResponse } from '../platform/web/solver/workerProtocol';
import type { BoardSnapshot, DeductionResult } from './types';

export type { GeneratedPuzzleResult } from '../application/solver/SolverService';

export class SolverWorkerClient implements SolverService {
  private worker: Worker | null = null;
  private sequence = 0;
  private pendingReject: ((reason?: unknown) => void) | null = null;

  private createWorker(): Worker {
    return new Worker(new URL('../workers/solver.worker.ts', import.meta.url), { type: 'module' });
  }

  cancel(reason = 'Solver cancelled'): void {
    const worker = this.worker;
    this.worker = null;
    if (worker) {
      worker.onmessage = null;
      worker.onerror = null;
      worker.terminate();
    }
    if (this.pendingReject) {
      const reject = this.pendingReject;
      this.pendingReject = null;
      reject(new Error(reason));
    }
  }

  solveStep(board: BoardSnapshot): Promise<DeductionResult | null> {
    return this.request({ id: ++this.sequence, type: 'STEP', board });
  }

  autoToQueen(board: BoardSnapshot, timeoutMs = 5000): Promise<DeductionResult | null> {
    return this.request({ id: ++this.sequence, type: 'AUTO_TO_QUEEN', board, timeoutMs }, timeoutMs);
  }

  countSolutions(board: BoardSnapshot, limit = 2, timeoutMs = 5000): Promise<number> {
    return this.requestCount({ id: ++this.sequence, type: 'COUNT_SOLUTIONS', board, limit }, timeoutMs);
  }

  generateUnique(size: number, maxAttempts = 150, timeoutMs = 10000): Promise<GeneratedPuzzleResult | null> {
    return this.dispatch({ id: ++this.sequence, type: 'GENERATE_UNIQUE', size, maxAttempts }, timeoutMs, (response) => {
      if (response.type === 'GENERATED_PUZZLE') return { board: response.board, attempts: response.attempts };
      if (response.type === 'NO_RESULT') return null;
      if (response.type === 'ERROR') throw new Error(response.message);
      throw new Error('Unexpected generator response');
    });
  }

  private request(request: WorkerRequest, timeoutMs?: number): Promise<DeductionResult | null> {
    return this.dispatch(request, timeoutMs, (response) => {
      if (response.type === 'DEDUCTION') return response.result;
      if (response.type === 'NO_RESULT') return null;
      if (response.type === 'ERROR') throw new Error(response.message);
      throw new Error('Unexpected solver response');
    });
  }

  private requestCount(request: WorkerRequest, timeoutMs?: number): Promise<number> {
    return this.dispatch(request, timeoutMs, (response) => {
      if (response.type === 'SOLUTION_COUNT') return response.count;
      if (response.type === 'ERROR') throw new Error(response.message);
      throw new Error('Unexpected solver response');
    });
  }

  private dispatch<T>(request: WorkerRequest, timeoutMs: number | undefined, map: (response: WorkerResponse) => T): Promise<T> {
    this.cancel();
    const worker = this.createWorker();
    this.worker = worker;

    return new Promise<T>((resolve, reject) => {
      this.pendingReject = reject;
      let timer: number | undefined;
      let settled = false;

      const settle = (fn: () => void) => {
        if (settled) return;
        settled = true;
        if (timer !== undefined) window.clearTimeout(timer);
        worker.onmessage = null;
        worker.onerror = null;
        if (this.worker === worker) {
          this.worker = null;
          this.pendingReject = null;
        }
        worker.terminate();
        fn();
      };

      if (timeoutMs !== undefined) {
        timer = window.setTimeout(() => {
          if (this.worker !== worker) return;
          settle(() => reject(new Error(`Solver timeout after ${timeoutMs}ms`)));
        }, timeoutMs);
      }

      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        if (event.data.id !== request.id || this.worker !== worker) return;
        settle(() => {
          try { resolve(map(event.data)); }
          catch (error) { reject(error); }
        });
      };
      worker.onerror = (event) => {
        if (this.worker !== worker) return;
        settle(() => reject(new Error(event.message || 'Solver worker failed'));
      };
      worker.postMessage(request);
    });
  }
}
