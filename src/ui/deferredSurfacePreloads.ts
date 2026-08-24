/** Start fetching optional surfaces before the user commits to opening them. */

export function preloadChallengeMode(): void {
  void import('./components/ChallengeModeRuntime');
}

export function preloadSettings(): void {
  void import('./components/SettingsModal');
}
