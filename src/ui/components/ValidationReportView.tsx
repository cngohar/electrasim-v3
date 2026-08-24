import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  Info,
  Loader2,
  Play,
  RotateCcw,
  ShieldCheck,
  Wrench,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import type { ValidationIssue, ValidationReport } from '../../domain/circuitValidation';
import { useCircuitStore, useSettingsStore } from '../../store';
import { useUiStore } from '../../store/uiStore';

interface Props {
  report: ValidationReport | null;
  onRunValidation: () => void;
}

export function ValidationReportView({ report, onRunValidation }: Props) {
  const [showPassed, setShowPassed] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const isValidatingCircuit = useUiStore((s) => s.isValidatingCircuit);
  const validationStale = useUiStore((s) => s.validationStale);
  const complianceGateBlocked = useUiStore((s) => s.complianceGateBlocked);
  const applyQuickFix = useUiStore((s) => s.applyQuickFix);
  const runWithComplianceOverride = useUiStore((s) => s.runWithComplianceOverride);
  const setActiveValidationIssueModal = useUiStore((s) => s.setActiveValidationIssueModal);
  const appMode = useSettingsStore((s) => s.appMode);

  // CASE 0: Currently Validating Circuit (Loading Spinner)
  if (isValidatingCircuit) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center my-auto min-h-[220px]">
        <div className="relative mb-3 flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
          <Loader2 className="size-7 animate-spin text-emerald-600 dark:text-emerald-400" />
          <ShieldCheck className="size-4 absolute text-emerald-600 dark:text-emerald-400" />
        </div>
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
          Validating Circuit Topology...
        </h3>
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 max-w-[220px] leading-relaxed">
          Analyzing BS 7671 regulations, CPC grounding paths, cable ampacities, and overcurrent
          coordination...
        </p>
      </div>
    );
  }

  // CASE 1: No report generated yet
  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center">
        <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 shadow-inner">
          <ShieldCheck className="size-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Circuit Validation</h3>
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 max-w-[220px] leading-relaxed">
          Analyze your circuit design against common flaws, safety risks, and BS 7671 wiring
          standards.
        </p>
        <button
          type="button"
          onClick={onRunValidation}
          className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-500 transition active:scale-98"
        >
          <ShieldCheck className="size-4" />
          Run Circuit Check
        </button>
      </div>
    );
  }

  // CASE 2: Empty canvas (no components on canvas)
  if (report.isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center my-auto">
        <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 shadow-inner">
          <ShieldCheck className="size-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Canvas is Empty</h3>
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 max-w-[220px] leading-relaxed">
          No components found on the canvas. Drag components from the left palette to build and
          validate your circuit.
        </p>
      </div>
    );
  }

  // CASE 3: Incomplete Circuit (Needs wiring or missing power supply)
  if (report.isIncomplete) {
    const mainIssue = report.issues[0];
    return (
      <div className="flex flex-col gap-3 p-3.5 text-xs">
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/40 p-4 text-amber-900 dark:text-amber-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Circuit Status
                </div>
                <div className="text-sm font-bold">Incomplete Circuit</div>
              </div>
            </div>
            <button
              type="button"
              onClick={onRunValidation}
              title="Re-run validation check"
              className="flex size-7 items-center justify-center rounded-lg bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 shadow-xs hover:bg-white dark:hover:bg-slate-800 transition"
            >
              <RotateCcw className="size-3.5" />
            </button>
          </div>
          <p className="mt-2 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            Please complete the circuit wiring (connect Live, Neutral, and Earth conductors) before
            running full compliance validation.
          </p>
        </div>

        {mainIssue && (
          <div className="rounded-xl border border-amber-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 p-3.5 shadow-sm space-y-2.5">
            <h4 className="font-bold text-slate-900 dark:text-slate-100">{mainIssue.title}</h4>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              {mainIssue.description}
            </p>
            <div className="flex items-start gap-1.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 p-2.5 rounded-lg border border-amber-200/60 dark:border-amber-900/40">
              <Wrench className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <span>{mainIssue.recommendation}</span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              {mainIssue.quickFix && (
                <button
                  type="button"
                  onClick={() => applyQuickFix(mainIssue.quickFix!)}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 dark:bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 transition shadow-xs"
                >
                  <Wrench className="size-3.5" />
                  Quick Fix: {mainIssue.quickFix.label}
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveValidationIssueModal(mainIssue)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                <FileText className="size-3.5 text-emerald-500" />
                View Details
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // CASE 4: Complete Circuit - Show Full Compliance Report
  const { score, status, summary, issues, passedChecks } = report;

  const scoreColor =
    score >= 90
      ? 'text-emerald-600 dark:text-emerald-400 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-800'
      : score >= 60
        ? 'text-amber-600 dark:text-amber-400 border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800'
        : 'text-red-600 dark:text-red-400 border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-800';

  const statusText =
    status === 'pass'
      ? 'Circuit Compliant & Safe'
      : status === 'warning'
        ? 'Minor Design Warnings'
        : 'Critical Design Flaws';

  const filteredIssues =
    selectedCategory === 'all' ? issues : issues.filter((i) => i.severity === selectedCategory);
  /** Every issue in the full report that carries an automatic quick fix. */
  const fixableIssues = issues.filter((i) => i.quickFix);

  const handleSelectTarget = (issue: ValidationIssue) => {
    const cs = useCircuitStore.getState();
    if (issue.componentId) {
      if (cs.components.some((c) => c.id === issue.componentId)) {
        cs.selectComponent(issue.componentId);
      } else {
        useUiStore
          .getState()
          .addLog(
            'That component no longer exists — re-run validation for a fresh report.',
            'info',
          );
      }
    } else if (issue.wireId) {
      if (cs.wires.some((w) => w.id === issue.wireId)) {
        cs.selectWire(issue.wireId);
      } else {
        useUiStore
          .getState()
          .addLog('That wire no longer exists — re-run validation for a fresh report.', 'info');
      }
    }
  };
  const firstBlockingIssue = issues.find((issue) => issue.blocking && issue.severity === 'error');
  const blockingCount = report.blockingErrorsCount ?? 0;

  return (
    <div className="flex flex-col gap-3 p-3.5 text-xs">
      {validationStale && (
        <div
          // biome-ignore lint/a11y/useSemanticElements: transient advisory banner needs role=status; <output> implies a calculation result
          role="status"
          data-validation-stale-banner
          className="flex items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-amber-900 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
        >
          <span className="flex items-center gap-2 text-[11px] font-semibold leading-snug">
            <AlertTriangle className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
            The circuit changed after this report ran — results may be outdated.
          </span>
          <button
            type="button"
            onClick={onRunValidation}
            className="shrink-0 rounded-lg bg-amber-600 px-2.5 py-1 text-[10px] font-bold text-white shadow-xs transition hover:bg-amber-500"
          >
            Re-validate
          </button>
        </div>
      )}
      {complianceGateBlocked && blockingCount > 0 && (
        <div
          role="alert"
          data-compliance-gate-banner
          className="rounded-xl border border-red-300 bg-red-50 p-3.5 text-red-950 shadow-sm dark:border-red-900 dark:bg-red-950/50 dark:text-red-100"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-400" />
            <div className="min-w-0 flex-1">
              <h3 className="text-xs font-bold">
                Fix {blockingCount} blocking issue{blockingCount === 1 ? '' : 's'} to enable Run
              </h3>
              <p className="mt-1 text-[11px] leading-relaxed text-red-800 dark:text-red-200">
                {firstBlockingIssue?.title ??
                  'The active electrical standard has blocked this simulation.'}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {firstBlockingIssue && (
              <button
                type="button"
                onClick={() => {
                  handleSelectTarget(firstBlockingIssue);
                  setActiveValidationIssueModal(firstBlockingIssue);
                }}
                className="flex items-center gap-1 rounded-lg border border-red-300 bg-white px-2.5 py-1.5 text-[10px] font-bold text-red-800 transition hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:text-red-200 dark:hover:bg-red-900"
              >
                <FileText className="size-3" />
                Review first issue
              </button>
            )}
            {appMode === 'pro' && (
              <button
                type="button"
                data-compliance-override
                onClick={runWithComplianceOverride}
                title="Teacher/demo override — starts the simulation and records an audit event. Physical faults cannot be bypassed."
                className="flex items-center gap-1 rounded-lg bg-red-700 px-2.5 py-1.5 text-[10px] font-bold text-white transition hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-500"
              >
                <Play className="size-3" />
                Run anyway (teacher/demo)
              </button>
            )}
          </div>
          <p className="mt-2 text-[9px] leading-relaxed text-red-700 dark:text-red-300">
            Overrides are written to Simulation History. Tripped, blown, or melted equipment must
            still be repaired.
          </p>
        </div>
      )}

      {/* Score Header Card */}
      <div className={`rounded-xl border p-3.5 shadow-sm transition ${scoreColor}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="text-2xl font-black tracking-tight">{score}%</div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                Compliance Score
              </div>
              <div className="text-xs font-bold leading-tight">{statusText}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onRunValidation}
            title="Re-run validation check"
            className="flex size-8 items-center justify-center rounded-lg bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 shadow-xs hover:bg-white dark:hover:bg-slate-800 transition"
          >
            <RotateCcw className="size-3.5" />
          </button>
        </div>

        {/* Counter Pills */}
        <div className="mt-3 flex items-center justify-between gap-1 border-t border-black/10 dark:border-white/10 pt-2.5 text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-2 py-0.5 rounded-md transition ${selectedCategory === 'all' ? 'bg-black/10 dark:bg-white/10 font-bold' : 'opacity-70 hover:opacity-100'}`}
          >
            All ({issues.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('error')}
            className={`flex items-center gap-1 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-md transition ${selectedCategory === 'error' ? 'bg-red-500/15 font-bold' : 'opacity-70 hover:opacity-100'}`}
          >
            <XCircle className="size-3" />
            {summary.errorsCount}
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('warning')}
            className={`flex items-center gap-1 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-md transition ${selectedCategory === 'warning' ? 'bg-amber-500/15 font-bold' : 'opacity-70 hover:opacity-100'}`}
          >
            <AlertTriangle className="size-3" />
            {summary.warningsCount}
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('info')}
            className={`flex items-center gap-1 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-md transition ${selectedCategory === 'info' ? 'bg-blue-500/15 font-bold' : 'opacity-70 hover:opacity-100'}`}
          >
            <Info className="size-3" />
            {summary.infoCount}
          </button>
        </div>
      </div>

      {/* Issues Section */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
          <span>Design Issues & Findings</span>
          <div className="flex items-center gap-2">
            {fixableIssues.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  // Apply every available quick fix in report order; each
                  // application re-runs validation, so the final report
                  // reflects the combined result.
                  for (const issue of fixableIssues) {
                    if (issue.quickFix) applyQuickFix(issue.quickFix);
                  }
                }}
                title={`Apply all ${fixableIssues.length} available quick fixes`}
                className="flex items-center gap-1 rounded-lg bg-emerald-600 dark:bg-emerald-500 px-2 py-1 text-[10px] font-bold text-white hover:bg-emerald-500 transition shadow-xs"
              >
                <Wrench className="size-3" />
                Fix All ({fixableIssues.length})
              </button>
            )}
            <span className="text-[10px] text-slate-400 font-normal">
              {filteredIssues.length} item(s)
            </span>
          </div>
        </div>

        {filteredIssues.length === 0 ? (
          <div className="rounded-xl border border-dashed border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 text-center text-emerald-700 dark:text-emerald-400 font-semibold">
            ✓ No design issues found! Circuit is compliant.
          </div>
        ) : (
          filteredIssues.map((issue, idx) => {
            const isErr = issue.severity === 'error';
            const isWarn = issue.severity === 'warning';

            return (
              <div
                key={`${issue.id}_${idx}`}
                onClick={() => handleSelectTarget(issue)}
                className={`group cursor-pointer rounded-xl border p-3.5 transition hover:shadow-md ${
                  isErr
                    ? 'border-red-200 bg-red-50/50 hover:bg-red-50 dark:border-red-900/50 dark:bg-red-950/30 dark:hover:bg-red-950/50'
                    : isWarn
                      ? 'border-amber-200 bg-amber-50/50 hover:bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 dark:hover:bg-amber-950/50'
                      : 'border-blue-200 bg-blue-50/50 hover:bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/30 dark:hover:bg-blue-950/50'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {isErr ? (
                    <XCircle className="size-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  ) : isWarn ? (
                    <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  ) : (
                    <Info className="size-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 leading-snug">
                        {issue.title}
                      </h4>
                      {issue.componentId && (
                        <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 group-hover:underline shrink-0">
                          Inspect
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      {issue.description}
                    </p>
                    <div className="mt-2 flex items-start gap-1.5 text-[10px] font-semibold text-slate-700 dark:text-slate-200 bg-white/80 dark:bg-slate-900/80 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800/60">
                      <Wrench className="size-3 text-slate-500 shrink-0 mt-0.5" />
                      <span>{issue.recommendation}</span>
                    </div>

                    {/* Quick Fix & View Details Actions */}
                    <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                      {issue.quickFix && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            applyQuickFix(issue.quickFix!);
                          }}
                          className="flex items-center gap-1 rounded-lg bg-emerald-600 dark:bg-emerald-500 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-500 dark:hover:bg-emerald-400 active:scale-98 transition shadow-2xs"
                        >
                          <Wrench className="size-3" />
                          Quick Fix: {issue.quickFix.label}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveValidationIssueModal(issue);
                        }}
                        className="flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white/90 dark:bg-slate-800/90 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                      >
                        <FileText className="size-3 text-emerald-500" />
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Passed Checks Accordion */}
      {passedChecks.length > 0 && (
        <div className="mt-1 border-t border-slate-200/80 dark:border-slate-800/80 pt-2">
          <button
            type="button"
            onClick={() => setShowPassed(!showPassed)}
            className="flex w-full items-center justify-between py-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition"
          >
            <span className="flex items-center gap-1.5 font-bold text-[11px]">
              <CheckCircle2 className="size-3.5 text-emerald-500" />
              Passed Design Checks ({passedChecks.length})
            </span>
            {showPassed ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </button>

          {showPassed && (
            <div className="mt-2 flex flex-col gap-1.5 pl-1">
              {passedChecks.map((check) => (
                <div
                  key={check.id}
                  className="rounded-lg border border-emerald-100 bg-emerald-50/40 dark:border-emerald-950 dark:bg-emerald-950/20 p-2 text-[11px]"
                >
                  <div className="font-semibold text-emerald-800 dark:text-emerald-300">
                    ✓ {check.title}
                  </div>
                  <div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                    {check.description}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
