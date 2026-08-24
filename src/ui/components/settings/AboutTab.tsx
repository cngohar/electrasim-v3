import { GraduationCap, Sparkles, Wrench } from 'lucide-react';
import { useUiStore } from '../../../store';
import { APP_VERSION } from '../../../version';

const ROADMAP: Array<[icon: string, item: string, status: string]> = [
  ['✅', 'Simulation engine + fault detection', 'shipped'],
  ['✅', 'Smart wiring + undo/redo', 'shipped'],
  ['✅', 'Multi-select, copy/paste, custom wiring', 'shipped'],
  ['✅', 'Alignment, mini-map, colour presets', 'shipped'],
  ['✅', 'Dark mode + PWA + offline support', 'shipped'],
  ['✅', 'Import / Export / Share URL', 'shipped'],
  ['✅', '6 new components (RCD, Contactor, Timer, Dimmer, DB, Bell)', 'shipped'],
  ['🔮', 'Cloud save + accounts', 'v2.0'],
  ['🔮', 'AI assistant', 'v2.0'],
];

export function AboutTab() {
  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-xl border border-blue-200 bg-gradient-to-br from-blue-600 to-blue-700 p-5 text-white shadow-lg shadow-blue-600/20">
        <div className="absolute right-0 top-0 size-32 rounded-bl-full bg-white/5" />
        <div className="relative flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-xl bg-white/15 text-2xl shadow-sm">
            ⚡
          </div>
          <div>
            <div className="text-lg font-bold tracking-tight">ElectraSim</div>
            <div className="text-xs text-blue-200">Interactive Wiring Lab</div>
          </div>
        </div>
        <div className="relative mt-3 text-[11px] leading-relaxed text-blue-100">
          A browser-based circuit simulation playground for learning and visualising real electrical
          wiring logic — live, interactive, and offline-capable.
        </div>
        <div className="relative mt-3 flex items-center gap-2">
          <span className="rounded-full border border-blue-400/50 bg-white/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider">
            v{APP_VERSION}
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-800/60">
        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          <Sparkles className="size-3 text-sky-500" /> Interactive Tutorials
        </div>
        <p className="mb-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
          Guided walkthroughs you can restart any time — arrows point, you do the real actions.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              const ui = useUiStore.getState();
              ui.setSettingsOpen(false);
              ui.startTour('student');
            }}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-2 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
          >
            <GraduationCap className="size-3.5" />
            Student: first circuit
          </button>
          <button
            type="button"
            onClick={() => {
              const ui = useUiStore.getState();
              ui.setSettingsOpen(false);
              ui.startTour('pro');
            }}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-2 py-2 text-[11px] font-semibold text-purple-700 transition hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950/50 dark:text-purple-300 dark:hover:bg-purple-900/60"
          >
            <Wrench className="size-3.5" />
            Pro: standards tour
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-800/60">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          🗺️ Roadmap
        </div>
        <div className="space-y-1">
          {ROADMAP.map(([icon, item, status]) => (
            <div key={item} className="flex items-center gap-2 py-0.5 text-[11px]">
              <span>{icon}</span>
              <span
                className={`flex-1 ${status === 'shipped' ? 'text-slate-700 dark:text-slate-300' : status === 'in progress' ? 'font-semibold text-blue-700 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}
              >
                {item}
              </span>
              <span
                className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${status === 'shipped' ? 'bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400' : status === 'in progress' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400' : 'bg-slate-50 text-slate-400 dark:bg-slate-800 dark:text-slate-500'}`}
              >
                {status}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <a
          href="https://web.facebook.com/electrasimweb"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-950/60 dark:text-blue-400 dark:hover:bg-blue-900/60"
        >
          <span>📘</span> Facebook
        </a>
        <button
          type="button"
          onClick={() => {
            useUiStore.getState().setSettingsOpen(false);
            setTimeout(() => useUiStore.getState().setContactOpen(true), 150);
          }}
          className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <span>✉️</span> Contact
        </button>
        <a
          href="https://electrasim.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <span>🌐</span> electrasim.com
        </a>
      </div>

      <div className="text-center text-[10px] text-slate-400 dark:text-slate-500">
        Built with ⚡ · Preferences stored locally · No tracking
      </div>
    </div>
  );
}
