/**
 * Shared time formatting for the learning modes.
 *
 * Challenge Mode and the Diagnosis Lab both show an informational mm:ss
 * timer (plan §32: "Time and hints are informational, not competitive
 * scores"), so the helper lives here rather than in any one mode.
 */

/** `mm:ss` for elapsed-time displays (plan §19, §32). */
export function formatElapsed(elapsedMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
