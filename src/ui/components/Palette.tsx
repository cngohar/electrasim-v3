/**
 * Palette — component catalogue.
 *
 * Full screen height toggleable left panel.
 */

import { ChevronLeft, ChevronRight, Layers, Search, X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { COMPONENT_DEFS } from '../../domain';
import {
  PLUG_SYSTEMS,
  type StandardId,
  getStandard,
  primarySocketForPlug,
} from '../../domain/standards';
import { useUiStore } from '../../store';
import { useDeclarativeChallengeStore } from '../../store/declarativeChallengeStore';
import { useSettingsStore } from '../../store/settingsStore';
import { getDefaultArt } from '../canvas/componentArt';
import { getComponentImage } from './componentImages';

interface PaletteEntry {
  type: string;
  label: string;
  icon: string;
  tier?: 'basic' | 'pro';
}

interface Group {
  category: string;
  items: PaletteEntry[];
}

/** Regional socket types that get filtered by the selected country/region.
 *  Universal socket types (switched, USB, GFCI, industrial) are excluded and
 *  always shown. */
const REGIONAL_SOCKET_TYPES = new Set([
  'socket-3pin',
  'socket-2pin',
  'double-socket',
  'socket-us',
  'double-socket-us',
  'socket-schuko',
  'socket-schuko-double',
  'socket-as3112',
  'socket-as3112-double',
  'socket-bs546',
  'socket-bs546-double',
  'socket-usb',
]);

const CATEGORY_ORDER = [
  'supply',
  'switch',
  'socket',
  'protection',
  'transformer',
  'relay',
  'contactor',
  'timer',
  'thermostat',
  'sensor',
  'sounder',
  'motor',
  'heater',
  'distribution',
  'lighting',
  'fan',
  'load',
  'control',
  'junction',
];

const PRIMARY_PALETTE_TYPES = new Set([
  // Supply
  'ac-mains-supply',
  'dc-battery-12v',
  'solar-pv-panel',
  'kwh-meter',
  'earth-rod',
  'diesel-generator',
  'live-terminal',
  'neutral-terminal',
  'earth-terminal',
  // Protection
  'mcb',
  'mcb-type-c',
  'mcb-type-d',
  'mccb',
  'rcd',
  'rcbo',
  'afdd',
  'fuse',
  'fused-spur',
  'main-switch',
  'spd',
  'isolator-switch',
  'distribution-board',
  // Switch
  'single-way-switch',
  'two-way-switch',
  'intermediate-switch',
  'double-pole-switch',
  'double-gang-switch',
  'push-button',
  'cooker-unit',
  // Sockets (regional variants surfaced dynamically)
  'socket-3pin',
  'double-socket',
  'switched-socket',
  'socket-usb',
  'socket-gfci',
  'socket-industrial',
  'shaver-socket',
  'socket-us',
  'double-socket-us',
  'socket-schuko',
  'socket-schuko-double',
  'socket-as3112',
  'socket-as3112-double',
  'socket-bs546',
  'socket-bs546-double',
  // Lighting
  'bulb',
  'led-downlight',
  'tube-light',
  // Transformer
  'transformer-8v',
  'transformer-12v',
  'transformer-24v',
  'step-up-down-transformer',
  // Relay
  'relay-spst',
  'relay-spdt',
  'relay-dpdt',
  'control-relay',
  // Contactor
  'contactor-1p',
  'contactor-2p',
  'contactor-3p',
  'contactor-4p',
  // Timer
  'timer-switch',
  'digital-weekly-timer',
  'staircase-timer',
  'countdown-timer',
  'delay-timer',
  // Thermostat
  'thermostat',
  'room-thermostat',
  'heating-thermostat',
  // Sensor
  'pir-sensor',
  'photocell-sensor',
  'temperature-sensor',
  'door-sensor',
  // Sounder
  'bell',
  'electric-buzzer',
  'wireless-doorbell',
  'alarm-siren',
  'smoke-alarm',
  'burglar-alarm',
  // Motor
  'motor',
  'motor-3phase',
  'water-pump',
  // Heater
  'space-heater',
  'water-heater',
  'heating-element',
  'immersion-heater',
  'electric-shower',
  'storage-heater',
  'underfloor-heating',
  'heat-pump',
  'extractor-hood',
  'dishwasher',
  'washing-machine',
  'tumble-dryer',
  'fridge-freezer',
  // Distribution
  'distribution-box',
  'distribution-board-3phase',
  // Fan
  'ceiling-fan',
  'extractor-fan',
  // Load
  'air-conditioner',
  'induction-hob',
  'ev-charger',
  // Control
  'dimmer-switch',
  'fan-dimmer',
  // Junction
  'junction-box',
  'wago-connector',
  'terminal-strip',
]);

function buildGroups(): Group[] {
  const groups = new Map<string, PaletteEntry[]>();
  for (const [type, def] of Object.entries(COMPONENT_DEFS)) {
    if (!PRIMARY_PALETTE_TYPES.has(type)) continue;
    const cat = def.category;
    const existing = groups.get(cat);
    const list = existing ?? [];
    if (!existing) groups.set(cat, list);
    list.push({ type, label: def.label, icon: def.icon, tier: def.tier });
  }
  return CATEGORY_ORDER.filter((c) => groups.has(c)).map((c) => ({
    category: c.charAt(0).toUpperCase() + c.slice(1),
    items: groups.get(c) ?? [],
  }));
}

/** High-value starting components promoted for the active rule set.
 *  Each region's list reflects its own regulatory identity:
 *  - UK (BS 7671 18th Ed): all-RCBO boards are modern best practice, with
 *    MCB + RCD as the classic split-load pairing.
 *  - US (NEC): plain thermal-magnetic breakers (B/C/D curves are an IEC
 *    concept), GFCI receptacles (NEC 210.8) and AFCI protection (NEC 210.12).
 *  - EU (IEC 60364): MCB + 30 mA RCD plus SPD (IEC 60364-4-44 §443).
 *  - International 230 V: MCB + RCD with HRC fuses still common in
 *    fuse-board installations across 230 V/50 Hz countries. */
export function recommendedPaletteTypes(
  standard: StandardId,
  plugSystem: keyof typeof PLUG_SYSTEMS,
) {
  const standardProtection =
    standard === 'us'
      ? ['mcb', 'socket-gfci', 'afdd']
      : standard === 'eu'
        ? ['mcb', 'rcd', 'spd']
        : standard === 'int'
          ? ['mcb', 'rcd', 'fuse']
          : ['rcbo', 'mcb', 'rcd']; // uk
  return ['ac-mains-supply', ...standardProtection, primarySocketForPlug(plugSystem), 'bulb'];
}

interface Props {
  open: boolean;
  isPhone: boolean;
}

/** Renders a palette tile's icon: near-realistic SVG art when upgraded, else
 *  the legacy photo (lighting) or emoji glyph. Keeps palette consistent with
 *  the upgraded canvas components. */
function TileIcon({
  type,
  label,
  icon,
  isLighting,
}: {
  type: string;
  label: string;
  icon: string;
  isLighting: boolean;
}) {
  const art = getDefaultArt(type);
  if (art) {
    return (
      <div className="size-8 rounded-lg bg-slate-50 flex items-center justify-center p-0.5 dark:bg-slate-800">
        <img
          src={art}
          alt={label}
          referrerPolicy="no-referrer"
          className="size-full object-contain"
        />
      </div>
    );
  }
  if (isLighting) {
    return (
      <div className="size-8 rounded-lg overflow-hidden bg-slate-900 flex items-center justify-center p-0.5 border border-slate-700/60">
        <img
          src={getComponentImage(type, 'lighting')}
          alt={label}
          referrerPolicy="no-referrer"
          className="size-full object-contain"
        />
      </div>
    );
  }
  return <span className="text-xl leading-none">{icon}</span>;
}

export function Palette({ open, isPhone }: Props) {
  const groups = useMemo(buildGroups, []);
  const placingType = useUiStore((s) => s.placingType);
  const appMode = useSettingsStore((s) => s.appMode);
  const regulationStandard = useSettingsStore((s) => s.regulationStandard);
  const plugSystem = useSettingsStore((s) => s.plugSystem);
  const recentComponents = useSettingsStore((s) => s.recentComponents);
  const showRecentComponents = useSettingsStore((s) => s.showRecentComponents);
  // Plan §20: during an active challenge the palette exposes only the
  // allowed component types; everything else is dimmed (not deleted).
  const challengeDefinition = useDeclarativeChallengeStore((s) =>
    s.status === 'active' ? s.definition : null,
  );
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen);
  const [query, setQuery] = useState('');

  // Regional socket set — only show the selected plug type's sockets (plus
  // universal components). Keeps the palette relevant, not bloated.
  const regionalSockets = useMemo(() => new Set(PLUG_SYSTEMS[plugSystem].sockets), [plugSystem]);
  const isAvailable = useCallback(
    (entry: PaletteEntry) => {
      if (appMode === 'basic' && entry.tier === 'pro') return false;
      return !REGIONAL_SOCKET_TYPES.has(entry.type) || regionalSockets.has(entry.type);
    },
    [appMode, regionalSockets],
  );
  const allEntries = useMemo(() => groups.flatMap((group) => group.items), [groups]);
  const recommendedTypeOrder = useMemo(
    () => recommendedPaletteTypes(regulationStandard, plugSystem),
    [regulationStandard, plugSystem],
  );
  // Plan §20: during a challenge only the allowed parts are offered; the
  // learner can still search for nothing else. Extra components already on
  // the canvas are never deleted — the validator warns instead.
  const challengeAllows = useMemo(() => {
    if (!challengeDefinition?.allowedComponents) return null;
    const allowed = new Set(challengeDefinition.allowedComponents);
    return (type: string): boolean => allowed.has(type);
  }, [challengeDefinition]);
  const recommended = useMemo(
    () =>
      recommendedTypeOrder
        .map((type) => allEntries.find((entry) => entry.type === type))
        .filter((entry): entry is PaletteEntry =>
          Boolean(
            entry && isAvailable(entry) && (challengeAllows ? challengeAllows(entry.type) : true),
          ),
        ),
    [recommendedTypeOrder, allEntries, isAvailable, challengeAllows],
  );
  const visibleRecentComponents = recentComponents.filter((type) => {
    const entry = allEntries.find((item) => item.type === type);
    return Boolean(entry && isAvailable(entry) && (challengeAllows ? challengeAllows(type) : true));
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rank = new Map(recommendedTypeOrder.map((type, index) => [type, index]));
    return groups
      .map((g) => ({
        ...g,
        items: g.items
          .filter((it) => {
            if (appMode === 'basic' && it.tier === 'pro') return false;
            if (challengeAllows && !challengeAllows(it.type)) return false;
            // Region-filter regional sockets only. Universal socket types
            // (switched-socket, USB, GFCI, industrial) stay visible everywhere.
            if (REGIONAL_SOCKET_TYPES.has(it.type) && !regionalSockets.has(it.type)) return false;
            if (!q) return true;
            return it.label.toLowerCase().includes(q) || it.type.toLowerCase().includes(q);
          })
          .sort(
            (a, b) =>
              (rank.get(a.type) ?? Number.MAX_SAFE_INTEGER) -
              (rank.get(b.type) ?? Number.MAX_SAFE_INTEGER),
          ),
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, query, appMode, regionalSockets, recommendedTypeOrder, challengeAllows]);

  // The phone branch returns before the desktop `if (!open)` guard below, so
  // it must honour `open` itself — otherwise the bottom sheet is permanently
  // mounted on phones and covers the canvas and every other bottom-docked
  // panel (Guided Circuits, Challenge Mode, the Diagnosis Lab).
  if (isPhone) {
    if (!open) return null;
    return (
      <>
        {/* Backdrop — tap outside to close */}
        <div
          className="absolute inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={() => useUiStore.getState().togglePalette()}
        />
        {/*
         * z-50 above every other bottom-docked surface (challenge/diagnosis
         * panels sit at z-30): only one bottom surface should be usable at a
         * time (plan §19), and the palette must be the top one while open.
         */}
        <aside className="absolute bottom-0 left-0 right-0 z-50 flex max-h-[62vh] flex-col overflow-hidden rounded-t-2xl border-t border-white/80 bg-white/95 shadow-2xl shadow-slate-900/20 dark:border-slate-700/80 dark:bg-slate-900/95">
          {/* Drag handle */}
          <div className="flex justify-center pt-2.5 pb-1">
            <div className="h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-600" />
          </div>
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2 dark:border-slate-700/60">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Add Component
            </span>
            <button
              type="button"
              onClick={() => useUiStore.getState().togglePalette()}
              className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
              aria-label="Close palette"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="border-b border-slate-100 p-3 dark:border-slate-700/60">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                placeholder="Search components…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-full border border-slate-200 bg-white py-2 pl-9 pr-9 text-sm outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {filtered.length === 0 && (
              <div className="py-6 text-center text-sm text-slate-400">
                No components match &ldquo;{query}&rdquo;
              </div>
            )}
            {!query && recommended.length > 0 && (
              <div className="mb-4" data-standard-recommendations={regulationStandard}>
                <div className="px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">
                  {getStandard(regulationStandard).shortLabel} essentials
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {recommended.map((item) => {
                    const active = placingType === item.type;
                    const definition = COMPONENT_DEFS[item.type];
                    const isLighting = definition?.category === 'lighting';
                    return (
                      <button
                        type="button"
                        key={`recommended-${item.type}`}
                        data-palette-type={item.type}
                        onClick={() =>
                          useUiStore.getState().setPlacingType(active ? null : item.type)
                        }
                        className="flex flex-col items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/60 px-2 py-3 text-[11px] font-medium text-indigo-800 shadow-sm transition active:scale-95 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200"
                      >
                        <TileIcon
                          type={item.type}
                          label={item.label}
                          icon={item.icon}
                          isLighting={isLighting}
                        />
                        <span className="w-full truncate text-center">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {filtered.map((cat) => (
              <div key={cat.category} className="mb-4">
                <div className="px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {cat.category}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {cat.items.map((it) => {
                    const active = placingType === it.type;
                    const isLighting =
                      cat.category.toLowerCase() === 'lighting' ||
                      it.type.startsWith('bulb') ||
                      it.type === 'led-downlight' ||
                      it.type === 'tube-light';
                    return (
                      <button
                        type="button"
                        key={it.type}
                        data-palette-type={it.type}
                        onClick={() =>
                          useUiStore.getState().setPlacingType(active ? null : it.type)
                        }
                        className={[
                          'flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-[11px] font-medium shadow-sm transition active:scale-95',
                          active
                            ? 'border-blue-400 bg-blue-50 text-blue-700 ring-2 ring-blue-200 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-600'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
                        ].join(' ')}
                      >
                        <TileIcon
                          type={it.type}
                          label={it.label}
                          icon={it.icon}
                          isLighting={isLighting}
                        />
                        <span className="truncate text-center w-full">{it.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>
      </>
    );
  }

  if (!open) {
    if (isPhone) return null;
    return (
      <aside
        className="fixed left-0 top-[84px] bottom-0 z-20 flex w-12 flex-col items-center justify-between border-r border-slate-200/80 bg-white/90 p-2 shadow-xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90"
        title="Component Library (Collapsed)"
      >
        <div className="flex flex-col items-center gap-3 pt-3">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            data-tour="open-palette"
            className="flex size-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shadow-xs hover:bg-blue-100 dark:bg-blue-950/80 dark:text-blue-400 dark:hover:bg-blue-900"
            title="Expand Component Library"
            aria-label="Expand Component Library"
          >
            <ChevronRight className="size-4" />
          </button>
          <div className="flex flex-col items-center gap-2 pt-4">
            <Layers className="size-4 text-slate-500 dark:text-slate-400" />
            <span className="[writing-mode:vertical-lr] rotate-180 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Components
            </span>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside
      data-tour="palette"
      className="fixed left-0 top-[84px] bottom-0 z-20 flex w-[260px] flex-col overflow-hidden border-r border-slate-200/80 bg-white/90 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-3.5 py-3 select-none dark:border-slate-700/60">
        <div className="flex items-center gap-2 min-w-0">
          <Layers className="size-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
          <span className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
            Components
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => setPaletteOpen(false)}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            title="Collapse panel"
            aria-label="Collapse panel"
          >
            <ChevronLeft className="size-4" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="border-b border-slate-100 p-2.5 dark:border-slate-700/60">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-full border border-slate-200 bg-white/80 py-1.5 pl-8 pr-8 text-xs outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-blue-500 dark:focus:ring-blue-900/50"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label="Clear search"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
      </div>

      {/* Recent components (toggleable in Settings → Editing) */}
      {!query && showRecentComponents && visibleRecentComponents.length > 0 && (
        <div className="border-b border-slate-100 px-2.5 pb-2 pt-2 dark:border-slate-700/60">
          <div className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Recent
          </div>
          <div className="grid grid-cols-2 gap-2">
            {visibleRecentComponents.map((type) => {
              const def = COMPONENT_DEFS[type];
              if (!def) return null;
              const active = placingType === type;
              const isLighting =
                def.category.toLowerCase() === 'lighting' ||
                type.startsWith('bulb') ||
                type === 'led-downlight' ||
                type === 'tube-light';
              return (
                <button
                  key={type}
                  type="button"
                  data-palette-type={type}
                  title={`Click to place ${def.label} on canvas`}
                  onClick={() => useUiStore.getState().setPlacingType(active ? null : type)}
                  className={[
                    'flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-[10px] font-medium shadow-sm transition hover:scale-[1.02]',
                    active
                      ? 'border-blue-400 bg-blue-50 text-blue-700 ring-2 ring-blue-200 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-600 dark:ring-blue-900'
                      : 'border-indigo-200/70 bg-indigo-50/40 text-slate-700 hover:border-indigo-300 hover:bg-white hover:text-blue-700 dark:border-indigo-900/60 dark:bg-indigo-950/20 dark:text-slate-300 dark:hover:border-indigo-600 dark:hover:bg-slate-800/60 dark:hover:text-blue-400',
                  ].join(' ')}
                >
                  <TileIcon type={type} label={def.label} icon={def.icon} isLighting={isLighting} />
                  <span className="truncate text-center w-full px-1">{def.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Categories & Components */}
      <div className="flex-1 overflow-y-auto p-2.5">
        {!query && recommended.length > 0 && (
          <div
            className="mb-3 rounded-xl border border-indigo-200/80 bg-indigo-50/50 p-2 dark:border-indigo-900 dark:bg-indigo-950/30"
            data-standard-recommendations={regulationStandard}
          >
            <div className="px-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              {getStandard(regulationStandard).shortLabel} essentials
            </div>
            <div className="grid grid-cols-2 gap-2">
              {recommended.map((item) => {
                const active = placingType === item.type;
                const definition = COMPONENT_DEFS[item.type];
                const isLighting = definition?.category === 'lighting';
                return (
                  <button
                    type="button"
                    key={`recommended-${item.type}`}
                    data-palette-type={item.type}
                    title={`Recommended for ${getStandard(regulationStandard).shortLabel}: ${item.label}`}
                    onClick={() => useUiStore.getState().setPlacingType(active ? null : item.type)}
                    className={[
                      'flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-[10px] font-medium shadow-sm transition hover:scale-[1.02]',
                      active
                        ? 'border-blue-400 bg-blue-50 text-blue-700 ring-2 ring-blue-200 dark:border-blue-600 dark:bg-blue-950/60 dark:text-blue-300'
                        : 'border-indigo-200 bg-white/80 text-slate-700 hover:border-indigo-400 hover:text-indigo-700 dark:border-indigo-800 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:border-indigo-600',
                    ].join(' ')}
                  >
                    <TileIcon
                      type={item.type}
                      label={item.label}
                      icon={item.icon}
                      isLighting={isLighting}
                    />
                    <span className="w-full truncate text-center">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {filtered.length === 0 && (
          <div className="py-4 text-center text-xs text-slate-400">
            No components match &ldquo;{query}&rdquo;
          </div>
        )}
        {filtered.map((cat) => (
          <div key={cat.category} className="mb-3">
            <div className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {cat.category}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {cat.items.map((it) => {
                const active = placingType === it.type;
                const isProItem = it.tier === 'pro';
                const isLighting =
                  cat.category.toLowerCase() === 'lighting' ||
                  it.type.startsWith('bulb') ||
                  it.type === 'led-downlight' ||
                  it.type === 'tube-light';
                return (
                  <div key={it.type} className="relative group">
                    <button
                      type="button"
                      data-palette-type={it.type}
                      title={`Click to place ${it.label} on canvas${isProItem ? ' (Pro Component)' : ''}`}
                      onClick={() => useUiStore.getState().setPlacingType(active ? null : it.type)}
                      className={[
                        'w-full flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-[10px] font-medium shadow-sm transition hover:scale-[1.02]',
                        active
                          ? 'border-blue-400 bg-blue-50 text-blue-700 ring-2 ring-blue-200 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-600 dark:ring-blue-900'
                          : 'border-slate-200/80 bg-white/80 text-slate-700 hover:border-blue-300 hover:bg-white hover:text-blue-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-blue-500 dark:hover:bg-slate-700/80 dark:hover:text-blue-400',
                      ].join(' ')}
                    >
                      {isProItem && (
                        <span className="absolute top-1 left-1 rounded bg-purple-100 px-1 py-0.5 text-[8px] font-bold text-purple-700 dark:bg-purple-900/60 dark:text-purple-300">
                          PRO
                        </span>
                      )}
                      <TileIcon
                        type={it.type}
                        label={it.label}
                        icon={it.icon}
                        isLighting={isLighting}
                      />
                      <span className="truncate text-center w-full px-1">{it.label}</span>
                    </button>
                    <button
                      type="button"
                      title={`View ${it.label} Technical Specifications`}
                      onClick={(e) => {
                        e.stopPropagation();
                        useUiStore.getState().setActiveComponentInfoType(it.type);
                      }}
                      className="absolute top-1 right-1 p-0.5 rounded-full bg-slate-100 hover:bg-sky-500 text-slate-400 hover:text-white dark:bg-slate-800 dark:hover:bg-sky-600 transition shadow-sm cursor-pointer z-10"
                    >
                      <span className="text-[9px] font-bold block w-3.5 h-3.5 leading-none text-center">
                        ?
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
