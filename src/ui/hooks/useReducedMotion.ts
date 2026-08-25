/**
 * useReducedMotion — live `prefers-reduced-motion: reduce` media-query hook.
 *
 * Shared single source of truth for animation-gating in React components.
 * Non-React code (store actions, timers) uses the synchronous
 * `prefersReducedMotionNow` from `lib/reducedMotion` instead.
 */

import { useEffect, useState } from 'react';
import { REDUCED_MOTION_QUERY, prefersReducedMotionNow } from '../../lib/reducedMotion';

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => prefersReducedMotionNow());
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(REDUCED_MOTION_QUERY);
    setReduced(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return reduced;
}
