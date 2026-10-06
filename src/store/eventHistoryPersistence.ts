/**
 * Durable persistence for the Pro Simulation History audit trail.
 *
 * History is intentionally stored separately from the circuit: clearing or
 * importing a drawing must not silently erase the classroom audit record.
 */

import { get, set } from 'idb-keyval';
import { useUiStore } from './uiStore';
import type { EventHistoryEntry } from './uiStore.types';

const STORAGE_KEY = 'electrasim:event-history:v1';
const SCHEMA_VERSION = 1 as const;
const MAX_EVENTS = 100;
const DEBOUNCE_MS = 150;

const EVENT_TYPES = new Set<EventHistoryEntry['eventType']>([
  'fault_detected',
  'fault_injected',
  'component_tripped',
  'wire_overheated',
  'component_blown',
  'wire_melted',
  'fault_cleared',
  'component_repaired',
  'regulatory_violation',
  'manual_intervention',
]);
const SEVERITIES = new Set<EventHistoryEntry['severity']>(['critical', 'warning', 'info']);

interface PersistedEventHistory {
  version: typeof SCHEMA_VERSION;
  events: EventHistoryEntry[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function optionalFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/** Rebuild untrusted IndexedDB data from a strict whitelist. */
export function parsePersistedEventHistory(value: unknown): EventHistoryEntry[] | null {
  if (!isRecord(value) || value.version !== SCHEMA_VERSION || !Array.isArray(value.events)) {
    return null;
  }

  const events: EventHistoryEntry[] = [];
  for (const raw of value.events) {
    if (!isRecord(raw)) continue;
    if (
      typeof raw.id !== 'string' ||
      typeof raw.timestamp !== 'number' ||
      !Number.isFinite(raw.timestamp) ||
      typeof raw.eventType !== 'string' ||
      !EVENT_TYPES.has(raw.eventType as EventHistoryEntry['eventType']) ||
      typeof raw.description !== 'string' ||
      typeof raw.severity !== 'string' ||
      !SEVERITIES.has(raw.severity as EventHistoryEntry['severity'])
    ) {
      continue;
    }

    const details = isRecord(raw.details)
      ? {
          simulatedSeconds: optionalFiniteNumber(raw.details.simulatedSeconds),
          modelVersion: optionalString(raw.details.modelVersion),
          currentAmps: optionalFiniteNumber(raw.details.currentAmps),
          voltage: optionalFiniteNumber(raw.details.voltage),
          cableMm2: optionalFiniteNumber(raw.details.cableMm2),
          reason: optionalString(raw.details.reason),
          faultType: optionalString(raw.details.faultType),
          issueId: optionalString(raw.details.issueId),
          standard: optionalString(raw.details.standard),
        }
      : undefined;

    events.push({
      id: raw.id,
      timestamp: raw.timestamp,
      eventType: raw.eventType as EventHistoryEntry['eventType'],
      description: raw.description,
      severity: raw.severity as EventHistoryEntry['severity'],
      componentName: optionalString(raw.componentName),
      componentType: optionalString(raw.componentType),
      componentId: optionalString(raw.componentId),
      wireId: optionalString(raw.wireId),
      ...(details ? { details } : {}),
    });

    if (events.length === MAX_EVENTS) break;
  }
  return events;
}

function snapshot(events: EventHistoryEntry[]): EventHistoryEntry[] {
  return events.slice(0, MAX_EVENTS).map((event) => ({
    ...event,
    ...(event.details ? { details: { ...event.details } } : {}),
  }));
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingSnapshot: EventHistoryEntry[] | null = null;
let started = false;
let lastSaveError = '';

async function persistEventHistory(events: EventHistoryEntry[]): Promise<void> {
  const payload: PersistedEventHistory = { version: SCHEMA_VERSION, events };
  try {
    await set(STORAGE_KEY, payload);
    lastSaveError = '';
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message !== lastSaveError) {
      console.warn('[event-history] save failed:', message);
      lastSaveError = message;
    }
  }
}

function flushPendingEventHistory(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
  if (!pendingSnapshot) return;
  const events = pendingSnapshot;
  pendingSnapshot = null;
  void persistEventHistory(events);
}

/** Hydrate the capped audit trail and start autosave before React's first render. */
export async function startEventHistoryPersistence(): Promise<void> {
  if (started) return;
  started = true;

  try {
    const stored = parsePersistedEventHistory(await get(STORAGE_KEY));
    useUiStore.setState({ eventHistory: stored ?? [] });
  } catch (error) {
    console.warn('[event-history] hydrate failed, using empty history:', error);
    useUiStore.setState({ eventHistory: [] });
  }

  useUiStore.subscribe((state, previous) => {
    if (state.eventHistory === previous.eventHistory) return;
    pendingSnapshot = snapshot(state.eventHistory);
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(flushPendingEventHistory, DEBOUNCE_MS);
  });
  window.addEventListener('pagehide', flushPendingEventHistory);
}

export async function clearPersistedEventHistory(): Promise<void> {
  useUiStore.setState({ eventHistory: [] });
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
  pendingSnapshot = null;
  await set(STORAGE_KEY, undefined);
}

export const __EVENT_HISTORY_STORAGE_KEY = STORAGE_KEY;
export const __EVENT_HISTORY_MAX_EVENTS = MAX_EVENTS;
