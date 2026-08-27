/**
 * Toolbar — Workbench experiment top application bar.
 *
 * Three-zone full-width strip with the workbench command order:
 *   left:   [ElectraSim] [Undo] [Redo] [Standard]
 *   center: [Guides] [Student/Pro] [Validate] [▶ Run Simulation]
 *           [⚡ Fault Lab] [Analyze] [Diagnostics]   ← exactly centered
 *   right:  [⌘K / Ctrl K] [Theme] [Settings] [Menu]
 *
 * All existing behaviour is preserved — this only re-hosts the same buttons
 * into a centered-command shell and makes the command-palette affordance
 * system-aware (⌘ on macOS, Search on Windows, Ctrl elsewhere).
 */

import {
  BookOpen,
  Command,
  Flame,
  FlaskConical,
  GraduationCap,
  Moon,
  OctagonAlert,
  Play,
  Redo2,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Square,
  Sun,
  Undo2,
  Wrench,
  Zap,
} from 'lucide-react';
import { COMPONENT_DEFS } from '../../domain';
import { isMacPlatform, remapShortcutLabel } from '../../lib/platform';
import { redo, undo, useCircuitStore, useUiStore } from '../../store';
import { useSettingsStore } from '../../store/settingsStore';
import { preloadSettings } from '../deferredSurfacePreloads';
import { useResolvedTheme } from '../hooks/useResolvedTheme';
import { IconBtn } from './IconBtn';
import { StandardSelector } from './StandardSelector';

interface Props {
  isPhone: boolean;
  simRunning: boolean;
  dashboardOpen?: boolean;
  onToggleDashboard?: () => void;
}

export function Toolbar({ isPhone, simRunning, dashboardOpen, onToggleDashboard }: Props) {
  const appMode = useSettingsStore((s) => s.appMode);
  const setSetting = useSettingsStore((s) => s.setSetting);
  const resolvedTheme = useResolvedTheme();
  const isDark = resolvedTheme === 'dark';
  const simResult = useUiStore((s) => s.simResult);

  // Check if circuit has tripped or blown components blocking simulation
  const hasTrippedComponents =
    simResult?.trippedComponents && simResult.trippedComponents.length > 0;
  const hasBlownComponents = simResult?.blownComponents && simResult.blownComponents.length > 0;
  const hasBustedWires = simResult?.bustedWires && simResult.bustedWires.size > 0;
  const isBlocked = !simRunning && (hasTrippedComponents || hasBlownComponents || hasBustedWires);

  const diagnosticOverlayMode = useSettingsStore((s) => s.diagnosticOverlayMode);
  const faultLabOpen = useUiStore((s) => s.faultLabOpen);
  const overlayLabel =
    diagnosticOverlayMode === 'off'
      ? 'Off'
      : diagnosticOverlayMode === 'heat'
        ? 'Heat only'
        : 'Heat + V-drop';

  const cycleDiagnosticOverlay = () => {
    const next =
      diagnosticOverlayMode === 'off'
        ? 'heat'
        : diagnosticOverlayMode === 'heat'
          ? 'heat-vdrop'
          : 'off';
    setSetting('diagnosticOverlayMode', next);
  };

  const toggleFaultLab = () => {
    // Toggling fault mode arms manual fault injection and snaps the
    // Inspector onto the dedicated Fault Lab tab (no more floating window).
    useUiStore.getState().toggleFaultLab();
    const nowOpen = useUiStore.getState().faultLabOpen;
    useUiStore
      .getState()
      .addLog(
        nowOpen
          ? 'Fault Lab opened in the Inspector — select a component, then inject.'
          : 'Fault Lab closed — manual fault controls disarmed.',
        'info',
      );
  };

  const mac = isMacPlatform();

  const brand = (
    <div className="flex shrink-0 items-center gap-2 pr-2">
      <div className="grid size-7 place-items-center rounded-lg bg-blue-600 text-white shadow-sm shadow-blue-600/30">
        <Zap className="size-3.5" strokeWidth={3} />
      </div>
      {!isPhone && (
        <div className="leading-tight">
          <div className="text-[13px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            ElectraSim
          </div>
          <div className="text-[9px] leading-tight text-slate-400 dark:text-slate-500">
            Wiring Workbench
          </div>
        </div>
      )}
    </div>
  );

  const undoRedo = (
    <>
      <IconBtn icon={Undo2} title={remapShortcutLabel('Undo (Ctrl+Z)')} onClick={undo} />
      <IconBtn icon={Redo2} title={remapShortcutLabel('Redo (Ctrl+Shift+Z)')} onClick={redo} />
    </>
  );

  // Guided circuits
  const guidesBtn = (
    <button
      type="button"
      onClick={() => useUiStore.getState().setTemplatesOpen(true)}
      title="Guided circuits"
      data-tour="guided-circuits"
      className="flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/70"
    >
      <BookOpen className="size-3.5" />
      {!isPhone && <span className="hidden md:inline">Guides</span>}
    </button>
  );

  // Student / Pro mode
  const modeBtn = (
    <button
      type="button"
      onClick={() => {
        const nextMode = appMode === 'basic' ? 'pro' : 'basic';
        setSetting('appMode', nextMode);
        // Untouched demo benches follow the mode (no-op on user circuits).
        useCircuitStore.getState().swapDemoForMode(nextMode);
        if (nextMode === 'basic') {
          // Pro components on a user circuit stay fully functional in
          // Student mode — the palette just stops offering new ones.
          // Make that explicit instead of leaving users to wonder.
          const proCount = useCircuitStore
            .getState()
            .components.filter((c) => COMPONENT_DEFS[c.type]?.tier === 'pro').length;
          if (proCount > 0) {
            useUiStore
              .getState()
              .showNoticeToast(
                `${proCount} Pro component${proCount === 1 ? '' : 's'} stay${proCount === 1 ? 's' : ''} active on the canvas — Student mode only hides them from the palette.`,
              );
          }
        }
        if (nextMode === 'basic' && dashboardOpen) {
          onToggleDashboard?.();
        }
        useUiStore
          .getState()
          .addLog(
            nextMode === 'pro'
              ? 'Switched to Pro Electrician Mode — cable sizing, BS 7671 calculations & commercial components unlocked.'
              : 'Switched to Basic Student Mode — simplified domestic wiring view.',
            'info',
          );
      }}
      title={
        appMode === 'basic'
          ? 'Basic Student Mode active — click to switch to Pro Electrician Mode'
          : 'Pro Electrician Mode active — click to switch to Basic Student Mode'
      }
      data-tour="mode-toggle"
      className={[
        'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold shadow-sm transition',
        appMode === 'basic'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
          : 'border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950/60 dark:text-purple-300',
      ].join(' ')}
    >
      {appMode === 'basic' ? (
        <GraduationCap className="size-3.5" />
      ) : (
        <Wrench className="size-3.5" />
      )}
      {!isPhone && (
        <span className="hidden md:inline">{appMode === 'basic' ? 'Student' : 'Pro'}</span>
      )}
    </button>
  );

  // Validate
  const validateBtn = (
    <button
      type="button"
      onClick={() => useUiStore.getState().runCircuitValidation()}
      title="Validate circuit for design flaws & BS 7671 compliance"
      data-tour="validate"
      className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/70"
    >
      <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
      {!isPhone && <span className="hidden md:inline">Validate</span>}
    </button>
  );

  // RUN SIMULATION — primary action
  const runBtn = (
    <button
      type="button"
      onClick={() => !isBlocked && useUiStore.getState().toggleSim()}
      disabled={isBlocked}
      data-tour="run"
      className={[
        'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm transition',
        isBlocked
          ? 'cursor-not-allowed bg-red-600 text-white animate-pulse'
          : simRunning
            ? 'bg-emerald-600 text-white shadow-emerald-600/20 hover:bg-emerald-700'
            : 'bg-blue-600 text-white shadow-blue-600/20 hover:bg-blue-700',
      ].join(' ')}
      title={
        isBlocked ? 'Circuit tripped or damaged - fix faults before resuming simulation' : undefined
      }
    >
      {isBlocked ? (
        <>
          <OctagonAlert className="size-3" />
          Circuit Tripped
        </>
      ) : simRunning ? (
        <>
          <Square className="size-3" fill="currentColor" />
          Stop
        </>
      ) : (
        <>
          <Play className="size-3" fill="currentColor" />
          Run Simulation
        </>
      )}
    </button>
  );

  // Pro-mode: Analyze Circuit dashboard (existing behaviour preserved)
  const analyzeBtn =
    appMode === 'pro' && !isPhone ? (
      <button
        type="button"
        onClick={() => {
          useUiStore.getState().setInspectorCollapsed(false);
          useUiStore.getState().setActiveInspectorTab('analytics');
          onToggleDashboard?.();
        }}
        title="Toggle circuit diagnostics, analysis & waveforms"
        className={[
          'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold shadow-sm transition',
          dashboardOpen
            ? 'border-blue-500 bg-blue-600 text-white shadow-blue-500/20'
            : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
        ].join(' ')}
      >
        <Sparkles className="size-3.5" />
        <span className="hidden lg:inline">Analyze</span>
      </button>
    ) : null;

  const diagnosticsBtn =
    appMode === 'pro' && !isPhone ? (
      <button
        type="button"
        onClick={cycleDiagnosticOverlay}
        title={`Diagnostic overlay: ${overlayLabel}. Click to cycle Off, Heat only, and Heat + V-drop.`}
        aria-label={`Diagnostic overlay: ${overlayLabel}`}
        data-diagnostic-overlay-mode={diagnosticOverlayMode}
        data-tour="diagnostics"
        className={[
          'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold shadow-sm transition',
          diagnosticOverlayMode !== 'off'
            ? 'border-orange-500 bg-orange-600 text-white shadow-orange-500/20'
            : 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 dark:border-orange-800 dark:bg-orange-950/60 dark:text-orange-300 dark:hover:bg-orange-900/70',
        ].join(' ')}
      >
        <Flame className="size-3.5" />
        <span className="hidden lg:inline">Diagnostics: {overlayLabel}</span>
      </button>
    ) : null;

  // FAULT LAB — Pro-only manual fault mode; owns an Inspector tab, so
  // it is hidden on phones where the Inspector never renders.
  const faultLabBtn =
    appMode === 'pro' && !isPhone ? (
      <button
        type="button"
        onClick={toggleFaultLab}
        title="Toggle the Fault Lab — manual fault controls"
        data-tour="fault-lab"
        aria-pressed={faultLabOpen}
        className={[
          'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold shadow-sm transition',
          faultLabOpen
            ? 'border-amber-500 bg-amber-600 text-white shadow-amber-500/20'
            : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300 dark:hover:bg-amber-900/70',
        ].join(' ')}
      >
        <FlaskConical className="size-3.5" />
        {!isPhone && <span className="hidden md:inline">Fault Lab</span>}
        {faultLabOpen && (
          <span className="hidden text-[9px] font-bold uppercase tracking-wider opacity-90 lg:inline">
            Active
          </span>
        )}
      </button>
    ) : null;

  // Command palette hint — system-aware: ⌘ on macOS, Search on Windows,
  // Ctrl elsewhere.
  const commandHint = !isPhone ? (
    <button
      type="button"
      onClick={() => useUiStore.getState().toggleCommandPalette()}
      title={mac ? 'Command palette (⌘K)' : 'Command palette (Ctrl+K)'}
      className="hidden lg:flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white/80 px-2 py-1.5 text-xs text-slate-500 transition hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-blue-500"
    >
      {mac ? <Command className="size-3.5" /> : <Search className="size-3.5" />}
      <kbd className="rounded border border-slate-200 bg-slate-50 px-1 text-[9px] font-semibold text-slate-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300">
        {mac ? '⌘ K' : 'Ctrl K'}
      </kbd>
    </button>
  ) : null;

  // Theme
  const themeBtn = (
    <button
      type="button"
      title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
      onClick={() => setSetting('colorScheme', isDark ? 'light' : 'dark')}
      className="flex size-8 items-center justify-center rounded-lg border border-slate-200/80 bg-white/80 text-slate-600 shadow-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
    >
      {isDark ? (
        <Sun className="size-4 text-amber-400" />
      ) : (
        <Moon className="size-4 text-slate-600" />
      )}
    </button>
  );

  // Settings
  const settingsBtn = (
    <button
      type="button"
      title="Settings"
      onPointerEnter={preloadSettings}
      onFocus={preloadSettings}
      onClick={() => useUiStore.getState().setSettingsOpen(true)}
      className="flex size-8 items-center justify-center rounded-lg border border-slate-200/80 bg-white/80 text-slate-600 shadow-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
    >
      <Settings className="size-4" />
    </button>
  );

  const menuBtn = <MenuTrigger />;

  if (isPhone) {
    return (
      <header className="absolute inset-x-0 top-0 z-30 flex h-12 items-center justify-between gap-1 border-b border-slate-200/80 bg-white/90 px-2 shadow-sm ring-1 ring-slate-900/5 backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/90 dark:ring-slate-700/50">
        <div className="flex items-center gap-1">
          {brand}
          <Sep />
          {undoRedo}
          {guidesBtn}
          {modeBtn}
          {validateBtn}
          {runBtn}
        </div>
        <div className="flex items-center gap-1">
          {themeBtn}
          {settingsBtn}
          {menuBtn}
        </div>
      </header>
    );
  }

  return (
    <header className="absolute inset-x-0 top-0 z-30 grid h-12 grid-cols-[1fr_auto_1fr] items-center gap-1 border-b border-slate-200/80 bg-white/90 px-2 shadow-sm ring-1 ring-slate-900/5 backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/90 dark:ring-slate-700/50">
      {/* Left zone — identity + history + active standard */}
      <div className="flex min-w-0 items-center gap-1 justify-self-start">
        {brand}
        <Sep />
        {undoRedo}
        <StandardSelector compact />
        <Sep />
      </div>

      {/* Center zone — the workbench command cluster, exactly centered */}
      <div className="flex items-center gap-1">
        {guidesBtn}
        {modeBtn}
        {validateBtn}
        {runBtn}
        {analyzeBtn}
        {diagnosticsBtn}
        {faultLabBtn}
      </div>

      {/* Right zone — command palette, theme, settings, menu */}
      <div className="flex items-center gap-1 justify-self-end">
        {commandHint}
        {themeBtn}
        {settingsBtn}
        {menuBtn}
      </div>
    </header>
  );
}

function Sep() {
  return <div className="mx-1 h-4 w-px shrink-0 bg-slate-200 dark:bg-slate-700" />;
}

/** MCB breaker-switch menu trigger — Phase 6.5. */
function MenuTrigger() {
  const menuOpen = useUiStore((s) => s.menuOpen);
  return (
    <button
      type="button"
      aria-label="Menu"
      data-tour="menu"
      onClick={() => useUiStore.getState().setMenuOpen(!menuOpen)}
      className="group relative grid size-8 place-items-center rounded-lg border border-slate-200/80 bg-white/80 shadow-sm transition hover:border-blue-300 dark:border-slate-700/80 dark:bg-slate-800/80 dark:hover:border-blue-500"
      title="Menu (Esc to close)"
    >
      {/* MCB breaker lever — rotates on toggle */}
      <div
        className={[
          'relative h-5 w-1.5 rounded-full transition-transform duration-300 ease-out',
          menuOpen
            ? 'rotate-[35deg] bg-red-500 shadow-sm shadow-red-400/40'
            : 'rotate-0 bg-blue-600 shadow-sm shadow-blue-600/30',
        ].join(' ')}
      >
        <div
          className={[
            'absolute -top-0.5 left-1/2 size-2.5 -translate-x-1/2 rounded-full border-2 border-white transition-colors',
            menuOpen ? 'bg-red-500' : 'bg-blue-600',
          ].join(' ')}
        />
      </div>
      <span
        className={[
          'absolute bottom-1 right-1 size-1.5 rounded-full',
          menuOpen ? 'bg-red-400' : 'bg-emerald-400',
        ].join(' ')}
      />
    </button>
  );
}
