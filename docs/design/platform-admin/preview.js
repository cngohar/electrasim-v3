/* Standalone design demo. Fictional records, memory-only state, no API calls. */
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const esc = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );
const icon = (name, cls = 'icon') =>
  `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const initials = (name) =>
  name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('');
const roleLabel = (role) =>
  ({
    individual: 'Individual',
    moderator: 'Moderator',
    admin: 'Admin',
    super_admin: 'Super admin',
  })[role] ?? role;
const pages = [
  { id: 'overview', label: 'Overview', icon: 'grid', roles: ['super_admin', 'admin', 'moderator'] },
  { id: 'users', label: 'Users', icon: 'users', roles: ['super_admin', 'admin'] },
  { id: 'roles', label: 'Access & roles', icon: 'shield', roles: ['super_admin'] },
  { id: 'memberships', label: 'Memberships', icon: 'card', roles: ['super_admin'] },
  { id: 'components', label: 'Components', icon: 'bolt', roles: ['super_admin'] },
  {
    id: 'settings',
    label: 'Community settings',
    icon: 'sliders',
    roles: ['super_admin', 'admin', 'moderator'],
  },
  { id: 'audit', label: 'Audit log', icon: 'clock', roles: ['super_admin', 'admin', 'moderator'] },
  {
    id: 'standards',
    label: 'Standards',
    icon: 'book',
    roles: ['super_admin', 'admin', 'moderator'],
  },
];
const people = [
  ['Maya Chen', 'individual', 'Pro', 'active', 'peach', 'Today, 09:42'],
  ['Noor Hassan', 'moderator', 'Basic', 'active', 'mint', 'Today, 09:18'],
  ['Daniel Brooks', 'individual', 'Pro', 'restricted', 'lavender', 'Today, 08:56'],
  ['Sofia Martinez', 'admin', 'Basic', 'active', 'peach', 'Yesterday, 16:24'],
  ['Ethan Williams', 'individual', 'Basic', 'active', 'mint', 'Yesterday, 15:12'],
  ['Amira Patel', 'individual', 'Pro', 'suspended', 'lavender', 'Oct 22, 11:36'],
  ['Oliver James', 'individual', 'Basic', 'active', 'peach', 'Oct 22, 10:08'],
  ['Lina Andersson', 'moderator', 'Basic', 'active', 'mint', 'Oct 21, 14:52'],
  ['Lucas Reed', 'individual', 'Pro', 'active', 'lavender', 'Oct 21, 13:16'],
  ['Zara Khan', 'individual', 'Basic', 'restricted', 'peach', 'Oct 20, 18:20'],
  ['Leo Wilson', 'individual', 'Basic', 'active', 'mint', 'Oct 20, 14:10'],
  ['Isabel Costa', 'individual', 'Pro', 'active', 'lavender', 'Oct 20, 12:40'],
  ['Theo Laurent', 'individual', 'Basic', 'active', 'peach', 'Oct 19, 17:20'],
  ['Sara Ahmed', 'individual', 'Basic', 'active', 'mint', 'Oct 19, 10:56'],
  ['Arjun Rao', 'individual', 'Pro', 'active', 'lavender', 'Oct 18, 16:44'],
  ['Emma Davis', 'individual', 'Basic', 'active', 'peach', 'Oct 18, 13:10'],
];
let state;
function reset() {
  state = {
    role: 'super_admin',
    filter: 'all',
    search: '',
    page: 1,
    selected: new Set(),
    drawer: null,
    drawerTab: 'profile',
    profileTab: 'overview',
    membershipTab: 'plans',
    plans: [
      {
        id: 'plan_pro_monthly',
        name: 'Pro monthly',
        code: 'pro-monthly',
        description: 'Complete Pro access, with a monthly review point.',
        days: 30,
        status: 'active',
        benefits: ['Pro component catalogue', 'Advanced fault capabilities'],
      },
      {
        id: 'plan_pro_annual',
        name: 'Pro annual',
        code: 'pro-annual',
        description: 'A full year of Pro access for committed learners.',
        days: 365,
        status: 'active',
        benefits: ['Pro component catalogue', 'Advanced fault capabilities'],
      },
      {
        id: 'plan_study',
        name: 'Study access',
        code: 'study-access',
        description: 'A shorter access window for a learning programme.',
        days: 90,
        status: 'draft',
        benefits: ['Pro component catalogue'],
      },
    ],
    grants: people.flatMap(([name, , plan], i) =>
      plan === 'Pro'
        ? [
            {
              id: `grant_${i}`,
              userId: `usr_demo_${String(i + 1).padStart(3, '0')}`,
              planId: 'plan_pro_monthly',
              planName: 'Pro monthly',
              benefits: ['Pro component catalogue', 'Advanced fault capabilities'],
              starts: '2026-10-24',
              ends: '2026-11-23',
              status: 'active',
              actor: 'Alex Morgan',
              reason: 'Sample learning access',
            },
          ]
        : [],
    ),
    componentSearch: '',
    componentCategory: 'all',
    componentFilter: 'all',
    componentPage: 1,
    componentRevision: 1,
    componentConflict: false,
    components: componentPreviewCatalogue.map((item) => ({
      ...item,
      access: item.tier === 'pro' ? 'pro' : 'free',
    })),
    auditScope: 'all',
    auditSearch: '',
    period: '14',
    users: people.map(([name, role, plan, status, color, joined], i) => ({
      id: `usr_demo_${String(i + 1).padStart(3, '0')}`,
      name,
      role,
      plan,
      status,
      color,
      joined,
      email: `${name.toLowerCase().replaceAll(' ', '.')}@example.com`,
      custom: i === 1 ? ['Community reviewer'] : [],
      communityRestricted: status === 'restricted',
      platformSuspended: status === 'suspended',
      reason:
        status === 'restricted'
          ? 'Repeated off-topic community activity'
          : status === 'suspended'
            ? 'Account access under review'
            : '',
      expires: status === 'restricted' ? 'Today, 18:00' : null,
    })),
    customRoles: [
      {
        name: 'Community reviewer',
        users: 6,
        permissions: ['Read community settings', 'Read community audit'],
        archived: false,
      },
      {
        name: 'User support',
        users: 3,
        permissions: ['View users and contact details', 'Read standards'],
        archived: false,
      },
      { name: 'Event assistant', users: 2, permissions: ['Read community audit'], archived: true },
    ],
    settings: { threshold: 5, writes: 20, reports: 10, words: '', preModeration: false },
    activity: [
      {
        actor: 'Jordan Lee',
        verb: 'updated the permissions for',
        target: 'Community reviewer',
        time: '12 min ago',
        scope: 'platform',
        kind: 'shield',
        before: 'Read community audit',
        after: 'Read community audit + read community settings',
        reason: 'Reviewers need to inspect moderation defaults.',
      },
      {
        actor: 'Alex Morgan',
        verb: 'restricted community access for',
        target: 'Daniel Brooks',
        time: '38 min ago',
        scope: 'community',
        kind: 'lock',
        before: 'Community access: unrestricted',
        after: 'Community writes: restricted until today, 18:00',
        reason: 'Repeated off-topic community activity.',
      },
      {
        actor: 'Sofia Martinez',
        verb: 'updated',
        target: 'Community settings',
        time: '1 hour ago',
        scope: 'community',
        kind: 'sliders',
        before: 'Report limit: 8 per day',
        after: 'Report limit: 10 per day',
        reason: 'Adjust the reporting allowance after review.',
      },
      {
        actor: 'Alex Morgan',
        verb: 'assigned a role to',
        target: 'Noor Hassan',
        time: '2 hours ago',
        scope: 'platform',
        kind: 'users',
        before: 'Individual',
        after: 'Moderator + Community reviewer',
        reason: 'Approved community support assignment.',
      },
    ],
    policy: [false, false, true, false, false, true, true],
    adminPolicy: permissionNames.map(() => true),
    review: null,
  };
  $('#preview-role').value = state.role;
}
function pill(text, tone = '') {
  return `<span class="pill ${tone}">${esc(text)}</span>`;
}
function statusPill(status) {
  return pill(
    status === 'restricted' ? 'Restricted' : status === 'suspended' ? 'Suspended' : 'Active',
    status === 'active' ? 'green dot' : status === 'restricted' ? 'amber dot' : 'rose dot',
  );
}
function rolePill(role) {
  return pill(roleLabel(role), role === 'admin' ? 'purple' : role === 'moderator' ? 'blue' : '');
}
function avatar(user, large = false) {
  return `<span class="avatar ${user.color ?? 'navy'} ${large ? 'large' : ''}">${esc(initials(user.name))}</span>`;
}
function heading(title, subtitle, actions = '') {
  return `<div class="page-heading"><div><div class="eyebrow">PLATFORM WORKSPACE</div><h1>${title}</h1><p>${subtitle}</p></div><div class="heading-actions">${actions}</div></div>`;
}
function permission(index) {
  return (
    state.role === 'super_admin' ||
    (state.role === 'admin' ? state.adminPolicy[index] : state.policy[index])
  );
}
function canUsers() {
  return permission(0);
}
function pageAllowed(page) {
  return (
    page.id === 'overview' ||
    (page.id === 'users' && canUsers()) ||
    (['roles', 'memberships', 'components'].includes(page.id) && canSecurity()) ||
    (page.id === 'settings' && permission(2)) ||
    (page.id === 'audit' && (permission(4) || permission(5))) ||
    (page.id === 'standards' && permission(6))
  );
}
function syncStatus(user) {
  user.status = user.platformSuspended
    ? 'suspended'
    : user.communityRestricted
      ? 'restricted'
      : 'active';
}
function effectiveDemoPermissions(user) {
  const base =
    user.role === 'super_admin'
      ? [
          ...permissionNames,
          'Manage staff roles',
          'Suspend platform accounts',
          'Manage memberships',
          'Manage component access',
          'Read catalogue audit',
        ]
      : user.role === 'admin'
        ? permissionNames.filter((_, i) => state.adminPolicy[i])
        : user.role === 'moderator'
          ? permissionNames.filter((_, i) => state.policy[i])
          : [];
  return [
    ...new Set([
      ...base,
      ...state.customRoles
        .filter((role) => !role.archived && user.custom.includes(role.name))
        .flatMap((role) => role.permissions),
    ]),
  ];
}
function canSecurity() {
  return state.role === 'super_admin';
}
function userById(id) {
  return state.users.find((user) => user.id === id);
}
function currentPage() {
  const key = location.hash.slice(1).split('/')[0] || 'overview';
  return pages.some((page) => page.id === key && pageAllowed(page)) ? key : 'overview';
}
function render() {
  const page = currentPage();
  $('#navigation').innerHTML = pages
    .filter((item) => pageAllowed(item))
    .map(
      (item) =>
        `${item.id === 'standards' ? '<span class="nav-divider"></span>' : ''}<a class="nav-link" href="#${item.id}" ${page === item.id ? 'aria-current="page"' : ''}>${icon(item.icon)}<span>${item.label}</span>${item.id === 'users' ? '<span class="nav-count">16</span>' : ''}</a>`,
    )
    .join('');
  $('#breadcrumb-page').textContent =
    page === 'users' && profileId()
      ? `Users / ${userById(profileId())?.name ?? 'Account'}`
      : pages.find((item) => item.id === page).label;
  $('#operator-role').textContent = roleLabel(state.role);
  const views = {
    overview: overview,
    users: () => (profileId() ? userProfile() : directory()),
    roles: rolesView,
    components: componentsView,
    memberships: () =>
      location.hash.startsWith('#memberships/new') ||
      location.hash.startsWith('#memberships/plans/')
        ? planEditor()
        : membershipsView(),
    settings: settingsView,
    audit: auditView,
    standards: standardsView,
  };
  $('#main').innerHTML = views[page]();
  renderPlanPreview();
  document.title = `${pages.find((item) => item.id === page).label} · ElectraSim design preview`;
}
function overview() {
  const date = `<label class="btn">${icon('clock')}<select id="overview-period" class="period-picker" aria-label="Date range"><option value="14" ${state.period === '14' ? 'selected' : ''}>Last 14 days</option><option value="30" ${state.period === '30' ? 'selected' : ''}>Last 30 days</option></select></label>`;
  let cards = canUsers()
    ? [
        [
          'Registered users',
          '1,284',
          'users',
          '',
          `<span class="positive">${icon('trend')} 12.8%</span> vs. previous period`,
        ],
        [
          'Active custom roles',
          String(8 + state.customRoles.filter((role) => !role.archived).length - 2),
          'shield',
          'purple',
          '<span class="link">6 staff with custom access</span>',
        ],
        [
          'Community restrictions',
          String(12 + state.users.filter((user) => user.communityRestricted).length - 2),
          'lock',
          'amber',
          '<span class="link">2 expire today</span>',
        ],
        [
          'Suspended accounts',
          String(3 + state.users.filter((user) => user.platformSuspended).length - 1),
          'users',
          'rose',
          '<span class="link">Review account access</span>',
        ],
      ]
    : [
        [
          'Community restrictions',
          String(12 + state.users.filter((user) => user.communityRestricted).length - 2),
          'lock',
          'amber',
          '2 expire today',
        ],
        ['Community actions', '24', 'clock', '', 'In the selected sample period'],
      ];
  if (!canSecurity())
    cards = cards.filter(
      ([label]) => !['Active custom roles', 'Suspended accounts'].includes(label),
    );
  const tasks = [
    [
      'restricted',
      'clock',
      '',
      '2 restrictions expire today',
      'Review community access before it changes.',
    ],
    ...(canSecurity()
      ? [
          [
            'archived',
            'shield',
            'blue',
            '1 archived role has assignments',
            'Check the people affected by this role.',
          ],
          [
            'suspended',
            'users',
            'rose',
            '3 accounts are suspended',
            'Review access decisions and action history.',
          ],
        ]
      : []),
  ];
  return `${heading('Workspace overview', 'A clear view of your people, access, and recent activity.', `${date}<button class="btn" data-action="export">${icon('download')}Export summary</button>`)}
    <section class="metrics ${cards.length <= 2 ? 'compact' : ''}" aria-label="Sample workspace metrics">${cards.map(([label, value, symbol, tone, note]) => `<article class="metric"><div class="metric-top"><span>${label}</span><span class="metric-icon ${tone}">${icon(symbol)}</span></div><div class="metric-number">${value}</div><div class="metric-bottom">${note}</div></article>`).join('')}</section>
    <div class="chart-row"><section class="panel"><div class="panel-heading"><div><h2>${canUsers() ? 'People joining your workspace' : 'Community activity'}</h2><p>${canUsers() ? 'New registrations over the selected period' : 'A sample of recent community administration'}</p></div>${pill('Sample trend', 'blue')}</div><div class="chart-total"><strong>${state.period === '14' ? '148' : '312'}</strong><span>${canUsers() ? 'new users' : 'actions recorded'}</span><span class="mini-trend">↗ 12.8%</span></div>${chart()}<div class="chart-footer"><div class="chart-legend"><span><i class="legend-dot"></i>Current period</span><span><i class="legend-dot previous"></i>Previous period</span></div><span>All times UTC</span></div></section>
    <section class="panel"><div class="panel-heading"><h2>Needs attention</h2>${pill(`${tasks.length} ${tasks.length === 1 ? 'item' : 'items'}`, 'amber')}</div><div class="attention-list">${tasks.map(([action, symbol, tone, title, description]) => `<button class="attention-item" data-action="${action}"><span class="attention-symbol ${tone}">${icon(symbol)}</span><span><strong>${title}</strong><small>${description}</small></span>${icon('chevron')}</button>`).join('')}</div></section></div>
    <div class="lower-row">${canUsers() ? userTable(true) : `<section class="panel"><div class="panel-heading"><h2>Community policy</h2>${pill('Read only')}</div><div class="panel-content"><p class="note">Review the current moderation defaults and the recorded reasons for community actions.</p><button class="btn" data-page="settings">View community settings ${icon('arrow')}</button></div></section>`}
    <section class="panel"><div class="panel-heading"><h2>Recent activity</h2>${pill('Today')}</div><div class="recent-list">${activityRows(4)}</div><div class="activity-footer"><button class="text-button" data-page="audit">View the full audit log ${icon('arrow')}</button></div></section></div>`;
}
function chart() {
  return `<svg class="chart" viewBox="0 0 650 175" role="img" aria-label="Illustrative registration trend. Sample figures only."><defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#5c83ec" stop-opacity=".14"/><stop offset="100%" stop-color="#5c83ec" stop-opacity="0"/></linearGradient></defs>${[25, 62, 99, 136].map((y, i) => `<line class="gridline" x1="44" y1="${y}" x2="626" y2="${y}"/><text x="18" y="${y + 3}">${[24, 16, 8, 0][i]}</text>`).join('')}<path d="M45 123C75 124 83 101 116 106S166 135 202 113 240 99 276 105 310 80 350 89 395 120 433 95 465 108 499 96 540 87 574 69 603 82 626 68" class="last-period"/><path d="M45 113C72 114 86 95 116 101S164 119 202 93 241 81 276 91 315 46 350 64 395 63 433 47 468 63 499 43 536 55 574 27 610 34 626 17V140H45Z" fill="url(#chart-fill)" stroke="none"/><path d="M45 113C72 114 86 95 116 101S164 119 202 93 241 81 276 91 315 46 350 64 395 63 433 47 468 63 499 43 536 55 574 27 610 34 626 17" class="current-period"/><circle cx="626" cy="17" r="3.5" fill="#4978f0" stroke="white" stroke-width="2"/>${[
    ['Oct 10', 45],
    ['Oct 13', 175],
    ['Oct 16', 307],
    ['Oct 19', 438],
    ['Oct 23', 598],
  ]
    .map(([text, x]) => `<text x="${x}" y="161">${text}</text>`)
    .join('')}</svg>`;
}
function filteredUsers() {
  return state.users.filter(
    (user) =>
      (state.filter === 'all' ||
        (state.filter === 'staff' && user.role !== 'individual') ||
        state.filter === user.status) &&
      `${user.name} ${user.email} ${roleLabel(user.role)}`
        .toLowerCase()
        .includes(state.search.toLowerCase()),
  );
}
function userTable(compact = false) {
  const rows = filteredUsers();
  const page = compact ? 1 : state.page;
  const size = compact ? 5 : 8;
  const visible = rows.slice((page - 1) * size, page * size);
  return `<section class="panel table-panel ${compact ? '' : 'full-table'}"><div class="panel-heading"><div><h2>${compact ? 'Recent users' : 'User directory'} <span class="user-count">${compact ? 'Latest 5' : rows.length}</span></h2>${compact ? '' : '<p>Search people, inspect access, and review account actions.</p>'}</div>${compact ? `<button class="text-button" data-page="users">View all users ${icon('arrow')}</button>` : `<button class="btn small" data-action="export">${icon('download')}Export sample</button>`}</div>
    ${compact ? `<div class="table-toolbar">${filters()}<span class="muted">${icon('filter')}</span></div>` : `<div class="directory-tools"><label class="search-field">${icon('search')}<input id="user-search" aria-label="Search sample users" placeholder="Search name, email or role…" value="${esc(state.search)}"/></label>${filters()}</div>`}
    ${!compact && state.selected.size ? `<div class="bulk-bar"><strong>${state.selected.size} users selected</strong><div class="inline-actions"><button class="btn small" data-action="bulk-role">Review role assignment</button><button class="text-button" data-action="clear-selection">Clear selection</button></div></div>` : ''}
    <div class="table-scroll"><table><thead><tr>${compact ? '' : '<th><input type="checkbox" class="inline-check" aria-label="Select visible users" id="select-all"/></th>'}<th>User</th><th>Role</th>${compact ? '' : '<th>Membership</th>'}<th>Status</th>${compact ? '' : '<th>Joined</th>'}<th><span class="sr-only">Open account</span></th></tr></thead><tbody>${visible.map((user) => `<tr class="${state.selected.has(user.id) ? 'selected' : ''}">${compact ? '' : `<td><input type="checkbox" class="inline-check user-select" data-user="${user.id}" aria-label="Select ${esc(user.name)}" ${state.selected.has(user.id) ? 'checked' : ''}/></td>`}<td><button class="user-link" data-profile="${user.id}">${avatar(user)}<span><strong>${esc(user.name)}</strong><small>${esc(user.email)}</small></span></button></td><td>${rolePill(user.role)}</td>${compact ? '' : `<td>${pill(user.plan, user.plan === 'Pro' ? 'blue' : '')}</td>`}<td>${statusPill(user.status)}</td>${compact ? '' : `<td class="muted">${user.joined}</td>`}<td><button class="icon-button" data-user-open="${user.id}" aria-label="Quick view for ${esc(user.name)}" title="Quick view">${icon('chevron')}</button></td></tr>`).join('')}</tbody></table>${visible.length ? '' : '<div class="empty"><strong>No users match these filters</strong>Try another name or choose All users.</div>'}</div>
    <div class="table-footer"><span>${compact ? 'Sample of the latest registrations' : `Showing ${rows.length ? (page - 1) * size + 1 : 0}–${Math.min(page * size, rows.length)} of ${rows.length} sample users`}</span>${compact ? '<span>Updated just now</span>' : `<div class="pagination"><button data-action="previous" aria-label="Previous page" ${page === 1 ? 'disabled' : ''}>${icon('chevron', 'icon previous')}</button>${Array.from({ length: Math.max(1, Math.ceil(rows.length / size)) }, (_, i) => `<button data-user-page="${i + 1}" ${page === i + 1 ? 'aria-current="page"' : ''}>${i + 1}</button>`).join('')}<button data-action="next" aria-label="Next page" ${page * size >= rows.length ? 'disabled' : ''}>${icon('chevron')}</button></div>`}</div></section>`;
}
function filters() {
  return `<div class="segmented" role="group" aria-label="User filters">${[
    ['all', 'All users'],
    ['active', 'Active'],
    ['restricted', 'Restricted'],
    ['staff', 'Staff'],
  ]
    .map(
      ([value, label]) =>
        `<button class="segment" data-filter="${value}" aria-pressed="${state.filter === value}">${label}</button>`,
    )
    .join('')}</div>`;
}
function directory() {
  return `${heading('People & access', 'Everything you need to understand an account before making a change.', `<button class="btn primary" data-action="open-search">${icon('search')}Find an account</button>`)}${userTable()}`;
}
function visibleActivity() {
  return state.activity.filter((event) =>
    ['membership', 'catalog'].includes(event.scope)
      ? canSecurity()
      : event.scope === 'platform'
        ? permission(4)
        : permission(5),
  );
}
function activityRows(limit = 20) {
  return visibleActivity()
    .slice(0, limit)
    .map(
      (event) =>
        `<button class="activity-item" data-activity="${state.activity.indexOf(event)}"><span class="activity-symbol">${icon(event.kind)}</span><span><p><strong>${esc(event.actor)}</strong> ${esc(event.verb)} <strong>${esc(event.target)}</strong></p><time>${event.time}</time></span></button>`,
    )
    .join('');
}
const permissionNames = [
  'View users and contact details',
  'Restrict community writes',
  'Read community settings',
  'Change community settings',
  'Read platform audit',
  'Read community audit',
  'Read standards',
];
function rolesView() {
  return `${heading('Access & roles', 'Give each team member the access they need, with protected actions kept explicit.', `<button class="btn primary" data-action="create-role">${icon('plus')}Create custom role</button>`)}<div class="role-cards">${[
    [
      'Super admin',
      'Protected platform ownership. Staff roles, account suspension, and memberships.',
      'shield',
      'purple',
      '2 people',
    ],
    [
      'Administrator',
      'Manage users, ordinary-user restrictions, settings, and scoped activity.',
      'users',
      '',
      '4 people',
    ],
    [
      'Moderator',
      'Review community policy, community history, and standards.',
      'book',
      'amber',
      '8 people',
    ],
  ]
    .map(
      ([title, description, symbol, tone, count]) =>
        `<article class="panel role-card"><div class="metric-icon ${tone}">${icon(symbol)}</div><h2>${title}</h2><p>${description}</p><footer><span>${count}</span>${title === 'Super admin' ? pill('Protected', 'purple') : '<a class="text-button" href="#permission-matrix">View permissions ↓</a>'}</footer></article>`,
    )
    .join('')}</div>
    <section class="panel"><div class="panel-heading"><div><h2>Custom roles</h2><p>Reusable access for your team.</p></div>${pill(`${state.customRoles.filter((role) => !role.archived).length} active`)}</div><div class="table-scroll"><table><thead><tr><th>Role</th><th>Assigned users</th><th>Permissions</th><th>Status</th><th></th></tr></thead><tbody>${state.customRoles.map((role, i) => `<tr><td><strong>${esc(role.name)}</strong></td><td>${role.users} people</td><td class="muted">${role.permissions.length} permissions</td><td>${pill(role.archived ? 'Archived' : 'Active', role.archived ? '' : 'green')}</td><td><button class="text-button" data-role-edit="${i}">Manage ${icon('arrow')}</button></td></tr>`).join('')}</tbody></table></div></section>
    <section class="panel mt-large" id="permission-matrix"><div class="panel-heading"><div><h2>System permission matrix</h2><p>Compare effective system grants before changing them.</p></div>${pill('Protected actions locked', 'purple')}</div><form id="matrix-form"><div class="table-scroll"><table class="matrix"><thead><tr><th>Permission</th><th>Moderator</th><th>Admin</th><th>Super admin</th></tr></thead><tbody>${permissionNames.map((label, i) => `<tr><td>${label}</td><td><input aria-label="Moderator: ${label}" type="checkbox" name="permission-${i}" ${state.policy[i] ? 'checked' : ''}/></td><td><input aria-label="Admin: ${label}" type="checkbox" name="admin-permission-${i}" ${state.adminPolicy[i] ? 'checked' : ''}/></td><td>${icon('check')}</td></tr>`).join('')}${['Assign staff roles and permissions', 'Suspend platform accounts', 'Manage paid memberships', 'Manage component access', 'Read catalogue audit'].map((label) => `<tr><td>${label}</td><td><span class="locked">${icon('lock')}Protected</span></td><td><span class="locked">${icon('lock')}Protected</span></td><td>${icon('check')}</td></tr>`).join('')}</tbody></table></div><div class="panel-content inline-actions spread"><p class="note">Custom roles add to these system grants.</p><button class="btn primary">Review permission changes</button></div></form></section>`;
}
function auditView() {
  const items = visibleActivity().filter(
    (event) =>
      (state.auditScope === 'all' || event.scope === state.auditScope) &&
      `${event.actor} ${event.target} ${event.verb}`
        .toLowerCase()
        .includes(state.auditSearch.toLowerCase()),
  );
  return `${heading('Audit log', 'Understand who changed what, why they changed it, and who was affected.', `<button class="btn" data-action="export">${icon('download')}Export sample</button>`)}<section class="panel"><div class="audit-tools"><label class="search-field">${icon('search')}<input id="audit-search" aria-label="Search sample activity" placeholder="Search actor, action or account…" value="${esc(state.auditSearch)}"/></label><select id="audit-scope" aria-label="Audit scope"><option value="all">All permitted scopes</option>${permission(4) ? `<option value="platform" ${state.auditScope === 'platform' ? 'selected' : ''}>Platform</option>` : ''}${permission(5) ? `<option value="community" ${state.auditScope === 'community' ? 'selected' : ''}>Community</option>` : ''}${canSecurity() ? `<option value="membership" ${state.auditScope === 'membership' ? 'selected' : ''}>Membership</option><option value="catalog" ${state.auditScope === 'catalog' ? 'selected' : ''}>Catalogue</option>` : ''}</select></div><div class="table-scroll"><table><thead><tr><th>Actor</th><th>Action & subject</th><th>Scope</th><th>When</th><th></th></tr></thead><tbody>${items.map((event) => `<tr><td><strong>${esc(event.actor)}</strong></td><td>${esc(event.verb)}<br><strong>${esc(event.target)}</strong></td><td>${pill(event.scope, event.scope === 'platform' ? 'blue' : 'purple')}</td><td class="muted">${event.time}</td><td><button class="text-button" data-activity="${state.activity.indexOf(event)}">View change ${icon('arrow')}</button></td></tr>`).join('')}</tbody></table>${items.length ? '' : '<div class="empty"><strong>No matching activity</strong>Change the search or scope.</div>'}</div><div class="table-footer">${items.length} sample events <span>Recorded history · scoped access</span></div></section>`;
}
function componentsView() {
  const id = location.hash.split('/')[1];
  const item = state.components.find((component) => component.id === id);
  const accessPill = (component) =>
    pill(
      component.access === 'free' ? 'Free' : 'Pro',
      component.access === 'free' ? 'green' : 'purple',
    );
  if (id && !item)
    return `${heading('Component unavailable', 'This component ID is not in the current catalogue.')}<button class="btn" data-page="components">Back to components</button>`;
  if (item) {
    const protectedBasic = item.tier === 'basic';
    const events = state.activity.filter(
      (event) => event.scope === 'catalog' && event.target === item.id,
    );
    return `${heading(item.label, item.description, '<button class="btn" data-page="components">← All components</button>')}
      ${state.componentConflict ? '<section class="panel panel-content" role="alert"><h2>Policy changed during review</h2><p>Your change was not applied. Reload the current policy, then review again. The reason is never resubmitted automatically.</p><button class="btn primary" data-action="component-reload">Reload current policy</button></section>' : ''}
      <div class="component-detail-grid mt-large"><section class="panel"><div class="panel-heading"><h2>Component access</h2>${accessPill(item)}</div><div class="panel-content">
      <span class="detail-label">CANONICAL COMPONENT ID</span><p class="component-id">${esc(item.id)}</p>
      <dl class="component-facts"><dt>Category</dt><dd>${esc(item.category)}</dd><dt>Code-defined tier</dt><dd>${protectedBasic ? 'Basic · protected baseline' : 'Pro'}</dd><dt>Effective access</dt><dd>${item.access === 'free' ? 'Free for everyone' : 'Requires the Pro component benefit'}</dd><dt>Policy revision</dt><dd>${state.componentRevision}</dd></dl>
      ${protectedBasic ? `<p class="note">${icon('lock')}This confirmed Basic component stays free. Administrators cannot put it behind a membership.</p><button class="btn" disabled>Basic access locked</button>` : `<p>Choose whether everyone can use this component, or require the existing Pro component benefit.</p><button class="btn primary" data-component-review="${esc(item.id)}" ${state.componentConflict ? 'disabled' : ''}>${item.access === 'free' ? 'Review Pro requirement' : 'Review free access'}</button>`}
      </div></section><section class="panel"><div class="panel-heading"><h2>Impact & recovery</h2></div><div class="panel-content"><p>Saved circuit count: <strong>Unavailable in this preview</strong></p><p>Public content count: <strong>Not available yet</strong></p><p>When access becomes Pro, people without the benefit keep their original circuit read-only, a raw backup, and an explicit Basic-copy recovery. Fresh authorized access restores editing.</p><p class="note">Electrical models, ratings, standards and automatic safety findings stay code-owned.</p></div></section></div>
      <section class="panel mt-large"><div class="panel-heading"><h2>Component access history</h2>${pill(`${events.length} sample changes`)}</div><div class="panel-content">${events.length ? events.map((event) => `<p><strong>${esc(event.before)} → ${esc(event.after)}</strong> · ${esc(event.actor)}<br>Reason: ${esc(event.reason)}</p>`).join('') : '<p>No access changes in this sample session.</p>'}</div></section>`;
  }
  const rows = state.components.filter(
    (component) =>
      `${component.label} ${component.id}`
        .toLowerCase()
        .includes(state.componentSearch.toLowerCase()) &&
      (state.componentCategory === 'all' || component.category === state.componentCategory) &&
      (state.componentFilter === 'all' ||
        (state.componentFilter === 'protected'
          ? component.tier === 'basic'
          : component.access === state.componentFilter)),
  );
  const categories = [...new Set(state.components.map((component) => component.category))].sort();
  const size = 12;
  const page = state.componentPage;
  return `${heading('Component access', 'Decide who can use existing Pro components. The confirmed Basic catalogue stays free.', pill('Super admin only', 'purple'))}
    <section class="panel"><div class="panel-heading"><div><h2>Component catalogue</h2><p>${state.components.length} components · ${state.components.filter((component) => component.tier === 'basic').length} protected Basic · policy revision ${state.componentRevision}</p></div></div>
    <div class="audit-tools"><label class="search-field">${icon('search')}<input id="component-search" aria-label="Search components" placeholder="Search component name or ID…" value="${esc(state.componentSearch)}"/></label><select id="component-category" aria-label="Component category"><option value="all">All categories</option>${categories.map((category) => `<option value="${esc(category)}" ${category === state.componentCategory ? 'selected' : ''}>${esc(category)}</option>`).join('')}</select><select id="component-filter" aria-label="Component access filter">${[
      ['all', 'All access'],
      ['free', 'Free'],
      ['pro', 'Pro'],
      ['protected', 'Protected Basic'],
    ]
      .map(
        ([value, label]) =>
          `<option value="${value}" ${value === state.componentFilter ? 'selected' : ''}>${label}</option>`,
      )
      .join('')}</select></div>
    <div class="table-scroll"><table><thead><tr><th>Component</th><th>Category</th><th>Code tier</th><th>Effective access</th><th></th></tr></thead><tbody>${rows
      .slice((page - 1) * size, page * size)
      .map(
        (component) =>
          `<tr><td><strong>${esc(component.label)}</strong><br><small class="muted">${esc(component.id)}</small></td><td>${esc(component.category)}</td><td>${component.tier === 'basic' ? 'Basic · locked' : 'Pro'}</td><td>${accessPill(component)}</td><td><button class="text-button" data-page="components/${esc(component.id)}" aria-label="View ${esc(component.label)}">View ${icon('arrow')}</button></td></tr>`,
      )
      .join(
        '',
      )}</tbody></table>${rows.length ? '' : '<div class="empty"><strong>No matching components</strong>Change the search or filters.</div>'}</div>
    <div class="table-footer"><span>${rows.length} matching components · page ${page} of ${Math.max(1, Math.ceil(rows.length / size))}</span><div class="inline-actions"><button class="btn small" data-component-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}>Previous components</button><button class="btn small" data-component-page="${page + 1}" ${page * size >= rows.length ? 'disabled' : ''}>Next components</button></div></div></section>`;
}
function reviewComponent(id) {
  const item = state.components.find((component) => component.id === id);
  if (!canSecurity() || !item || item.tier === 'basic' || state.componentConflict) return;
  const version = state.componentRevision;
  const before = item.access;
  const after = before === 'free' ? 'pro' : 'free';
  review({
    title: 'Review component access',
    description: `Change access to ${item.label}.`,
    summary: `<span class="detail-label">ACCESS CHANGE</span>${before === 'free' ? 'Free for everyone' : 'Requires Pro'} → <strong>${after === 'free' ? 'Free for everyone' : 'Requires Pro'}</strong><br><br>${after === 'pro' ? 'Existing circuits stay intact. Users without the benefit move to read-only recovery; no component is removed.' : 'Everyone can use this component after a fresh access check. Membership plans retain the overall Pro component benefit.'}<br><br>Electrical behavior stays unchanged. Reviewing policy revision ${version}.`,
    fields:
      '<details class="component-scenario"><summary>Preview a concurrent change</summary><p>Simulate another administrator changing the policy while this review is open.</p><button class="btn small" type="button" data-action="component-race">Simulate concurrent policy change</button><p id="component-race-status" role="status"></p></details>',
    apply: (form) => {
      if (!canSecurity() || state.componentRevision !== version) {
        state.componentConflict = true;
        return false;
      }
      item.access = after;
      state.componentRevision++;
      addEvent(
        'changed component access for',
        item.id,
        before === 'free' ? 'Free' : 'Pro',
        after === 'free' ? 'Free' : 'Pro',
        String(form.get('reason')),
        'catalog',
        'bolt',
      );
    },
  });
}
function settingsView() {
  return `${heading('Community settings', 'Set clear defaults for healthy community participation.', pill(!permission(3) ? 'Read only' : 'Editable by admins', 'blue'))}<div class="settings-layout"><aside class="settings-menu"><strong>Moderation & limits</strong><span>Community policy defaults</span><span>Changes require a reason</span></aside><form class="panel settings-form" id="settings-form"><h2>Moderation & rate limits</h2><p>Review policy changes before they take effect.</p><fieldset ${!permission(3) ? 'disabled' : ''} class="borderless">${[
    [
      'threshold',
      'Auto-hide threshold',
      'Distinct eligible reports needed for automatic review.',
      2,
      100,
    ],
    ['writes', 'Writes per minute', 'Maximum community writes per account.', 1, 120],
    ['reports', 'Reports per day', 'Maximum reports submitted by an account.', 1, 50],
  ]
    .map(
      ([key, label, note, min, max]) =>
        `<label class="setting-row"><span><strong>${label}</strong><p>${note}</p></span><input type="number" name="${key}" min="${min}" max="${max}" value="${state.settings[key]}" required/></label>`,
    )
    .join(
      '',
    )}<label class="setting-row"><span><strong>Pre-moderation</strong><p>Hold new contributions for review before publication.</p></span><input type="checkbox" class="switch" name="preModeration" ${state.settings.preModeration ? 'checked' : ''}/></label><label class="field mt-large">Banned words <textarea name="words" placeholder="One word per line">${esc(state.settings.words)}</textarea></label></fieldset>${permission(3) ? '<div class="settings-actions"><button class="btn" type="button" data-action="default-settings">Use defaults</button><button class="btn primary">Review changes</button></div>' : '<p class="note">Your role can read this policy. Policy changes require an administrator.</p>'}</form></div>`;
}
function planById(id) {
  return state.plans.find((plan) => plan.id === id);
}
function durationLabel(plan) {
  return plan.days ? `${plan.days} days` : 'No expiry';
}
function grantRows(grants, showUser = true) {
  return `<div class="table-scroll"><table><thead><tr>${showUser ? '<th>Member</th>' : ''}<th>Membership plan</th><th>Status</th><th>Starts</th><th>Ends</th><th>Assigned by</th></tr></thead><tbody>${grants
    .map((grant) => {
      const user = userById(grant.userId);
      return `<tr>${showUser ? `<td><button class="user-link" data-profile="${user.id}">${avatar(user)}<span><strong>${esc(user.name)}</strong><small>${esc(user.email)}</small></span></button></td>` : ''}<td><strong>${esc(grant.planName)}</strong><small class="table-subtext">${esc((grant.benefits ?? []).join(' · '))}</small><small class="table-subtext">${esc(grant.reason)}</small></td><td>${pill(grant.status === 'active' ? 'Active' : grant.status === 'scheduled' ? 'Scheduled' : 'Ended', grant.status === 'active' ? 'green' : '')}</td><td>${esc(grant.starts)}</td><td>${esc(grant.ends ?? 'No expiry')}</td><td>${esc(grant.actor)}</td></tr>`;
    })
    .join(
      '',
    )}</tbody></table>${grants.length ? '' : '<div class="empty"><strong>No membership grants yet</strong>Assign an active plan to add access for this user.</div>'}</div>`;
}
function membershipsView() {
  const active = state.plans.filter((plan) => plan.status === 'active').length;
  return `${heading('Memberships', 'Create reusable access plans, then assign them to individual members.', `<button class="btn" data-action="membership-grant">${icon('users')}Assign membership</button><button class="btn primary" data-page="memberships/new">${icon('plus')}Create membership plan</button>`)}
    <div class="membership-summary"><span>${icon('card')}<strong>${active}</strong> active plans</span><span><strong>${state.grants.filter((grant) => grant.status === 'active').length}</strong> sample members</span><span>${icon('shield')}Super admin only</span></div>
    <div class="section-tabs" aria-label="Membership sections"><button class="section-tab ${state.membershipTab === 'plans' ? 'active' : ''}" data-membership-tab="plans">Plans <span>${state.plans.length}</span></button><button class="section-tab ${state.membershipTab === 'grants' ? 'active' : ''}" data-membership-tab="grants">Member grants <span>${state.grants.length}</span></button></div>
    ${state.membershipTab === 'plans' ? `<div class="plan-cards">${state.plans.map((plan) => `<article class="panel plan-card ${plan.status === 'active' ? 'featured' : ''}"><div class="inline-actions spread"><span class="plan-symbol">${icon('card')}</span>${pill(plan.status === 'active' ? 'Active' : plan.status === 'draft' ? 'Draft' : 'Archived', plan.status === 'active' ? 'green' : '')}</div><h2>${esc(plan.name)}</h2><p>${esc(plan.description)}</p><strong class="plan-duration">${durationLabel(plan)}<small>access per assignment</small></strong><ul class="permission-summary">${plan.benefits.map((benefit) => `<li>${icon('check')}${esc(benefit)}</li>`).join('')}</ul><footer class="plan-footer"><span>${state.grants.filter((grant) => grant.planId === plan.id && grant.status === 'active').length} active members</span><button class="text-button" data-page="memberships/plans/${plan.id}">Manage plan ${icon('arrow')}</button></footer></article>`).join('')}</div><section class="panel plan-explainer"><span class="metric-icon">${icon('plus')}</span><div><h2>Build a plan for your members</h2><p>Choose a name, duration and capabilities. Save a draft or make it available for assignment.</p></div><button class="btn" data-page="memberships/new">Create membership plan ${icon('arrow')}</button></section>` : `<section class="panel"><div class="panel-heading"><div><h2>Member grants</h2><p>Who has access, for how long, and who assigned it.</p></div><button class="btn small" data-action="membership-grant">${icon('plus')}Assign membership</button></div>${grantRows(state.grants)}</section>`}
    <p class="note">Basic access is the default for every account. Membership plans add simulator capabilities; staff permissions and account restrictions are managed separately.</p>`;
}
const planBenefits = ['Pro component catalogue', 'Advanced fault capabilities'];
function planEditor() {
  const id = location.hash.split('/')[2];
  const existing = planById(id);
  if (id && !existing)
    return `${heading('Plan not found', 'This sample plan is unavailable.')}<button class="btn" data-page="memberships">Back to memberships</button>`;
  const plan = existing ?? {
    name: '',
    code: '',
    description: '',
    days: 30,
    status: 'draft',
    benefits: planBenefits,
  };
  return `<button class="back-link" data-page="memberships">← Memberships / Plans</button>${heading(existing ? 'Manage membership plan' : 'Create membership plan', 'Define the access a membership provides. Review your changes before saving.', pill(existing ? 'Edit plan' : 'New plan', 'blue'))}
    <form id="plan-form" data-plan-id="${existing?.id ?? ''}" class="plan-editor"><div class="panel editor-fields"><div class="editor-section"><div class="section-number">01</div><div><h2>Plan identity</h2><p>A clear name helps staff choose the right access.</p></div></div><label class="field">Plan name<input name="plan-name" maxlength="80" required placeholder="e.g. Pro semester" value="${esc(plan.name)}"/></label><label class="field">Plan code<input name="plan-code" maxlength="64" pattern="[a-z0-9]+(-[a-z0-9]+)*" required placeholder="e.g. pro-semester" value="${esc(plan.code)}"/><small>Unique lowercase identifier, using letters, numbers and hyphens.</small></label><label class="field">Description<textarea name="plan-description" maxlength="300" required placeholder="Who is this plan for?">${esc(plan.description)}</textarea></label>
    <div class="editor-section"><div class="section-number">02</div><div><h2>Access & duration</h2><p>Choose the capabilities included with each assignment.</p></div></div><fieldset class="benefit-options"><legend>Included capabilities</legend>${planBenefits.map((benefit) => `<label class="check-label"><input type="checkbox" name="benefit" value="${esc(benefit)}" ${plan.benefits.includes(benefit) ? 'checked' : ''}/><span>${esc(benefit)}</span></label>`).join('')}</fieldset><div class="form-columns"><label class="field">Access duration<select name="plan-days">${[
      [30, '30 days'],
      [90, '90 days'],
      [180, '180 days'],
      [365, '365 days'],
      [0, 'No expiry'],
    ]
      .map(
        ([days, label]) =>
          `<option value="${days}" ${plan.days === days ? 'selected' : ''}>${label}</option>`,
      )
      .join(
        '',
      )}</select></label><label class="field">Plan status<select name="plan-status">${['draft', 'active', 'archived'].map((status) => `<option value="${status}" ${plan.status === status ? 'selected' : ''}>${status[0].toUpperCase() + status.slice(1)}</option>`).join('')}</select></label></div><p class="detail-notice">Active plans can be assigned to members. Draft and archived plans stay unavailable for new assignments. Changes apply to future assignments; existing grants keep their recorded access and dates.</p><div class="editor-actions"><button type="button" class="btn" data-page="memberships">Cancel</button><button class="btn primary">Review ${existing ? 'plan changes' : 'new plan'} ${icon('arrow')}</button></div></div>
    <aside class="editor-aside"><span class="eyebrow">MEMBER ACCESS PREVIEW</span><article class="panel plan-card featured" id="plan-preview"></article><div class="detail-box"><h3>How assignment works</h3><ol class="workflow-steps"><li>Create and activate a plan.</li><li>Choose a member and start date.</li><li>Review the access and record a reason.</li></ol><p>Membership grants never grant staff powers.</p></div></aside></form>`;
}
function planDraft(form) {
  const data = new FormData(form);
  return {
    name: String(data.get('plan-name')).trim(),
    code: String(data.get('plan-code')).trim(),
    description: String(data.get('plan-description')).trim(),
    days: Number(data.get('plan-days')),
    status: String(data.get('plan-status')),
    benefits: data.getAll('benefit').map(String),
  };
}
function renderPlanPreview() {
  const form = $('#plan-form');
  if (!form) return;
  const plan = planDraft(form);
  $('#plan-preview').innerHTML =
    `${pill(plan.status[0].toUpperCase() + plan.status.slice(1), plan.status === 'active' ? 'green' : '')}<h2>${esc(plan.name || 'Your membership plan')}</h2><p>${esc(plan.description || 'A short description of the access this plan provides.')}</p><strong class="plan-duration">${durationLabel(plan)}<small>access per assignment</small></strong><ul class="permission-summary">${plan.benefits.map((benefit) => `<li>${icon('check')}${esc(benefit)}</li>`).join('') || '<li>Select at least one capability</li>'}</ul><p class="note">${plan.status === 'active' ? 'Ready for member assignment after review.' : 'Save a draft, then activate it when ready.'}</p>`;
}
function profileId() {
  return currentPage() === 'users' ? location.hash.split('/')[1] : null;
}
function activeUser() {
  return userById($('#account-drawer').open ? state.drawer : (profileId() ?? state.drawer));
}
function accessForm(user, id = 'user-access-form') {
  return `<form id="${id}"><label class="field">System role<select name="role" ${canSecurity() ? '' : 'disabled'}>${['individual', 'moderator', 'admin', 'super_admin'].map((role) => `<option value="${role}" ${user.role === role ? 'selected' : ''}>${roleLabel(role)}</option>`).join('')}</select></label><section class="detail-section"><h3>Custom roles</h3>${state.customRoles
    .filter((role) => !role.archived)
    .map(
      (role) =>
        `<label class="check-label"><input type="checkbox" name="custom" value="${esc(role.name)}" ${user.custom.includes(role.name) ? 'checked' : ''} ${canSecurity() ? '' : 'disabled'}/>${esc(role.name)}</label>`,
    )
    .join(
      '',
    )}</section><section class="detail-section"><h3>Effective access</h3><ul class="permission-summary">${(effectiveDemoPermissions(user).length ? effectiveDemoPermissions(user) : ['No platform staff permissions']).map((label) => `<li>${icon('check')}${esc(label)}</li>`).join('')}</ul></section>${canSecurity() ? '<button class="btn primary">Review access changes</button>' : '<p class="detail-notice">Staff provisioning is reserved for super admins.</p>'}</form>`;
}
function userHistory(user, compact = false) {
  const all = visibleActivity().filter((event) => event.target === user.name);
  const events = compact ? all.slice(0, 3) : all;
  return events.length
    ? `<div class="profile-history">${events.map((event) => `<article class="history-entry"><span class="activity-symbol">${icon(event.kind)}</span><div><div class="inline-actions spread"><strong>${esc(event.verb)} ${esc(event.target)}</strong><span class="muted">${esc(event.time)}</span></div><p>${esc(event.actor)} · ${esc(event.scope)}</p>${compact ? '' : `<div class="change-comparison"><div><span class="detail-label">Before</span>${esc(event.before)}</div><div><span class="detail-label">After</span>${esc(event.after)}</div></div>`}<p><strong>Reason:</strong> ${esc(event.reason)}</p></div></article>`).join('')}</div>`
    : '<div class="empty"><strong>No account actions in this sample</strong>Reviewed changes will appear here.</div>';
}
function userProfile() {
  const user = userById(profileId());
  if (!user)
    return `${heading('User not found', 'This sample account is unavailable.')}<button class="btn" data-page="users">Back to users</button>`;
  const grants = state.grants.filter((grant) => grant.userId === user.id);
  const tabs = [
    ['overview', 'Overview'],
    ['access', 'Access & roles'],
    ['memberships', 'Memberships'],
    ['activity', 'Activity'],
  ];
  const identity = `<section class="panel profile-card"><div class="panel-heading"><div><h2>Account details</h2><p>Identity and account history at a glance.</p></div>${pill('Sample account')}</div><dl class="profile-facts">${[
    ['Full name', user.name],
    ['Email address', user.email],
    ['Account ID', user.id],
    ['Email verification', 'Verified · sample'],
    ['Registered', user.joined],
    ['Last sign-in', 'Today, 10:24 · sample'],
    ['Sign-in method', 'Email and password · sample'],
    ['System role', roleLabel(user.role)],
  ]
    .map(([label, value]) => `<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`)
    .join('')}</dl></section>`;
  const overview = `<div class="profile-layout"><div>${identity}<section class="panel profile-card mt-large"><div class="panel-heading"><h2>Latest account activity</h2><button class="text-button" data-profile-tab="activity">All activity ${icon('arrow')}</button></div><div class="panel-content">${userHistory(user, true)}</div></section></div><aside><section class="panel profile-side"><h2>Membership overview</h2><div class="inline-actions spread"><strong>${user.plan === 'Pro' ? 'Pro access' : 'Basic access'}</strong>${pill(user.plan, user.plan === 'Pro' ? 'blue' : '')}</div><p>${user.plan === 'Pro' ? 'Simulator access from a membership grant.' : 'Default access, with no active membership grant.'}</p><button class="text-button" data-profile-tab="memberships">Review memberships ${icon('arrow')}</button></section><section class="panel profile-side mt-large">${communityControl(user)}${accountControl(user)}</section></aside></div>`;
  const access = `<div class="profile-layout"><section class="panel profile-side"><h2>Roles & permissions</h2><p>Review this account’s complete staff access before making a change.</p>${accessForm(user, 'profile-access-form')}</section><aside class="panel profile-side"><h2>Access boundaries</h2><p>System and custom roles determine staff access. Membership plans determine simulator capabilities.</p><p>Community restrictions and platform suspension are reviewed independently from roles.</p></aside></div>`;
  const memberships = `<section class="panel"><div class="panel-heading"><div><h2>Membership history</h2><p>Current and previous grants for ${esc(user.name)}.</p></div>${canSecurity() ? `<button class="btn primary" data-action="membership-grant">${icon('plus')}Assign membership</button>` : pill('Protected administration', 'purple')}</div>${canSecurity() ? grantRows(grants, false) : '<div class="panel-content"><p>Membership administration and grant details are reserved for super admins.</p></div>'}</section>`;
  return `<button class="back-link" data-page="users">← All users</button><header class="profile-hero"><div class="profile-identity">${avatar(user, true)}<div><span class="eyebrow">USER PROFILE</span><h1>${esc(user.name)}</h1><p>${esc(user.email)}</p><div class="inline-actions">${rolePill(user.role)}${statusPill(user.status)}${pill(user.plan, user.plan === 'Pro' ? 'blue' : '')}</div></div></div><button class="btn" data-user-open="${user.id}">${icon('users')}Quick view</button></header><div class="section-tabs profile-tabs" aria-label="Full user profile sections">${tabs.map(([id, label]) => `<button class="section-tab ${state.profileTab === id ? 'active' : ''}" data-profile-tab="${id}" ${state.profileTab === id ? 'aria-current="page"' : ''}>${label}</button>`).join('')}</div>${state.profileTab === 'overview' ? overview : state.profileTab === 'access' ? access : state.profileTab === 'memberships' ? memberships : `<section class="panel"><div class="panel-heading"><div><h2>Account activity</h2><p>Permitted changes, recorded reasons and their before/after values.</p></div>${pill('Scoped history')}</div><div class="panel-content">${userHistory(user)}</div></section>`}`;
}
function standardsView() {
  return `${heading('Standards reference', 'Code-owned electrical references used by the simulator.', pill('Read only'))}<div class="standards-grid">${[
    ['UK', 'United Kingdom', 'BS 7671 · UK teaching defaults', 230, 50],
    ['US', 'United States', 'NEC · US teaching defaults', 120, 60],
    ['EU', 'European Union', 'IEC / European teaching defaults', 230, 50],
    ['INT', 'International', 'IEC · International teaching defaults', 230, 50],
  ]
    .map(
      ([code, name, note, voltage, frequency]) =>
        `<article class="panel standard-card"><div class="inline-actions spread"><h2>${name}</h2>${pill(code, 'blue')}</div><div class="values"><span>${voltage} V<small>NOMINAL VOLTAGE</small></span><span>${frequency} Hz<small>FREQUENCY</small></span></div><p>${note}</p></article>`,
    )
    .join(
      '',
    )}</div><p class="note">Illustrative reference cards. Electrical rules are maintained with the model; this workspace offers no rule-editing control.</p>`;
}
function openUser(id, tab = 'profile') {
  if (!canUsers()) {
    toast('This preview role has no account-directory access.');
    return;
  }
  const user = userById(id);
  if (!user) return;
  state.drawer = id;
  state.drawerTab = tab;
  renderDrawer();
  const drawer = $('#account-drawer');
  if (!drawer.open) drawer.showModal();
}
function membershipSummary(user) {
  const grant = state.grants.find((grant) => grant.userId === user.id && grant.status === 'active');
  return `<section class="detail-section"><h3>Membership</h3><div class="detail-box"><div class="row"><strong>${canSecurity() && grant ? esc(grant.planName) : user.plan === 'Pro' ? 'Pro membership' : 'Basic access'}</strong>${pill(grant ? 'Active grant' : 'Free', grant ? 'blue' : '')}</div><p>${canSecurity() && grant ? `Manual grant · ${grant.ends ? `Ends ${esc(grant.ends)}` : 'No expiry'}` : user.plan === 'Pro' ? 'Pro simulator capabilities.' : 'Basic simulation and private circuit work.'}</p></div></section>`;
}
function renderDrawer() {
  const user = userById(state.drawer);
  if (!user) return;
  const profile = `<div class="detail-grid"><div><span class="detail-label">Account state</span>${statusPill(user.status === 'restricted' ? 'active' : user.status)}</div><div><span class="detail-label">System role</span>${rolePill(user.role)}</div><div><span class="detail-label">Joined</span><span class="detail-value">${user.joined}</span></div><div><span class="detail-label">Account ID</span><span class="detail-value">${user.id}</span></div></div>${membershipSummary(user)}${communityControl(user)}${accountControl(user)}`;
  const access = accessForm(user);
  const events = visibleActivity().filter((event) => event.target === user.name);
  const history = events.length
    ? events
        .map(
          (event) =>
            `<div class="detail-box"><strong>${esc(event.actor)}</strong><p>${esc(event.verb)} ${esc(event.target)}</p><p>${esc(event.reason)}</p><small>${event.time}</small></div>`,
        )
        .join('')
    : '<div class="empty"><strong>No account actions in this sample</strong>Actions you preview will appear here.</div>';
  $('#account-drawer').innerHTML =
    `<div class="drawer-top"><span>USER DIRECTORY / ACCOUNT</span><button class="icon-button" data-close="account-drawer" aria-label="Close account">${icon('close')}</button></div><div class="drawer-identity">${avatar(user, true)}<div><h2 id="drawer-name">${esc(user.name)}</h2><p>${esc(user.email)}</p></div></div><div class="drawer-profile-link"><button class="btn primary" data-profile="${user.id}">Open full profile ${icon('arrow')}</button></div><div class="drawer-tabs" role="tablist" aria-label="Account sections">${[
      ['profile', 'Account overview'],
      ['access', 'Access & roles'],
      ['history', 'Activity'],
    ]
      .map(
        ([id, label]) =>
          `<button class="drawer-tab" role="tab" id="drawer-tab-${id}" aria-controls="drawer-panel" tabindex="${state.drawerTab === id ? 0 : -1}" aria-selected="${state.drawerTab === id}" data-drawer-tab="${id}">${label}</button>`,
      )
      .join(
        '',
      )}</div><div class="drawer-body" role="tabpanel" id="drawer-panel" aria-labelledby="drawer-tab-${state.drawerTab}">${state.drawerTab === 'profile' ? profile : state.drawerTab === 'access' ? access : history}</div>`;
}
function communityControl(user) {
  const restricted = user.communityRestricted;
  return `<section class="detail-section"><h3>Community access</h3><div class="detail-box"><div class="row"><strong>${restricted ? 'Writes restricted' : 'Unrestricted'}</strong>${pill(restricted ? 'Restriction active' : 'No restriction', restricted ? 'amber' : 'green')}</div><p>${restricted ? `${esc(user.reason)}. Ends ${esc(user.expires ?? 'indefinitely')}.` : 'Publishing and social actions are available within the account’s permissions.'}</p>${permission(1) && (state.role === 'super_admin' || user.role === 'individual') ? `<button class="btn small ${restricted ? '' : 'danger-soft'}" data-action="${restricted ? 'restore-community' : 'restrict-community'}">${restricted ? 'Review restriction removal' : 'Restrict community writes'}</button>` : '<p>Staff restrictions require a super admin.</p>'}</div></section>`;
}
function accountControl(user) {
  if (!canSecurity()) return '';
  const suspended = user.platformSuspended;
  return `<section class="detail-section"><h3>Account controls</h3><div class="detail-box danger-zone"><div class="row"><strong>${suspended ? 'Platform account suspended' : 'Platform account active'}</strong>${icon('shield')}</div><p>${suspended ? 'Restoring access permits a fresh sign-in. Revoked sessions stay revoked.' : 'Suspension signs out all sessions. Private circuits and memberships are retained.'}</p><button class="btn small ${suspended ? '' : 'danger-soft'}" data-action="${suspended ? 'restore-account' : 'suspend-account'}">${suspended ? 'Review account restoration' : 'Review platform suspension'}</button></div></section>`;
}
function review({
  title,
  description,
  summary,
  fields = '',
  button = 'Apply demo change',
  danger = false,
  apply,
  reason = true,
}) {
  state.review = { apply, reason };
  $('#review-dialog').innerHTML =
    `<div class="dialog-heading"><h2 id="review-heading">${esc(title)}</h2><button class="icon-button" data-close="review-dialog" aria-label="Close review">${icon('close')}</button></div><p class="dialog-description">${esc(description)}</p>${summary ? `<div class="review-summary">${summary}</div>` : ''}<form id="review-form">${fields}${reason ? '<label class="field">Reason<textarea name="reason" required maxlength="1000" placeholder="Explain the reason for this change…"></textarea></label>' : ''}<p class="note">Design preview: this affects fictional sample records only.</p><div class="dialog-footer"><button class="btn" type="button" data-close="review-dialog">Cancel</button><button class="btn ${danger ? 'danger' : 'primary'}">${button}</button></div></form>`;
  $('#review-dialog').showModal();
}
function addEvent(verb, target, before, after, reason, scope = 'platform', kind = 'shield') {
  state.activity.unshift({
    actor: 'Alex Morgan',
    verb,
    target,
    before,
    after,
    reason,
    time: 'Just now',
    scope,
    kind,
  });
}
function toast(message) {
  $('#toast').innerHTML = `${icon('check')}<span>${esc(message)}</span>`;
  $('#toast').hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    $('#toast').hidden = true;
  }, 4200);
}
function closeNav() {
  $('#sidebar').classList.remove('open');
  $('.nav-scrim').hidden = true;
  $('.mobile-menu').setAttribute('aria-expanded', 'false');
}
function navigate(page) {
  closeNav();
  if (location.hash === `#${page}`) render();
  else location.hash = page;
}
function showSearch() {
  $('#search-dialog').innerHTML =
    `<div class="dialog-heading"><h2 id="search-heading">Find anything in this workspace</h2><button class="icon-button" data-close="search-dialog" aria-label="Close search">${icon('close')}</button></div><label class="search-field">${icon('search')}<input id="command-input" autofocus placeholder="Search a page or sample user…" aria-label="Search pages and sample users"/></label><div class="search-results" id="search-results"></div>`;
  searchResults('');
  $('#search-dialog').showModal();
}
function searchResults(query) {
  const term = query.toLowerCase();
  $('#search-results').innerHTML =
    pages
      .filter((page) => pageAllowed(page) && page.label.toLowerCase().includes(term))
      .map(
        (page) =>
          `<button class="search-result" data-search-page="${page.id}">${icon(page.icon)}${page.label}<small>Page ${icon('arrow')}</small></button>`,
      )
      .join('') +
    (canUsers()
      ? state.users
          .filter((user) => `${user.name} ${user.email}`.toLowerCase().includes(term))
          .slice(0, 5)
          .map(
            (user) =>
              `<button class="search-result" data-search-user="${user.id}">${avatar(user)}${esc(user.name)}<small>Account ${icon('arrow')}</small></button>`,
          )
          .join('')
      : '');
}
function exportSample() {
  const page = currentPage();
  let rows;
  if (page === 'overview')
    rows = [
      ['Metric', 'Sample value'],
      ...(canUsers() ? [['Registered users', '1284']] : []),
      [
        'Community restrictions',
        String(12 + state.users.filter((u) => u.communityRestricted).length - 2),
      ],
      ...(canSecurity()
        ? [
            [
              'Suspended accounts',
              String(3 + state.users.filter((u) => u.platformSuspended).length - 1),
            ],
          ]
        : []),
    ];
  else if (page === 'audit')
    rows = [
      ['Actor', 'Action', 'Subject', 'Scope', 'Reason'],
      ...visibleActivity().map((event) => [
        event.actor,
        event.verb,
        event.target,
        event.scope,
        event.reason,
      ]),
    ];
  else
    rows = [
      ['Name', 'Role', 'Membership', 'Status'],
      ...filteredUsers().map((user) => [user.name, roleLabel(user.role), user.plan, user.status]),
    ];
  const csv = `Fictional sample data only\n${rows
    .map((row) =>
      row
        .map((value) => {
          const cell = String(value);
          return `"${(/^[=+@-]/.test(cell) ? "'" : '') + cell.replaceAll('"', '""')}"`;
        })
        .join(','),
    )
    .join('\n')}`;
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `electrasim-demo-${page}.csv`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Sample CSV exported. No real user data is included.');
}
function grantEnd(starts, days) {
  if (!days) return null;
  const date = new Date(`${starts}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
function renderGrantPreview() {
  const box = $('#grant-preview');
  if (!box) return;
  const form = $('#review-form');
  const plan = planById(form.elements.plan.value);
  const starts = form.elements.starts.value;
  if (!plan) return;
  box.innerHTML = `<strong>${esc(plan.name)}</strong><p>${esc(plan.benefits.join(' · '))}</p><p>${esc(starts || 'Choose a start date')} → ${esc(grantEnd(starts, plan.days) ?? 'No expiry')}</p>`;
}
const actions = {
  'open-search': showSearch,
  period: () => {
    state.period = state.period === '14' ? '30' : '14';
    render();
  },
  export: exportSample,
  restricted: () => {
    if (!canUsers()) {
      navigate('audit');
      return;
    }
    state.filter = 'restricted';
    state.page = 1;
    navigate('users');
  },
  archived: () => {
    if (!canSecurity()) {
      navigate('audit');
      return;
    }
    navigate('roles');
  },
  suspended: () => {
    if (!canUsers()) {
      navigate('audit');
      return;
    }
    state.filter = 'suspended';
    state.page = 1;
    navigate('users');
  },
  previous: () => {
    state.page = Math.max(1, state.page - 1);
    render();
  },
  next: () => {
    state.page++;
    render();
  },
  'clear-selection': () => {
    state.selected.clear();
    render();
  },
  'bulk-role': () => {
    if (!canSecurity()) {
      toast('Role assignment requires a super admin.');
      return;
    }
    review({
      title: 'Review role assignment',
      description: 'Apply one reviewed role to the selected sample accounts.',
      summary: `<strong>${state.selected.size} selected accounts</strong><br>Changes will appear in the sample audit log.`,
      fields:
        '<label class="field">System role<select name="role"><option value="individual">Individual</option><option value="moderator">Moderator</option><option value="admin">Admin</option></select></label>',
      apply: (form) => {
        const role = String(form.get('role'));
        state.users
          .filter((user) => state.selected.has(user.id))
          .forEach((user) => {
            addEvent(
              'changed the role for',
              user.name,
              roleLabel(user.role),
              roleLabel(role),
              String(form.get('reason')),
            );
            user.role = role;
          });
        state.selected.clear();
      },
    });
  },
  'restrict-community': () => {
    const user = activeUser();
    review({
      title: 'Restrict community writes',
      description: `Review community access for ${user.name}.`,
      summary:
        'Blocks publishing and social writes.<br>Private circuit work and paid memberships remain available.',
      fields:
        '<label class="field">Duration<select name="duration"><option value="24 hours">24 hours</option><option value="7 days">7 days</option><option value="indefinitely">Indefinitely</option></select></label>',
      danger: true,
      apply: (form) => {
        user.communityRestricted = true;
        syncStatus(user);
        user.reason = String(form.get('reason'));
        user.expires = String(form.get('duration'));
        addEvent(
          'restricted community access for',
          user.name,
          'Community access: unrestricted',
          `Restricted for ${user.expires}`,
          user.reason,
          'community',
          'lock',
        );
      },
    });
  },
  'restore-community': () => {
    const user = activeUser();
    review({
      title: 'Remove community restriction',
      description: `Restore community writes for ${user.name}.`,
      summary: 'The original restriction remains in the account’s action history.',
      apply: (form) => {
        user.communityRestricted = false;
        syncStatus(user);
        addEvent(
          'removed the restriction for',
          user.name,
          'Community writes: restricted',
          'Community access: unrestricted',
          String(form.get('reason')),
          'community',
          'lock',
        );
      },
    });
  },
  'suspend-account': () => {
    const user = activeUser();
    review({
      title: 'Suspend platform account',
      description: `Review platform access for ${user.name}.`,
      summary:
        'All active sessions will be revoked.<br>Private circuits and paid membership records are retained.<br>The account must sign in again after restoration.',
      danger: true,
      button: 'Suspend sample account',
      apply: (form) => {
        user.platformSuspended = true;
        syncStatus(user);
        addEvent(
          'suspended platform access for',
          user.name,
          'Platform account: active',
          'Platform account: suspended',
          String(form.get('reason')),
          'platform',
          'lock',
        );
      },
    });
  },
  'restore-account': () => {
    const user = activeUser();
    review({
      title: 'Restore platform account',
      description: `Allow a fresh sign-in for ${user.name}.`,
      summary: 'Previously revoked sessions stay revoked.',
      apply: (form) => {
        user.platformSuspended = false;
        syncStatus(user);
        addEvent(
          'restored platform access for',
          user.name,
          'Platform account: suspended',
          'Platform account: active',
          String(form.get('reason')),
        );
      },
    });
  },
  'create-role': () =>
    review({
      title: 'Create a custom role',
      description: 'Choose a reusable set of non-protected permissions.',
      fields: `<label class="field">Role name<input name="name" required maxlength="80" placeholder="e.g. Community support"/></label><h3 class="mb-small">Permissions</h3>${permissionNames.map((label) => `<label class="check-label"><input type="checkbox" name="permission" value="${label}"/>${label}</label>`).join('')}`,
      apply: (form) => {
        const name = String(form.get('name'));
        state.customRoles.push({
          name,
          users: 0,
          permissions: form.getAll('permission').map(String),
          archived: false,
        });
        addEvent(
          'created a custom role',
          name,
          'No role',
          form.getAll('permission').join(', '),
          String(form.get('reason')),
        );
      },
    }),
  'default-settings': () => {
    $('[name=threshold]').value = 5;
    $('[name=writes]').value = 20;
    $('[name=reports]').value = 10;
    $('[name=words]').value = '';
    $('[name=preModeration]').checked = false;
    toast('Default values loaded into the form. Review to apply.');
  },
  'membership-grant': () => {
    if (!canSecurity()) return;
    const plans = state.plans.filter((plan) => plan.status === 'active');
    if (!plans.length) {
      toast('Activate a membership plan before assigning access.');
      return;
    }
    const selected = profileId();
    review({
      title: 'Assign membership',
      description:
        'Choose a member and an active plan. The grant is recorded separately from staff access.',
      fields: `<label class="field">Member<select name="user">${state.users.map((user) => `<option value="${user.id}" ${user.id === selected ? 'selected' : ''}>${esc(user.name)} · ${esc(user.email)}</option>`).join('')}</select></label><label class="field">Membership plan<select name="plan">${plans.map((plan) => `<option value="${plan.id}">${esc(plan.name)} · ${durationLabel(plan)}</option>`).join('')}</select></label><label class="field">Starts on<input type="date" name="starts" value="2026-10-24" min="2026-10-24" required/></label><div id="grant-preview" class="detail-box"></div>`,
      summary:
        'Active membership grants for this member will be replaced from the selected start date. This does not change the account’s roles or restrictions.',
      button: 'Assign sample membership',
      apply: (form) => {
        const user = userById(String(form.get('user')));
        const plan = planById(String(form.get('plan')));
        if (!user || !plan || plan.status !== 'active') return;
        const starts = String(form.get('starts'));
        const ends = grantEnd(starts, plan.days);
        const future = starts > '2026-10-24';
        if (!future)
          state.grants
            .filter((grant) => grant.userId === user.id && grant.status === 'active')
            .forEach((grant) => {
              grant.status = 'ended';
              grant.ends = starts;
            });
        state.grants.unshift({
          id: `grant_${Date.now()}`,
          userId: user.id,
          planId: plan.id,
          planName: plan.name,
          benefits: [...plan.benefits],
          starts,
          ends,
          status: future ? 'scheduled' : 'active',
          actor: 'Alex Morgan',
          reason: String(form.get('reason')),
        });
        addEvent(
          'assigned membership to',
          user.name,
          user.plan,
          `${plan.name} · ${starts} to ${ends ?? 'no expiry'}`,
          String(form.get('reason')),
          'membership',
          'card',
        );
        if (!future) user.plan = 'Pro';
      },
    });
    renderGrantPreview();
  },
};
document.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.close) {
    $(`#${button.dataset.close}`).close();
    return;
  }
  if (button.dataset.page) {
    navigate(button.dataset.page);
    return;
  }
  if (button.dataset.profile) {
    $('#account-drawer').close();
    $('#account-drawer').innerHTML = '';
    state.profileTab = 'overview';
    navigate(`users/${button.dataset.profile}`);
    return;
  }
  if (button.dataset.profileTab) {
    state.profileTab = button.dataset.profileTab;
    render();
    return;
  }
  if (button.dataset.membershipTab) {
    state.membershipTab = button.dataset.membershipTab;
    render();
    return;
  }
  if (button.dataset.userOpen) {
    openUser(button.dataset.userOpen);
    return;
  }
  if (button.dataset.filter) {
    state.filter = button.dataset.filter;
    state.page = 1;
    render();
    return;
  }
  if (button.dataset.userPage) {
    state.page = Number(button.dataset.userPage);
    render();
    return;
  }
  if (button.dataset.drawerTab) {
    state.drawerTab = button.dataset.drawerTab;
    renderDrawer();
    return;
  }
  if (button.dataset.searchPage) {
    $('#search-dialog').close();
    navigate(button.dataset.searchPage);
    return;
  }
  if (button.dataset.searchUser) {
    $('#search-dialog').close();
    openUser(button.dataset.searchUser);
    return;
  }
  if (button.dataset.activity !== undefined) {
    const record = state.activity[Number(button.dataset.activity)];
    review({
      title: 'Recorded change',
      description: `${record.actor} ${record.verb} ${record.target}.`,
      summary: `<span class="detail-label">BEFORE</span>${esc(record.before)}<br><br><span class="detail-label">AFTER</span>${esc(record.after)}<br><br><span class="detail-label">REASON</span>${esc(record.reason)}`,
      fields: '',
      reason: false,
      button: 'Close detail',
      apply: () => {},
    });
    return;
  }
  if (button.dataset.roleEdit !== undefined) {
    const role = state.customRoles[Number(button.dataset.roleEdit)];
    review({
      title: `Manage ${role.name}`,
      description: `${role.users} people are assigned to this sample role.`,
      summary: esc(role.permissions.join(' · ') || 'No permissions'),
      fields: `<label class="check-label"><input type="checkbox" name="archived" ${role.archived ? 'checked' : ''}/>Archive this role</label>`,
      apply: (form) => {
        const old = role.archived;
        role.archived = form.has('archived');
        addEvent(
          'updated a custom role',
          role.name,
          old ? 'Archived' : 'Active',
          role.archived ? 'Archived' : 'Active',
          String(form.get('reason')),
        );
      },
    });
    return;
  }
  if (button.dataset.componentReview) {
    reviewComponent(button.dataset.componentReview);
    return;
  }
  if (button.dataset.componentPage) {
    state.componentPage = Number(button.dataset.componentPage);
    render();
    return;
  }
  if (button.dataset.action === 'component-race') {
    state.componentRevision++;
    $('#component-race-status').textContent =
      'Another sample administrator changed the policy. Try applying this review.';
    return;
  }
  if (button.dataset.action === 'component-reload') {
    state.componentConflict = false;
    render();
    return;
  }
  if (button.dataset.action) actions[button.dataset.action]?.();
});
document.addEventListener('change', (event) => {
  const input = event.target;
  if (input.closest('#plan-form')) renderPlanPreview();
  if (input.closest('#review-form') && ['plan', 'starts'].includes(input.name))
    renderGrantPreview();
  if (['component-category', 'component-filter'].includes(input.id)) {
    state[input.id === 'component-category' ? 'componentCategory' : 'componentFilter'] =
      input.value;
    state.componentPage = 1;
    render();
    return;
  }
  if (input.id === 'overview-period') {
    state.period = input.value;
    render();
    return;
  }
  if (input.id === 'preview-role') {
    state.role = input.value;
    state.selected.clear();
    state.auditScope = 'all';
    $$('dialog[open]').forEach((dialog) => dialog.close());
    render();
    return;
  }
  if (input.classList.contains('user-select')) {
    input.checked
      ? state.selected.add(input.dataset.user)
      : state.selected.delete(input.dataset.user);
    render();
    return;
  }
  if (input.id === 'select-all') {
    filteredUsers()
      .slice((state.page - 1) * 8, state.page * 8)
      .forEach((user) => {
        input.checked ? state.selected.add(user.id) : state.selected.delete(user.id);
      });
    render();
    return;
  }
  if (input.id === 'audit-scope') {
    state.auditScope = input.value;
    render();
  }
});
document.addEventListener('input', (event) => {
  const input = event.target;
  if (input.closest('#plan-form')) renderPlanPreview();
  if (input.id === 'command-input') searchResults(input.value);
  if (['user-search', 'audit-search', 'component-search'].includes(input.id)) {
    const cursor = input.selectionStart;
    state[
      input.id === 'user-search'
        ? 'search'
        : input.id === 'audit-search'
          ? 'auditSearch'
          : 'componentSearch'
    ] = input.value;
    state.componentPage = 1;
    state.page = 1;
    render();
    const next = $(`#${input.id}`);
    next.focus();
    next.setSelectionRange(cursor, cursor);
  }
});
document.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.target;
  const data = new FormData(form);
  if (form.id === 'review-form') {
    if (state.review.reason && !String(data.get('reason')).trim()) {
      form.querySelector('[name=reason]').setCustomValidity('Please give a reason.');
      form.reportValidity();
      form
        .querySelector('[name=reason]')
        .addEventListener('input', (e) => e.target.setCustomValidity(''), { once: true });
      return;
    }
    if (!state.review.reason) {
      $('#review-dialog').close();
      return;
    }
    const result = state.review.apply(data);
    $('#review-dialog').close();
    render();
    if ($('#account-drawer').open) renderDrawer();
    toast(
      result === false
        ? 'Policy changed. Reload and review before retrying.'
        : 'Demo updated. No live accounts or settings changed.',
    );
  }
  if (form.id === 'user-access-form' || form.id === 'profile-access-form') {
    const user = activeUser();
    const role = String(data.get('role'));
    const custom = data.getAll('custom').map(String);
    review({
      title: 'Review account access',
      description: `Update staff access for ${user.name}.`,
      summary: `<span class="detail-label">SYSTEM ROLE</span>${esc(roleLabel(user.role))} → <strong>${esc(roleLabel(role))}</strong><br><span class="detail-label mt-small">CUSTOM ROLES</span>${esc(custom.join(', ') || 'None')}<br><span class="detail-label mt-small">RESULTING ACCESS</span>${esc(effectiveDemoPermissions({ ...user, role, custom }).join(' · ') || 'No platform staff permissions')}<br><br>${role === 'super_admin' ? 'This grants protected staff, account, and membership powers.' : 'Paid membership capabilities remain separate.'}`,
      fields:
        role === 'super_admin'
          ? '<label class="check-label"><input type="checkbox" required/>I understand this grants protected super-admin powers.</label>'
          : '',
      apply: (reason) => {
        addEvent(
          'updated access for',
          user.name,
          `${roleLabel(user.role)}; ${user.custom.join(', ')}`,
          `${roleLabel(role)}; ${custom.join(', ')}`,
          String(reason.get('reason')),
        );
        user.role = role;
        user.custom = custom;
      },
    });
  }
  if (form.id === 'plan-form') {
    if (!canSecurity()) return;
    const draft = planDraft(form);
    const existing = planById(form.dataset.planId);
    const codeInput = form.querySelector('[name=plan-code]');
    if (state.plans.some((plan) => plan.code === draft.code && plan.id !== existing?.id)) {
      codeInput.setCustomValidity('This plan code is already used. Choose another.');
      codeInput.reportValidity();
      codeInput.addEventListener('input', () => codeInput.setCustomValidity(''), { once: true });
      return;
    }
    if (!draft.benefits.length) {
      toast('Select at least one included capability.');
      return;
    }
    review({
      title: existing ? 'Review membership plan changes' : 'Review new membership plan',
      description: existing
        ? 'Changes apply to future assignments. Existing grants keep their recorded access and dates.'
        : 'Save this reusable plan for membership assignment.',
      summary: `<span class="detail-label">PLAN</span><strong>${esc(draft.name)}</strong> · ${esc(draft.code)}<br><br><span class="detail-label">ACCESS</span>${esc(draft.benefits.join(' · '))}<br><br><span class="detail-label">DURATION & STATUS</span>${durationLabel(draft)} · ${esc(draft.status)}${existing ? `<br><br><span class="detail-label">PREVIOUS</span>${esc(existing.name)} · ${durationLabel(existing)} · ${esc(existing.status)}` : ''}`,
      button: existing ? 'Save sample plan' : 'Create sample plan',
      apply: (reason) => {
        addEvent(
          existing ? 'updated membership plan' : 'created membership plan',
          draft.name,
          existing
            ? `${existing.name} · ${durationLabel(existing)} · ${existing.status}`
            : 'No plan',
          `${draft.name} · ${durationLabel(draft)} · ${draft.status}`,
          String(reason.get('reason')),
          'membership',
          'card',
        );
        if (existing) Object.assign(existing, draft);
        else state.plans.push({ id: `plan_${Date.now()}`, ...draft });
        state.membershipTab = 'plans';
        navigate('memberships');
      },
    });
  }
  if (form.id === 'matrix-form') {
    const next = permissionNames.map((_, i) => data.has(`permission-${i}`));
    const admin = permissionNames.map((_, i) => data.has(`admin-permission-${i}`));
    const count =
      next.filter((v, i) => v !== state.policy[i]).length +
      admin.filter((v, i) => v !== state.adminPolicy[i]).length;
    review({
      title: 'Review system permissions',
      description: 'Update the system grants for moderator and admin roles.',
      summary: `<strong>${count} permission changes</strong><br>Protected super-admin actions remain locked.`,
      apply: (reason) => {
        addEvent(
          'updated system permissions',
          'Moderator and admin',
          'Previous system policy',
          `${count} permission changes`,
          String(reason.get('reason')),
        );
        state.policy = next;
        state.adminPolicy = admin;
      },
    });
  }
  if (form.id === 'settings-form') {
    const next = {
      threshold: Number(data.get('threshold')),
      writes: Number(data.get('writes')),
      reports: Number(data.get('reports')),
      words: String(data.get('words')),
      preModeration: data.has('preModeration'),
    };
    review({
      title: 'Review community policy',
      description: 'Inspect the proposed defaults before applying this demo change.',
      summary: `Auto-hide: <strong>${state.settings.threshold} → ${next.threshold}</strong> reports<br>Writes per minute: <strong>${state.settings.writes} → ${next.writes}</strong><br>Reports per day: <strong>${state.settings.reports} → ${next.reports}</strong><br>Pre-moderation: <strong>${state.settings.preModeration ? 'On' : 'Off'} → ${next.preModeration ? 'On' : 'Off'}</strong>`,
      apply: (reason) => {
        addEvent(
          'updated',
          'Community settings',
          `${state.settings.reports} reports/day`,
          `${next.reports} reports/day`,
          String(reason.get('reason')),
          'community',
          'sliders',
        );
        state.settings = next;
      },
    });
  }
});
$('#open-search').addEventListener('click', showSearch);
$('.mobile-menu').addEventListener('click', () => {
  $('#sidebar').classList.add('open');
  $('.nav-scrim').hidden = false;
  $('.mobile-menu').setAttribute('aria-expanded', 'true');
});
$('.nav-scrim').addEventListener('click', closeNav);
$('#reset-demo').addEventListener('click', () => {
  reset();
  $$('dialog[open]').forEach((dialog) => dialog.close());
  render();
  toast('Sample data reset.');
});
document.addEventListener('keydown', (event) => {
  if (event.target.matches('.drawer-tab') && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
    event.preventDefault();
    const tabs = ['profile', 'access', 'history'];
    const at = tabs.indexOf(state.drawerTab);
    state.drawerTab = tabs[(at + (event.key === 'ArrowRight' ? 1 : 2)) % 3];
    renderDrawer();
    $(`#drawer-tab-${state.drawerTab}`).focus();
    return;
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    if (!$('#search-dialog').open) showSearch();
  }
  if (event.key === 'Escape') closeNav();
});
window.addEventListener('hashchange', () => {
  closeNav();
  state.search = '';
  state.page = 1;
  state.profileTab = 'overview';
  state.selected.clear();
  $('#account-drawer').close();
  render();
  window.scrollTo({ top: 0 });
});
reset();
render();
$('.command-search kbd').textContent = navigator.platform.includes('Mac') ? '⌘ K' : 'Ctrl K';
