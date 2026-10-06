import { earthingAcceptanceCircuits } from '../core/earthingFixtures';
/** Actual catalogue drawings for domain, real Comlink and local Hono acceptance. */
import { mnaAcceptanceCircuits } from '../core/mnaFixtures';
import { motorAcceptanceCircuits } from '../core/motorFixtures';
import { operatingPointAcceptanceCircuits } from '../core/operatingPointFixtures';
import { threePhaseAcceptanceCircuits } from '../core/threePhaseFixtures';
import { transformerAcceptanceCircuits } from '../core/transformerFixtures';
import type { Circuit } from '../types';

export function runtimeAcceptanceCircuits(): Record<string, Circuit> {
  return Object.fromEntries([
    ...Object.entries(motorAcceptanceCircuits()).map(
      ([name, circuit]) => [`motor-${name}`, circuit] as const,
    ),
    ...Object.entries(threePhaseAcceptanceCircuits()).map(
      ([name, circuit]) => [`phasor-${name}`, circuit] as const,
    ),
    ...Object.entries(mnaAcceptanceCircuits()).map(
      ([name, circuit]) => [`network-${name}`, circuit] as const,
    ),
    ...Object.entries(operatingPointAcceptanceCircuits()).map(
      ([name, circuit]) => [`load-${name}`, circuit] as const,
    ),
    ...Object.entries(transformerAcceptanceCircuits()).map(
      ([name, circuit]) => [`transformer-${name}`, circuit] as const,
    ),
    ...Object.entries(earthingAcceptanceCircuits()).map(
      ([name, circuit]) => [`earth-${name}`, circuit] as const,
    ),
  ]);
}

export function portableResult(value: unknown): unknown {
  return JSON.parse(
    JSON.stringify(value, (_key, item) => (item instanceof Set ? [...item] : item)),
  );
}
