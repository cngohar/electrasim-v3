/**
 * Seed circuits — initial state for the editor on first load.
 *
 * Two editable demos, one per application mode. Electrical coverage and
 * validation depend on the declared models:
 *
 * - **Student demo** (`buildStudentSeedCircuit`): a friendly two-branch
 *   bench — protected lighting (MCB → switch → bulb) and an RCBO-protected
 *   socket with earth. Small enough to read at a glance.
 * - **Pro demo** (`buildProSeedCircuit`): a three-branch drawing —
 *   two-way staircase lighting, an RCBO socket circuit, and a D-curve
 *   breaker + contactor motor starter. Exercises Validate, the diagnostics
 *   overlay, Zs checks and the Fault Lab with the single-phase motor explicitly unassessed.
 *
 * Drawing configuration (see `circuitValidation.ts`):
 * - Breaker rating = `state.customMaxAmps ?? def.maxAmps`; default cable is
 *   1.5 mm² (≈20 A clipped direct), so every breaker here declares a
 *   realistic rating ≤ its cable's ampacity.
 * - The unloaded socket declares `customCableMm2: 2.5` per its recommended
 *   conductor, and sits behind an RCBO (RCD-on-sockets rule).
 * - The motor sits behind a **D-curve** breaker (inrush rule) and both its
 *   conductors route through the contactor (conductor-bypass rule).
 *
 * Built using real domain primitives so the simulation engine and the
 * renderer see the exact shapes a user-drawn circuit would produce. The
 * layout targets the 1200×720 logical canvas with COMP_W=100 / COMP_H=70.
 */

import type { Circuit, ComponentInstance, WireInstance } from '@electrasim/domain';
import { COMPONENT_DEFS } from '@electrasim/domain';

let nextId = 0;
const uid = (prefix: string) => `${prefix}${++nextId}`;

const C = (
  type: string,
  x: number,
  y: number,
  state: ComponentInstance['state'] = {},
): ComponentInstance => {
  if (!COMPONENT_DEFS[type]) throw new Error(`seed: unknown type "${type}"`);
  return { id: uid(`${type.split('-')[0]}-`), type, x, y, state };
};

const W = (
  from: { c: ComponentInstance; p: number },
  to: { c: ComponentInstance; p: number },
): WireInstance => ({
  id: uid('w-'),
  fromComponentId: from.c.id,
  fromPortIndex: from.p,
  toComponentId: to.c.id,
  toPortIndex: to.p,
  controlPoints: [],
});

const resolveSocket = (socketTypeArg: string) =>
  COMPONENT_DEFS[socketTypeArg] ? socketTypeArg : 'socket-3pin';

/** Student bench with modeled incandescent lighting: protected light + RCBO socket. */
export function buildStudentSeedCircuit(socketTypeArg = 'socket-3pin'): Circuit {
  const socketType = resolveSocket(socketTypeArg);
  // Deterministic ids: reset the counter so every call produces the same
  // component/wire ids — callers rebuild an identical seed to detect the
  // "untouched demo" state (see circuitStore.swapDemoSocketForPlug).
  nextId = 0;

  // ── Supply rail (left column) ─────────────────────────────────────────
  const live = C('live-terminal', 110, 150);
  const neutral = C('neutral-terminal', 110, 420);
  const earth = C('earth-terminal', 110, 640);

  // ── Branch 1: protected lighting — MCB 6 A → switch → bulb ────────────
  const mcb = C('mcb', 330, 150, { on: true, customMaxAmps: 6 });
  const sw = C('single-way-switch', 560, 150, { on: true });
  const bulb = C('bulb-incandescent', 790, 150);

  // ── Branch 2: RCBO-protected socket with earth ────────────────────────
  const rcbo = C('rcbo', 330, 420, { on: true, customMaxAmps: 20 });
  const socket = C(socketType, 560, 420, { customCableMm2: 2.5 });

  const components = [live, neutral, earth, mcb, sw, bulb, rcbo, socket];
  const wires = [
    // Lighting: L → MCB → switch → bulb → N
    W({ c: live, p: 0 }, { c: mcb, p: 0 }),
    W({ c: mcb, p: 1 }, { c: sw, p: 0 }),
    W({ c: sw, p: 1 }, { c: bulb, p: 0 }),
    W({ c: bulb, p: 1 }, { c: neutral, p: 0 }),
    // Socket: both conductors route through the RCBO (two-pole)
    W({ c: live, p: 0 }, { c: rcbo, p: 0 }), // L → RCBO L-in
    W({ c: rcbo, p: 2 }, { c: socket, p: 0 }), // RCBO L-out → socket L
    W({ c: socket, p: 1 }, { c: rcbo, p: 3 }), // socket N → RCBO N-out
    W({ c: rcbo, p: 1 }, { c: neutral, p: 0 }), // RCBO N-in → N
    W({ c: earth, p: 0 }, { c: socket, p: 2 }), // PE → socket E
  ];

  return { components, wires };
}

/** Pro drawing with modeled lighting and an unassessed motor: staircase light, RCBO socket, motor. */
export function buildProSeedCircuit(socketTypeArg = 'socket-3pin'): Circuit {
  const socketType = resolveSocket(socketTypeArg);
  nextId = 0;

  // ── Supply rail ───────────────────────────────────────────────────────
  const live = C('live-terminal', 110, 110);
  const neutral = C('neutral-terminal', 110, 400);
  const earth = C('earth-terminal', 110, 650);

  // ── Branch 1: two-way staircase lighting — MCB 6 A ────────────────────
  const mcb = C('mcb', 330, 110, { on: true, customMaxAmps: 6 });
  const sw1 = C('two-way-switch', 560, 60, { on: true });
  const sw2 = C('two-way-switch', 790, 60, { on: true });
  const bulb = C('bulb-incandescent', 1010, 110);

  // ── Branch 2: RCBO-protected socket with earth ────────────────────────
  const rcbo = C('rcbo', 330, 400, { on: true, customMaxAmps: 20 });
  const socket = C(socketType, 560, 400, { customCableMm2: 2.5 });

  // ── Branch 3: motor starter — D-curve breaker → contactor → motor ─────
  // Type D satisfies the motor-inrush curve rule under every preset the
  // app ships (UK/EU require ≥ C, the US preset requires D).
  const mcbC = C('mcb-type-d', 330, 580, { on: true, customMaxAmps: 10 });
  const contactor = C('contactor', 560, 610, { on: true });
  const motor = C('motor', 790, 610);

  const components = [
    live,
    neutral,
    earth,
    mcb,
    sw1,
    sw2,
    bulb,
    rcbo,
    socket,
    mcbC,
    contactor,
    motor,
  ];
  const wires = [
    // Staircase: L → MCB → SW1 COM, travellers L1/L2, SW2 COM → bulb → N
    W({ c: live, p: 0 }, { c: mcb, p: 0 }),
    W({ c: mcb, p: 1 }, { c: sw1, p: 0 }),
    W({ c: sw1, p: 1 }, { c: sw2, p: 1 }),
    W({ c: sw1, p: 2 }, { c: sw2, p: 2 }),
    W({ c: sw2, p: 0 }, { c: bulb, p: 0 }),
    W({ c: bulb, p: 1 }, { c: neutral, p: 0 }),
    // Socket: both conductors through the RCBO
    W({ c: live, p: 0 }, { c: rcbo, p: 0 }),
    W({ c: rcbo, p: 2 }, { c: socket, p: 0 }),
    W({ c: socket, p: 1 }, { c: rcbo, p: 3 }),
    W({ c: rcbo, p: 1 }, { c: neutral, p: 0 }),
    W({ c: earth, p: 0 }, { c: socket, p: 2 }),
    // Motor: L → C-curve MCB → contactor (both conductors) → motor
    W({ c: live, p: 0 }, { c: mcbC, p: 0 }),
    W({ c: mcbC, p: 1 }, { c: contactor, p: 0 }),
    W({ c: contactor, p: 2 }, { c: motor, p: 0 }),
    W({ c: motor, p: 1 }, { c: contactor, p: 3 }),
    W({ c: contactor, p: 1 }, { c: neutral, p: 0 }),
  ];

  return { components, wires };
}

/** Demo circuit for an application mode. */
export function buildSeedCircuitForMode(
  mode: 'basic' | 'pro',
  socketTypeArg = 'socket-3pin',
): Circuit {
  return mode === 'pro'
    ? buildProSeedCircuit(socketTypeArg)
    : buildStudentSeedCircuit(socketTypeArg);
}

/**
 * Legacy entry point — the app boots in Student mode, so the default seed
 * is the Student bench. Prefer `buildSeedCircuitForMode` in new code.
 */
export function buildSeedCircuit(socketTypeArg = 'socket-3pin'): Circuit {
  return buildStudentSeedCircuit(socketTypeArg);
}
