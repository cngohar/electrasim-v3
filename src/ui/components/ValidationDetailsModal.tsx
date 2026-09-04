import {
  AlertTriangle,
  BookOpen,
  Crosshair,
  Info,
  Lightbulb,
  ShieldAlert,
  Wrench,
  Zap,
} from 'lucide-react';
import type { ValidationIssue } from '../../domain/circuitValidation';
import { useCircuitStore } from '../../store/circuitStore';
import { useUiStore } from '../../store/uiStore';
import { Modal } from './Modal';

import { useEffect, useState } from 'react';

export function ValidationDetailsModal() {
  const activeIssue = useUiStore((s) => s.activeValidationIssueModal);
  const setActiveIssue = useUiStore((s) => s.setActiveValidationIssueModal);
  const applyQuickFix = useUiStore((s) => s.applyQuickFix);
  const selectComponent = useCircuitStore((s) => s.selectComponent);
  const selectWire = useCircuitStore((s) => s.selectWire);

  const [currentIssue, setCurrentIssue] = useState<ValidationIssue | null>(activeIssue);

  useEffect(() => {
    if (activeIssue) {
      setCurrentIssue(activeIssue);
    }
  }, [activeIssue]);

  if (!currentIssue) return null;

  const handleClose = () => setActiveIssue(null);

  const handleLocateOnCanvas = () => {
    if (currentIssue.componentId) {
      selectComponent(currentIssue.componentId);
      useUiStore.setState({ inspectorOpen: true, inspectorCollapsed: false });
    } else if (currentIssue.wireId) {
      selectWire(currentIssue.wireId);
      useUiStore.setState({ inspectorOpen: true, inspectorCollapsed: false });
    }
    handleClose();
  };

  const handleApplyQuickFix = () => {
    if (currentIssue.quickFix) {
      applyQuickFix(currentIssue.quickFix);
      handleClose();
    }
  };

  const breakdown = currentIssue.detailedBreakdown;

  const severityColor =
    currentIssue.severity === 'error'
      ? 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border-rose-500/20'
      : currentIssue.severity === 'warning'
        ? 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border-amber-500/20'
        : 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border-blue-500/20';

  const severityIcon =
    currentIssue.severity === 'error' ? (
      <ShieldAlert className="size-5 text-rose-500" />
    ) : currentIssue.severity === 'warning' ? (
      <AlertTriangle className="size-5 text-amber-500" />
    ) : (
      <Info className="size-5 text-blue-500" />
    );

  return (
    <Modal
      open={Boolean(activeIssue)}
      onClose={handleClose}
      widthClass="max-w-2xl"
      ariaLabel={currentIssue.title}
    >
      <div className="space-y-5">
        {/* Header section */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200/80 pb-4 dark:border-slate-800">
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl border ${severityColor}`}
            >
              {severityIcon}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold capitalize border ${severityColor}`}
                >
                  {currentIssue.severity}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                  <Zap className="size-3" />
                  {currentIssue.category.replace('_', ' ')}
                </span>
              </div>
              <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
                {currentIssue.title}
              </h2>
            </div>
          </div>
        </div>

        {/* BS 7671 Regulation standard badge */}
        {breakdown?.bs7671Regulation && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3.5 py-2.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-500/20">
            <BookOpen className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>Regulation Reference: {breakdown.bs7671Regulation}</span>
          </div>
        )}

        {/* Primary Description */}
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {currentIssue.description}
        </p>

        {/* Electrical Physics & Risk Explanation */}
        {breakdown?.physicsExplanation && (
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4 border border-slate-200/80 dark:border-slate-700/60">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              <Zap className="size-3.5 text-amber-500" />
              Electrical Physics & Design Hazard Analysis
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {breakdown.physicsExplanation}
            </p>
          </div>
        )}

        {/* Diagnostic Timeline / Step Breakdown */}
        {breakdown?.steps && breakdown.steps.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">
              Step-by-Step Diagnostic Analysis
            </h3>
            <div className="space-y-2.5">
              {breakdown.steps.map((step) => (
                <div
                  key={step.stepNumber}
                  className="flex items-start gap-3 rounded-lg border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-3"
                >
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 dark:bg-emerald-500 text-[11px] font-extrabold text-white">
                    {step.stepNumber}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {step.title}
                    </h4>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Electrician Practical Tip */}
        {breakdown?.practicalTip && (
          <div className="flex items-start gap-3 rounded-xl bg-amber-500/10 p-3.5 dark:bg-amber-500/15 border border-amber-500/20">
            <Lightbulb className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider block">
                Electrician's Practical Remediation Tip
              </span>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                {breakdown.practicalTip}
              </p>
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200/80 dark:border-slate-800">
          {currentIssue.componentId || currentIssue.wireId ? (
            <button
              type="button"
              onClick={handleLocateOnCanvas}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <Crosshair className="size-3.5 text-emerald-500" />
              Locate on Canvas
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Close
            </button>
            {currentIssue.quickFix && (
              <button
                type="button"
                onClick={handleApplyQuickFix}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 active:bg-emerald-700 transition-colors cursor-pointer"
              >
                <Wrench className="size-3.5" />
                Quick Fix: {currentIssue.quickFix.label}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
