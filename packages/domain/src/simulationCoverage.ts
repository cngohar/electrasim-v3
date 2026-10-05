import { COMPONENT_DEFS } from './components';
import { DIMMER_APPROXIMATION } from './core/dimmerModel';
import { compareIds } from './core/faultTopology';
import { resolveDeviceModel } from './core/models';
import { resolveComponentState } from './core/normalize';
import { configuredSupplySources, sameSupplyModel } from './core/supplies';
import { TIMER_APPROXIMATION } from './core/timerModel';
import type { Circuit, ComponentDef, SimulationLimitation } from './types';

/** Temporary explicit coverage boundary until the replacement device models ship.
 * A drawing stays editable/exportable; unsupported physics must not yield invented
 * voltages, trips or a successful validation score. This is not an access policy.
 */
export function getLegacySimulationLimitations(
  circuit: Circuit,
  defs: Record<string, ComponentDef> = COMPONENT_DEFS,
): SimulationLimitation[] {
  const limitations: SimulationLimitation[] = [];
  const sources = configuredSupplySources(circuit);
  const first = sources[0]?.profile.model;
  if (first && sources.some((source) => !sameSupplyModel(source.profile.model, first))) {
    for (const source of sources)
      limitations.push({
        code: 'independent-source-model',
        componentId: source.componentId,
        blocking: true,
        message:
          'Different or conflicting source profiles require the new independent-source solver. Legacy rail measurements are unavailable.',
      });
  }
  for (const component of circuit.components) {
    const def = defs[component.type];
    if (!def) continue;
    const add = (code: SimulationLimitation['code'], detail: string, blocking = true) => {
      limitations.push({
        code,
        componentId: component.id,
        message: `${def.label}: ${detail}`,
        blocking,
      });
    };
    const configured = sources.find((s) => s.componentId === component.id)?.profile.model;
    if (configured?.kind === 'dc' && component.type !== 'dc-battery-12v') {
      add(
        'dc-source-model',
        'This source is configured for DC. DC voltage and load response await the new solver; electrical measurements are unavailable.',
      );
    } else if (configured?.kind === 'ac-three-phase') {
      add(
        'three-phase-model',
        'The saved three-phase profile requires explicit phase terminals and the three-phase solver; electrical measurements are unavailable.',
      );
    } else if (def.category === 'transformer') {
      add(
        'transformer-model',
        'transformer voltage conversion and winding isolation are not assessed. Electrical simulation is unavailable for this circuit.',
      );
    } else if (component.type === 'dc-battery-12v' || component.type === 'solar-pv-panel') {
      add(
        'dc-source-model',
        'DC source voltage and AC/DC compatibility are not assessed. Electrical simulation is unavailable for this circuit.',
      );
    } else if (
      component.type === 'distribution-board-3phase' ||
      (def.isLoad &&
        !def.ports.some((p) => p.type === 'neutral') &&
        def.ports.filter((p) => p.type === 'live').length >= 3)
    ) {
      add(
        'three-phase-model',
        'three-phase supply, phase loss and motor operation are not assessed. Electrical simulation is unavailable for this circuit.',
      );
    } else if (def.category === 'timer') {
      add(
        'timing-model',
        'only manual switch continuity is modeled; schedules and time delays are not assessed.',
        false,
      );
    } else if (def.isDimmer) {
      add(
        'dimming-model',
        'only on/off continuity is modeled; dimming level and load response are not assessed.',
        false,
      );
    }
  }
  return limitations;
}

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
        model.supply.kind === 'ac-three-phase') ||
      component.type === 'motor-3phase' ||
      component.type === 'distribution-board-3phase'
    ) {
      add(
        'three-phase-model',
        'Three-phase equations and device operation are not assessed.',
        true,
      );
    } else if (model.kind === 'unassessed') {
      add('device-model', model.reason, true);
    } else if (model.kind === 'unassessed-load') {
      add(
        'load-model',
        `${model.reason} Only legacy continuity observations are available; numerical measurements and operation are not assessed.`,
      );
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
