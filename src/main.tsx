import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import {
  decodeShareURL,
  hasLegacyShareQuery,
  migrateLegacyShareQueryToFragment,
  stripShareURLPayload,
} from './lib/exportImport';
import { useCircuitStore } from './store/circuitStore';
import {
  loadActiveDeclarativeChallenge,
  loadChallengeProgress,
} from './store/declarativeChallengePersistence';
import { startEventHistoryPersistence } from './store/eventHistoryPersistence';
import { hydrateCircuit, persistCircuit, startAutosave } from './store/persistence';
import { startSettingsPersistence, useSettingsStore } from './store/settingsStore';
import { startAccessLifecycle } from './store/simulatorAccess';
import { useUiStore } from './store/uiStore';
import { applyDocumentTheme, readThemeHint, resolveThemePreference } from './ui/themePreference';
import './index.css';
import { ensureEmojiGlyphs } from './lib/emoji/emojiSvg';

// Twemoji artwork loads in parallel with app boot — outside the initial
// bundle. UI surfaces re-render via useEmojiGlyphsReady when it arrives.
void ensureEmojiGlyphs();

applyDocumentTheme(readThemeHint() ?? resolveThemePreference('system'), false);

void (async () => {
  const devOverlayPromise = import.meta.env.DEV
    ? import('./lib/FpsOverlay').then((module) => module.FpsOverlay).catch(() => null)
    : Promise.resolve(null);

  // Circuit, settings, and the audit trail hydrate before the first frame;
  // their IndexedDB reads are independent and can run concurrently.
  await Promise.all([hydrateCircuit(), startSettingsPersistence(), startEventHistoryPersistence()]);
  applyDocumentTheme(resolveThemePreference(useSettingsStore.getState().colorScheme));
  const DevOverlay = await devOverlayPromise;

  // Shared circuits intentionally override the device's last autosaved circuit.
  try {
    const initialShareUrl = window.location.href;
    // Old links put circuit data in the query string. Move that payload into the
    // local-only fragment immediately; decode the captured URL for compatibility.
    if (hasLegacyShareQuery(initialShareUrl)) {
      window.history.replaceState(null, '', migrateLegacyShareQueryToFragment(initialShareUrl));
    }
    const shared = await decodeShareURL(initialShareUrl);

    if (shared) {
      useCircuitStore.getState().setCircuit(shared);
      useCircuitStore.temporal.getState().clear();
      const persisted = await persistCircuit(shared);
      if (persisted) {
        // Only discard the recovery source after IndexedDB confirms the write.
        window.history.replaceState(
          null,
          '',
          stripShareURLPayload(window.location.href, 'fragment'),
        );
      }
    }
  } catch {
    console.warn('[main] Share URL decode failed, using saved/seed circuit.');
  }

  startAutosave();
  startAccessLifecycle();

  // Plan §14: defer the optional Challenge Mode recovery check until after
  // the editor has mounted. This keeps the first frame independent of the
  // challenge store and makes its first use a visible, lazy transition.
  void (async () => {
    const active = await loadActiveDeclarativeChallenge();
    if (!active) return;

    const { useDeclarativeChallengeStore } = await import('./store/declarativeChallengeStore');
    const progress = await loadChallengeProgress();
    useDeclarativeChallengeStore.setState({ progress });
    useDeclarativeChallengeStore.setState({
      resumePrompt: { active: true, record: { challengeId: active.challengeId } },
    });
    useUiStore.getState().setChallengeOpen(true);
  })();

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
      {DevOverlay ? <DevOverlay /> : null}
    </StrictMode>,
  );

  // Let the first frame and critical assets finish before background precaching begins.
  if (!import.meta.env.DEV) {
    const registerServiceWorker = () => {
      void import('virtual:pwa-register').then(({ registerSW }) => {
        registerSW({ immediate: true });
      });
    };
    if (document.readyState === 'complete') registerServiceWorker();
    else window.addEventListener('load', registerServiceWorker, { once: true });
  }
})();
