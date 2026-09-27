/** Shared vector device bodies. Electrical terminals and instance ratings are drawn separately.
 * Reusing one cached SVG image per type keeps the DOM small even in a dense scene.
 */
import { COMPONENT_DEFS } from '@electrasim/domain/components';
import type { ComponentInstance } from '@electrasim/domain/types';
import { getDefaultArt } from './componentArt';

export type DeviceFamily =
  | 'breaker'
  | 'residual'
  | 'board'
  | 'isolator'
  | 'fuse'
  | 'surge'
  | 'socket'
  | 'rocker'
  | 'knob'
  | 'button'
  | 'contactor'
  | 'relay'
  | 'transformer'
  | 'terminal'
  | 'junction'
  | 'lever'
  | 'motor'
  | 'fan'
  | 'lamp'
  | 'heater'
  | 'appliance'
  | 'sensor'
  | 'timer'
  | 'meter'
  | 'source'
  | 'sounder';
const groups: Record<DeviceFamily, readonly string[]> = {
  breaker: ['mcb', 'mcb-type-c', 'mcb-type-d', 'mccb'],
  residual: ['rcd', 'rcbo', 'afdd'],
  board: ['distribution-board', 'distribution-box', 'distribution-board-3phase'],
  isolator: ['main-switch', 'isolator-switch'],
  fuse: ['fuse', 'fused-spur'],
  surge: ['spd'],
  rocker: [
    'single-way-switch',
    'two-way-switch',
    'intermediate-switch',
    'double-pole-switch',
    'double-gang-switch',
    'cooker-unit',
  ],
  knob: ['dimmer-switch', 'fan-dimmer', 'rotary-selector-switch', 'room-thermostat'],
  button: ['push-button'],
  contactor: ['contactor', 'contactor-1p', 'contactor-2p', 'contactor-3p', 'contactor-4p'],
  relay: ['relay-spst', 'relay-spdt', 'relay-dpdt', 'control-relay', 'smart-relay'],
  transformer: ['transformer-8v', 'transformer-12v', 'transformer-24v', 'step-up-down-transformer'],
  terminal: ['live-terminal', 'neutral-terminal', 'earth-terminal', 'terminal-strip', 'earth-rod'],
  junction: ['junction-box'],
  lever: ['wago-connector'],
  motor: ['motor', 'motor-3phase', 'water-pump'],
  fan: ['ceiling-fan', 'extractor-fan', 'industrial-exhaust-fan', 'table-fan'],
  lamp: [
    'bulb',
    'bulb-incandescent',
    'bulb-halogen',
    'bulb-cfl',
    'bulb-smart-rgb',
    'led-downlight',
    'tube-light',
  ],
  heater: [
    'water-heater',
    'space-heater',
    'electric-shower',
    'immersion-heater',
    'underfloor-heating',
    'storage-heater',
    'heating-element',
  ],
  appliance: [
    'air-conditioner',
    'induction-hob',
    'ev-charger',
    'extractor-hood',
    'heat-pump',
    'dishwasher',
    'washing-machine',
    'tumble-dryer',
    'fridge-freezer',
  ],
  sensor: [
    'pir-sensor',
    'photocell-sensor',
    'thermostat',
    'heating-thermostat',
    'temperature-sensor',
    'door-sensor',
  ],
  timer: [
    'timer-switch',
    'digital-weekly-timer',
    'staircase-timer',
    'countdown-timer',
    'delay-timer',
  ],
  meter: ['kwh-meter'],
  source: ['ac-mains-supply', 'dc-battery-12v', 'solar-pv-panel', 'diesel-generator'],
  sounder: [
    'bell',
    'electric-buzzer',
    'wireless-doorbell',
    'alarm-siren',
    'smoke-alarm',
    'burglar-alarm',
  ],
  socket: [
    'socket-2pin',
    'socket-3pin',
    'double-socket',
    'socket-usb',
    'socket-gfci',
    'socket-industrial',
    'socket-us',
    'double-socket-us',
    'socket-schuko',
    'socket-schuko-double',
    'socket-as3112',
    'socket-as3112-double',
    'socket-bs546',
    'shaver-socket',
    'socket-bs546-double',
    'switched-socket',
  ],
};
export const DEVICE_FAMILIES = Object.fromEntries(
  Object.entries(groups).flatMap(([family, types]) => types.map((type) => [type, family])),
) as Record<string, DeviceFamily>;
const uri = (body: string) =>
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="housing" x2=".7" y2="1"><stop stop-color="#f8fafc"/><stop offset=".55" stop-color="#e2e8f0"/><stop offset="1" stop-color="#b7c4d1"/></linearGradient><linearGradient id="metal" x2="0" y2="1"><stop stop-color="#94a3b8"/><stop offset=".5" stop-color="#e2e8f0"/><stop offset="1" stop-color="#64748b"/></linearGradient></defs>${body}</svg>`)}`;
const rect = (x: number, y: number, w: number, h: number, fill: string, radius = 2) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" stroke="#64748b" stroke-width=".8"/>`;
const screw = (x: number, y: number) =>
  `<circle cx="${x}" cy="${y}" r="1.6" fill="#94a3b8"/><path d="M${x - 1} ${y}h2" stroke="#334155" stroke-width=".7"/>`;
const plate = (w = 48, h = 52) =>
  rect((64 - w) / 2, (64 - h) / 2, w, h, 'url(#housing)', 4) +
  screw((64 - w) / 2 + 4, 32) +
  screw((64 + w) / 2 - 4, 32);
const vents = (x: number, y: number, count: number, horizontal = false) =>
  Array.from(
    { length: count },
    (_, i) =>
      `<path d="M${x + (horizontal ? 0 : i * 4)} ${y + (horizontal ? i * 4 : 0)}${horizontal ? 'h24' : 'v16'}" stroke="#64748b" stroke-width="1.2"/>`,
  ).join('');

function body(type: string, family: DeviceFamily): string | undefined {
  switch (family) {
    case 'breaker':
    case 'residual': {
      const w = family === 'residual' || type === 'mccb' ? 42 : 30;
      return (
        rect((64 - w) / 2, 4, w, 56, 'url(#housing)', 3) +
        rect((64 - w) / 2 + 2, 5, 3, 54, '#94a3b8', 1) +
        rect(24, 17, 16, 26, '#334155', 2) +
        rect(22, 48, 20, 6, '#f8fafc', 1) +
        (family === 'residual'
          ? '<circle cx="47" cy="24" r="4" fill="#fbbf24" stroke="#92400e"/><text x="47" y="26" font-size="5" text-anchor="middle" fill="#422006">T</text>'
          : '') +
        screw(32, 9) +
        screw(32, 57)
      );
    }
    case 'rocker':
      return (
        plate(48, 52) +
        rect(21, 13, 22, 37, '#94a3b8', 3) +
        (type === 'double-gang-switch' ? '<path d="M32 13v37" stroke="#475569"/>' : '')
      );
    case 'knob':
      return `${plate()}<circle cx="32" cy="31" r="18" fill="#cbd5e1" stroke="#94a3b8"/><path d="M18 16l-2-2M46 16l2-2M12 31H9M52 31h3" stroke="#64748b"/>`;
    case 'button':
      return `${plate(38, 48)}<circle cx="32" cy="30" r="15" fill="url(#metal)" stroke="#334155"/>`;
    case 'contactor':
    case 'relay': {
      const poles = Math.max(1, Math.min(4, Number(type.match(/([1-4])p/)?.[1] ?? 2)));
      return (
        rect(8, 7, 48, 51, '#334155', 3) +
        rect(12, 12, 40, 35, family === 'relay' ? '#c7d9e3' : '#e2e8f0', 2) +
        Array.from(
          { length: poles },
          (_, i) =>
            rect(16 + i * (32 / poles), 5, Math.min(9, 28 / poles), 6, '#64748b', 1) +
            rect(16 + i * (32 / poles), 51, Math.min(9, 28 / poles), 6, '#64748b', 1),
        ).join('') +
        rect(22, 24, 20, 13, '#475569', 1) +
        (family === 'relay'
          ? '<path d="M18 19h9l10 23h9M18 42h8M39 19h7" fill="none" stroke="#b45309" stroke-width="2"/>'
          : '')
      );
    }
    case 'transformer':
      return (
        rect(11, 12, 42, 40, '#64748b', 1) +
        rect(7, 17, 50, 5, '#94a3b8', 1) +
        rect(7, 43, 50, 5, '#94a3b8', 1) +
        rect(19, 15, 26, 34, '#c27838', 3) +
        vents(23, 22, 5) +
        screw(13, 19) +
        screw(51, 46)
      );
    case 'board':
      return (
        plate(56, 52) +
        rect(8, 8, 48, 13, '#64748b', 2) +
        rect(9, 26, 46, 21, '#94a3b8', 1) +
        Array.from(
          { length: type.includes('3phase') ? 6 : 4 },
          (_, i) =>
            rect(12 + i * 7, 28, 6, 16, '#f8fafc', 1) + rect(13 + i * 7, 32, 4, 6, '#334155', 1),
        ).join('')
      );
    case 'isolator':
      return (
        plate(46, 54) +
        (type === 'isolator-switch'
          ? '<circle cx="32" cy="31" r="19" fill="#fbbf24" stroke="#b45309"/>'
          : rect(20, 15, 24, 31, '#94a3b8'))
      );
    case 'fuse':
      return type === 'fused-spur'
        ? plate() +
            rect(18, 16, 13, 29, '#94a3b8') +
            rect(35, 21, 12, 23, '#f8fafc') +
            screw(41, 26)
        : undefined;
    case 'surge':
      return `${
        rect(15, 5, 34, 54, 'url(#housing)', 3) +
        rect(19, 17, 26, 28, '#dc2626', 2) +
        rect(24, 21, 16, 6, '#16a34a', 1)
      }<path d="M34 29l-7 9h6l-3 7 10-11h-7z" fill="#fff"/>`;
    case 'terminal':
      if (type === 'earth-rod') return undefined;
      return `${
        rect(9, 23, 46, 19, '#94a3b8', 2) +
        rect(
          14,
          16,
          36,
          32,
          type === 'earth-terminal'
            ? '#c6b846'
            : type === 'neutral-terminal'
              ? '#60a5fa'
              : type === 'live-terminal'
                ? '#b87949'
                : '#f1f5f9',
          2,
        )
      }<circle cx="32" cy="31" r="9" fill="url(#metal)" stroke="#475569"/><path d="M26 31h12" stroke="#334155" stroke-width="2"/>`;
    case 'lever':
      return (
        rect(7, 21, 50, 26, '#cbd5e1', 3) +
        [13, 28, 43]
          .map((x) => rect(x, 17, 10, 20, '#f97316', 2) + rect(x, 39, 9, 5, '#475569', 1))
          .join('')
      );
    case 'motor':
      return (
        rect(13, 22, 33, 25, '#94a3b8', 5) +
        vents(17, 26, 7) +
        rect(20, 13, 18, 10, '#475569') +
        rect(12, 47, 37, 5, '#64748b') +
        rect(46, 30, 13, 7, 'url(#metal)', 1) +
        (type === 'water-pump'
          ? '<circle cx="11" cy="34" r="10" fill="#64748b" stroke="#334155"/><path d="M10 24v-9h9M10 44v8" fill="none" stroke="#94a3b8" stroke-width="6"/>'
          : '')
      );
    case 'fan':
      if (type === 'ceiling-fan')
        return '<path d="M32 5v14" stroke="#64748b" stroke-width="4"/><circle cx="32" cy="33" r="7" fill="url(#metal)" stroke="#475569"/>';
      return `${
        type === 'table-fan'
          ? rect(22, 50, 20, 5, '#64748b') + rect(29, 41, 6, 10, '#94a3b8')
          : plate(54, 54)
      }<circle cx="32" cy="29" r="21" fill="#475569" stroke="#94a3b8" stroke-width="3"/>`;
    case 'timer':
      return (
        plate(42, 56) +
        (type === 'timer-switch'
          ? '<circle cx="32" cy="29" r="15" fill="#f8fafc" stroke="#475569" stroke-width="4"/><path d="M32 18v11l8 5" stroke="#334155" stroke-width="2" fill="none"/>'
          : rect(16, 16, 32, 16, '#94b9a9', 2) +
            rect(19, 39, 8, 5, '#64748b') +
            rect(35, 39, 8, 5, '#64748b'))
      );
    case 'sensor':
      if (type === 'door-sensor')
        return rect(11, 10, 23, 43, 'url(#housing)', 4) + rect(40, 13, 12, 36, '#e2e8f0', 3);
      if (type === 'temperature-sensor')
        return `<path d="M32 6v22" stroke="#334155" stroke-width="3"/>${rect(28, 27, 8, 27, 'url(#metal)', 4)}`;
      if (type === 'pir-sensor' || type === 'photocell-sensor')
        return `${plate(40, 50)}<path d="M17 29a15 15 0 0 0 30 0z" fill="#f1f5f9" stroke="#94a3b8"/><path d="M20 33h24M23 39h18" stroke="#cbd5e1"/>`;
      return (
        plate() +
        rect(16, 14, 32, 21, '#adc5b3', 2) +
        rect(19, 42, 8, 5, '#94a3b8') +
        rect(37, 42, 8, 5, '#94a3b8')
      );
    case 'source':
      if (type === 'solar-pv-panel')
        return `${
          rect(6, 10, 52, 40, '#334155', 2) +
          Array.from({ length: 4 }, (_, row) =>
            Array.from({ length: 6 }, (_, col) =>
              rect(9 + col * 8, 13 + row * 9, 7, 8, '#315c93', 0),
            ).join(''),
          ).join('')
        }<path d="M20 51l-3 7M44 51l3 7" stroke="#64748b" stroke-width="3"/>`;
      if (type === 'dc-battery-12v')
        return (
          rect(10, 17, 44, 37, '#334155', 4) +
          rect(10, 15, 44, 9, '#475569') +
          rect(16, 9, 7, 7, '#ef4444') +
          rect(42, 9, 7, 7, '#64748b')
        );
      if (type === 'diesel-generator')
        return `${
          rect(7, 14, 50, 36, '#b6aa59', 4) + rect(34, 20, 17, 20, '#334155') + vents(12, 22, 4)
        }<circle cx="17" cy="53" r="5" fill="#334155"/><circle cx="47" cy="53" r="5" fill="#334155"/>`;
      return `${
        plate() + rect(15, 17, 34, 26, '#475569')
      }<path d="M21 31q5-14 11 0t11 0" fill="none" stroke="#f8fafc" stroke-width="2"/>`;
    case 'socket':
      return socketBody(type);
    case 'lamp': {
      if (type === 'tube-light')
        return (
          rect(5, 24, 54, 15, '#f8fafc', 5) +
          rect(4, 25, 5, 13, '#94a3b8') +
          rect(55, 25, 5, 13, '#94a3b8')
        );
      if (type === 'led-downlight')
        return '<ellipse cx="32" cy="33" rx="27" ry="17" fill="url(#metal)" stroke="#64748b"/><ellipse cx="32" cy="33" rx="20" ry="12" fill="#f8fafc" stroke="#cbd5e1"/>';
      if (type === 'bulb' || type === 'bulb-smart-rgb')
        return `<path d="M14 28a18 18 0 1 1 36 0Z" fill="#f8fafc" stroke="#94a3b8"/><path d="M14 28h36L41 46H23Z" fill="url(#housing)" stroke="#94a3b8"/>${rect(24, 46, 16, 11, 'url(#metal)', 1)}<path d="M25 49h14M25 53h14" stroke="#64748b"/><path d="M29 59h6" stroke="#475569" stroke-width="3"/>`;
      // Existing CFL and reflector silhouettes are retained, with neutral unlit glass.
      return undefined;
    }
    case 'heater':
      if (type === 'heating-element' || type === 'immersion-heater')
        return `<path d="M15 10v37a5 5 0 0 0 10 0V18a5 5 0 0 1 10 0v29a5 5 0 0 0 10 0V10" fill="none" stroke="#b89068" stroke-width="5"/>${rect(9, 6, 43, 6, '#64748b')}`;
      if (type === 'space-heater') return plate(54, 40) + vents(20, 21, 4, true);
      if (type === 'water-heater')
        return `${
          rect(15, 6, 34, 50, 'url(#housing)', 12) + rect(22, 29, 20, 12, '#64748b')
        }<path d="M24 56v5M41 56v5" stroke="#b45309" stroke-width="3"/>`;
      return undefined;
    case 'appliance':
      if (type === 'air-conditioner')
        return `${plate(56, 30)}<path d="M10 39h44M14 34h36" stroke="#64748b"/>`;
      if (type === 'induction-hob')
        return (
          rect(7, 9, 50, 46, '#1e293b', 4) +
          [21, 43]
            .flatMap((x) =>
              [23, 42].map(
                (y) => `<circle cx="${x}" cy="${y}" r="8" fill="none" stroke="#64748b"/>`,
              ),
            )
            .join('')
        );
      if (type === 'ev-charger')
        return `${
          plate(36, 54) + rect(21, 14, 22, 15, '#334155')
        }<path d="M47 32h8v20q0 10-12 8V43" fill="none" stroke="#334155" stroke-width="3"/>`;
      return undefined;
    case 'sounder':
      if (['electric-buzzer', 'alarm-siren', 'wireless-doorbell'].includes(type))
        return `${plate(44, 46)}<circle cx="32" cy="30" r="14" fill="#475569" stroke="#94a3b8"/>${vents(21, 24, 4, true)}`;
      return undefined;
    default:
      return undefined;
  }
}
function socketBody(type: string): string | undefined {
  // Existing regional vector outlines already describe their distinct plug geometry.
  if (getDefaultArt(type)) return undefined;
  if (type === 'double-socket' || type === 'socket-usb' || type === 'switched-socket') {
    const apertures = '<path d="M29 20h6v9h-6zM20 35h9v5h-9zM36 35h9v5h-9z" fill="#334155"/>';
    return (
      plate(54, 48) +
      (type === 'double-socket'
        ? `<g transform="translate(2 12) scale(.55)">${apertures}</g>`
        : apertures) +
      (type === 'socket-usb'
        ? rect(23, 46, 7, 3, '#334155', 0) + rect(35, 46, 7, 3, '#334155', 0)
        : type === 'switched-socket'
          ? rect(47, 15, 6, 12, '#ef4444')
          : `<g transform="translate(27 12) scale(.55)">${apertures}</g>`)
    );
  }
  if (type === 'socket-industrial')
    return `${rect(17, 4, 30, 16, '#2563eb', 4)}<circle cx="32" cy="36" r="20" fill="#2563eb" stroke="#1e3a8a" stroke-width="2"/><circle cx="32" cy="36" r="14" fill="#e2e8f0"/><g fill="#334155"><circle cx="26" cy="32" r="2.5"/><circle cx="38" cy="32" r="2.5"/><circle cx="32" cy="43" r="3"/></g>`;
  if (type === 'socket-gfci')
    return `${plate(42, 56)}<g fill="#334155"><path d="M23 14h3v9h-3zM38 13h3v10h-3zM23 42h3v9h-3zM38 41h3v10h-3z"/><path d="M29 27a3 3 0 0 1 6 0v2h-6zM29 54a3 3 0 0 1 6 0v2h-6z"/></g>${rect(23, 30, 8, 6, '#334155')}${rect(34, 30, 8, 6, '#ef4444')}`;
  return `${plate(46, 48)}<circle cx="23" cy="32" r="4" fill="#334155"/><circle cx="41" cy="32" r="4" fill="#334155"/>`;
}

const images = new Map<string, string>();
export function deviceImage(type: string): string | undefined {
  const family = DEVICE_FAMILIES[type];
  if (!family) return undefined;
  if (images.has(type)) return images.get(type);
  const vector = body(type, family);
  const existing = getDefaultArt(type);
  // Printed numbers in legacy decorative artwork were not instance-aware (e.g. B16).
  // Ratings now come from deviceMarking() and remain live text in the parent SVG.
  const image = vector
    ? uri(vector)
    : existing
      ? `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
          decodeURIComponent(existing.split(',')[1])
            .replace(/<text\b[^>]*>[\s\S]*?<\/text>/g, '')
            .replace(/#(?:fff7ed|ffedd5|fdba74|fefce8|fde68a|fef9c3|fef08a)/g, '#f1f5f9'),
        )}`
      : undefined;
  if (image) images.set(type, image);
  return image;
}
export function deviceMarking(component: ComponentInstance): string {
  const definition = COMPONENT_DEFS[component.type];
  if (!definition) return '';
  const amps = component.state.customMaxAmps ?? definition.maxAmps;
  if (amps !== undefined && Number.isFinite(amps) && definition.isProtection) {
    return `${definition.mcbType ?? ''}${amps} A${definition.ratedLeakage_mA ? ` · ${definition.ratedLeakage_mA} mA` : ''}`;
  }
  const power = component.state.customPowerWatts ?? definition.powerWatts;
  if (definition.isLoad && power !== undefined && Number.isFinite(power))
    return power >= 1000 ? `${power / 1000} kW` : `${power} W`;
  if (component.state.customVoltage !== undefined) return `${component.state.customVoltage} V`;
  return '';
}
