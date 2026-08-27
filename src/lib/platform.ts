/**
 * platform — OS / keyboard-convention detection.
 *
 * Used to make shortcut affordances system-aware: macOS users see the ⌘
 * (Command) key, Windows users see the Search key convention, and every
 * other platform falls back to Ctrl. All functions are SSR-safe and the
 * detection logic is pure (accepts a navigator-like object) so it can be
 * unit-tested in jsdom.
 */

export type PlatformKind = 'mac' | 'windows' | 'linux' | 'other';

interface NavigatorLike {
  platform?: string;
  userAgent?: string;
  userAgentData?: { platform?: string };
}

export function detectPlatform(nav: NavigatorLike | null | undefined): PlatformKind {
  const uaDataPlatform = nav?.userAgentData?.platform ?? '';
  const platform = nav?.platform ?? '';
  const userAgent = nav?.userAgent ?? '';
  const raw = `${uaDataPlatform} ${platform} ${userAgent}`.toLowerCase();
  if (/(mac|iphone|ipad|ipod)/.test(raw)) return 'mac';
  if (/win/.test(raw)) return 'windows';
  if (/(linux|android|cros)/.test(raw)) return 'linux';
  return 'other';
}

export function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  return detectPlatform(navigator) === 'mac';
}

export function isWindowsPlatform(): boolean {
  if (typeof navigator === 'undefined') return false;
  return detectPlatform(navigator) === 'windows';
}

/** The modifier key label for the current platform: '⌘' on macOS, else 'Ctrl'. */
export function modKey(): string {
  return isMacPlatform() ? '⌘' : 'Ctrl';
}

/** 'K' → '⌘K' on macOS, 'Ctrl+K' everywhere else. */
export function modShortcut(key: string): string {
  return isMacPlatform() ? `⌘${key}` : `Ctrl+${key}`;
}

/**
 * Rewrites a "Ctrl+…" style shortcut label for a given platform.
 * On non-Mac platforms the label is returned unchanged.
 */
export function remapShortcutLabelFor(label: string, platform: PlatformKind): string {
  if (platform !== 'mac') return label;
  return label.replace(/Ctrl\+/g, '⌘');
}

/** Rewrites a "Ctrl+…" style shortcut label for the current platform. */
export function remapShortcutLabel(label: string): string {
  if (typeof navigator === 'undefined') return label;
  return remapShortcutLabelFor(label, detectPlatform(navigator));
}
