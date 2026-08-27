/** IDs accepted by the app's existing `?template=` entry point. */
export const GUIDED_CIRCUIT_IDS = [
  'simple-lamp',
  'one-way-light-switch',
  'two-way-staircase-light',
  'rcd-earth-fault-demo',
  'contactor-motor',
  'timer-bell',
  'push-button-doorbell',
  'rcbo-protected-socket',
  // Pro toolbox
  'pro-3phase-dol-starter',
  'pro-ev-charger-circuit',
  'pro-solar-dc-system',
  'pro-underfloor-heating',
  'pro-staircase-timer',
  'pro-pir-floodlight',
  'pro-cooker-induction',
  'pro-spd-consumer-unit',
  'pro-generator-backup',
  'pro-afdd-bedroom',
] as const;

export type GuidedCircuitId = (typeof GUIDED_CIRCUIT_IDS)[number];

const guidedCircuitIdSet = new Set<string>(GUIDED_CIRCUIT_IDS);

export function isGuidedCircuitId(value: string): value is GuidedCircuitId {
  return guidedCircuitIdSet.has(value);
}
