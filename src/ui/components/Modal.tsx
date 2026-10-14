import { createPortal } from 'react-dom';
/**
 * Modal — minimal dialog primitive for ElectraSim (Phase 6.1).
 *
 * Why not Radix Dialog? It's a great component but it pulls ~12 KB gzip
 * for two simple modals. We need:
 *   - backdrop click + Escape to close
 *   - focus the panel on open and restore focus on close
 *   - block body scroll while open
 *   - native dialog semantics + aria-labelledby for screen readers
 *
 * That's ~80 lines of vanilla React. Drop in Radix later if we need
 * portals, animations, or a richer focus trap.
 */

import { X } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useId, useRef } from 'react';
import { useDialogFocus } from '../hooks/useDialogFocus';
import { useSurfacePresence } from '../hooks/useSurfacePresence';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** When omitted the caller is responsible for rendering its own header. */
  title?: string;
  /** Optional short subtitle/description rendered under the title. */
  description?: string;
  /** Footer slot — typically the action buttons. */
  footer?: ReactNode;
  children: ReactNode;
  /** Tailwind max-width override; defaults to `max-w-md`. */
  widthClass?: string;
  /** Accessible name for callers that render a custom header instead of `title`. */
  ariaLabel?: string;
  /** Keep the dimmed backdrop without blurring the editor behind it. */
  backdropBlur?: boolean;
  /** Modeless tool window: selection and canvas interaction remain available. */
  interactiveCanvas?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  footer,
  children,
  widthClass = 'max-w-md',
  ariaLabel,
  backdropBlur = true,
  interactiveCanvas = false,
}: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const { mounted, exiting: isClosing } = useSurfacePresence(open);
  // Always invoke the LATEST onClose callback, synchronously. The previous
  // implementation deferred the call by 200 ms inside a captured closure,
  // which both delayed the state update and could call a stale callback.
  // The exit animation still runs: the parent flips `open` to false and the
  // effect above plays the 200 ms closing transition before unmounting.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const handleRequestClose = useCallback(() => {
    onCloseRef.current();
  }, []);

  useDialogFocus(mounted && !isClosing && !interactiveCanvas, handleRequestClose, panelRef);

  useEffect(() => {
    if (!open || !interactiveCanvas) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => {
      if (previous?.isConnected && previous.offsetParent !== null) previous.focus();
      else
        document.querySelector<HTMLButtonElement>('[aria-label="Labs and circuit tools"]')?.focus();
    };
  }, [open, interactiveCanvas]);

  if (!mounted) return null;

  return createPortal(
    <dialog
      open
      data-surface-state={isClosing ? 'closing' : 'open'}
      inert={isClosing || undefined}
      aria-hidden={isClosing || undefined}
      data-interactive-canvas={interactiveCanvas || undefined}
      className="table-dialog fixed inset-0 z-50 m-0 flex h-dvh w-screen max-h-none max-w-none items-center justify-center overflow-y-auto border-0 bg-transparent p-4"
      aria-modal={interactiveCanvas ? undefined : true}
      aria-labelledby={title ? titleId : undefined}
      aria-label={title ? undefined : (ariaLabel ?? 'Dialog')}
    >
      <button
        type="button"
        aria-label="Close"
        className={`absolute inset-0 cursor-default bg-slate-950/60 ${
          backdropBlur ? 'backdrop-blur-md' : ''
        } transition-all ${isClosing ? 'animate-modal-backdrop-out' : 'animate-modal-backdrop-in'}`}
        onClick={handleRequestClose}
      />
      <div
        ref={panelRef}
        data-canvas-occluder={interactiveCanvas || undefined}
        tabIndex={-1}
        className={`table-dialog-panel relative mx-auto my-auto min-w-0 w-full ${widthClass} max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-slate-200/90 bg-white shadow-2xl shadow-slate-950/40 ring-1 ring-slate-900/10 outline-none dark:border-slate-700/80 dark:bg-slate-900 dark:ring-slate-700/50 ${
          isClosing ? 'animate-modal-panel-out' : 'animate-modal-panel-in'
        }`}
      >
        {title && (
          <div className="table-dialog-heading flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-700/60">
            <div className="min-w-0">
              <h2
                id={titleId}
                className="text-base font-semibold text-slate-900 dark:text-slate-100"
              >
                {title}
              </h2>
              {description && (
                <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {description}
                </p>
              )}
            </div>
            {/* Explicit close affordance — backdrop click and Escape still work. */}
            <button
              type="button"
              onClick={handleRequestClose}
              aria-label="Close dialog"
              title="Close (Esc)"
              className="grid size-8 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="size-4" />
            </button>
          </div>
        )}
        {title ? <div className="table-dialog-content px-5 py-4">{children}</div> : children}
        {footer && (
          <div className="table-dialog-footer flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3 dark:border-slate-700/60 dark:bg-slate-800/60">
            {footer}
          </div>
        )}
      </div>
    </dialog>,
    document.querySelector('.electrasim-editor.open-table') ?? document.body,
  );
}
