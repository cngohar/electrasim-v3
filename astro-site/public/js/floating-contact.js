/**
 * floating-contact.js — dismissal behaviour for the persistent contact FAB.
 *
 * This lived as an inline <script> in FloatingContact.astro, where Astro emitted
 * it inline in the body. The production CSP is `script-src 'self'` with no hash
 * or nonce, so the browser blocked it on every page and the FAB never closed on
 * outside-click or Escape. Same-origin file, same behaviour, no CSP exception.
 */
window.ElectraSim.onReady(({ signal }) => {
  const details = document.querySelector('details.floating-contact');
  if (!details) return;

  document.addEventListener(
    'click',
    (event) => {
      if (details.open && !details.contains(event.target)) {
        details.open = false;
      }
    },
    { signal },
  );

  details.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape' && details.open) {
        details.open = false;
        details.querySelector('summary')?.focus();
      }
    },
    { signal },
  );
});
