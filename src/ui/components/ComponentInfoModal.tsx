import {
  Activity,
  AlertTriangle,
  Award,
  BookOpen,
  Cable,
  Check,
  CheckCircle2,
  Copy,
  Cpu,
  Info,
  Layers,
  Shield,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { type FC, useEffect, useRef, useState } from 'react';
import { getComponentHelp } from '../../domain/componentHelp';
import { useUiStore } from '../../store/uiStore';
import { useDialogFocus } from '../hooks/useDialogFocus';
import { getComponentImage } from './componentImages';

export const ComponentInfoModal: FC = () => {
  const activeType = useUiStore((s) => s.activeComponentInfoType);
  const setActiveType = useUiStore((s) => s.setActiveComponentInfoType);

  const [currentType, setCurrentType] = useState<string | null>(activeType);
  const [isClosing, setIsClosing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'wiring' | 'standards'>('overview');
  const [copied, setCopied] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Single owner of the open/close animation. The store's `activeType` is
  // the only trigger: set → mount + entrance; cleared → one 200 ms exit,
  // then unmount. (The old version also flipped `isClosing` from the close
  // handler while keeping `isClosing` in these deps, so the effect fought
  // it — cancelling the exit, replaying the entrance, then running a second
  // exit: the "closes twice" animation bug.) `currentType` is intentionally
  // not a dependency: adding it would cancel/restart the exit timer when it
  // clears itself at the end of the animation.
  // biome-ignore lint/correctness/useExhaustiveDependencies: single-trigger animation owner — see comment above
  useEffect(() => {
    if (activeType) {
      setCurrentType(activeType);
      setIsClosing(false);
      return;
    }
    if (!currentType) return;
    setIsClosing(true);
    const timer = window.setTimeout(() => {
      setCurrentType(null);
      setIsClosing(false);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [activeType]);

  const handleClose = () => {
    // Just clear the store — the effect above owns the exit animation.
    setActiveType(null);
  };

  useDialogFocus(Boolean(currentType) && !isClosing, handleClose, panelRef);

  if (!currentType) return null;

  const data = getComponentHelp(currentType);
  const imageUrl = getComponentImage(currentType, data.category);

  const handleCopySpecs = () => {
    const text = [
      `Component: ${data.title} (${currentType})`,
      `Category: ${data.category}`,
      data.voltage ? `Voltage: ${data.voltage}` : null,
      data.amperage ? `Current: ${data.amperage}` : null,
      data.powerWatts !== undefined ? `Power: ${data.powerWatts}W` : null,
      data.breakingCapacity ? `Breaking Capacity: ${data.breakingCapacity}` : null,
      data.tripCurve ? `Trip Curve: ${data.tripCurve}` : null,
      data.cableSize ? `Min Cable Size: ${data.cableSize}` : null,
      data.standards ? `Standards: ${data.standards}` : null,
      `Overview: ${data.overview}`,
    ]
      .filter(Boolean)
      .join('\n');

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <dialog
      open
      id="component-info-modal-dialog"
      aria-modal="true"
      aria-labelledby="component-info-modal-title"
      className="fixed inset-0 z-50 m-0 flex h-dvh w-screen max-h-none max-w-none items-center justify-center overflow-y-auto border-0 bg-transparent p-4"
    >
      {/* Backdrop */}
      <button
        type="button"
        id="component-info-modal-backdrop"
        aria-label="Close modal backdrop"
        className={`absolute inset-0 cursor-default bg-slate-950/75 backdrop-blur-md transition-all ${
          isClosing ? 'animate-backdrop-fade-out' : 'animate-backdrop-fade-in'
        }`}
        onClick={handleClose}
      />

      {/* Modal Container */}
      <div
        ref={panelRef}
        tabIndex={-1}
        id="component-info-modal-container"
        className={`relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-950/40 overflow-hidden text-slate-900 outline-none dark:bg-slate-900 dark:border-slate-700/80 dark:shadow-slate-950/80 dark:text-slate-100 ${
          isClosing ? 'animate-dialog-fade-out' : 'animate-dialog-fade-in'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-100 border border-amber-200 text-amber-600 shadow-sm dark:bg-amber-500/10 dark:border-amber-500/25 dark:text-amber-400 dark:shadow-amber-500/10">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  id="component-info-modal-title"
                  className="text-lg font-bold text-slate-900 leading-none tracking-tight dark:text-slate-100"
                >
                  {data.title}
                </h2>
                {data.category && (
                  <span className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-full bg-sky-50 text-sky-700 border border-sky-200 dark:bg-slate-800 dark:text-sky-400 dark:border-sky-500/25">
                    {data.category}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1 font-mono dark:text-slate-400">
                {currentType}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopySpecs}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors cursor-pointer dark:text-slate-300 dark:hover:text-white dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:border-slate-700/80"
              title="Copy technical specifications to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy Specs</span>
                </>
              )}
            </button>
            <button
              id="component-info-modal-close"
              type="button"
              onClick={handleClose}
              className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer dark:hover:text-slate-100 dark:hover:bg-slate-800"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/60">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'border-sky-500 text-sky-600 bg-sky-50 dark:text-sky-400 dark:bg-slate-800/60'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/30'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            Overview & Specifications
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('wiring')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all cursor-pointer ${
              activeTab === 'wiring'
                ? 'border-emerald-500 text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-slate-800/60'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/30'
            }`}
          >
            <Cable className="w-3.5 h-3.5" />
            Wiring & Behavior
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('standards')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all cursor-pointer ${
              activeTab === 'standards'
                ? 'border-amber-500 text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-slate-800/60'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/30'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            Standards & Safety Tips
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 custom-scrollbar">
          {activeTab === 'overview' && (
            <>
              {/* Main Visual & Overview */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                <div className="md:col-span-5 flex flex-col items-center justify-center p-3.5 bg-slate-100 border border-slate-200 rounded-xl overflow-hidden group relative dark:bg-slate-950/70 dark:border-slate-800">
                  <div className="absolute inset-0 bg-radial from-sky-500/5 to-transparent pointer-events-none" />
                  <img
                    src={imageUrl}
                    alt={data.title}
                    className="w-full h-44 object-contain rounded-lg transition-transform duration-300 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <span className="mt-2.5 text-[11px] text-slate-500 font-medium flex items-center gap-1.5 dark:text-slate-400">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Physical Component Model
                  </span>
                </div>

                <div className="md:col-span-7 flex flex-col justify-between h-full space-y-3">
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 dark:text-slate-400">
                      <Info className="w-3.5 h-3.5 text-sky-400" /> Component Overview
                    </h4>
                    <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200 dark:text-slate-300 dark:bg-slate-800/40 dark:border-slate-800">
                      {data.overview}
                    </p>
                  </div>

                  {data.circuitBehavior && (
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 dark:text-slate-400">
                        <Activity className="w-3.5 h-3.5 text-emerald-400" /> Circuit & Simulation
                        Behavior
                      </h4>
                      <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200 dark:text-slate-300 dark:bg-slate-800/40 dark:border-slate-800">
                        {data.circuitBehavior}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Technical Specifications Matrix */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400 mb-3 flex items-center gap-1.5">
                  <Activity className="w-4 h-4" /> Technical Electrical Specifications
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {data.voltage && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors dark:bg-slate-800/60 dark:border-slate-700/60 dark:hover:border-slate-600">
                      <div className="text-[10px] uppercase font-semibold text-slate-500 flex items-center gap-1 dark:text-slate-400">
                        <Zap className="w-3 h-3 text-amber-400" /> Voltage
                      </div>
                      <div className="text-xs font-bold text-slate-900 mt-1 font-mono dark:text-slate-100">
                        {data.voltage}
                      </div>
                    </div>
                  )}

                  {data.amperage && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors dark:bg-slate-800/60 dark:border-slate-700/60 dark:hover:border-slate-600">
                      <div className="text-[10px] uppercase font-semibold text-slate-500 flex items-center gap-1 dark:text-slate-400">
                        <Activity className="w-3 h-3 text-sky-400" /> Current / Amps
                      </div>
                      <div className="text-xs font-bold text-slate-900 mt-1 font-mono dark:text-slate-100">
                        {data.amperage}
                      </div>
                    </div>
                  )}

                  {data.powerWatts !== undefined && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors dark:bg-slate-800/60 dark:border-slate-700/60 dark:hover:border-slate-600">
                      <div className="text-[10px] uppercase font-semibold text-slate-500 flex items-center gap-1 dark:text-slate-400">
                        <Zap className="w-3 h-3 text-emerald-400" /> Power Rating
                      </div>
                      <div className="text-xs font-bold text-slate-900 mt-1 font-mono dark:text-slate-100">
                        {typeof data.powerWatts === 'number'
                          ? `${data.powerWatts}W`
                          : data.powerWatts}
                      </div>
                    </div>
                  )}

                  {data.breakingCapacity && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors dark:bg-slate-800/60 dark:border-slate-700/60 dark:hover:border-slate-600">
                      <div className="text-[10px] uppercase font-semibold text-slate-500 flex items-center gap-1 dark:text-slate-400">
                        <Shield className="w-3 h-3 text-rose-400" /> Breaking Cap.
                      </div>
                      <div className="text-xs font-bold text-slate-900 mt-1 font-mono dark:text-slate-100">
                        {data.breakingCapacity}
                      </div>
                    </div>
                  )}

                  {data.tripCurve && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors dark:bg-slate-800/60 dark:border-slate-700/60 dark:hover:border-slate-600">
                      <div className="text-[10px] uppercase font-semibold text-slate-500 flex items-center gap-1 dark:text-slate-400">
                        <Layers className="w-3 h-3 text-purple-400" /> Trip Curve
                      </div>
                      <div className="text-xs font-bold text-slate-900 mt-1 font-mono dark:text-slate-100">
                        {data.tripCurve}
                      </div>
                    </div>
                  )}

                  {data.frequency && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors dark:bg-slate-800/60 dark:border-slate-700/60 dark:hover:border-slate-600">
                      <div className="text-[10px] uppercase font-semibold text-slate-500 flex items-center gap-1 dark:text-slate-400">
                        <Activity className="w-3 h-3 text-indigo-400" /> Frequency
                      </div>
                      <div className="text-xs font-bold text-slate-900 mt-1 font-mono dark:text-slate-100">
                        {data.frequency}
                      </div>
                    </div>
                  )}

                  {data.ipRating && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors dark:bg-slate-800/60 dark:border-slate-700/60 dark:hover:border-slate-600">
                      <div className="text-[10px] uppercase font-semibold text-slate-500 flex items-center gap-1 dark:text-slate-400">
                        <Shield className="w-3 h-3 text-cyan-400" /> IP Rating
                      </div>
                      <div className="text-xs font-bold text-slate-900 mt-1 font-mono dark:text-slate-100">
                        {data.ipRating}
                      </div>
                    </div>
                  )}

                  {data.cableSize && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors dark:bg-slate-800/60 dark:border-slate-700/60 dark:hover:border-slate-600">
                      <div className="text-[10px] uppercase font-semibold text-slate-500 flex items-center gap-1 dark:text-slate-400">
                        <Cable className="w-3 h-3 text-orange-400" /> Cable Size
                      </div>
                      <div className="text-xs font-bold text-slate-900 mt-1 font-mono dark:text-slate-100">
                        {data.cableSize}
                      </div>
                    </div>
                  )}

                  {data.poles && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors dark:bg-slate-800/60 dark:border-slate-700/60 dark:hover:border-slate-600">
                      <div className="text-[10px] uppercase font-semibold text-slate-500 flex items-center gap-1 dark:text-slate-400">
                        <Cpu className="w-3 h-3 text-amber-400" /> Poles / Config
                      </div>
                      <div className="text-xs font-bold text-slate-900 mt-1 font-mono dark:text-slate-100">
                        {data.poles}
                      </div>
                    </div>
                  )}

                  {data.standards && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors dark:bg-slate-800/60 dark:border-slate-700/60 dark:hover:border-slate-600">
                      <div className="text-[10px] uppercase font-semibold text-slate-500 flex items-center gap-1 dark:text-slate-400">
                        <Award className="w-3 h-3 text-yellow-400" /> Standards
                      </div>
                      <div
                        className="text-xs font-bold text-slate-100 mt-1 font-mono truncate"
                        title={data.standards}
                      >
                        {data.standards}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Deep-dive article on the ElectraSim blog */}
              {data.learnMoreSlug && (
                <a
                  href={`/blog/${data.learnMoreSlug}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between gap-3 p-3.5 bg-sky-50 border border-sky-200 rounded-xl transition-colors hover:border-sky-300 hover:bg-sky-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:bg-sky-950/40 dark:border-sky-500/25 dark:hover:border-sky-400/50 dark:hover:bg-sky-950/60"
                >
                  <span className="flex items-center gap-2.5 text-xs text-sky-800 dark:text-sky-200">
                    <BookOpen aria-hidden="true" className="w-4 h-4 shrink-0 text-sky-400" />
                    <span>
                      <span className="font-semibold text-sky-900 block dark:text-sky-100">
                        Read the full guide
                      </span>
                      In-depth article on this component — opens the ElectraSim blog in a new tab.
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className="text-sky-600 text-sm transition-transform group-hover:translate-x-0.5 dark:text-sky-400"
                  >
                    →
                  </span>
                </a>
              )}
            </>
          )}

          {activeTab === 'wiring' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl dark:bg-slate-800/50 dark:border-slate-700/80">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2.5 flex items-center gap-2">
                  <Cable className="w-4 h-4 text-emerald-400" /> Terminal & Conductor Guidelines
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700 dark:text-slate-300">
                  <div className="p-3 bg-white border border-slate-200 rounded-lg dark:bg-slate-900/60 dark:border-slate-800">
                    <span className="font-semibold text-slate-800 block mb-1 dark:text-slate-200">
                      Recommended Conductor
                    </span>
                    <span className="font-mono text-emerald-700 dark:text-emerald-300">
                      {data.cableSize || '1.5 mm² - 2.5 mm² Copper'}
                    </span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-lg dark:bg-slate-900/60 dark:border-slate-800">
                    <span className="font-semibold text-slate-800 block mb-1 dark:text-slate-200">
                      Protection Curve & Poles
                    </span>
                    <span className="font-mono text-sky-700 dark:text-sky-300">
                      {data.tripCurve || 'Standard'} ({data.poles || '1P / Single'})
                    </span>
                  </div>
                </div>
              </div>

              {data.keySpecs && data.keySpecs.length > 0 && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl dark:bg-slate-800/40 dark:border-slate-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2.5 flex items-center gap-2 dark:text-slate-300">
                    <Sparkles className="w-4 h-4 text-sky-400" /> Technical Characteristics
                  </h4>
                  <ul className="space-y-2">
                    {data.keySpecs.map((spec, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-slate-700 flex items-start gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200 dark:text-slate-300 dark:bg-slate-900/50 dark:border-slate-800"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{spec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeTab === 'standards' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl dark:bg-emerald-950/20 dark:border-emerald-500/25">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-400" /> Regulatory Compliance Standard
                </h4>
                <p className="text-xs text-emerald-800 font-mono leading-relaxed bg-emerald-100/70 p-3 rounded-lg border border-emerald-200 dark:text-emerald-200/90 dark:bg-emerald-950/40 dark:border-emerald-500/20">
                  {data.standards}
                </p>
              </div>

              {data.quickTips && data.quickTips.length > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl dark:bg-amber-500/5 dark:border-amber-500/20">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2.5 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" /> Electrician Practical
                    Safety Tips
                  </h4>
                  <ul className="space-y-2">
                    {data.quickTips.map((tip, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-amber-800 flex items-start gap-2 bg-amber-100/60 px-3 py-2 rounded-lg border border-amber-200 dark:text-amber-200/90 dark:bg-amber-950/20 dark:border-amber-500/20"
                      >
                        <span className="text-amber-600 font-bold shrink-0 dark:text-amber-400">
                          •
                        </span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-white/95 flex items-center justify-between dark:border-slate-800 dark:bg-slate-900/95">
          <span className="text-xs text-slate-500 truncate max-w-[65%] dark:text-slate-400">
            Standards: {data.standards}
          </span>
          <button
            type="button"
            onClick={handleClose}
            className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-lg shadow-sky-900/20 active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </dialog>
  );
};
