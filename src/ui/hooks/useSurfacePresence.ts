import { useEffect, useState } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { useReducedMotion } from './useReducedMotion';

/** Keep an exit visible; reopening cancels its pending removal. */
export function useSurfacePresence(open: boolean, duration = 160) {
  const osReduced = useReducedMotion();
  const preference = useSettingsStore((s) => s.interfaceMotion);
  const reduced = osReduced || preference === 'off';
  const [retained, setRetained] = useState(open);

  useEffect(() => {
    if (open || reduced) {
      setRetained(open);
      return;
    }
    const timer = window.setTimeout(() => setRetained(false), duration);
    return () => window.clearTimeout(timer);
  }, [open, reduced, duration]);

  return { mounted: open || (!reduced && retained), exiting: !open, reduced };
}

/** Keep the last payload while a data-driven surface closes. */
export function useClosingValue<T>(value: T | null | undefined): T | null {
  const [previous, setPrevious] = useState<T | null>(value ?? null);
  const { mounted } = useSurfacePresence(value != null);
  useEffect(() => {
    if (value != null) setPrevious(value);
  }, [value]);
  return mounted ? (value ?? previous) : null;
}
