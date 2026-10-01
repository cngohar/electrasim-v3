import { COMPONENT_DEFS } from './components';
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
    if (def.category === 'transformer') {
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
