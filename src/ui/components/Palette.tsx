import { useElectricalEditing } from '../../store/electricalEditing';
import { usePlacementGuidance } from '../hooks/usePlacementGuidance';
import { PlacementSupplyFilter } from './PlacementSupplyFilter';
/**
 * Palette — component catalogue.
 *
 * Full screen height toggleable left panel.
 */

import { COMPONENT_DEFS } from '@electrasim/domain';
import {
  PLUG_SYSTEMS,
  type StandardId,
  getStandard,
  primarySocketForPlug,
} from '@electrasim/domain/standards';
import { Search, X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useUiStore } from '../../store';
import { useSettingsStore } from '../../store/settingsStore';
import { ComponentPreview } from './ComponentPreview';
import { Modal } from './Modal';

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
  'ac-three-phase-supply',
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
  'bulb-incandescent',
  'bulb-halogen',
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
    const cat = def.category;
    const existing = groups.get(cat);
    const list = existing ?? [];
    if (!existing) groups.set(cat, list);
    list.push({ type, label: def.label, icon: def.icon, tier: def.tier });
  }
  return CATEGORY_ORDER.filter((c) => groups.has(c)).map((c) => ({
    category: c.charAt(0).toUpperCase() + c.slice(1),
    items: (groups.get(c) ?? []).sort(
      (a, b) =>
        Number(PRIMARY_PALETTE_TYPES.has(b.type)) - Number(PRIMARY_PALETTE_TYPES.has(a.type)),
    ),
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

export function Palette({ open, isPhone }: Props) {
  const guidance = usePlacementGuidance();
  const groups = useMemo(buildGroups, []);
  const placingType = useUiStore((s) => s.placingType);
  const regulationStandard = useSettingsStore((s) => s.regulationStandard);
  const plugSystem = useSettingsStore((s) => s.plugSystem);
  const recentComponents = useSettingsStore((s) => s.recentComponents);
  const showRecentComponents = useSettingsStore((s) => s.showRecentComponents);
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Recommended');
  const [browseOpen, setBrowseOpen] = useState(false);
  // Regional socket set — only show the selected plug type's sockets (plus
  // universal components). Keeps the palette relevant, not bloated.
  const regionalSockets = useMemo(() => new Set(PLUG_SYSTEMS[plugSystem].sockets), [plugSystem]);
  const isAvailable = useCallback(
    (entry: PaletteEntry) => {
      if (!guidance.visible(entry.type)) return false;
      return !REGIONAL_SOCKET_TYPES.has(entry.type) || regionalSockets.has(entry.type);
    },
    [guidance, regionalSockets],
  );
  const allEntries = useMemo(() => groups.flatMap((group) => group.items), [groups]);
  const recommendedTypeOrder = useMemo(
    () => recommendedPaletteTypes(regulationStandard, plugSystem),
    [regulationStandard, plugSystem],
  );
  const recommended = useMemo(
    () =>
      recommendedTypeOrder
        .map((type) => allEntries.find((entry) => entry.type === type))
        .filter((entry): entry is PaletteEntry => Boolean(entry && isAvailable(entry))),
    [recommendedTypeOrder, allEntries, isAvailable],
  );
  const visibleRecentComponents = recentComponents.filter((type) => {
    const entry = allEntries.find((item) => item.type === type);
    return Boolean(entry && isAvailable(entry));
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rank = new Map(recommendedTypeOrder.map((type, index) => [type, index]));
    return groups
      .map((g) => ({
        ...g,
        items: g.items
          .filter((it) => {
            if (!guidance.visible(it.type)) return false;

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
  }, [groups, query, regionalSockets, recommendedTypeOrder, guidance]);

  const shelfEntries =
    category === 'Recommended'
      ? recommended
      : category === 'Recent'
        ? allEntries.filter((entry) => visibleRecentComponents.includes(entry.type))
        : (filtered.find((group) => group.category === category)?.items ?? []);
  const choose = (entry: PaletteEntry) => {
    useUiStore.getState().setPlacingType(placingType === entry.type ? null : entry.type);
    setBrowseOpen(false);
    setQuery('');
  };
  const tile = (entry: PaletteEntry) => (
    <button
      type="button"
      key={entry.type}
      data-palette-type={entry.type}
      data-compatibility={guidance.results[entry.type]?.status}
      aria-pressed={placingType === entry.type}
      title={`${entry.label}: ${guidance.hint(entry.type)}${entry.tier === 'pro' ? ' · Membership' : ''}`}
      onClick={() => choose(entry)}
      className="table-component-tile"
    >
      <ComponentPreview type={entry.type} label={entry.label} />
      <span>{entry.label}</span>
      {entry.tier === 'pro' && <small>Pro</small>}
    </button>
  );
  return (
    <>
      <aside
        className="table-shelf"
        data-workspace-library
        data-tour="palette"
        data-canvas-occluder
        data-shelf-collapsed={!open}
      >
        <div className="table-shelf-heading">
          <nav aria-label="Component categories" className="table-shelf-categories">
            {[
              'Recommended',
              ...(showRecentComponents && visibleRecentComponents.length ? ['Recent'] : []),
              ...filtered.map((group) => group.category),
            ].map((name) => (
              <button
                type="button"
                key={name}
                aria-pressed={category === name}
                onClick={() => {
                  setCategory(name);
                  setPaletteOpen(true);
                }}
              >
                {name === 'Recommended'
                  ? `${getStandard(regulationStandard).shortLabel} essentials`
                  : name}
              </button>
            ))}
          </nav>
          <button
            type="button"
            className="table-browse"
            data-tour="open-palette"
            onClick={() => setBrowseOpen(true)}
          >
            <Search size={15} />
            <span>{isPhone ? 'Browse' : 'Browse all components'}</span>
          </button>
          <button
            type="button"
            className="table-shelf-collapse"
            aria-label={open ? 'Collapse component shelf' : 'Expand Component Library'}
            onClick={() => setPaletteOpen(!open)}
          >
            {open ? '−' : '+'}
          </button>
        </div>
        {open && (
          <div
            className="table-shelf-parts"
            data-standard-recommendations={
              category === 'Recommended' ? regulationStandard : undefined
            }
          >
            {shelfEntries.map(tile)}
            {!guidance.showAll && (
              <button
                type="button"
                className="table-hidden-parts"
                onClick={() => useElectricalEditing.setState({ showAll: true })}
              >
                Show all parts<small>Review unassessed ratings</small>
              </button>
            )}
            {!shelfEntries.length && (
              <p>No compatible parts in this category. Browse all to review placement options.</p>
            )}
          </div>
        )}
      </aside>
      <Modal
        open={browseOpen}
        onClose={() => setBrowseOpen(false)}
        title="Component library"
        description="Choose a component, then place it on your circuit."
        widthClass="max-w-4xl"
      >
        <div className="table-catalogue-tools">
          <label className="table-search">
            <Search size={16} />
            <input
              aria-label="Search components"
              placeholder="Search components…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && (
              <button type="button" aria-label="Clear search" onClick={() => setQuery('')}>
                <X size={15} />
              </button>
            )}
          </label>
          <PlacementSupplyFilter />
        </div>
        <div className="table-catalogue">
          {filtered.map((group) => (
            <section key={group.category} data-palette-category={group.category.toLowerCase()}>
              <h3>
                {group.category}
                <small>{group.items.length} components</small>
              </h3>
              <div className="table-catalogue-grid">{group.items.map(tile)}</div>
            </section>
          ))}
          {!filtered.length && (
            <p>No matches. Try a component name or change the placement supply.</p>
          )}
        </div>
      </Modal>
    </>
  );
}
