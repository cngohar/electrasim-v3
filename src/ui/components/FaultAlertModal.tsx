import { AlertTriangle, Flame, HelpCircle, RefreshCw, X, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useCircuitStore, useUiStore } from '../../store';
import { useDialogFocus } from '../hooks/useDialogFocus';
import { MECHANISM_LABEL, formatClearingTime } from './faultAlertFormat';

export function FaultAlertModal() {
  const faultAlert = useUiStore((s) => s.faultAlert);
  const clearFaultAlert = useUiStore((s) => s.clearFaultAlert);
  const setWhatHappenedOpen = useUiStore((s) => s.setWhatHappenedOpen);
  const repairAllFaults = useCircuitStore((s) => s.repairAllFaults);
  const running = useUiStore((s) => s.simRunning);

  const [currentAlert, setCurrentAlert] = useState(faultAlert);
  const [isClosing, setIsClosing] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (faultAlert) {
      setCurrentAlert(faultAlert);
      setIsClosing(false);
    } else if (currentAlert && !isClosing) {
      setIsClosing(true);
      const timer = window.setTimeout(() => {
        setCurrentAlert(null);
        setIsClosing(false);
      }, 200);
      return () => window.clearTimeout(timer);
    }
  }, [faultAlert, currentAlert, isClosing]);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    window.setTimeout(() => {
      clearFaultAlert();
      setCurrentAlert(null);
      setIsClosing(false);
    }, 200);
  };

  useDialogFocus(Boolean(currentAlert) && !isClosing, handleClose, panelRef);

  if (!currentAlert) return null;

  const handleRepair = async () => {
    const applied =
      currentAlert.kind === 'melt'
        ? await repairAllFaults()
        : await useCircuitStore.getState().resetAllTrippedComponents();
    if (!applied) return;
    handleClose();
  };

  const handleWhatHappened = () => {
    setWhatHappenedOpen(true);
    handleClose();
  };

  const handleAdjustInInspector = () => {
    if (currentAlert.deviceId) {
      useCircuitStore.getState().selectComponent(currentAlert.deviceId);
    } else if (currentAlert.wireId) {
      useCircuitStore.getState().selectWire(currentAlert.wireId);
    } else {
      const cs = useCircuitStore.getState();
      const blownComp = cs.components.find((c) => c.state?.isBlown);
      if (blownComp) {
        cs.selectComponent(blownComp.id);
      } else {
        const bustedWire = cs.wires.find((w) => w.isBusted);
        if (bustedWire) {
          cs.selectWire(bustedWire.id);
        }
      }
    }
    useUiStore.getState().setInspectorCollapsed(false);
    useUiStore.getState().setInspectorOpen(true);
    handleClose();
  };

  const isMelt = currentAlert.kind === 'melt';

  return (
    <dialog
      open
      aria-modal="true"
      aria-labelledby="fault-alert-title"
      className="fixed inset-0 z-100 m-0 flex h-dvh w-screen max-h-none max-w-none items-center justify-center overflow-y-auto border-0 bg-transparent p-4"
    >
      <button
        type="button"
        aria-label="Close"
        className={`absolute inset-0 cursor-default bg-slate-950/75 backdrop-blur-md transition-all ${
          isClosing ? 'animate-backdrop-fade-out' : 'animate-backdrop-fade-in'
        }`}
        onClick={handleClose}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`relative w-full max-w-lg rounded-2xl border bg-white p-6 shadow-2xl transition-all dark:bg-slate-900 outline-none ${
          isClosing ? 'animate-dialog-fade-out' : 'animate-dialog-fade-in'
        } ${
          isMelt
            ? 'border-red-500/50 shadow-red-500/20 dark:border-red-600/60'
            : 'border-amber-500/50 shadow-amber-500/20 dark:border-amber-600/60'
        }`}
      >
        {/* Header with Icon */}
        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-bold ${
              isMelt
                ? 'bg-red-100 text-red-600 dark:bg-red-950/80 dark:text-red-400'
                : 'bg-amber-100 text-amber-600 dark:bg-amber-950/80 dark:text-amber-400'
            }`}
          >
            {isMelt ? (
              <Flame className="h-7 w-7 animate-bounce text-red-600 dark:text-red-400" />
            ) : (
              <Zap className="h-7 w-7 animate-pulse text-amber-600 dark:text-amber-400" />
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between gap-2">
              <h2
                id="fault-alert-title"
                className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-100"
              >
                {currentAlert.title}
              </h2>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {currentAlert.deviceName && (
              <span className="mt-1 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {currentAlert.deviceName}
              </span>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="mt-4 space-y-3">
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            {currentAlert.reason}
          </p>

          {/* Metrics Card */}
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/60">
            <div>
              <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Current Demand
              </span>
              <span className="text-base font-extrabold font-mono text-red-600 dark:text-red-400">
                {currentAlert.currentAmps === null
                  ? 'Unavailable'
                  : `${currentAlert.currentAmps.toFixed(1)} A`}
                {currentAlert.currentMultiple !== undefined && (
                  <span className="ml-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                    {currentAlert.currentMultiple.toFixed(2)}×
                  </span>
                )}
              </span>
            </div>
            <div>
              <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {isMelt ? 'Cable Capacity' : 'Protection Rating'}
              </span>
              <span className="text-base font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                {currentAlert.limitAmps === null
                  ? 'Not declared'
                  : `${currentAlert.limitAmps.toFixed(1)} A`}
              </span>
            </div>
            {/* Timing turns "over its rating" into a real disconnection-time
                answer, and names which element inside the device operated. */}
            {currentAlert.clearingTimeSeconds !== undefined && (
              <div className="col-span-2 border-t border-slate-200 pt-2 dark:border-slate-800">
                <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Disconnection Time
                  {currentAlert.mechanism && ` — ${MECHANISM_LABEL[currentAlert.mechanism]}`}
                </span>
                <span className="text-base font-extrabold font-mono text-amber-600 dark:text-amber-400">
                  {formatClearingTime(currentAlert.clearingTimeSeconds)}
                </span>
              </div>
            )}
          </div>

          {/* Action Hint */}
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <strong className="font-semibold block mb-0.5">How to Resolve Issue:</strong>
              {currentAlert.resolutionHint}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleWhatHappened}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-xs font-bold text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-900/80 cursor-pointer"
          >
            <HelpCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            What Happened?
          </button>
          <div className="flex w-full sm:w-auto items-center gap-2">
            <button
              type="button"
              onClick={handleAdjustInInspector}
              className="w-1/2 sm:w-auto rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
            >
              Adjust in Inspector
            </button>
            <button
              type="button"
              onClick={handleRepair}
              disabled={running}
              className={`w-1/2 sm:w-auto flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-md transition-all active:scale-95 cursor-pointer ${
                isMelt
                  ? 'bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500'
                  : 'bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500'
              }`}
            >
              <RefreshCw className="h-4 w-4" />
              {isMelt ? 'Replace damaged items' : 'Reset tripped devices'}
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
