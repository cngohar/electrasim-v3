/**
 * Component registry — the catalogue of every electrical component the editor
 * can place. Each entry is a pure data record (a `ComponentDef`) describing
 * the component's behavioural flags, its ports, and presentation hints.
 *
 * The registry is queried by:
 *   - the simulation engine (behavioural flags, port types)
 *   - the renderer (icon, port positions, grid size)
 *   - the palette UI (label, description, category)
 *
 * Adding a new component = add an entry here and ensure tests cover its
 * behavioural flags. No code changes elsewhere are needed.
 */

import type { ComponentDef } from '../types';

// ─── Visual constants (component box, grid, port radius) ───────────────────

export const GRID_SIZE = 30;
export const COMP_W = 100;
export const COMP_H = 70;
export const PORT_RADIUS = 7;

import { CONTROL_DEFS } from './controls';
import { FAN_AND_LOAD_DEFS } from './fansAndLoads';
import { HVAC_SOUNDER_AND_DISTRIBUTION_DEFS } from './hvacSoundersAndDistribution';
import { INDUSTRIAL_CONTROL_DEFS } from './industrialControl';
import { LIGHTING_DEFS } from './lighting';
import { PROTECTION_DEFS } from './protection';
import { SOCKET_DEFS } from './sockets';
import { SUPPLY_AND_JUNCTION_DEFS } from './suppliesAndJunctions';
// ─── Registry zones (merged in original order) ─────────────────────────────
import { SWITCH_DEFS } from './switches';
import { TIMER_DEFS } from './timers';

// ─── The registry ──────────────────────────────────────────────────────────

export const COMPONENT_DEFS: Record<string, ComponentDef> = {
  ...SWITCH_DEFS,
  ...LIGHTING_DEFS,
  ...PROTECTION_DEFS,
  ...SOCKET_DEFS,
  ...FAN_AND_LOAD_DEFS,
  ...CONTROL_DEFS,
  ...SUPPLY_AND_JUNCTION_DEFS,
  ...TIMER_DEFS,
  ...INDUSTRIAL_CONTROL_DEFS,
  ...HVAC_SOUNDER_AND_DISTRIBUTION_DEFS,
};

/** Convenience: get a def or throw a descriptive error. */
export const getDef = (
  type: string,
  registry: Record<string, ComponentDef> = COMPONENT_DEFS,
): ComponentDef => {
  const def = registry[type];
  if (!def) {
    throw new Error(`Unknown component type "${type}". Did you register it in COMPONENT_DEFS?`);
  }
  return def;
};
