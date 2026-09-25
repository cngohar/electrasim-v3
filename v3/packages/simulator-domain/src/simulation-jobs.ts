import type { CircuitDocument } from "./model.ts";
import type { SimulationRun } from "./simulation.ts";

export interface SimulationJobHost {
  run(
    circuit: CircuitDocument,
    durationMs: number,
    stepMs: number,
    signal?: AbortSignal,
  ): Promise<SimulationRun>;
}

interface QueuedJob {
  readonly circuit: CircuitDocument;
  readonly durationMs: number;
  readonly stepMs: number;
  readonly signal?: AbortSignal;
  readonly resolve: (run: SimulationRun) => void;
  readonly reject: (error: Error) => void;
}

/** Bounded one-job-per-worker host; termination is the cancellation boundary. */
export class WorkerSimulationJobHost implements SimulationJobHost {
  private active = 0;
  private readonly queue: QueuedJob[] = [];

  constructor(
    private readonly workerUrl: URL,
    private readonly options: {
      readonly maximumConcurrent?: number;
      readonly maximumQueued?: number;
      readonly timeoutMs?: number;
    } = {},
  ) {}

  run(
    circuit: CircuitDocument,
    durationMs: number,
    stepMs: number,
    signal?: AbortSignal,
  ): Promise<SimulationRun> {
    if (signal?.aborted) return Promise.reject(new Error("simulation_cancelled"));
    if (this.queue.length >= (this.options.maximumQueued ?? 16))
      return Promise.reject(new Error("simulation_queue_full"));
    return new Promise((resolve, reject) => {
      this.queue.push({
        circuit,
        durationMs,
        stepMs,
        ...(signal ? { signal } : {}),
        resolve,
        reject,
      });
      this.drain();
    });
  }

  private drain(): void {
    const maximumConcurrent = this.options.maximumConcurrent ?? 2;
    while (this.active < maximumConcurrent) {
      const job = this.queue.shift();
      if (!job) return;
      if (job.signal?.aborted) {
        job.reject(new Error("simulation_cancelled"));
        continue;
      }
      this.active += 1;
      this.execute(job).finally(() => {
        this.active -= 1;
        this.drain();
      });
    }
  }

  private async execute(job: QueuedJob): Promise<void> {
    const worker = new Worker(this.workerUrl.href);
    const timeoutMs = this.options.timeoutMs ?? 5_000;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const cancelled = () => worker.terminate();
    job.signal?.addEventListener("abort", cancelled, { once: true });
    try {
      const run = await new Promise<SimulationRun>((resolve, reject) => {
        timeout = setTimeout(() => {
          worker.terminate();
          reject(new Error("simulation_timeout"));
        }, timeoutMs);
        worker.onmessage = (event: MessageEvent<{ run?: SimulationRun; error?: string }>) => {
          if (event.data.error) reject(new Error(event.data.error));
          else if (event.data.run) resolve(event.data.run);
          else reject(new Error("simulation_worker_protocol"));
        };
        worker.onerror = () => reject(new Error("simulation_worker_failed"));
        worker.postMessage({
          circuit: job.circuit,
          durationMs: job.durationMs,
          stepMs: job.stepMs,
        });
      });
      if (job.signal?.aborted) job.reject(new Error("simulation_cancelled"));
      else job.resolve(run);
    } catch (error) {
      job.reject(error instanceof Error ? error : new Error("simulation_worker_failed"));
    } finally {
      if (timeout) clearTimeout(timeout);
      job.signal?.removeEventListener("abort", cancelled);
      worker.terminate();
    }
  }
}
