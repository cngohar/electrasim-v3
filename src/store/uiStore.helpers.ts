/**
 * UI-store entity factories and onboarding (welcome / mobile-suitability)
 * persistence helpers.
 *
 * Split verbatim from the former monolithic `uiStore.ts`. Leaf module —
 * imports nothing from the store, so the store can use it during
 * `create()` without an import cycle.
 */

import { COMPONENT_DEFS, type ComponentInstance, type WireInstance } from '@electrasim/domain';

let nextEntityId = 0;

function uniqueEntityId(prefix: string, existingIds: Iterable<string>): string {
  const existing = new Set(existingIds);
  let id = '';
  do {
    id = `${prefix}-${Date.now().toString(36)}-${(++nextEntityId).toString(36)}`;
  } while (existing.has(id));
  return id;
}

function createComponent(type: string, x: number, y: number, existingIds: Iterable<string>) {
  const def = COMPONENT_DEFS[type];
  if (!def) return null;
  return {
    id: uniqueEntityId(type.split('-')[0] ?? 'component', existingIds),
    type,
    x,
    y,
    state: def.defaultOn ? { on: true } : {},
  } satisfies ComponentInstance;
}

function createWire(
  endpoints: Omit<WireInstance, 'id' | 'controlPoints' | 'pathKind'>,
  existingIds: Iterable<string>,
): WireInstance {
  return {
    id: uniqueEntityId('wire', existingIds),
    ...endpoints,
    controlPoints: [],
    pathKind: 'orthogonal',
  };
}

export const MOBILE_SUITABILITY_STORAGE_KEY = 'electrasim:mobile-suitability:v1';
const PHONE_BREAKPOINT = 640;

export function shouldShowMobileSuitability(width: number, acknowledged: boolean): boolean {
  return width < PHONE_BREAKPOINT && !acknowledged;
}

function hasWelcomed(): boolean {
  try {
    return (
      typeof window !== 'undefined' && window.localStorage.getItem('electrasim:welcomed') === '1'
    );
  } catch {
    return false;
  }
}

function markWelcomed(): void {
  try {
    window.localStorage.setItem('electrasim:welcomed', '1');
  } catch {
    // The editor remains usable when storage is disabled or unavailable.
  }
}

function hasAcknowledgedMobileSuitability(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      window.localStorage.getItem(MOBILE_SUITABILITY_STORAGE_KEY) === '1'
    );
  } catch {
    return false;
  }
}

function markMobileSuitabilityAcknowledged(): void {
  try {
    window.localStorage.setItem(MOBILE_SUITABILITY_STORAGE_KEY, '1');
  } catch {
    // The advisory can still be dismissed for this session when storage is unavailable.
  }
}

const mobileSuitabilityInitiallyOpen =
  typeof window !== 'undefined' &&
  shouldShowMobileSuitability(window.innerWidth, hasAcknowledgedMobileSuitability());

export {
  createComponent,
  createWire,
  hasWelcomed,
  markWelcomed,
  markMobileSuitabilityAcknowledged,
  mobileSuitabilityInitiallyOpen,
  uniqueEntityId,
};
