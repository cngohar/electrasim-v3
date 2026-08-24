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

import { type ReactNode, useCallback, useEffect, useId, useRef, useState } from 'react';
import { useDialogFocus } from '../hooks/useDialogFocus';

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
}: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(open);
  const [isClosing, setIsClosing] = useState(false);

  // Mount immediately when opened.
  useEffect(() => {
    if (open) {
      setMounted(true);
      setIsClosing(false);
    }
  }, [open]);

  // When closed while mounted, play the 200 ms exit transition, then unmount.
  // `isClosing` is intentionally NOT a dependency: if it were, flipping it to
  // true would run the cleanup and cancel the unmount timer, leaving the
  // dialog stuck in the DOM forever.
  useEffect(() => {
    if (open || !mounted) return;
    setIsClosing(true);
    const timer = window.setTimeout(() => {
      setMounted(false);
      setIsClosing(false);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [open, mounted]);

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

  useDialogFocus(mounted && !isClosing, handleRequestClose, panelRef);

  if (!mounted) return null;

  return (
    <dialog
      open
      className="fixed inset-0 z-50 m-0 flex h-dvh w-screen max-h-none max-w-none items-center justify-center overflow-y-auto border-0 bg-transparent p-4"
      aria-modal="true"
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
        tabIndex={-1}
        className={`relative min-w-0 w-full ${widthClass} max-h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-slate-200/90 bg-white shadow-2xl shadow-slate-950/40 ring-1 ring-slate-900/10 outline-none dark:border-slate-700/80 dark:bg-slate-900 dark:ring-slate-700/50 ${
          isClosing ? 'animate-modal-panel-out' : 'animate-modal-panel-in'
        }`}
      >
        {title && (
          <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-700/60">
            <h2 id={titleId} className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {description}
              </p>
            )}
          </div>
        )}
        {title ? <div className="px-5 py-4">{children}</div> : children}
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3 dark:border-slate-700/60 dark:bg-slate-800/60">
            {footer}
          </div>
        )}
      </div>
    </dialog>
  );
}
