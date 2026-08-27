import { describe, expect, it } from 'vitest';
import { detectPlatform, remapShortcutLabelFor } from './platform';

describe('detectPlatform', () => {
  it('detects macOS from navigator.platform', () => {
    expect(detectPlatform({ platform: 'MacIntel', userAgent: 'x' })).toBe('mac');
  });

  it('detects macOS from userAgentData (Chromium)', () => {
    expect(detectPlatform({ userAgentData: { platform: 'macOS' } })).toBe('mac');
  });

  it('detects iOS as mac-keyboard convention', () => {
    expect(
      detectPlatform({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' }),
    ).toBe('mac');
  });

  it('detects Windows', () => {
    expect(detectPlatform({ platform: 'Win32', userAgent: 'Mozilla/5.0 (Windows NT 10.0)' })).toBe(
      'windows',
    );
  });

  it('detects Linux', () => {
    expect(detectPlatform({ platform: 'Linux x86_64' })).toBe('linux');
  });

  it('falls back to other for unknown platforms', () => {
    expect(detectPlatform({})).toBe('other');
    expect(detectPlatform(null)).toBe('other');
  });
});

describe('remapShortcutLabelFor', () => {
  it('rewrites Ctrl labels to ⌘ on macOS', () => {
    expect(remapShortcutLabelFor('Ctrl+Z', 'mac')).toBe('⌘Z');
    expect(remapShortcutLabelFor('Ctrl+Shift+Z', 'mac')).toBe('⌘Shift+Z');
    expect(remapShortcutLabelFor('Redo (or Ctrl+Y)', 'mac')).toBe('Redo (or ⌘Y)');
  });

  it('keeps Ctrl labels on other platforms', () => {
    expect(remapShortcutLabelFor('Ctrl+Z', 'windows')).toBe('Ctrl+Z');
    expect(remapShortcutLabelFor('Ctrl+K', 'linux')).toBe('Ctrl+K');
  });
});
