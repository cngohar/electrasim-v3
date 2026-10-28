// Small public-profile enhancement; server HTML remains readable without JavaScript.
(() => {
  const button = document.querySelector('.report-profile');
  if (!button) return;
  const tabs = [...document.querySelectorAll('.profile-section-label')];
  const chooseTab = (id) => {
    for (const tab of tabs) {
      const selected = tab.id === `${id}-tab`;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      document.querySelector(tab.hash).hidden = !selected;
    }
  };
  if (tabs.length === 2) {
    document.querySelector('.tab-strip').setAttribute('role', 'tablist');
    for (const tab of tabs) {
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', tab.hash.slice(1));
      const panel = document.querySelector(tab.hash);
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tab.id);
      tab.addEventListener('click', (event) => {
        event.preventDefault();
        chooseTab(tab.hash.slice(1));
      });
      tab.addEventListener('keydown', (event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const next =
          event.key === 'Home'
            ? tabs[0]
            : event.key === 'End'
              ? tabs[1]
              : tabs.find((item) => item !== tab);
        chooseTab(next.hash.slice(1));
        next.focus();
      });
    }
    chooseTab(location.hash === '#about' ? 'about' : 'circuits');
  }
  const handle = button.dataset.handle;
  const dialog = document.querySelector('#report-dialog');
  const body = document.querySelector('#report-body');
  let signedIn = false;
  let owner = false;
  let busy = false;
  const getMe = async () => {
    const response = await fetch('/api/me/profile', {
      credentials: 'same-origin',
      cache: 'no-store',
    });
    if (response.status === 401) return null;
    if (!response.ok) throw new Error('Account access unavailable; please try again.');
    return (await response.json()).profile;
  };
  // The SSR page contains only public fields. Owner navigation is added after a private account check.
  const me = fetch('/api/me/profile', { credentials: 'same-origin', cache: 'no-store' })
    .then(async (response) => {
      if (!response.ok) return;
      const data = await response.json();
      signedIn = true;
      owner = data.profile.handle === handle;
      if (owner) {
        const link = document.createElement('a');
        link.className = 'btn';
        link.href = '/settings/profile/';
        link.textContent = 'Edit your profile ↗';
        button.replaceWith(link);
      }
    })
    .catch(() => {});
  const escapeText = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  button.addEventListener('click', async () => {
    await me;
    if (owner) return;
    try {
      const profile = await getMe();
      signedIn = Boolean(profile);
      if (profile?.handle === handle) return;
    } catch (error) {
      body.innerHTML = `<h2 id="report-title">Report unavailable</h2><p>${escapeText(error.message)}</p><div class="actions"><button class="btn" data-close>Close</button></div>`;
      dialog.showModal();
      return;
    }
    if (!signedIn) {
      body.innerHTML = `<h2 id="report-title">Sign in to report a profile</h2><p>Reports are private and reviewed by community staff.</p><div class="actions"><button class="btn" data-close>Cancel</button><a class="btn primary" href="/settings/profile/?next=${encodeURIComponent(`/u/${handle}`)}">Sign in</a></div>`;
    } else
      body.innerHTML =
        '<h2 id="report-title">Report this profile</h2><p>The profile owner won’t see your identity.</p><form id="report-form"><div class="field"><label for="reason">Reason</label><select id="reason" required><option value="">Choose a reason</option><option>Misleading identity</option><option>Harassment or hate</option><option>Inappropriate avatar</option><option>Spam</option><option>Other</option></select></div><div class="field"><label for="details">Details</label><textarea id="details" required maxlength="500"></textarea></div><p role="alert" id="report-error"></p><div class="actions"><button type="button" class="btn" data-close>Cancel</button><button type="submit" class="btn primary">Submit report</button></div></form>';
    dialog.showModal();
    dialog.querySelector('select,button')?.focus();
  });
  body.addEventListener('click', (event) => {
    if (event.target.closest('[data-close]') && !busy) dialog.close();
  });
  dialog.addEventListener('cancel', (event) => {
    if (busy) event.preventDefault();
  });
  dialog.addEventListener('close', () => button.isConnected && button.focus());
  body.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy) return;
    busy = true;
    const submit = body.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      const response = await fetch(`/api/community/users/${handle}/reports`, {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: body.querySelector('#reason').value,
          details: body.querySelector('#details').value,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Report unavailable; try again.');
      dialog.close();
      const toast = document.querySelector('#toast');
      toast.hidden = false;
      toast.textContent = data.duplicate
        ? 'You already reported this profile. Staff can review your report.'
        : 'Report submitted. Your identity stays private.';
    } catch (error) {
      body.querySelector('#report-error').textContent = error.message;
    } finally {
      busy = false;
      submit.disabled = false;
    }
  });
})();
