import type { BoardSnapshot, DeductionResult, WorkerRequest, WorkerResponse } from './types';

export class SolverWorkerClient {
  private worker: Worker | null = null;
  private sequence = 0;

  private createWorker(): Worker {
    return new Worker(new URL('../workers/solver.worker.ts', import.meta.url), { type: 'module' });
  }

  cancel(): void {
    this.worker?.terminate();
    this.worker = null;
  }

  async solveStep(board: BoardSnapshot): Promise<DeductionResult | null> {
    return this.request({ id: ++this.sequence, type: 'STEP', board });
  }

  async autoToQueen(board: BoardSnapshot, timeoutMs = 5000): Promise<DeductionResult | null> {
    const id = ++this.sequence;
    const timer = window.setTimeout(() => this.cancel(), timeoutMs);
    try {
      return await this.request({ id, type: 'AUTO_TO_QUEEN', board, timeoutMs });
    } finally {
      window.clearTimeout(timer);
    }
  }

  private request(request: WorkerRequest): Promise<DeductionResult | null> {
    this.cancel();
    const worker = this.createWorker();
    this.worker = worker;
    return new Promise((resolve, reject) => {
      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        if (event.data.id !== request.id) return;
        this.cancel();
        if (event.data.type === 'DEDUCTION') resolve(event.data.result);
        else if (event.data.type === 'NO_RESULT') resolve(null);
        else if (event.data.type === 'ERROR') reject(new Error(event.data.message));
        else reject(new Error('Unexpected solver response'));
      };
      worker.onerror = (event) => {
        this.cancel();
        reject(new Error(event.message || 'Solver worker failed'));
      };
      worker.postMessage(request);
    });
  }
}
