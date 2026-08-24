/**
 * sim.worker — runs the pure `simulate()` engine off the main thread.
 *
 * Vite's `?worker` import (used in `client.ts`) bundles this module into
 * a separate ES-module worker. Comlink wraps the API so the main thread
 * can call `worker.simulate(circuit)` like an async function.
 *
 * The simulation domain is fully pure (no DOM, no React, no globals), so
 * the worker bundle stays small and portable.
 */

import * as Comlink from 'comlink';
import { simulate } from '../domain/simulation/simulate';
import type { SimulateOptions } from '../domain/simulation/simulate';
import type { Circuit, SimulationResult } from '../domain/types';

const api = {
  simulate(circuit: Circuit, options?: SimulateOptions): SimulationResult {
    return simulate(circuit, options);
  },
};

export type SimWorkerApi = typeof api;

Comlink.expose(api);
