import { normalizeCircuitFaults } from '@electrasim/domain/faults';
import type { Circuit } from '@electrasim/domain/types';
import { type Capability, requirementsForContent } from './index';

/** One classification for legacy and modern documents; automatic findings are never inputs. */
export function circuitRequirements(
  circuit: Circuit,
  diagnosis?: 'basic' | 'advanced' | 'ohmageddon',
): Capability[] {
  return requirementsForContent({
    componentTypes: circuit.components.map((c) => c.type),
    // Match the solver's active input: a client-supplied resolved flag does not
    // remove an injected fault from traversal or grant access to its behavior.
    injectedFaultTypes: normalizeCircuitFaults(circuit).map((f) => f.type),
    diagnosis,
  });
}
