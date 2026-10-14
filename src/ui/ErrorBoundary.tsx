/**
 * ErrorBoundary — catches render errors in any descendant and shows a
 * friendly fallback instead of a blank page (Phase 6.1 hardening).
 *
 * Why a class component? React's error boundary contract still requires
 * `componentDidCatch`/`getDerivedStateFromError`; there is no hooks API.
 *
 * What it catches:
 *   - Errors thrown during render or in lifecycle methods of the subtree.
 * What it does NOT catch (handled separately):
 *   - Async rejections from event handlers (we add `.catch` at call sites).
 *   - Errors inside the simulation Web Worker (handled by sim-worker client).
 *   - Errors during IndexedDB I/O (handled by persistence + settings stores).
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Optional custom fallback renderer; receives the error + reset fn. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    // One central place to log render errors. In production this is the
    // hook to send a beacon to a backend (Phase 9).
    console.error('[ErrorBoundary] render error:', error, info.componentStack);
  }

  reset = () => {
    this.setState({ error: null });
  };

  override render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) return this.props.fallback(error, this.reset);

    return (
      <div className="open-table table-editor-error grid min-h-dvh w-full place-items-center p-6">
        <div className="table-surface table-load-failure w-full max-w-lg">
          <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Something went wrong
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            The editor could not finish rendering. Try again, or reload to restore your last saved
            circuit.
          </p>
          <details className="mt-6 text-xs">
            <summary>Technical details</summary>
            <pre className="mt-3 max-h-40 overflow-auto rounded-lg bg-slate-900 p-3 text-xs leading-relaxed text-slate-100">
              {error.message}
            </pre>
          </details>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Reload
            </button>
            <button
              type="button"
              onClick={this.reset}
              className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }
}
