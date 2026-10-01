import type { Circuit, ComponentInstance, WireInstance } from '../types';

/** Explicit IDs and wiring keep audit cases replayable across runtimes. */
export const component = (
  id: string,
  type: string,
  state: ComponentInstance['state'] = {},
): ComponentInstance => ({ id, type, x: 0, y: 0, state });

export const wire = (
  id: string,
  fromComponentId: string,
  fromPortIndex: number,
  toComponentId: string,
  toPortIndex: number,
): WireInstance => ({
  id,
  fromComponentId,
  fromPortIndex,
  toComponentId,
  toPortIndex,
  controlPoints: [],
});

export function protectedLoad(type = 'mcb', watts = 7400, rating = 16): Circuit {
  const twoPole = ['rcd', 'rcbo', 'main-switch', 'afdd', 'socket-gfci'].includes(type);
  return {
    components: [
      component('l', 'live-terminal'),
      component('n', 'neutral-terminal'),
      component('device', type, { on: true, customMaxAmps: rating }),
      component('load', 'space-heater', { customPowerWatts: watts }),
    ],
    wires: [
      wire('feed', 'l', 0, 'device', 0),
      wire('branch', 'device', twoPole ? 2 : 1, 'load', 0),
      wire('return', 'load', 1, twoPole ? 'device' : 'n', twoPole ? 3 : 0),
      ...(twoPole ? [wire('neutral-feed', 'n', 0, 'device', 1)] : []),
    ],
  };
}

export function parallelLoads(): Circuit {
  return {
    components: [
      component('l', 'live-terminal'),
      component('n', 'neutral-terminal'),
      component('heater', 'space-heater'),
      component('lamp', 'bulb'),
    ],
    wires: [
      wire('heater-feed', 'l', 0, 'heater', 0),
      wire('heater-return', 'heater', 1, 'n', 0),
      wire('lamp-feed', 'l', 0, 'lamp', 0),
      wire('lamp-return', 'lamp', 1, 'n', 0),
    ],
  };
}
