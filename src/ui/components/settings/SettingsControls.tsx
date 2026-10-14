import type {
  ColorScheme,
  RoutingStyle,
  UserSettings,
  WireColorStandard,
} from '../../../store/settingsStore';
import { EmojiGlyph } from '../EmojiGlyph';

type CanvasPreset = UserSettings['canvasPreset'];

export function TabIntro({ title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="table-settings-intro">
      <h3>{title}</h3>
      <p>{desc}</p>
    </div>
  );
}

interface ElectricToggleProps {
  label: string;
  description: string;
  preview: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

export function ElectricToggle({
  label,
  description,
  preview,
  checked,
  onChange,
}: ElectricToggleProps) {
  const toggleId = `toggle-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div className="table-setting-row">
      <div>
        <label htmlFor={toggleId}>{label}</label>
        <p>{description}</p>
        <details>
          <summary>How this works</summary>
          <p>{preview}</p>
        </details>
      </div>
      <button
        type="button"
        role="switch"
        id={toggleId}
        aria-label={label}
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="table-toggle"
      >
        <span />
      </button>
    </div>
  );
}

const ROUTING_OPTIONS: Array<{
  value: RoutingStyle;
  label: string;
  icon: string;
  hint: string;
  desc: string;
}> = [
  {
    value: 'orthogonal',
    label: 'Smart Route',
    icon: '┗',
    hint: 'Right-angle path that avoids components',
    desc: 'New wires find a clean Manhattan path around obstacles using A* pathfinding.',
  },
  {
    value: 'bezier',
    label: 'Curved',
    icon: '∿',
    hint: 'Smooth bezier curve (legacy)',
    desc: 'New wires draw as smooth bezier curves — may overlap components.',
  },
];

export function RoutingStyleSelector({
  value,
  onChange,
}: {
  value: RoutingStyle;
  onChange: (value: RoutingStyle) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-800/60">
      <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
        Wire routing for new connections
      </span>
      <span className="mb-3 mt-0.5 block text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
        Affects how new wires are drawn when you connect two ports. Existing wires keep their saved
        style.
      </span>
      <div className="grid grid-cols-2 gap-2">
        {ROUTING_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            title={option.hint}
            className={[
              'flex flex-col gap-1 rounded-xl border-2 px-3 py-3 text-left transition-all',
              value === option.value
                ? 'border-blue-500 bg-blue-50 shadow-[0_0_6px_1px_rgba(37,99,235,0.15)] dark:border-blue-600 dark:bg-blue-950/60'
                : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-blue-600',
            ].join(' ')}
          >
            <span
              className={`font-mono text-lg leading-none ${value === option.value ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}
            >
              {option.icon}
            </span>
            <span
              className={`text-xs font-bold ${value === option.value ? 'text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}
            >
              {option.label}
            </span>
            <span className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
              {option.desc}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

const SCHEME_OPTIONS: Array<{
  value: ColorScheme;
  label: string;
  icon: string;
  desc: string;
}> = [
  { value: 'light', label: 'Light', icon: 'sun', desc: 'Lab Glass white theme' },
  { value: 'dark', label: 'Dark', icon: 'moon', desc: 'Full dark mode' },
  { value: 'system', label: 'System', icon: 'laptop', desc: 'Follow OS setting' },
];

export function SchemeSelector({
  value,
  onChange,
}: {
  value: ColorScheme;
  onChange: (value: ColorScheme) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-800/60">
      <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
        Color scheme
      </span>
      <span className="mb-3 mt-0.5 block text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
        Choose your preferred appearance. All panels and modals update immediately.
      </span>
      <div className="flex gap-2">
        {SCHEME_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={[
              'flex flex-1 flex-col items-center gap-1 rounded-xl border-2 py-2.5 text-xs transition-all',
              value === option.value
                ? 'border-blue-500 bg-blue-50 shadow-[0_0_6px_1px_rgba(37,99,235,0.15)] dark:border-blue-600 dark:bg-blue-950/60'
                : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-blue-600',
            ].join(' ')}
          >
            <EmojiGlyph emoji={option.icon} size={16} />
            <span
              className={`font-semibold ${value === option.value ? 'text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}
            >
              {option.label}
            </span>
            <span className="text-[9px] text-slate-400 dark:text-slate-500">{option.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const PRESET_OPTIONS: Array<{
  value: CanvasPreset;
  label: string;
  icon: string;
  desc: string;
}> = [
  { value: 'default', label: 'Default', icon: 'paint', desc: 'Standard Lab Glass palette' },
  {
    value: 'high-contrast',
    label: 'High Contrast',
    icon: 'black-square',
    desc: 'Black bg, bold wires, yellow accents',
  },
  {
    value: 'deuteranopia',
    label: 'Colour-blind',
    icon: 'eye',
    desc: 'Orange/purple/cyan — no red/green reliance',
  },
];

export function CanvasPresetSelector({
  value,
  onChange,
}: {
  value: CanvasPreset;
  onChange: (value: CanvasPreset) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-800/60">
      <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
        Canvas colour preset
      </span>
      <span className="mb-3 mt-0.5 block text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
        Adjusts wire and component colours for accessibility. Pairs with the colour scheme above.
      </span>
      <div className="grid grid-cols-3 gap-2">
        {PRESET_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={[
              'flex flex-col gap-1 rounded-xl border-2 px-2 py-2.5 text-left transition-all',
              value === option.value
                ? 'border-blue-500 bg-blue-50 shadow-[0_0_6px_1px_rgba(37,99,235,0.15)] dark:border-blue-600 dark:bg-blue-950/60'
                : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-blue-600',
            ].join(' ')}
          >
            <EmojiGlyph emoji={option.icon} size={16} />
            <span
              className={`text-[10px] font-bold ${value === option.value ? 'text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}
            >
              {option.label}
            </span>
            <span className="text-[9px] leading-relaxed text-slate-500 dark:text-slate-400">
              {option.desc}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

const WIRE_STANDARD_OPTIONS: Array<{
  value: WireColorStandard;
  label: string;
  icon: string;
  desc: string;
}> = [
  {
    value: 'uk_eu',
    label: 'UK / EU Standard',
    icon: 'flag-gb flag-eu',
    desc: 'Live = Brown · Neutral = Blue · Earth = Green/Yellow (BS 7671 / IEC 60446)',
  },
  {
    value: 'us',
    label: 'US Standard',
    icon: 'flag-us',
    desc: 'Live = Black/Red · Neutral = White/Gray · Earth = Green/Bare (NEC)',
  },
];

export function WireColorStandardSelector({
  value,
  onChange,
}: {
  value: WireColorStandard;
  onChange: (value: WireColorStandard) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-800/60">
      <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200">
        Regional wire color standard
      </span>
      <span className="mb-3 mt-0.5 block text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
        Toggle wire conductor color coding between UK/EU (BS 7671) and US (NEC) wiring conventions.
      </span>
      <div className="grid grid-cols-2 gap-2">
        {WIRE_STANDARD_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={[
              'flex flex-col gap-1 rounded-xl border-2 px-3 py-2.5 text-left transition-all',
              value === option.value
                ? 'border-blue-500 bg-blue-50 shadow-[0_0_6px_1px_rgba(37,99,235,0.15)] dark:border-blue-600 dark:bg-blue-950/60'
                : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-blue-600',
            ].join(' ')}
          >
            <EmojiGlyph emoji={option.icon} size={16} />
            <span
              className={`text-xs font-bold ${value === option.value ? 'text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}
            >
              {option.label}
            </span>
            <span className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
              {option.desc}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
