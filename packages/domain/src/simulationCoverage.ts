import { COMPONENT_DEFS } from './components';
import { configuredSupplySources, sameSupplyModel } from './core/supplies';
import type { Circuit, ComponentDef, SimulationLimitation } from './types';

/** Temporary explicit coverage boundary until the replacement device models ship.
 * A drawing stays editable/exportable; unsupported physics must not yield invented
 * voltages, trips or a successful validation score. This is not an access policy.
 */
export function getSimulationLimitations(
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
