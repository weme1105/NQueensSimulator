import type { BoardSnapshot, DeductionResult, WorkerRequest, WorkerResponse } from './types';

export class SolverWorkerClient {
  private worker: Worker | null = null;
  private sequence = 0;
  private pendingReject: ((reason?: unknown) => void) | null = null;

  private createWorker(): Worker {
    return new Worker(new URL('../workers/solver.worker.ts', import.meta.url), { type: 'module' });
  }

  cancel(reason = 'Solver cancelled'): void {
    this.worker?.terminate();
    this.worker = null;
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
      const settle = (fn: () => void) => {
        if (timer !== undefined) window.clearTimeout(timer);
        this.pendingReject = null;
        worker.terminate();
        if (this.worker === worker) this.worker = null;
        fn();
      };

      if (timeoutMs !== undefined) {
        timer = window.setTimeout(() => {
          if (this.worker !== worker) return;
          this.worker = null;
          this.pendingReject = null;
          worker.terminate();
          reject(new Error(`Solver timeout after ${timeoutMs}ms`));
        }, timeoutMs);
      }

      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        if (event.data.id !== request.id) return;
        settle(() => {
          try { resolve(map(event.data)); }
          catch (error) { reject(error); }
        });
      };
      worker.onerror = (event) => settle(() => reject(new Error(event.message || 'Solver worker failed')));
      worker.postMessage(request);
    });
  }
}
