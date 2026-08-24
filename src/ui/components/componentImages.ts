import imgVariantCflBulb from '../../assets/images/bulb_cfl_spiral_1786782245054.jpg';
import imgVariantBulbHalogen from '../../assets/images/bulb_halogen_gu10_1786782231855.jpg';
import imgVariantBulbIncandescent from '../../assets/images/bulb_incandescent_edison_1786782216775.jpg';
import imgLightBulb from '../../assets/images/bulb_led_a60_1786782205960.jpg';
import imgVariantLedDownlight from '../../assets/images/bulb_led_downlight_1786782271149.jpg';
import imgVariantSmartRgb from '../../assets/images/bulb_smart_rgb_1786782258296.jpg';
import imgVariantTubeLight from '../../assets/images/bulb_tube_light_1786782285212.jpg';
import imgLightSwitch from '../../assets/images/component_light_switch_1786249016724.jpg';
import imgMcbBreaker from '../../assets/images/component_mcb_breaker_1786248947812.jpg';
import imgRcdSwitch from '../../assets/images/component_rcd_switch_1786249000503.jpg';
import imgSocketOutlet from '../../assets/images/component_socket_outlet_1786248985392.jpg';
import imgWaterHeater from '../../assets/images/component_water_heater_1786249033522.jpg';
import imgContactor3p from '../../assets/images/contactor_3p_1786522064198.jpg';
import imgDistBoard3p from '../../assets/images/dist_board_3p_1786522082960.jpg';
import imgEvCharger from '../../assets/images/ev_charger_station_1786333648320.jpg';
import imgRelayModule from '../../assets/images/relay_module_1786522047102.jpg';
import imgSolarPanel from '../../assets/images/solar_panel_pv_1786333628876.jpg';
import imgTransformer24v from '../../assets/images/transformer_24v_1786522030718.jpg';
import imgVariantCeilingFan from '../../assets/images/variant_ceiling_fan.png';
import imgVariantCookerSwitch from '../../assets/images/variant_cooker_switch_1786780613299.jpg';
import imgVariantDimmer from '../../assets/images/variant_dimmer_switch_1786780625706.jpg';
import imgVariantExtractorFan from '../../assets/images/variant_extractor_fan.png';
import imgVariantIndustrialExhaustFan from '../../assets/images/variant_industrial_exhaust_fan.png';
import imgVariantMcbTypeC from '../../assets/images/variant_mcb_type_c_1786780544186.jpg';
import imgVariantMcbTypeD from '../../assets/images/variant_mcb_type_d_1786780651637.jpg';
import imgVariantMccb from '../../assets/images/variant_mccb_industrial_1786780558864.jpg';
import imgVariantMotor from '../../assets/images/variant_motor.png';
import imgVariantPirSensor from '../../assets/images/variant_pir_sensor_1786780637436.jpg';
import imgVariantRcbo from '../../assets/images/variant_rcbo_breaker_1786780527368.jpg';
import imgVariantSocketGfci from '../../assets/images/variant_socket_gfci_1786780599469.jpg';
import imgVariantSocketUsb from '../../assets/images/variant_socket_usb_1786780587870.jpg';
import imgVariantSpd from '../../assets/images/variant_spd_surge_1786780572651.jpg';
import imgVariantTableFan from '../../assets/images/variant_table_fan.png';

/** Photorealistic component images registry with real photography assets */
export const COMPONENT_IMAGES: Record<string, string> = {
  // ─── LIGHTING VARIANTS ───
  bulb: imgLightBulb,
  'bulb-incandescent': imgVariantBulbIncandescent,
  'bulb-halogen': imgVariantBulbHalogen,
  'bulb-cfl': imgVariantCflBulb,
  'bulb-smart-rgb': imgVariantSmartRgb,
  'led-downlight': imgVariantLedDownlight,
  'tube-light': imgVariantTubeLight,

  // ─── PROTECTION & BREAKERS ───
  mcb: imgMcbBreaker,
  'mcb-type-c': imgVariantMcbTypeC,
  'mcb-type-d': imgVariantMcbTypeD,
  mccb: imgVariantMccb,
  rcd: imgRcdSwitch,
  rcbo: imgVariantRcbo,
  fuse: imgVariantRcbo,
  spd: imgVariantSpd,
  'distribution-board': imgDistBoard3p,

  // ─── SWITCHES & CONTROLS ───
  'single-way-switch': imgLightSwitch,
  'two-way-switch': imgLightSwitch,
  'intermediate-switch': imgLightSwitch,
  'double-pole-switch': imgVariantCookerSwitch,
  'cooker-unit': imgVariantCookerSwitch,
  'push-button': imgLightSwitch,
  'rotary-selector-switch': imgVariantDimmer,
  contactor: imgContactor3p,
  'fused-spur': imgLightSwitch,

  // ─── SOCKETS & OUTLETS ───
  'socket-2pin': imgSocketOutlet,
  'socket-3pin': imgSocketOutlet,
  'double-socket': imgSocketOutlet,
  'socket-usb': imgVariantSocketUsb,
  'socket-gfci': imgVariantSocketGfci,
  'socket-industrial': imgSocketOutlet,
  'switched-socket': imgSocketOutlet,

  // ─── FANS ───
  'ceiling-fan': imgVariantCeilingFan,
  'extractor-fan': imgVariantExtractorFan,
  'industrial-exhaust-fan': imgVariantIndustrialExhaustFan,
  'table-fan': imgVariantTableFan,

  // ─── CONTROL & AUTOMATION ───
  'dimmer-switch': imgVariantDimmer,
  'fan-dimmer': imgVariantDimmer,
  'pir-sensor': imgVariantPirSensor,
  thermostat: imgVariantDimmer,
  'photocell-sensor': imgVariantPirSensor,
  'smart-relay': imgRelayModule,

  // ─── POWER SUPPLIES & TERMINALS ───
  'live-terminal': imgDistBoard3p,
  'neutral-terminal': imgDistBoard3p,
  'earth-terminal': imgDistBoard3p,
  'ac-mains-supply': imgDistBoard3p,
  'dc-battery-12v': imgTransformer24v,
  'solar-pv-panel': imgSolarPanel,
  'diesel-generator': imgVariantMotor,

  // ─── APPLIANCES & LOADS ───
  bell: imgWaterHeater,
  'water-heater': imgWaterHeater,
  'space-heater': imgWaterHeater,
  'air-conditioner': imgWaterHeater,
  'induction-hob': imgVariantCookerSwitch,
  'ev-charger': imgEvCharger,
  motor: imgVariantMotor,
  'motor-3phase': imgVariantMotor,
  'water-pump': imgVariantMotor,
  'heating-element': imgWaterHeater,
  'alarm-siren': imgVariantPirSensor,

  // ─── TRANSFORMERS & RELAYS ───
  'transformer-8v': imgTransformer24v,
  'transformer-12v': imgTransformer24v,
  'transformer-24v': imgTransformer24v,
  'step-up-down-transformer': imgTransformer24v,

  'relay-spst': imgRelayModule,
  'relay-spdt': imgRelayModule,
  'relay-dpdt': imgRelayModule,
  'control-relay': imgRelayModule,

  'contactor-1p': imgContactor3p,
  'contactor-2p': imgContactor3p,
  'contactor-3p': imgContactor3p,
  'contactor-4p': imgContactor3p,

  'distribution-box': imgDistBoard3p,
  'distribution-board-3phase': imgDistBoard3p,

  // ─── JUNCTION & TIMERS ───
  'junction-box': imgDistBoard3p,
  'terminal-strip': imgDistBoard3p,
  'wago-connector': imgDistBoard3p,
  'timer-switch': imgVariantDimmer,
  'digital-weekly-timer': imgVariantDimmer,
  'staircase-timer': imgVariantDimmer,
};

/** Resolve an actual photographic image asset for every single component and variant */
export function getComponentImage(type: string, category?: string): string {
  const registered = COMPONENT_IMAGES[type];
  if (registered) return registered;

  if (category === 'lighting' || type.includes('bulb') || type.includes('light'))
    return imgLightBulb;
  if (
    category === 'protection' ||
    type.includes('mcb') ||
    type.includes('rcd') ||
    type.includes('breaker')
  )
    return imgMcbBreaker;
  if (category === 'socket' || type.includes('socket') || type.includes('plug'))
    return imgSocketOutlet;
  if (category === 'switch' || type.includes('switch')) return imgLightSwitch;
  if (category === 'fan' || type.includes('fan')) return imgVariantCeilingFan;
  if (category === 'motor' || type.includes('motor') || type.includes('pump'))
    return imgVariantMotor;
  if (category === 'transformer' || type.includes('transformer')) return imgTransformer24v;
  if (category === 'relay' || type.includes('relay')) return imgRelayModule;
  if (category === 'contactor' || type.includes('contactor')) return imgContactor3p;
  if (type.includes('solar')) return imgSolarPanel;
  if (type.includes('ev') || type.includes('charger')) return imgEvCharger;
  if (category === 'load' || type.includes('heater')) return imgWaterHeater;

  return imgDistBoard3p;
}

function canvasIconSvg(type: string): string {
  const customShapes: Record<string, string> = {
    // ─── LIGHTING VARIANTS ───
    bulb: `<path d="M32 8c-11 0-18 8-18 18 0 8 5 12 9 16h18c4-4 9-8 9-16C50 16 43 8 32 8Z" fill="#facc15" stroke="#eab308" stroke-width="2"/><circle cx="32" cy="27" r="7" fill="#fff7ed"/><path d="M25 44h14M27 51h10M29 57h6" stroke="#cbd5e1" stroke-width="4" stroke-linecap="round"/>`,
    'bulb-incandescent': `<path d="M32 8c-11 0-18 8-18 18 0 8 5 12 9 16h18c4-4 9-8 9-16C50 16 43 8 32 8Z" fill="#fb923c" stroke="#ea580c" stroke-width="2"/><path d="M25 24 Q 28 14 32 20 Q 36 26 39 16" fill="none" stroke="#fff7ed" stroke-width="2.5"/><path d="M25 44h14M26 51h12M28 57h8" stroke="#cbd5e1" stroke-width="4" stroke-linecap="round"/>`,
    'bulb-halogen': `<polygon points="32,8 14,38 50,38" fill="#fef08a" stroke="#ca8a04" stroke-width="2"/><ellipse cx="32" cy="38" rx="18" ry="5" fill="#fef9c3" stroke="#ca8a04" stroke-width="2"/><rect x="28" y="16" width="8" height="12" rx="2" fill="#eab308"/><line x1="28" y1="38" x2="28" y2="54" stroke="#94a3b8" stroke-width="3"/><line x1="36" y1="38" x2="36" y2="54" stroke="#94a3b8" stroke-width="3"/>`,
    'bulb-cfl': `<path d="M22 14 C22 8 28 8 28 14 L28 38 M28 14 C28 8 36 8 36 14 L36 38 M36 14 C36 8 42 8 42 14 L42 38" fill="none" stroke="#38bdf8" stroke-width="4" stroke-linecap="round"/><rect x="20" y="38" width="24" height="8" rx="2" fill="#f1f5f9"/><path d="M24 46h16M26 52h12M28 58h8" stroke="#cbd5e1" stroke-width="3.5" stroke-linecap="round"/>`,
    'bulb-smart-rgb': `<defs><linearGradient id="rgbGlow" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ec4899"/><stop offset="50%" stop-color="#8b5cf6"/><stop offset="100%" stop-color="#06b6d4"/></linearGradient></defs><path d="M32 8c-11 0-18 8-18 18 0 8 5 12 9 16h18c4-4 9-8 9-16C50 16 43 8 32 8Z" fill="url(#rgbGlow)" stroke="#c084fc" stroke-width="2"/><path d="M28 22a6 6 0 0 1 8 0 M26 18a9 9 0 0 1 12 0" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/><path d="M25 44h14M27 51h10M29 57h6" stroke="#cbd5e1" stroke-width="4" stroke-linecap="round"/>`,
    'led-downlight': `<circle cx="32" cy="32" r="22" fill="#f8fafc" stroke="#94a3b8" stroke-width="3"/><circle cx="32" cy="32" r="14" fill="#fef08a" stroke="#eab308" stroke-width="2"/><circle cx="32" cy="32" r="7" fill="#ffffff"/><path d="M12 18h-4 M52 18h4" stroke="#64748b" stroke-width="4" stroke-linecap="round"/>`,
    'tube-light': `<rect x="6" y="24" width="52" height="16" rx="8" fill="#f0f9ff" stroke="#38bdf8" stroke-width="2"/><line x1="12" y1="32" x2="52" y2="32" stroke="#e0f2fe" stroke-width="6" stroke-linecap="round"/><rect x="6" y="27" width="4" height="10" rx="1" fill="#94a3b8"/><rect x="54" y="27" width="4" height="10" rx="1" fill="#94a3b8"/>`,

    // ─── SOCKET VARIANTS ───
    'socket-2pin': `<rect x="12" y="10" width="40" height="44" rx="8" fill="#f8fafc" stroke="#3b82f6" stroke-width="3"/><circle cx="24" cy="32" r="4.5" fill="#0f172a"/><circle cx="40" cy="32" r="4.5" fill="#0f172a"/>`,
    'socket-3pin': `<rect x="12" y="10" width="40" height="44" rx="8" fill="#f8fafc" stroke="#3b82f6" stroke-width="3"/><rect x="30" y="18" width="4" height="9" rx="1.5" fill="#0f172a"/><rect x="20" y="34" width="8" height="4" rx="1" fill="#0f172a"/><rect x="36" y="34" width="8" height="4" rx="1" fill="#0f172a"/>`,
    'double-socket': `<rect x="6" y="14" width="52" height="36" rx="6" fill="#f8fafc" stroke="#3b82f6" stroke-width="3"/><rect x="18" y="20" width="3" height="6" fill="#0f172a"/><rect x="12" y="30" width="5" height="3" fill="#0f172a"/><rect x="21" y="30" width="5" height="3" fill="#0f172a"/><rect x="43" y="20" width="3" height="6" fill="#0f172a"/><rect x="37" y="30" width="5" height="3" fill="#0f172a"/><rect x="46" y="30" width="5" height="3" fill="#0f172a"/>`,
    'socket-usb': `<rect x="8" y="12" width="48" height="40" rx="6" fill="#f8fafc" stroke="#06b6d4" stroke-width="3"/><rect x="18" y="18" width="3" height="6" fill="#0f172a"/><rect x="12" y="27" width="5" height="3" fill="#0f172a"/><rect x="21" y="27" width="5" height="3" fill="#0f172a"/><rect x="43" y="18" width="3" height="6" fill="#0f172a"/><rect x="37" y="27" width="5" height="3" fill="#0f172a"/><rect x="46" y="27" width="5" height="3" fill="#0f172a"/><rect x="28" y="36" width="8" height="4" rx="1" fill="#0284c7"/><rect x="29" y="43" width="6" height="2.5" rx="1.2" fill="#0f172a"/>`,
    'socket-gfci': `<rect x="12" y="10" width="40" height="44" rx="8" fill="#f8fafc" stroke="#10b981" stroke-width="3"/><rect x="30" y="16" width="4" height="6" fill="#0f172a"/><rect x="21" y="25" width="6" height="3" fill="#0f172a"/><rect x="37" y="25" width="6" height="3" fill="#0f172a"/><rect x="24" y="32" width="6" height="4" rx="1" fill="#ef4444"/><rect x="34" y="32" width="6" height="4" rx="1" fill="#0f172a"/><rect x="30" y="40" width="4" height="6" fill="#0f172a"/>`,
    'socket-industrial': `<circle cx="32" cy="32" r="22" fill="#1e3a8a" stroke="#3b82f6" stroke-width="3"/><circle cx="32" cy="32" r="15" fill="#f8fafc"/><circle cx="32" cy="23" r="3.5" fill="#0f172a"/><circle cx="23" cy="37" r="3.5" fill="#0f172a"/><circle cx="41" cy="37" r="3.5" fill="#0f172a"/>`,
    'switched-socket': `<rect x="10" y="10" width="44" height="44" rx="6" fill="#f8fafc" stroke="#3b82f6" stroke-width="3"/><rect x="16" y="14" width="10" height="7" rx="1" fill="#ef4444"/><rect x="30" y="24" width="4" height="7" fill="#0f172a"/><rect x="20" y="35" width="7" height="3" fill="#0f172a"/><rect x="37" y="35" width="7" height="3" fill="#0f172a"/>`,

    // ─── FAN VARIANTS ───
    'ceiling-fan': `<circle cx="32" cy="32" r="8" fill="#0284c7"/><path d="M32 24 C28 6 12 10 24 28 M39 36 C56 42 52 58 34 40 M24 36 C8 48 4 32 24 32" fill="#38bdf8" stroke="#0284c7" stroke-width="2"/>`,
    'extractor-fan': `<rect x="10" y="10" width="44" height="44" rx="6" fill="#f8fafc" stroke="#0ea5e9" stroke-width="3"/><circle cx="32" cy="32" r="16" fill="#e0f2fe"/><path d="M32 20 L32 44 M20 32 L44 32 M24 24 L40 40 M24 40 L40 24" stroke="#0284c7" stroke-width="3" stroke-linecap="round"/><circle cx="32" cy="32" r="5" fill="#0369a1"/>`,
    'industrial-exhaust-fan': `<rect x="8" y="8" width="48" height="48" rx="4" fill="#334155" stroke="#0284c7" stroke-width="3"/><circle cx="32" cy="32" r="18" fill="#1e293b" stroke="#0ea5e9" stroke-width="2"/><path d="M32 16 C25 24 39 24 32 32 C25 39 25 25 32 32 M48 32 C40 25 40 39 32 32 M16 32 C24 39 24 25 32 32" fill="#38bdf8" stroke="#bae6fd" stroke-width="1.5"/><circle cx="32" cy="32" r="6" fill="#ef4444"/>`,
    'table-fan': `<circle cx="32" cy="24" r="16" fill="#f0f9ff" stroke="#0284c7" stroke-width="2"/><path d="M32 12v24M20 24h24" stroke="#7dd3fc" stroke-width="1.5"/><circle cx="32" cy="24" r="5" fill="#0284c7"/><path d="M32 40 L32 50 M22 56 L42 56" stroke="#475569" stroke-width="4" stroke-linecap="round"/>`,

    // ─── SWITCHES & CONTROLS ───
    'single-way-switch': `<rect x="12" y="10" width="40" height="44" rx="8" fill="#f8fafc" stroke="#8b5cf6" stroke-width="3"/><rect x="22" y="18" width="20" height="28" rx="4" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5"/><line x1="22" y1="32" x2="42" y2="32" stroke="#cbd5e1" stroke-width="2"/><circle cx="32" cy="24" r="2.5" fill="#a855f7"/>`,
    'two-way-switch': `<rect x="12" y="10" width="40" height="44" rx="8" fill="#f8fafc" stroke="#8b5cf6" stroke-width="3"/><path d="M22 24 L32 14 L42 24 M42 40 L32 50 L22 40" fill="none" stroke="#7c3aed" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`,
    'intermediate-switch': `<rect x="12" y="10" width="40" height="44" rx="8" fill="#f8fafc" stroke="#8b5cf6" stroke-width="3"/><path d="M20 20 L44 44 M20 44 L44 20" stroke="#7c3aed" stroke-width="4" stroke-linecap="round"/><circle cx="32" cy="32" r="5" fill="#a855f7"/>`,
    'double-pole-switch': `<rect x="12" y="10" width="40" height="44" rx="8" fill="#f8fafc" stroke="#ef4444" stroke-width="3"/><rect x="20" y="16" width="24" height="24" rx="4" fill="#dc2626"/><circle cx="32" cy="46" r="3.5" fill="#f87171"/><text x="32" y="32" text-anchor="middle" font-size="10" font-weight="bold" fill="#fff">20A</text>`,
    'push-button': `<rect x="12" y="10" width="40" height="44" rx="8" fill="#f8fafc" stroke="#64748b" stroke-width="3"/><circle cx="32" cy="32" r="14" fill="#0284c7" stroke="#0369a1" stroke-width="2"/><circle cx="32" cy="32" r="8" fill="#38bdf8"/>`,
    'rotary-selector-switch': `<circle cx="32" cy="32" r="22" fill="#1e293b" stroke="#64748b" stroke-width="3"/><circle cx="32" cy="32" r="14" fill="#334155"/><rect x="30" y="14" width="4" height="14" rx="2" fill="#f8fafc"/><circle cx="32" cy="10" r="2" fill="#22c55e"/><circle cx="16" cy="22" r="2" fill="#94a3b8"/><circle cx="48" cy="22" r="2" fill="#38bdf8"/>`,
    'dimmer-switch': `<circle cx="32" cy="32" r="22" fill="#f8fafc" stroke="#f59e0b" stroke-width="3"/><circle cx="32" cy="32" r="13" fill="#fbbf24" stroke="#d97706" stroke-width="2"/><path d="M18 38 A 16 16 0 1 1 46 38" fill="none" stroke="#f59e0b" stroke-width="3" stroke-dasharray="2 3"/><rect x="30" y="20" width="4" height="9" rx="2" fill="#0f172a"/>`,
    'fan-dimmer': `<circle cx="32" cy="32" r="22" fill="#f8fafc" stroke="#06b6d4" stroke-width="3"/><circle cx="32" cy="32" r="13" fill="#0ea5e9" stroke="#0284c7" stroke-width="2"/><rect x="30" y="20" width="4" height="9" rx="2" fill="#ffffff"/><text x="32" y="42" text-anchor="middle" font-size="8" font-weight="900" fill="#0369a1">1-5</text>`,
    'cooker-unit': `<rect x="10" y="10" width="44" height="44" rx="6" fill="#f8fafc" stroke="#dc2626" stroke-width="3"/><rect x="16" y="16" width="14" height="20" rx="2" fill="#dc2626"/><circle cx="23" cy="42" r="2.5" fill="#ef4444"/><rect x="34" y="22" width="2.5" height="5" fill="#0f172a"/><rect x="39" y="22" width="2.5" height="5" fill="#0f172a"/>`,

    // ─── PROTECTION & BREAKERS ───
    mcb: `<rect x="18" y="8" width="28" height="48" rx="4" fill="#f8fafc" stroke="#64748b" stroke-width="3"/><rect x="24" y="14" width="16" height="20" rx="3" fill="#38bdf8"/><path d="M32 18v12M27 25h10" stroke="#0f172a" stroke-width="2"/><text x="32" y="48" text-anchor="middle" font-size="10" font-weight="bold" fill="#0f172a">B</text>`,
    'mcb-type-c': `<rect x="18" y="8" width="28" height="48" rx="4" fill="#f8fafc" stroke="#64748b" stroke-width="3"/><rect x="24" y="14" width="16" height="20" rx="3" fill="#22c55e"/><path d="M32 18v12M27 25h10" stroke="#0f172a" stroke-width="2"/><text x="32" y="48" text-anchor="middle" font-size="10" font-weight="bold" fill="#0f172a">C</text>`,
    'mcb-type-d': `<rect x="18" y="8" width="28" height="48" rx="4" fill="#f8fafc" stroke="#64748b" stroke-width="3"/><rect x="24" y="14" width="16" height="20" rx="3" fill="#f97316"/><path d="M32 18v12M27 25h10" stroke="#0f172a" stroke-width="2"/><text x="32" y="48" text-anchor="middle" font-size="10" font-weight="bold" fill="#0f172a">D</text>`,
    mccb: `<rect x="12" y="8" width="40" height="48" rx="4" fill="#1e293b" stroke="#475569" stroke-width="3"/><rect x="20" y="14" width="24" height="22" rx="3" fill="#334155"/><rect x="29" y="18" width="6" height="14" rx="2" fill="#ef4444"/><text x="32" y="48" text-anchor="middle" font-size="9" font-weight="bold" fill="#38bdf8">MCCB</text>`,
    rcd: `<rect x="14" y="8" width="36" height="48" rx="4" fill="#f8fafc" stroke="#38bdf8" stroke-width="3"/><rect x="20" y="14" width="12" height="18" rx="2" fill="#38bdf8"/><rect x="36" y="14" width="10" height="10" rx="2" fill="#eab308"/><text x="41" y="22" text-anchor="middle" font-size="8" font-weight="bold" fill="#0f172a">T</text><text x="32" y="48" text-anchor="middle" font-size="9" font-weight="bold" fill="#0f172a">RCD</text>`,
    rcbo: `<rect x="14" y="8" width="36" height="48" rx="4" fill="#f8fafc" stroke="#10b981" stroke-width="3"/><rect x="20" y="14" width="12" height="18" rx="2" fill="#22c55e"/><rect x="36" y="14" width="10" height="10" rx="2" fill="#eab308"/><text x="41" y="22" text-anchor="middle" font-size="8" font-weight="bold" fill="#0f172a">T</text><text x="32" y="48" text-anchor="middle" font-size="8" font-weight="bold" fill="#0f172a">RCBO</text>`,
    fuse: `<rect x="14" y="22" width="36" height="20" rx="3" fill="#f8fafc" stroke="#94a3b8" stroke-width="2"/><line x1="8" y1="32" x2="56" y2="32" stroke="#f59e0b" stroke-width="3"/><rect x="14" y="22" width="6" height="20" fill="#64748b"/><rect x="44" y="22" width="6" height="20" fill="#64748b"/>`,
    spd: `<rect x="18" y="8" width="28" height="48" rx="4" fill="#f8fafc" stroke="#eab308" stroke-width="3"/><polygon points="34,14 24,30 31,30 28,44 38,26 31,26" fill="#eab308"/><text x="32" y="52" text-anchor="middle" font-size="8" font-weight="bold" fill="#0f172a">SPD</text>`,
    'isolator-switch': `<rect x="12" y="8" width="40" height="48" rx="6" fill="#eab308" stroke="#ca8a04" stroke-width="3"/><circle cx="32" cy="30" r="12" fill="#dc2626"/><rect x="30" y="20" width="4" height="20" rx="2" fill="#fef08a"/>`,
    'distribution-board': `<rect x="8" y="10" width="48" height="44" rx="4" fill="#1e293b" stroke="#64748b" stroke-width="3"/><rect x="14" y="16" width="36" height="12" rx="2" fill="#334155"/><line x1="18" y1="22" x2="18" y2="28" stroke="#38bdf8" stroke-width="2"/><line x1="26" y1="22" x2="26" y2="28" stroke="#38bdf8" stroke-width="2"/><line x1="34" y1="22" x2="34" y2="28" stroke="#38bdf8" stroke-width="2"/><line x1="42" y1="22" x2="42" y2="28" stroke="#38bdf8" stroke-width="2"/>`,
    'distribution-board-3phase': `<rect x="8" y="10" width="48" height="44" rx="4" fill="#0f172a" stroke="#ef4444" stroke-width="3"/><rect x="14" y="16" width="36" height="14" rx="2" fill="#1e293b"/><line x1="18" y1="18" x2="18" y2="28" stroke="#ef4444" stroke-width="2.5"/><line x1="26" y1="18" x2="26" y2="28" stroke="#eab308" stroke-width="2.5"/><line x1="34" y1="18" x2="34" y2="28" stroke="#3b82f6" stroke-width="2.5"/><line x1="42" y1="18" x2="42" y2="28" stroke="#22c55e" stroke-width="2.5"/>`,

    // ─── TRANSFORMERS & RELAYS ───
    'transformer-8v': `<circle cx="24" cy="32" r="12" fill="none" stroke="#6366f1" stroke-width="3"/><circle cx="40" cy="32" r="12" fill="none" stroke="#a855f7" stroke-width="3"/><text x="32" y="52" text-anchor="middle" font-size="8" font-weight="bold" fill="#6366f1">8V</text>`,
    'transformer-12v': `<circle cx="24" cy="32" r="12" fill="none" stroke="#6366f1" stroke-width="3"/><circle cx="40" cy="32" r="12" fill="none" stroke="#a855f7" stroke-width="3"/><text x="32" y="52" text-anchor="middle" font-size="8" font-weight="bold" fill="#6366f1">12V</text>`,
    'transformer-24v': `<circle cx="24" cy="32" r="12" fill="none" stroke="#6366f1" stroke-width="3"/><circle cx="40" cy="32" r="12" fill="none" stroke="#a855f7" stroke-width="3"/><text x="32" y="52" text-anchor="middle" font-size="8" font-weight="bold" fill="#6366f1">24V</text>`,
    'step-up-down-transformer': `<circle cx="22" cy="30" r="11" fill="none" stroke="#3b82f6" stroke-width="3"/><circle cx="42" cy="30" r="11" fill="none" stroke="#ef4444" stroke-width="3"/><line x1="32" y1="14" x2="32" y2="46" stroke="#94a3b8" stroke-width="2" stroke-dasharray="2 2"/>`,
    'relay-spst': `<rect x="12" y="12" width="40" height="40" rx="4" fill="#f8fafc" stroke="#6366f1" stroke-width="3"/><rect x="18" y="24" width="10" height="16" fill="#6366f1"/><path d="M34 22 L42 22 M34 38 L42 32" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round"/>`,
    'relay-spdt': `<rect x="12" y="12" width="40" height="40" rx="4" fill="#f8fafc" stroke="#8b5cf6" stroke-width="3"/><path d="M20 32 L32 32 M32 32 L42 22 M42 42 h-6" stroke="#7c3aed" stroke-width="2.5" stroke-linecap="round"/>`,
    'relay-dpdt': `<rect x="12" y="12" width="40" height="40" rx="4" fill="#f8fafc" stroke="#8b5cf6" stroke-width="3"/><path d="M18 24 L28 24 M28 24 L36 18 M18 40 L28 40 M28 40 L36 34" stroke="#7c3aed" stroke-width="2" stroke-linecap="round"/>`,
    'contactor-1p': `<rect x="14" y="10" width="36" height="44" rx="4" fill="#1e293b" stroke="#3b82f6" stroke-width="3"/><path d="M32 16v10M32 38v10M28 26h8" stroke="#38bdf8" stroke-width="3"/><text x="32" y="44" text-anchor="middle" font-size="8" font-weight="bold" fill="#fff">1P</text>`,
    'contactor-2p': `<rect x="12" y="10" width="40" height="44" rx="4" fill="#1e293b" stroke="#3b82f6" stroke-width="3"/><path d="M24 16v12M40 16v12" stroke="#38bdf8" stroke-width="2.5"/><text x="32" y="44" text-anchor="middle" font-size="8" font-weight="bold" fill="#fff">2P</text>`,
    'contactor-3p': `<rect x="10" y="10" width="44" height="44" rx="4" fill="#1e293b" stroke="#3b82f6" stroke-width="3"/><path d="M18 16v12M32 16v12M46 16v12" stroke="#38bdf8" stroke-width="2"/><text x="32" y="44" text-anchor="middle" font-size="8" font-weight="bold" fill="#fff">3P</text>`,
    'contactor-4p': `<rect x="8" y="10" width="48" height="44" rx="4" fill="#1e293b" stroke="#3b82f6" stroke-width="3"/><path d="M16 16v10M26 16v10M36 16v10M46 16v10" stroke="#38bdf8" stroke-width="2"/><text x="32" y="44" text-anchor="middle" font-size="8" font-weight="bold" fill="#fff">4P</text>`,
  };

  const hash = [...type].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const rotation = (hash % 18) - 9;
  const uniqueAccent = ['#38bdf8', '#22c55e', '#a78bfa', '#f97316', '#ef4444'][hash % 5];
  const shape =
    customShapes[type] ??
    (type.includes('fan')
      ? `<circle cx="32" cy="32" r="7" fill="${uniqueAccent}"/><g transform="rotate(${rotation} 32 32)"><path d="M32 25C13 17 9 28 25 32M39 32C47 13 36 9 32 25M32 39C51 47 55 36 39 32" fill="none" stroke="${uniqueAccent}" stroke-width="5" stroke-linecap="round"/></g>`
      : type === 'motor'
        ? `<circle cx="32" cy="32" r="21" fill="#cbd5e1" stroke="${uniqueAccent}" stroke-width="4"/><path d="M18 22h28M18 32h28M18 42h28" stroke="#64748b" stroke-width="3"/><circle cx="32" cy="32" r="7" fill="${uniqueAccent}"/>`
        : type.includes('socket')
          ? `<rect x="12" y="10" width="40" height="44" rx="8" fill="#f8fafc" stroke="${uniqueAccent}" stroke-width="4"/><circle cx="25" cy="28" r="4" fill="${uniqueAccent}"/><circle cx="39" cy="28" r="4" fill="${uniqueAccent}"/><path d="M32 38v7" stroke="${uniqueAccent}" stroke-width="4" stroke-linecap="round"/>`
          : type.includes('terminal') || type.includes('connector') || type.includes('junction')
            ? `<rect x="10" y="18" width="44" height="28" rx="5" fill="#f8fafc" stroke="${uniqueAccent}" stroke-width="4"/><path d="M18 18v28M28 18v28M38 18v28M48 18v28" stroke="#94a3b8" stroke-width="2"/><circle cx="23" cy="32" r="3" fill="${uniqueAccent}"/>`
            : `<rect x="13" y="12" width="38" height="40" rx="${5 + (hash % 6)}" fill="#e2e8f0" stroke="${uniqueAccent}" stroke-width="4" transform="rotate(${rotation} 32 32)"/><circle cx="32" cy="32" r="${7 + (hash % 5)}" fill="${uniqueAccent}"/>`);
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${shape}</svg>`)}`;
}

const VARIANT_ICON_TYPES = new Set([
  'bulb',
  'bulb-incandescent',
  'bulb-halogen',
  'bulb-cfl',
  'bulb-smart-rgb',
  'led-downlight',
  'tube-light',
  'mcb',
  'mcb-type-c',
  'mcb-type-d',
  'mccb',
  'rcd',
  'rcbo',
  'fuse',
  'spd',
  'distribution-board',
  'fused-spur',
  'single-way-switch',
  'two-way-switch',
  'intermediate-switch',
  'double-pole-switch',
  'cooker-unit',
  'push-button',
  'rotary-selector-switch',
  'contactor',
  'socket-2pin',
  'socket-3pin',
  'double-socket',
  'socket-usb',
  'socket-gfci',
  'socket-industrial',
  'ceiling-fan',
  'extractor-fan',
  'industrial-exhaust-fan',
  'table-fan',
  'dimmer-switch',
  'fan-dimmer',
  'pir-sensor',
  'thermostat',
  'photocell-sensor',
  'smart-relay',
  'ac-mains-supply',
  'dc-battery-12v',
  'solar-pv-panel',
  'diesel-generator',
  'motor',
  'bell',
  'water-heater',
  'space-heater',
  'air-conditioner',
  'induction-hob',
  'ev-charger',
  'junction-box',
  'terminal-strip',
  'wago-connector',
  'timer-switch',
  'digital-weekly-timer',
  'staircase-timer',
  'countdown-timer',
  'delay-timer',
  'double-gang-switch',
  'switched-socket',
  'isolator-switch',
  'transformer-8v',
  'transformer-12v',
  'transformer-24v',
  'step-up-down-transformer',
  'relay-spst',
  'relay-spdt',
  'relay-dpdt',
  'control-relay',
  'contactor-1p',
  'contactor-2p',
  'contactor-3p',
  'contactor-4p',
  'room-thermostat',
  'heating-thermostat',
  'temperature-sensor',
  'door-sensor',
  'electric-buzzer',
  'wireless-doorbell',
  'alarm-siren',
  'motor-3phase',
  'water-pump',
  'heating-element',
  'distribution-box',
  'distribution-board-3phase',
]);

export function getComponentIcon(type: string, fallback: string): string {
  return VARIANT_ICON_TYPES.has(type) ? canvasIconSvg(type) : fallback;
}
