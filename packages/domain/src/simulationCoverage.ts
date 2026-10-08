import { COMPONENT_DEFS } from './components';
import { DIMMER_APPROXIMATION } from './core/dimmerModel';
import { compareIds } from './core/faultTopology';
import { resolveDeviceModel } from './core/models';
import { resolveComponentState } from './core/normalize';
import { TIMER_APPROXIMATION } from './core/timerModel';
import type { Circuit, ComponentDef, SimulationLimitation } from './types';

/** Current runtime coverage. Known DC/isolated-transformer models no longer carry
 * the retired rail solver's blanket block. Static contacts do not imply trips. */
export function getSimulationLimitations(
  circuit: Circuit,
  defs: Record<string, ComponentDef> = COMPONENT_DEFS,
): SimulationLimitation[] {
  const limitations: SimulationLimitation[] = [];
  for (const component of circuit.components) {
    const def = defs[component.type];
    if (!def) continue;
    const model = resolveDeviceModel(
      { ...component, state: resolveComponentState(component.state, def) },
      def,
      circuit,
    );
    const add = (code: SimulationLimitation['code'], message: string, blocking = false) =>
      limitations.push({
        code,
        componentId: component.id,
        message: `${def.label}: ${message}`,
        blocking,
      });
    if (
      ((model.kind === 'source' || model.kind === 'source-alias') &&
        model.supply.kind === 'ac-three-phase' &&
        !(model.kind === 'source' && model.phasePorts)) ||
      (component.type === 'motor-3phase' && model.kind !== 'three-phase-motor')
    ) {
      add(
        'three-phase-model',
        'Three-phase equations and device operation are not assessed.',
        true,
      );
    } else if (model.kind === 'source' && model.phasePorts) {
      add(
        'three-phase-model',
        'Declared resistive phasor, motor-equivalent and coil readings are supported. Reactive behavior, timed protection, damage and repair assessment remain unassessed.',
      );
    } else if (model.kind === 'unassessed') {
      add('device-model', model.reason, true);
    } else if (model.kind === 'unassessed-load') {
      add('load-model', `${model.reason} Numerical measurements and operation are not assessed.`);
    } else if (model.kind === 'contacts' && model.dimmer) {
      add('dimming-model', DIMMER_APPROXIMATION);
    } else if (model.kind === 'contacts' && model.protectionModel) {
      add(
        'protection-model',
        'Declared protection ratings use the deterministic simulation step; static `solveCircuit()` never moves a trip. Damage and coordination are not assessed.',
      );
    } else if (model.kind === 'contacts' && model.timerModel) {
      add('timing-model', TIMER_APPROXIMATION);
    } else if (model.kind === 'contacts' && model.limitation) {
      add(
        def.isDimmer
          ? 'dimming-model'
          : def.category === 'timer'
            ? 'timing-model'
            : 'control-model',
        model.limitation,
      );
    }
    if (def.isProtection && !(model.kind === 'contacts' && model.protectionModel))
      add(
        'protection-model',
        'Static contact current can be calculated. Timed tripping, residual operation and damage are not assessed by the MNA model.',
      );
  }
  return limitations.sort(
    (a, b) => compareIds(a.componentId, b.componentId) || compareIds(a.code, b.code),
  );
}
