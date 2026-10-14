/** Start fetching optional surfaces before the user commits to opening them. */

export function preloadSettings(): void {
  void import('./components/SettingsModal');
}
