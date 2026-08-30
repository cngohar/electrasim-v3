import type {
  ColorScheme,
  RoutingStyle,
  UserSettings,
  WireColorStandard,
} from '../../../store/settingsStore';
import { EmojiGlyph } from '../EmojiGlyph';

type CanvasPreset = UserSettings['canvasPreset'];

export function TabIntro({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/60 px-3.5 py-3 dark:border-blue-900/50 dark:bg-blue-950/40">
      <EmojiGlyph emoji={icon} size={20} className="mt-0.5 shrink-0" />
      <div>
        <div className="text-xs font-bold text-blue-800 dark:text-blue-300">{title}</div>
        <div className="mt-0.5 text-[11px] leading-relaxed text-blue-600/80 dark:text-blue-400/80">
          {desc}
        </div>
      </div>
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
    <div className="group rounded-xl border border-slate-200 bg-white/80 p-3 transition hover:border-blue-200 hover:bg-blue-50/30 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-blue-700 dark:hover:bg-blue-950/30">
      <div className="flex items-start gap-3">
        <button
          type="button"
          role="switch"
          id={toggleId}
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={[
            'relative mt-0.5 h-6 w-11 flex-shrink-0 rounded-full border-2 transition-all duration-200',
            checked
              ? 'border-blue-600 bg-blue-600 shadow-[0_0_8px_2px_rgba(37,99,235,0.3)]'
              : 'border-slate-300 bg-slate-200',
          ].join(' ')}
        >
          {checked && (
            <>
              <span className="absolute left-1.5 top-1/2 h-px w-2 -translate-y-1/2 bg-white/40" />
              <span className="absolute right-1.5 top-1/2 h-px w-2 -translate-y-1/2 bg-white/40" />
            </>
          )}
          <span
            className={[
              'absolute top-0.5 size-4 rounded-full shadow-md transition-all duration-200',
              checked ? 'left-[calc(100%-1.25rem)] bg-white' : 'left-0.5 bg-white',
            ].join(' ')}
          >
            <span
              className={[
                'absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors',
                checked ? 'bg-blue-500' : 'bg-slate-400',
              ].join(' ')}
            />
          </span>
        </button>

        <label htmlFor={toggleId} className="flex-1 cursor-pointer">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
            {label}
            <span
              className={[
                'rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide',
                checked
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-400'
                  : 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500',
              ].join(' ')}
            >
              {checked ? 'ON' : 'OFF'}
            </span>
          </span>
          <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
            {description}
          </span>
        </label>
      </div>

      <div
        className={[
          'mt-2.5 flex items-start gap-2 rounded-lg border px-2.5 py-2 text-[10px] leading-relaxed transition-all',
          checked
            ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-400'
            : 'border-slate-100 bg-slate-50/60 text-slate-500 dark:border-slate-700/60 dark:bg-slate-800/40 dark:text-slate-400',
        ].join(' ')}
      >
        <span className="mt-px text-[11px] leading-none">→</span>
        <span>{preview}</span>
      </div>
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
