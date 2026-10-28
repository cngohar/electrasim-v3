// Load the read-only island only on request. The schematic already exists in HTML.
(() => {
  const button = document.querySelector('#load-preview');
  const root = document.querySelector('[data-publication-preview]');
  if (!button || !root) return;
  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      const { enablePreview } = await import('/community/preview.js');
      enablePreview(root);
      button.hidden = true;
    } catch {
      document.querySelector('#preview-status').textContent =
        'Interactive preview could not load. The published schematic is still available. Try again.';
      button.disabled = false;
    }
  });
})();
