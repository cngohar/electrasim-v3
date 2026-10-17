import { COMPONENT_DEFS } from '@electrasim/domain';
import { getComponentHelp } from '@electrasim/domain/componentHelp';
import { componentReference } from '@electrasim/domain/core/componentReference';
import {
  Activity,
  AlertTriangle,
  Award,
  BookOpen,
  Cable,
  Check,
  CheckCircle2,
  Copy,
  FileText,
  Info,
  Layers,
  MapPin,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { type FC, useEffect, useState } from 'react';
import { useCircuitStore } from '../../store/circuitStore';
import { useUiStore } from '../../store/uiStore';
import { ComponentSpecs } from './ComponentSpecs';
import { Modal } from './Modal';
import { getComponentImage } from './componentImages';

export const ComponentInfoModal: FC = () => {
  const circuit = useCircuitStore((s) => s);
  const activeType = useUiStore((s) => s.activeComponentInfoType);
  const setActiveType = useUiStore((s) => s.setActiveComponentInfoType);

  const [currentType, setCurrentType] = useState<string | null>(activeType);
  const [activeTab, setActiveTab] = useState<'overview' | 'wiring' | 'standards'>('overview');
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (activeType) setCurrentType(activeType);
  }, [activeType]);
  const handleClose = () => setActiveType(null);
  if (!currentType) return null;

  const data = getComponentHelp(currentType);
  const def = COMPONENT_DEFS[currentType];
  const imageUrl = getComponentImage(currentType, data.category);

  // Canonical ports own identity; authored notes may describe that same label.
  const terminalPinouts =
    def?.ports.map((port, index) => ({
      terminal: port.label || `Terminal ${index + 1}`,
      role: port.type,
      description:
        data.terminalPinout?.find((item) => item.terminal === port.label)?.description ??
        `${port.type} terminal in the declared catalogue model.`,
    })) ?? [];

  const regulationClauses = data.regulationClauses ?? [];
  const selected = circuit.components.find(
    (component) => component.id === circuit.selectedComponentId && component.type === currentType,
  );
  const reference = componentReference(currentType, selected, circuit);

  const handleCopySpecs = () => {
    const text = [
      `Component: ${reference.title} (${currentType})`,
      `${reference.scope} · ${reference.family}`,
      ...reference.groups.flatMap((group) => [
        `${group.role}: ${group.terminals.join(' / ')}`,
        ...group.rows.map((row) => `${row.label}: ${row.value} [${row.provenance}] ${row.basis}`),
        `Model: ${group.law}. ${group.limitation}`,
      ]),
      reference.missingMetadata,
    ].join('\n');

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Modal
      open={!!activeType}
      onClose={handleClose}
      ariaLabel="Component specifications"
      widthClass="max-w-3xl"
    >
      <div className="table-custom-content ComponentInfoModal">
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
            Reference standards & tips
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 custom-scrollbar">
          <p className="text-xs">
            Reference guidance describes representative equipment. It does not add ratings,
            automatic behavior or certification to the selected teaching model.
          </p>
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
                    Representative photo
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
                        <Activity className="w-3.5 h-3.5 text-emerald-400" /> Reference behavior ·
                        model limits below
                      </h4>
                      <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200 dark:text-slate-300 dark:bg-slate-800/40 dark:border-slate-800">
                        {data.circuitBehavior}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <ComponentSpecs type={currentType} component={selected} circuit={circuit} />

              {/* Real-World Applications */}
              {data.realWorldApplications && data.realWorldApplications.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 dark:text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-blue-500" /> Typical Real-World Applications
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {data.realWorldApplications.map((app, idx) => (
                      <div
                        key={idx}
                        className="text-xs text-slate-700 bg-slate-50 border border-slate-200 p-2.5 rounded-lg flex items-center gap-2 dark:bg-slate-800/40 dark:border-slate-800 dark:text-slate-300"
                      >
                        <span className="size-1.5 rounded-full bg-blue-500 shrink-0" />
                        <span>{app}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
              {/* Terminal Pinouts & Markings */}
              {terminalPinouts.length > 0 && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl dark:bg-slate-800/40 dark:border-slate-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-500" /> Terminal Pinout & Physical Markings
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {terminalPinouts.map((pin, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-start gap-2.5 dark:bg-slate-900/60 dark:border-slate-800"
                      >
                        <span
                          className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded uppercase shrink-0 ${
                            pin.role === 'live'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300'
                              : pin.role === 'neutral'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300'
                                : pin.role === 'earth'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                                  : 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300'
                          }`}
                        >
                          {pin.terminal}
                        </span>
                        <div className="min-w-0">
                          <span className="text-[11px] font-semibold text-slate-900 dark:text-slate-100 block capitalize">
                            {pin.role} Terminal
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-tight">
                            {pin.description}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                      {data.cableSize || 'Not declared · review actual installation data'}
                    </span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-lg dark:bg-slate-900/60 dark:border-slate-800">
                    <span className="font-semibold text-slate-800 block mb-1 dark:text-slate-200">
                      Protection Curve & Poles
                    </span>
                    <span className="font-mono text-sky-700 dark:text-sky-300">
                      {data.tripCurve || 'Curve not declared'} ·{' '}
                      {data.poles || 'Configuration: see canonical terminals'}
                    </span>
                  </div>
                </div>
              </div>

              {data.keySpecs && data.keySpecs.length > 0 && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl dark:bg-slate-800/40 dark:border-slate-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2.5 flex items-center gap-2 dark:text-slate-300">
                    <Sparkles className="w-4 h-4 text-sky-400" /> Reference equipment notes
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
              {/* Statutory Regulation Clauses */}
              {regulationClauses.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-500" /> Authored reference clauses
                  </h4>
                  <div className="space-y-2">
                    {regulationClauses.map((clause, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl dark:bg-amber-950/20 dark:border-amber-900/40 space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-amber-900 dark:text-amber-200 text-xs">
                            {clause.title}
                          </span>
                          <span className="font-mono text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded">
                            {clause.clause}
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-800 dark:text-amber-300/90 leading-relaxed">
                          {clause.requirement}
                        </p>
                        <div className="text-[9px] text-amber-600 dark:text-amber-400 font-mono">
                          Standard: {clause.standard}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl dark:bg-emerald-950/20 dark:border-emerald-500/25">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-400" /> Reference standards
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
    </Modal>
  );
};
