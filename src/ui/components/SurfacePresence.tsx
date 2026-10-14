import type { ReactNode } from 'react';
import { useSurfacePresence } from '../hooks/useSurfacePresence';

/** Deferred surfaces retain their contents while the dialog completes its exit. */
export function SurfacePresence({
  open,
  children,
  animate = false,
  className = '',
}: { open: boolean; children: ReactNode; animate?: boolean; className?: string }) {
  const { mounted, exiting } = useSurfacePresence(open);
  if (!mounted) return null;
  return animate ? (
    <div
      className={`table-task-presence ${className}`}
      data-surface-state={exiting ? 'closing' : 'open'}
      aria-hidden={exiting || undefined}
      inert={exiting || undefined}
    >
      {children}
    </div>
  ) : (
    children
  );
}
