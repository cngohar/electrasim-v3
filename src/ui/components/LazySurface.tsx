import { LoaderCircle, RefreshCcw, X } from 'lucide-react';
import { type ReactNode, Suspense, useId, useRef } from 'react';
import { ErrorBoundary } from '../ErrorBoundary';
import { useDialogFocus } from '../hooks/useDialogFocus';

interface Props {
  children: ReactNode;
  label: string;
  onClose: () => void;
}

interface FailureProps {
  error: Error;
  label: string;
  onClose: () => void;
}

function LazySurfaceFailure({ error, label, onClose }: FailureProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  useDialogFocus(true, onClose, panelRef);

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-900/40 p-4 backdrop-blur-sm animate-backdrop-fade-in">
      <div
        ref={panelRef}
        tabIndex={-1}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="table-surface table-load-failure w-full max-w-sm rounded-lg border border-red-100 bg-white p-5 shadow-2xl outline-none animate-dialog-fade-in dark:border-red-900/50 dark:bg-slate-900"
      >
        <h2 id={titleId} className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {label} could not load
        </h2>
        <p
          id={descriptionId}
          className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400"
        >
          Check the connection, then reload to fetch this panel again.
        </p>
        <p className="sr-only">{error.message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <X className="size-3.5" />
            Close
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
          >
            <RefreshCcw className="size-3.5" />
            Reload
          </button>
        </div>
      </div>
    </div>
  );
}

export function LazySurface({ children, label, onClose }: Props) {
  return (
    <ErrorBoundary
      fallback={(error) => <LazySurfaceFailure error={error} label={label} onClose={onClose} />}
    >
      <Suspense
        fallback={
          <output className="fixed inset-0 z-[100] grid place-items-center bg-slate-900/20 backdrop-blur-sm">
            <span className="table-surface table-load-state inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-lg dark:bg-slate-900 dark:text-slate-200">
              <LoaderCircle className="size-4 animate-spin" />
              Loading {label}
            </span>
          </output>
        }
      >
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}
