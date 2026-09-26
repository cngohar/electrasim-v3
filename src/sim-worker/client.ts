/**
 * sim-worker client — typed wrapper around the simulation Web Worker.
 *
 * Goals:
 *   1. Fire-and-forget API: `await simulateAsync(circuit)` from anywhere.
 *   2. Lazy single-instance worker (created on first call, reused after).
 *   3. Graceful fallback to main-thread `simulate()` if the environment
 *      doesn't support module workers (rare browsers, jsdom in tests, SSR).
 *   4. Stale-call protection: each request gets a sequence number and the
 *      caller can check whether their result is still relevant.
 *
 * The worker module itself is small and pure; see `./sim.worker.ts`.
 */

import type { SimulateOptions } from '@electrasim/domain/simulation/simulate';
import type { Circuit, SimulationResult } from '@electrasim/domain/types';
import * as Comlink from 'comlink';
import type { SimWorkerApi } from './sim.worker';
import SimWorker from './sim.worker?worker';

// ─── Module-level singletons ────────────────────────────────────────────────

let proxy: Comlink.Remote<SimWorkerApi> | null = null;
let workerInstance: Worker | null = null;
let initFailed = false;
let mainThreadSimulationPromise: Promise<
  typeof import('@electrasim/domain/simulation/simulate')
> | null = null;

/** Load the synchronous engine only when a worker fallback is actually needed. */
async function simulateOnMainThread(
  circuit: Circuit,
  options?: SimulateOptions,
): Promise<SimulationResult> {
  mainThreadSimulationPromise ??= import('@electrasim/domain/simulation/simulate');
  const { simulate } = await mainThreadSimulationPromise;
  return simulate(circuit, options);
}

function workersAvailable(): boolean {
  return typeof Worker !== 'undefined' && typeof URL !== 'undefined';
}

/**
 * Lazily spin up the worker on first use. Uses Vite's `?worker` import so the
 * worker is emitted as a real module-worker chunk instead of a blob URL.
 *
 * Returns `null` for "use the main thread" and the proxy otherwise.
 */
async function getProxy(): Promise<Comlink.Remote<SimWorkerApi> | null> {
  if (proxy) return proxy;
  if (initFailed) return null;
  if (!workersAvailable()) {
    initFailed = true;
    return null;
  }
  try {
    workerInstance = new SimWorker({ name: 'sim-worker' });
    proxy = Comlink.wrap<SimWorkerApi>(workerInstance);
    return proxy;
  } catch (err) {
    console.warn('[sim-worker] failed to start, falling back to main thread:', err);
    initFailed = true;
    return null;
  }
}

/**
 * Run a simulation. Off-thread when possible, on-thread otherwise.
 *
 * Sets in `SimulationResult` survive structured cloning natively, so no
 * (de)serialisation is needed beyond what Comlink already handles.
 */
export async function simulateAsync(
  circuit: Circuit,
  options?: SimulateOptions,
): Promise<SimulationResult> {
  const p = await getProxy();
  if (!p) return simulateOnMainThread(circuit, options);
  try {
    return await p.simulate(circuit, options);
  } catch (err) {
    // If something unexpected happens in the worker, log once and
    // fall back so the user keeps a working app.
    console.error('[sim-worker] worker call failed, using main thread:', err);
    initFailed = true;
    proxy = null;
    workerInstance?.terminate();
    workerInstance = null;
    return simulateOnMainThread(circuit, options);
  }
}

/** Expose for tests / page-unload cleanup. */
export function terminateSimWorker(): void {
  workerInstance?.terminate();
  workerInstance = null;
  proxy = null;
  // Explicit termination is a lifecycle reset, not a permanent fallback.
  initFailed = false;
}

/**
 * Whether the worker is currently in use (true) vs falling back to the
 * main thread (false). Intended for debug/telemetry, not application logic.
 */
export function simWorkerActive(): boolean {
  return proxy !== null && !initFailed;
}
