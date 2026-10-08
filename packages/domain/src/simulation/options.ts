import type { StandardId } from '../standards';
import type { ComponentDef } from '../types';

export interface SimulateOptions {
  /** Explicit transient state; omit to reset. */
  simulationState?: import('../core/contracts').ElectricalSimulationState;
  /** Simulated time, not wall time. Omit for a zero-time solve. */
  deltaSeconds?: number;
  /** Override the registry (used in tests). Defaults to COMPONENT_DEFS. */
  defs?: Record<string, ComponentDef>;
  /** Presentation compatibility only. Electrical behavior is identical in both modes. */
  appMode?: 'basic' | 'pro';
  /** Teaching profile. US device timing is not assessed; choosing a profile
   * never changes a component's physical residual-current rating. */
  standard?: StandardId;
}
