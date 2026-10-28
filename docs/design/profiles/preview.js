// Fictional, memory-only design concept. No fetch, storage, authentication or API.
const $ = (selector) => document.querySelector(selector);
const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const initial = () => ({
  name: 'Maya Chen',
  handle: 'maya_chen',
  bio: 'Learning by building. Exploring motor controls, practical wiring and the little details that make a circuit work.',
  institution: 'Northbridge Technical Institute',
  level: 'Electrical engineering student',
  visibility: 'public',
  showInstitution: true,
  showLevel: true,
  allowForks: true,
  avatar: null,
  moderation: 'visible',
  revision: 1,
});
let profile = initial();
let draft = null;
let publicViewer = 'visitor';
let publicTab = 'circuits';
let staffRole = 'moderator';
let reports = [
  {
    id: 1,
    reason: 'Misleading identity',
    detail: 'Please review the profile name and avatar.',
    status: 'open',
    reporter: 'Sample member A',
  },
];
let history = [];
let currentRoute = '';
let returnFocus = null;
let toastTimer;
const dialog = $('#dialog');
const avatar = (p, extra = '') =>
  `<div class="avatar ${extra}" aria-label="Profile avatar">${
    p.avatar
      ? `<img src="${esc(p.avatar)}" alt="Uploaded profile avatar" />`
      : esc(
          p.name
            .split(/\s+/)
            .filter(Boolean)
            .map((part) => part[0])
            .slice(0, 2)
            .join('')
            .toUpperCase() || 'MC',
        )
  }</div>`;
const stateBadge = () =>
  `<span class="pill ${profile.moderation !== 'visible' ? 'red' : profile.visibility === 'public' ? 'green' : 'amber'}">${profile.moderation !== 'visible' ? esc(profile.moderation[0].toUpperCase() + profile.moderation.slice(1)) : profile.visibility === 'public' ? 'Public profile' : 'Private profile'}</span>`;
function toast(message) {
  clearTimeout(toastTimer);
  $('#toast').textContent = message;
  $('#toast').hidden = false;
  toastTimer = setTimeout(() => {
    $('#toast').hidden = true;
  }, 4500);
}
function openDialog(content) {
  returnFocus = document.activeElement;
  $('#dialog-body').innerHTML = content;
  dialog.showModal();
  dialog.querySelector('[autofocus]')?.focus();
}
dialog.addEventListener('close', () => {
  if (returnFocus?.isConnected) returnFocus.focus();
});
function closeDialog() {
  dialog.close();
}
function record(action, reason) {
  history.unshift({ action, reason, revision: profile.revision, actor: 'Alex Morgan · Moderator' });
}
function drawCover() {
  return `<div class="profile-cover" aria-hidden="true"><span class="cover-caption">IDEAS. CONNECTIONS. POSSIBILITIES.</span><svg viewBox="0 0 1100 155" fill="none" preserveAspectRatio="xMidYMid slice"><g stroke="currentColor" stroke-width="1.4"><path d="M-10 95h190v-40h100v65h140v-35h190V45h130v65h170v-40h200M40 155v-35h90V30h160m170 125v-40h70V20h170m120 135v-20h90v-90h150"/><circle cx="180" cy="95" r="6" fill="#dfe9f1"/><circle cx="420" cy="120" r="6" fill="#dfe9f1"/><circle cx="740" cy="45" r="6" fill="#dfe9f1"/><circle cx="910" cy="110" r="6" fill="#dfe9f1"/><path d="M300 55h12l5-10 10 20 10-20 10 20 5-10h18M565 85h16m-8-8v16M650 45h10v-13h32v26h-32V45m165 65v-14m-7 0h14m-14-5h14m-7 0V75"/></g></svg></div>`;
}
function publicContent() {
  const unavailable =
    profile.moderation !== 'visible' || profile.visibility === 'private' || !profile.handle;
  const owner = publicViewer === 'owner';
  const toolbar = `<div class="profile-toolbar"><span class="url-label">community / u / ${unavailable ? 'profile' : esc(profile.handle)}</span><label>Preview as<select id="public-viewer" aria-label="Preview as"><option value="visitor" ${publicViewer === 'visitor' ? 'selected' : ''}>Visitor</option><option value="member" ${publicViewer === 'member' ? 'selected' : ''}>Member</option><option value="owner" ${owner ? 'selected' : ''}>Owner</option></select></label></div>`;
  if (unavailable) {
    return `${toolbar}${owner ? `<div class="notice amber">Owner preview · ${profile.moderation !== 'visible' ? 'Staff review keeps this profile unavailable. Saving edits does not restore it.' : !profile.handle ? 'Claim a handle before sharing your profile.' : 'Your profile is private. Visitors see the neutral page below.'} <a href="#edit"><strong>Edit profile →</strong></a></div>` : ''}<section class="panel unavailable"><span class="empty-icon">◌</span><span class="eyebrow">Community profile</span><h1>Profile unavailable</h1><p>This profile isn’t available to view. It may be private or no longer shared.</p></section>`;
  }
  return `${toolbar}<section class="panel">${drawCover()}<div class="profile-identity">${avatar(profile, 'large')}<div class="profile-title-row"><div><div class="profile-name"><h1>${esc(profile.name)}</h1><span class="pill green">Community member</span></div><p class="handle">@${esc(profile.handle)}</p></div><div class="actions">${owner ? '<a class="btn" href="#edit">Edit your profile ↗</a>' : '<button class="btn" data-action="report">⚑ Report profile</button>'}</div></div><p class="profile-bio">${esc(profile.bio) || 'A member of the ElectraSim community.'}</p><div class="meta">${profile.showInstitution && profile.institution ? `<span>⌂ ${esc(profile.institution)}</span>` : ''}${profile.showLevel && profile.level ? `<span>${esc(profile.level)}</span>` : ''}<span>Joined October 2026</span></div></div></section>
  <div class="profile-bottom"><section class="panel"><div class="tab-strip" role="tablist" aria-label="Profile sections"><button id="circuits-tab" data-tab="circuits" role="tab" aria-selected="${publicTab === 'circuits'}" aria-controls="profile-tabpanel" tabindex="${publicTab === 'circuits' ? 0 : -1}">Circuits <span class="count">0</span></button><button id="about-tab" data-tab="about" role="tab" aria-selected="${publicTab === 'about'}" aria-controls="profile-tabpanel" tabindex="${publicTab === 'about' ? 0 : -1}">About</button></div><div id="profile-tabpanel" role="tabpanel" aria-labelledby="${publicTab}-tab">${publicTab === 'circuits' ? `<div class="empty-state"><span class="empty-icon" aria-hidden="true">⌁</span><h3>No circuits shared yet</h3><p>Good ideas start somewhere. When ${esc(profile.name.split(' ')[0])} shares a circuit, it will appear here.</p></div>` : `<div class="panel-body about-copy"><h3>A little about ${esc(profile.name.split(' ')[0])}</h3><p class="profile-bio">${esc(profile.bio) || 'No introduction added yet.'}</p><div class="meta"><span>Member since October 2026</span></div></div>`}</div></section><aside class="panel panel-body"><div class="aside-section"><p class="eyebrow">Built on curiosity</p><h3>Build. Understand. Share.</h3><p>Every connection is a chance to learn. Discover the people behind the circuits.</p></div><div class="aside-section"><h3>A respectful community</h3><p>See something that doesn’t belong? Profile reports help keep this space welcoming.</p>${!owner ? '<button class="text-btn" data-action="report">Report this profile →</button>' : '<span class="pill">You’re viewing your profile</span>'}</div></aside></div>`;
}
function editContent() {
  const p = draft;
  return `<div class="page-heading"><div><p class="eyebrow">Your community identity</p><h1>Make yourself at home.</h1><p>A little about you. Shared on your terms.</p></div><a class="btn" href="#public">View profile ↗</a></div>${profile.moderation !== 'visible' ? `<div class="notice red">Your profile is ${esc(profile.moderation)} after staff review. You can update your details, but edits won’t make the profile or avatar public. ${profile.moderation === 'removed' ? 'Removed profiles cannot be restored in this workflow.' : 'A moderator must review and restore it.'}</div>` : ''}
  <div class="edit-layout"><form id="profile-form" class="panel" novalidate><section class="form-section"><div class="section-heading"><h2>Profile details</h2><p>The person behind the connections.</p></div><div class="avatar-editor"><div id="edit-avatar">${avatar(p)}</div><div><label class="btn" for="avatar-file">Choose photo</label><input type="file" id="avatar-file" accept="image/png,image/jpeg,image/webp" hidden /><button type="button" class="text-btn" id="remove-avatar">Remove photo</button><small>JPG, PNG or WebP · Up to 2 MB</small></div></div><p class="error" id="avatar-error" role="alert"></p><div class="field"><label for="display-name">Display name</label><input id="display-name" name="name" maxlength="60" required value="${esc(p.name)}" autocomplete="off" /><small>Your public name. It can be different from your sign-in name.</small></div><div class="field"><label for="handle">Handle ${profile.handle ? '<span class="required">· Claimed</span>' : '<span class="required">· Choose once</span>'}</label><div class="input-prefix"><span>/u/</span><input id="handle" name="handle" maxlength="24" value="${esc(p.handle)}" ${profile.handle ? 'readonly aria-readonly="true"' : ''} autocomplete="off" autocapitalize="none" spellcheck="false" aria-describedby="handle-help handle-status" /></div><small id="handle-help">${profile.handle ? 'Your permanent community address. Handle changes are unavailable in this first release.' : '3–24 lowercase letters, numbers or underscores. Start with a letter. Reserved and claimed names are unavailable.'}</small><p id="handle-status" aria-live="polite"></p></div><div class="field"><label for="bio">Bio <span class="required">· Optional</span></label><textarea id="bio" name="bio" maxlength="280">${esc(p.bio)}</textarea><small><span id="bio-count">${p.bio.length}</span>/280 characters · Plain text, a little personality.</small></div></section>
  <section class="form-section"><div class="section-heading"><h2>Your learning journey</h2><p>Optional details, with separate visibility controls below.</p></div><div class="field-row"><div class="field"><label for="institution">Institution</label><input id="institution" name="institution" value="${esc(p.institution)}" maxlength="100" /></div><div class="field"><label for="level">Learning level</label><select id="level" name="level">${['', 'Electrical engineering student', 'Apprentice electrician', 'Practicing electrician', 'Educator', 'Enthusiast'].map((level) => `<option value="${esc(level)}" ${p.level === level ? 'selected' : ''}>${esc(level || 'Prefer not to say')}</option>`).join('')}</select></div></div></section>
  <section class="form-section"><div class="section-heading"><h2>Privacy & sharing</h2><p>You decide what the community sees.</p></div><div class="visibility-choices"><label class="visibility-option"><input type="radio" name="visibility" value="public" ${p.visibility === 'public' ? 'checked' : ''} /><span>Public profile<small>Visible to anyone with your profile address.</small></span></label><label class="visibility-option"><input type="radio" name="visibility" value="private" ${p.visibility === 'private' ? 'checked' : ''} /><span>Private profile<small>Your profile and avatar stay out of public view.</small></span></label></div>
  <div class="check-row"><input id="show-institution" name="showInstitution" type="checkbox" ${p.showInstitution ? 'checked' : ''} /><label for="show-institution">Show my institution<small>Only shown when your profile is public.</small></label></div><div class="check-row"><input id="show-level" name="showLevel" type="checkbox" ${p.showLevel ? 'checked' : ''} /><label for="show-level">Show my learning level<small>Help others understand where you are in your journey.</small></label></div><div class="check-row"><input id="allow-forks" name="allowForks" type="checkbox" ${p.allowForks ? 'checked' : ''} /><label for="allow-forks">Allow forks of future shared circuits<small>A default for future publishing. Sharing a profile never shares your private circuit files.</small></label></div></section>
  <div class="save-bar"><p>Preview changes are saved only for this session.</p><button class="btn primary" type="submit">Save profile</button></div><p id="save-error" class="error panel-body" role="alert" hidden></p></form>
  <aside class="preview-side"><section class="panel preview-mini"><span class="eyebrow">Profile card preview</span><div id="live-card"></div></section><section class="panel panel-body"><h3>Your privacy, by default</h3><ul class="helper-list"><li>Your email is never on your public profile.</li><li>Private circuit files stay private.</li><li>Your profile name doesn’t change your account details.</li></ul><div class="notice amber">Design proposal: handles are claimed once. Review this rule before implementation.</div></section></aside></div>`;
}
function liveCard() {
  if (!$('#live-card')) return;
  $('#live-card').innerHTML =
    `${avatar(draft)}<h3>${esc(draft.name) || 'Your name'}</h3><div class="handle">@${esc(draft.handle) || 'your_handle'}</div><p>${esc(draft.bio) || 'Your introduction goes here.'}</p><div class="meta">${draft.visibility === 'public' ? '<span>Public profile</span>' : '<span>Private · visible only to you</span>'}</div>`;
}
function staffContent() {
  const canAct = staffRole === 'moderator';
  return `<div class="staff-layout"><aside class="staff-nav"><p class="eyebrow">Administration</p><a href="#staff" class="active">Community / Profiles</a><a href="#staff-reports">Profile reports <span class="pill">${reports.filter((r) => r.status === 'open').length}</span></a><a href="#staff-history">Profile action history</a><p>Alex Morgan<br />${canAct ? 'Community moderator' : 'Read-only reviewer'}<br /><br />Sample moderation workspace</p></aside><div class="staff-content"><div class="page-heading"><div><p class="eyebrow">Community / Profile review</p><h1>Keep the community welcoming.</h1><p>Review public identity. Record a clear reason.</p></div>${stateBadge()}</div><div class="scenario"><label for="staff-role">Preview staff access</label><select id="staff-role"><option value="moderator" ${canAct ? 'selected' : ''}>Moderator · Can review</option><option value="reader" ${!canAct ? 'selected' : ''}>Reviewer · Read only</option></select><button class="text-btn" id="simulate-conflict">Simulate concurrent edit</button></div><div class="stack"><section class="panel panel-body"><div class="row spread"><div class="staff-person">${avatar(profile)}<div><h2>${esc(profile.name)}</h2><p>@${esc(profile.handle) || 'Unclaimed handle'} · Revision ${profile.revision}</p></div></div></div><div class="staff-detail"><p class="eyebrow">Profile bio</p><p>${esc(profile.bio) || 'No bio added.'}</p><small>Profile visibility: ${esc(profile.visibility)} · Avatar: ${profile.avatar ? 'Custom photo' : 'Initials'}</small></div><div class="staff-actions">${canAct ? `${profile.moderation === 'visible' ? '<button class="btn" data-moderate="hide">Hide profile</button>' : ''}${profile.moderation === 'hidden' ? '<button class="btn primary" data-moderate="restore">Restore profile</button>' : ''}${profile.moderation !== 'removed' ? '<button class="btn danger" data-moderate="remove">Remove profile</button>' : '<span class="pill red">Removed · Tombstone retained</span>'}${profile.avatar ? '<button class="btn" data-moderate="avatar">Remove avatar</button>' : ''}` : '<div class="notice">Read-only access. Profile changes and report decisions require moderation permission.</div>'}<a class="btn" href="#public">Check public view ↗</a></div><p class="muted"><small>Hiding a profile hides its identity and avatar. Other published circuits keep neutral author attribution. Private work and membership remain separate.</small></p></section>
  <section class="panel" id="staff-reports"><div class="panel-header row spread"><h3>Profile reports</h3><span class="pill">${reports.filter((r) => r.status === 'open').length} open</span></div><div class="panel-body">${reports.length ? reports.map((r) => `<div class="report-row"><div><strong>${esc(r.reason)}</strong><p>${esc(r.detail)}</p><p>${esc(r.reporter)} · <span class="pill ${r.status === 'open' ? 'amber' : 'green'}">${esc(r.status)}</span></p></div>${canAct && r.status === 'open' ? `<button class="btn" data-report-id="${r.id}">Review report</button>` : ''}</div>`).join('') : '<p class="muted">No profile reports to review.</p>'}</div></section>
  <section class="panel" id="staff-history"><div class="panel-header"><h3>Profile action history</h3></div><div class="panel-body">${history.length ? `<ol class="history">${history.map((h) => `<li><strong>${esc(h.action)}</strong><small>${esc(h.actor)} · Revision ${h.revision}</small><small>Reason: ${esc(h.reason)}</small></li>`).join('')}</ol>` : '<p class="muted">No staff actions in this demo session.</p>'}</div></section></div></div></div>`;
}
function render() {
  const hash = location.hash.slice(1) || 'public';
  const route = hash.startsWith('staff') ? 'staff' : hash === 'edit' ? 'edit' : 'public';
  if (route === 'edit' && currentRoute !== 'edit') draft = structuredClone(profile);
  if (dialog.open) closeDialog();
  currentRoute = route;
  for (const link of document.querySelectorAll('nav a')) {
    if (link.hash === `#${route}`) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  $('#main').innerHTML =
    route === 'edit' ? editContent() : route === 'staff' ? staffContent() : publicContent();
  document.title = `ElectraSim · ${route === 'edit' ? 'Edit profile' : route === 'staff' ? 'Profile moderation' : 'Profile preview'} · Design review`;
  if (route === 'edit') liveCard();
}
function handleError(value) {
  if (!/^[a-z][a-z0-9_]{2,23}$/.test(value))
    return 'Use 3–24 lowercase letters, numbers or underscores, starting with a letter.';
  if (
    [
      'admin',
      'api',
      'app',
      'community',
      'electrasim',
      'explore',
      'feed',
      'help',
      'me',
      'moderator',
      'root',
      'settings',
      'staff',
      'support',
      'system',
      'www',
    ].includes(value)
  )
    return 'This handle is reserved. Choose another.';
  if (['alex_morgan', 'sara_khan', 'maya_chen'].includes(value) && value !== profile.handle)
    return 'This handle is already claimed. Try another.';
  return '';
}
function syncDraft() {
  const data = new FormData($('#profile-form'));
  for (const key of ['name', 'handle', 'bio', 'institution', 'level', 'visibility'])
    draft[key] = String(data.get(key) ?? '');
  for (const key of ['showInstitution', 'showLevel', 'allowForks']) draft[key] = data.has(key);
  $('#bio-count').textContent = draft.bio.length;
  if (!profile.handle) {
    const error = handleError(draft.handle);
    $('#handle-status').textContent = draft.handle
      ? error || 'Available in sample data. Your address is claimed when you save.'
      : '';
    $('#handle-status').className = error ? 'error' : 'success';
  }
  liveCard();
}
function reportDialog() {
  if (publicViewer === 'visitor') {
    openDialog(
      '<h2 id="dialog-title">Sign in to report a profile</h2><p>Reports are private and reviewed by community staff. Sign in to help prevent duplicate and abusive reports.</p><div class="actions"><button class="btn" data-close>Cancel</button><button class="btn primary" id="sample-member">Continue as sample member</button></div>',
    );
    return;
  }
  if (reports.some((r) => r.reporter === 'You · Sample member')) {
    toast('You already reported this profile. Staff can review your report.');
    return;
  }
  openDialog(
    `<h2 id="dialog-title">Report this profile</h2><p>Tell us what needs a closer look. The profile owner won’t see your identity.</p><form id="report-form"><div class="field"><label for="report-reason">Reason</label><select id="report-reason" required><option value="">Choose a reason</option><option>Misleading identity</option><option>Harassment or hate</option><option>Inappropriate avatar</option><option>Spam</option><option>Other</option></select></div><div class="field"><label for="report-details">Details <span class="required">· Required</span></label><textarea id="report-details" required maxlength="500" placeholder="What should the reviewer know?" autofocus></textarea></div><div class="actions"><button type="button" class="btn" data-close>Cancel</button><button class="btn primary" type="submit">Submit report</button></div></form>`,
  );
}
function moderate(action) {
  if (staffRole !== 'moderator') return;
  const revision = profile.revision;
  const titles = {
    hide: 'Hide this profile?',
    restore: 'Restore this profile?',
    remove: 'Remove this profile?',
    avatar: 'Remove this avatar?',
  };
  const descriptions = {
    hide: 'The profile and avatar will become unavailable to public visitors. Owner edits will not clear the hidden state.',
    restore:
      'Restore staff visibility clearance. A private profile stays private. Review the current name, bio and avatar before restoring.',
    remove:
      'The profile and avatar will remain unavailable. A tombstone is retained; this workflow cannot restore removed profiles. Private circuits and account access are preserved.',
    avatar:
      'Replace the current photo with initials. This does not restore a hidden or removed profile.',
  };
  openDialog(
    `<h2 id="dialog-title">${titles[action]}</h2><p>${descriptions[action]}</p><div class="dialog-summary">${esc(profile.name)} · @${esc(profile.handle) || 'unclaimed'} · Reviewing revision ${revision}</div><form id="moderate-form"><div class="field"><label for="staff-reason">Reason for the record</label><textarea id="staff-reason" required minlength="8" maxlength="500" autofocus placeholder="Explain the decision (at least 8 characters)"></textarea></div><label class="check-row"><input id="conflict-on-submit" type="checkbox" />Simulate another edit before this save</label><p class="error" id="moderation-error" role="alert" hidden></p><div class="actions"><button type="button" class="btn" data-close>Cancel</button><button class="btn ${action === 'remove' ? 'danger' : 'primary'}" type="submit">Confirm ${action === 'avatar' ? 'avatar removal' : action}</button></div></form>`,
  );
  $('#moderate-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const reason = $('#staff-reason').value.trim();
    if (reason.length < 8 || staffRole !== 'moderator') return;
    if ($('#conflict-on-submit').checked) profile.revision++;
    if (revision !== profile.revision) {
      $('#moderation-error').hidden = false;
      $('#moderation-error').textContent =
        'This profile changed during review. Close and reload the current profile, then start a new review with a new reason.';
      $('#moderate-form button[type="submit"]').disabled = true;
      return;
    }
    profile.revision++;
    if (action === 'avatar') {
      profile.avatar = null;
      record('Avatar removed', reason);
    } else {
      profile.moderation = { hide: 'hidden', restore: 'visible', remove: 'removed' }[action];
      record(
        { hide: 'Profile hidden', restore: 'Profile restored', remove: 'Profile removed' }[action],
        reason,
      );
    }
    closeDialog();
    render();
    toast('Staff action recorded in sample history.');
  });
}
$('#main').addEventListener('input', (event) => {
  if (event.target.closest('#profile-form') && event.target.id !== 'avatar-file') syncDraft();
});
$('#main').addEventListener('change', async (event) => {
  const target = event.target;
  if (target.id === 'public-viewer') {
    publicViewer = target.value;
    render();
  }
  if (target.id === 'staff-role') {
    staffRole = target.value;
    render();
  }
  if (target.id === 'avatar-file') {
    const file = target.files?.[0];
    if (!file) return;
    const error = $('#avatar-error');
    error.textContent = '';
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 2 * 1024 * 1024
    ) {
      error.textContent = 'Choose a JPG, PNG or WebP photo smaller than 2 MB.';
      target.value = '';
      return;
    }
    const selectedDraft = draft;
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      const img = new Image();
      img.onload = () => {
        if (draft !== selectedDraft || currentRoute !== 'edit') return;
        draft.avatar = reader.result;
        $('#edit-avatar').innerHTML = avatar(draft);
        liveCard();
      };
      img.onerror = () => {
        if (currentRoute === 'edit')
          $('#avatar-error').textContent =
            'This file could not be read as a photo. Choose another image.';
      };
      img.src = reader.result;
    });
    reader.readAsDataURL(file);
  }
});
$('#main').addEventListener('keydown', (event) => {
  if (
    !event.target.matches('[role="tab"]') ||
    !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)
  )
    return;
  event.preventDefault();
  publicTab =
    event.key === 'Home'
      ? 'circuits'
      : event.key === 'End'
        ? 'about'
        : publicTab === 'circuits'
          ? 'about'
          : 'circuits';
  render();
  $(`#${publicTab}-tab`).focus();
});
$('#main').addEventListener('click', (event) => {
  const target = event.target.closest('button');
  if (!target) return;
  if (target.dataset.action === 'report') reportDialog();
  if (target.dataset.tab) {
    publicTab = target.dataset.tab;
    render();
    $(`#${publicTab}-tab`).focus();
  }
  if (target.dataset.moderate) moderate(target.dataset.moderate);
  if (target.id === 'remove-avatar') {
    draft.avatar = null;
    $('#edit-avatar').innerHTML = avatar(draft);
    liveCard();
  }
  if (target.id === 'simulate-conflict') {
    profile.revision++;
    render();
    toast('Sample revision advanced. Start a review to simulate a conflicting save.');
  }
  if (target.dataset.reportId) reviewReport(Number(target.dataset.reportId));
});
$('#main').addEventListener('submit', (event) => {
  if (event.target.id !== 'profile-form') return;
  event.preventDefault();
  syncDraft();
  const error = !draft.name.trim()
    ? 'Add a display name.'
    : !profile.handle
      ? handleError(draft.handle)
      : draft.handle !== profile.handle
        ? 'Claimed handles cannot be changed.'
        : '';
  if (error) {
    $('#save-error').textContent = error;
    $('#save-error').hidden = false;
    return;
  }
  const claim = !profile.handle;
  const apply = () => {
    profile = {
      ...profile,
      ...draft,
      name: draft.name.trim(),
      handle: profile.handle || draft.handle,
      revision: profile.revision + 1,
    };
    draft = structuredClone(profile);
    render();
    toast('Profile saved for this demo session.');
  };
  if (!claim) apply();
  else {
    openDialog(
      `<h2 id="dialog-title">Claim @${esc(draft.handle)}?</h2><p>This will be your permanent community address. You can change your display name later; this first release does not include handle renaming.</p><div class="dialog-summary">/u/${esc(draft.handle)}</div><div class="actions"><button class="btn" data-close>Keep editing</button><button class="btn primary" id="confirm-handle">Claim handle & save</button></div>`,
    );
    $('#confirm-handle').addEventListener('click', () => {
      closeDialog();
      apply();
    });
  }
});
function reviewReport(id) {
  if (staffRole !== 'moderator') return;
  const report = reports.find((r) => r.id === id);
  if (!report || report.status !== 'open') return;
  openDialog(
    `<h2 id="dialog-title">Review profile report</h2><p>${esc(report.reason)} — ${esc(report.detail)}</p><p class="notice">Report outcomes are separate from visibility. Hide or remove the profile through its own reviewed action.</p><form id="resolve-form"><div class="field"><label for="outcome">Outcome</label><select id="outcome"><option value="resolved">Resolve · Action reviewed</option><option value="dismissed">Dismiss · No violation found</option></select></div><div class="field"><label for="resolution-reason">Decision reason</label><textarea id="resolution-reason" minlength="8" maxlength="500" required autofocus></textarea></div><div class="actions"><button type="button" class="btn" data-close>Cancel</button><button class="btn primary" type="submit">Save report outcome</button></div></form>`,
  );
  $('#resolve-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const reason = $('#resolution-reason').value.trim();
    if (reason.length < 8 || staffRole !== 'moderator' || report.status !== 'open') return;
    report.status = $('#outcome').value;
    record(`Report ${report.status}`, reason);
    closeDialog();
    render();
    toast('Report outcome recorded. Profile visibility is unchanged.');
  });
}
$('#dialog-body').addEventListener('click', (event) => {
  if (event.target.closest('[data-close]')) closeDialog();
  if (event.target.id === 'sample-member') {
    closeDialog();
    publicViewer = 'member';
    render();
    reportDialog();
  }
});
$('#dialog-body').addEventListener('submit', (event) => {
  if (event.target.id !== 'report-form') return;
  event.preventDefault();
  const detail = $('#report-details').value.trim();
  if (!$('#report-reason').value || !detail) return;
  reports.push({
    id: reports.length + 1,
    reason: $('#report-reason').value,
    detail,
    status: 'open',
    reporter: 'You · Sample member',
  });
  closeDialog();
  toast('Report submitted. The profile owner cannot see your identity.');
});
function reset(scenario = 'default') {
  profile = initial();
  if (scenario === 'new') {
    profile.handle = '';
    profile.bio = '';
    profile.visibility = 'private';
    profile.showInstitution = false;
    profile.showLevel = false;
  }
  if (scenario === 'private') profile.visibility = 'private';
  if (scenario === 'hidden') profile.moderation = 'hidden';
  if (scenario === 'removed') profile.moderation = 'removed';
  draft = null;
  currentRoute = '';
  publicViewer = 'visitor';
  publicTab = 'circuits';
  staffRole = 'moderator';
  reports = [
    {
      id: 1,
      reason: 'Misleading identity',
      detail: 'Please review the profile name and avatar.',
      status: 'open',
      reporter: 'Sample member A',
    },
  ];
  history = [];
  render();
}
$('#reset').addEventListener('click', () => {
  openDialog(
    '<h2 id="dialog-title">Choose a sample state</h2><p>Reset all session edits, reports and staff history. All profiles are fictional.</p><div class="field"><label for="scenario">Starting profile</label><select id="scenario"><option value="default">Public · Established member</option><option value="new">New member · No handle yet</option><option value="private">Private profile</option><option value="hidden">Hidden by staff</option><option value="removed">Removed · Tombstone retained</option></select></div><div class="actions"><button class="btn" data-close>Cancel</button><button class="btn primary" id="load-scenario">Load sample</button></div>',
  );
  $('#load-scenario').addEventListener('click', () => {
    const scenario = $('#scenario').value;
    closeDialog();
    reset(scenario);
    toast('Sample state loaded.');
  });
});
window.addEventListener('hashchange', () => {
  render();
  $('#main').focus();
});
render();
