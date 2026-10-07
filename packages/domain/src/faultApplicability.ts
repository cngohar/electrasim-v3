import { COMPONENT_DEFS } from './components';
import type { Circuit, FaultTarget, FaultType } from './types';

export interface FaultApplicability {
  applicable: boolean;
  coverage: 'supported' | 'not-assessed';
  reason: string;
}

/** Physical target guidance shared by every Fault Lab entry point. Imports
 * remain readable even when their fault needs an undeclared conductor/model. */
export function assessFaultTarget(
  circuit: Circuit,
  type: FaultType,
  target: FaultTarget,
): FaultApplicability {
  const unavailable = (reason: string): FaultApplicability => ({
    applicable: false,
    coverage: 'not-assessed',
    reason,
  });
  const answer = (supported: boolean, reason: string): FaultApplicability => ({
    applicable: true,
    coverage: supported ? 'supported' : 'not-assessed',
    reason,
  });
  const role =
    type === 'open-live'
      ? 'live'
      : type === 'open-neutral'
        ? 'neutral'
        : type === 'open-earth'
          ? 'earth'
          : null;
  if (target.type === 'wire') {
    const wire = circuit.wires.find((w) => w.id === target.id);
    if (!wire) return unavailable('The wire no longer exists.');
    const from = circuit.components.find((c) => c.id === wire.fromComponentId);
    const to = circuit.components.find((c) => c.id === wire.toComponentId);
    const a = from && COMPONENT_DEFS[from.type]?.ports[wire.fromPortIndex]?.type;
    const b = to && COMPONENT_DEFS[to.type]?.ports[wire.toPortIndex]?.type;
    if (!a || !b) return unavailable('The wire endpoints are invalid.');
    if (role && (a !== role || b !== role))
      return unavailable(`Select a ${role} conductor for this break.`);
    if (type === 'open-circuit' || role)
      return answer(true, 'Opens this conductor; no trip or damage is implied.');
    if (['short-circuit', 'earth-fault', 'live-to-earth', 'reverse-polarity'].includes(type))
      return answer(
        false,
        'This wire fault has no declared second conductor or impedance. Its electrical effect is not assessed.',
      );
    return unavailable('This fault requires a component or terminal target.');
  }
  const id = target.type === 'component' ? target.id : target.componentId;
  const component = circuit.components.find((c) => c.id === id);
  const def = component && COMPONENT_DEFS[component.type];
  if (!def) return unavailable('The component no longer exists.');
  const count = (name: string) => def.ports.filter((p) => p.type === name).length;
  if (target.type === 'port') {
    const port = def.ports[target.portIndex];
    if (!port) return unavailable('The terminal does not exist.');
    if (role && port.type !== role) return unavailable(`Select a ${role} terminal.`);
    if (type === 'terminal-disconnect' || type === 'open-circuit' || role)
      return answer(true, 'Opens the named terminal connection.');
    return unavailable('Select a component with a declared conductor pair for this fault.');
  }
  if (type === 'terminal-disconnect')
    return unavailable('Select the specific terminal to disconnect.');
  if (role)
    return count(role)
      ? answer(true, `Opens the component's ${role} connections.`)
      : unavailable(`This component has no ${role} terminal.`);
  if (type === 'open-circuit')
    return def.isSource
      ? unavailable('Disconnect a source terminal or its wire instead.')
      : answer(true, 'Opens the component conduction paths.');
  if (type === 'reverse-polarity')
    return count('live') === 1 && count('neutral') === 1
      ? answer(true, 'Swaps the component live and neutral connections.')
      : unavailable('A unique live and neutral pair is required.');
  if (type === 'short-circuit')
    return count('live') === 1 && count('neutral') === 1
      ? answer(
          true,
          'Bridges the component live and neutral pair. Fault current and clearing depend on the declared circuit.',
        )
      : unavailable('A unique live and neutral pair is required.');
  if (type === 'earth-fault' || type === 'live-to-earth')
    return count('live') === 1 && count('earth') === 1
      ? answer(
          type === 'earth-fault',
          type === 'earth-fault'
            ? 'Bridges live to the component PE terminal. Clearing requires supported protection.'
            : 'Leakage impedance is unspecified; residual current and tripping are not assessed.',
        )
      : unavailable('A unique live and protective earth pair is required.');
  if (type === 'protection-bypass' || type === 'protection-forced-open')
    return def.isProtection
      ? answer(
          true,
          type === 'protection-bypass'
            ? 'Routes current outside the sensed poles; protection is bypassed.'
            : 'Keeps protective contacts open.',
        )
      : unavailable('Select a protective device.');
  if (type === 'switched-neutral')
    return def.isSwitch
      ? answer(
          false,
          'This saved fault has no declared neutral conductor mapping; its effect is not assessed.',
        )
      : unavailable('Select a switch.');
  if (type === 'smooth-dc-residual')
    return count('live') && count('earth')
      ? answer(
          false,
          'DC residual waveform and device saturation are not modeled; no automatic trip is assessed.',
        )
      : unavailable('A live and protective earth connection are required.');
  return count('live')
    ? answer(false, 'Arc waveform detection and automatic AFDD operation are not modeled.')
    : unavailable('A live conductor is required.');
}
