/**
 * Shared `prefers-reduced-motion: reduce` checks.
 *
 * The synchronous helper exists for code that cannot run hooks (store
 * actions, timers, render-agnostic utilities); React components should
 * prefer the `useReducedMotion` hook so changes are tracked live.
 */

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** One-shot synchronous check — safe to call outside React. */
export function prefersReducedMotionNow(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}
