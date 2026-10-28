// Progressive enhancement for public snapshot metadata and reporting. No editor/store imports.
(() => {
  const buttons = [...document.querySelectorAll('.snapshot-button')];
  if (!buttons.length) return;
  const dialog = document.createElement('dialog');
  dialog.className = 'snapshot-dialog';
  dialog.setAttribute('aria-labelledby', 'snapshot-title');
  document.body.append(dialog);
  const e = (value) =>
    String(value ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  let opener;
  let slug;
  let busy = false;
  let generation = 0;
  async function api(path, body) {
    const response = await fetch(`/api/${path}`, {
      method: body ? 'POST' : 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Snapshot unavailable; try again');
    return data;
  }
  for (const button of buttons)
    button.addEventListener('click', async () => {
      const token = ++generation;
      opener = button;
      slug = button.dataset.slug;
      dialog.innerHTML =
        '<h2 id="snapshot-title">Loading snapshot…</h2><button class="btn" data-close>Close</button>';
      dialog.showModal();
      try {
        const [detail, history] = await Promise.all([
          api(`community/publications/${slug}`),
          api(`community/publications/${slug}/versions`),
        ]);
        if (token !== generation || !dialog.open) return;
        const p = detail.publication;
        dialog.innerHTML = `<h2 id="snapshot-title">${e(p.title)}</h2><p>${e(p.description)}</p><p>By ${e(detail.author.displayName)} · Version ${p.versionNumber}</p><p>Published snapshots stay fixed when the private circuit is edited. Publishing does not certify electrical safety.</p><h3>Snapshot history</h3><ol>${history.items.map((v) => `<li>Version ${v.versionNumber}: ${e(v.title)}<br><small>Model ${e(v.modelVersion)} · ${e(v.fingerprint.slice(0, 16))}… · No fresh assessment</small></li>`).join('')}</ol><form id="publication-report"><h3>Report publication</h3><p>Sign in before submitting. Your identity stays private.</p><label for="publication-report-reason">Reason</label><select id="publication-report-reason" name="reason" required><option value="">Choose a reason</option><option>Unsafe or misleading</option><option>Harassment or hate</option><option>Spam</option><option>Other</option></select><label for="publication-report-details">Details</label><textarea id="publication-report-details" name="details" maxlength="500" required></textarea><p role="alert" id="publication-report-error"></p><button class="btn primary">Submit publication report</button></form><div class="actions"><button class="btn" data-close>Close</button><a class="btn" href="/settings/profile/">Sign in / Your profile</a></div>`;
        dialog.querySelector('select').focus();
      } catch (error) {
        if (token === generation && dialog.open)
          dialog.innerHTML = `<h2 id="snapshot-title">Snapshot unavailable</h2><p>${e(error.message)}</p><button class="btn" data-close>Close</button>`;
      }
    });
  dialog.addEventListener('click', (event) => {
    if (event.target.closest('[data-close]') && !busy) dialog.close();
  });
  dialog.addEventListener('cancel', (event) => {
    if (busy) event.preventDefault();
  });
  dialog.addEventListener('close', () => {
    generation++;
    dialog.innerHTML = '';
    opener?.focus();
  });
  dialog.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy) return;
    const form = event.target;
    const data = new FormData(form);
    const submit = form.querySelector('button');
    busy = true;
    submit.disabled = true;
    try {
      const result = await api(`community/publications/${slug}/reports`, {
        reason: String(data.get('reason')),
        details: String(data.get('details')),
      });
      form.innerHTML = `<output>${result.duplicate ? 'You already reported this publication.' : 'Report submitted. Your identity stays private.'}</output>`;
    } catch (error) {
      form.querySelector('#publication-report-error').textContent = error.message;
    } finally {
      busy = false;
      submit.disabled = false;
    }
  });
})();
