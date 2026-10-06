export const CONTROL_STEP_LIMITS = {
  timeResolutionSeconds: 0.000001,
  maxDeltaSeconds: 3600,
  maxElapsedSeconds: 31_536_000,
  maxEvents: 128,
  maxSolves: 256,
} as const;
