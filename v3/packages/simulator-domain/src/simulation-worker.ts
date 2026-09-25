import type { CircuitDocument } from "./model.ts";
import { runSimulation } from "./simulation.ts";

declare const self: Worker;

self.onmessage = (
  event: MessageEvent<{
    readonly circuit: CircuitDocument;
    readonly durationMs: number;
    readonly stepMs: number;
  }>,
) => {
  try {
    self.postMessage({
      run: runSimulation(event.data.circuit, event.data.durationMs, event.data.stepMs),
    });
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : "simulation_worker_failed",
    });
  }
};
