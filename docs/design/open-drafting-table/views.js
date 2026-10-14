/* All simulator screens use the same spacious design language. Sample state only. */
(() => {
  const screens = [
    ['files', 'Files & saved circuits', 'Project'],
    ['import', 'Import a circuit', 'Project'],
    ['export', 'Export & share', 'Project'],
    ['templates', 'Templates & guided circuits', 'Project'],
    ['commands', 'Command palette', 'Project'],
    ['placement', 'Placement & standards', 'Project'],
    ['settings-editing', 'Editing preferences', 'Settings'],
    ['settings-display', 'Display preferences', 'Settings'],
    ['settings-simulation', 'Simulation preferences', 'Settings'],
    ['settings-backup', 'Backup & restore', 'Settings'],
    ['settings-about', 'About ElectraSim', 'Settings'],
    ['variant', 'Choose a component variant', 'Editing'],
    ['variant-review', 'Review variant change', 'Editing'],
    ['component-info', 'Component reference & specifications', 'Editing'],
    ['device-model', 'Device configuration', 'Editing'],
    ['coil-model', 'Coil configuration', 'Editing'],
    ['timer-model', 'Timer program', 'Editing'],
    ['motor-model', 'Three-phase motor configuration', 'Editing'],
    ['protection-model', 'Protection configuration', 'Editing'],
    ['supply', 'Supply configuration', 'Editing'],
    ['supply-review', 'Review supply change', 'Editing'],
    ['wire', 'Wire properties', 'Editing'],
    ['connections', 'Connections', 'Editing'],
    ['netlist', 'Accessible netlist', 'Editing'],
    ['selection-tools', 'Selection & alignment', 'Editing'],
    ['confirm-delete', 'Confirm removal', 'Editing'],
    ['readiness', 'Circuit readiness', 'Results'],
    ['validation', 'Validation & diagnostics', 'Results'],
    ['analytics', 'Calculated readings', 'Results'],
    ['zs', 'Earth-fault loop assessment', 'Results'],
    ['history', 'Event history', 'Results'],
    ['fault-alert', 'Circuit needs attention', 'Results'],
    ['what-happened', 'What happened?', 'Results'],
    ['faults', 'Fault Lab', 'Learning'],
    ['diagnosis', 'Diagnosis Lab', 'Learning'],
    ['guided', 'Guided circuit', 'Learning'],
    ['practice-result', 'Practice result', 'Learning'],
    ['pause', 'Practice paused', 'Learning'],
    ['account', 'Account & access', 'Access'],
    ['sign-in', 'Sign in', 'Access'],
    ['recovery', 'Membership & recovery', 'Access'],
    ['basic-copy', 'Create a basic copy', 'Access'],
    ['help', 'Documentation', 'Help'],
    ['shortcuts', 'Keyboard shortcuts', 'Help'],
    ['contact', 'Contact & feedback', 'Help'],
    ['welcome', 'Welcome to ElectraSim', 'Help'],
    ['tour', 'Workspace tour', 'Help'],
    ['mobile', 'Working on a phone', 'Help'],
    ['error', 'Recovery from an error', 'States'],
    ['states', 'Interface states', 'States'],
    ['map', 'Simulator design map', 'States'],
  ].map(([id, title, group]) => ({ id, title, group }));
  const escapeHtml = (value) =>
    String(value ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const button = (label, action, extra = '', kind = '') =>
    `<button type="button" class="action ${kind}" data-action="${action}" ${extra}>${escapeHtml(label)}</button>`;
  const open = (label, id, kind = '') => button(label, 'open', `data-view="${id}"`, kind);
  const note = (text) => `<p class="screen-note">${escapeHtml(text)}</p>`;
  const field = (label, id, value = '', type = 'text', extra = '') =>
    `<label class="screen-field">${escapeHtml(label)}<input id="${id}" type="${type}" value="${escapeHtml(value)}" ${extra}></label>`;
  const toggle = (label, key, value = true, description = '') =>
    `<label class="toggle-row"><span><strong>${escapeHtml(label)}</strong>${description ? `<small>${escapeHtml(description)}</small>` : ''}</span><input type="checkbox" data-pref="${key}" ${value ? 'checked' : ''}></label>`;
  const card = (title, text, action) =>
    `<article class="screen-card"><h2>${escapeHtml(title)}</h2>${note(text)}${action || ''}</article>`;
  const tabs = (entries, active) =>
    `<nav class="segments screen-tabs" aria-label="Sections">${entries.map(([id, label]) => `<button type="button" data-action="open" data-view="${id}" aria-pressed="${id === active}">${escapeHtml(label)}</button>`).join('')}</nav>`;
  const settingsTabs = [
    ['settings-editing', 'Editing'],
    ['settings-display', 'Display'],
    ['settings-simulation', 'Simulation'],
    ['settings-backup', 'Backup'],
    ['settings-about', 'About'],
  ];
  function view(id, S, C) {
    const current = C.component(S.types[S.selected]);
    const family = (DesignCatalog.variants[current.type] || [current.type]).map(C.component);
    const reference = C.photo(current.type);
    const supply = S.supplyDraft || S.supply;
    const wire = S.wireDraft || S.wire;
    let body = '';
    switch (id) {
      case 'map':
        body =
          note(
            'Every existing simulator workflow has a redesigned destination. Open a screen, try its controls, and compare desktop and phone layouts.',
          ) +
          screens
            .filter((s) => s.id !== 'map')
            .reduce(
              (out, s, index, all) =>
                out +
                (index === 0 || s.group !== all[index - 1].group
                  ? `<h2 class="group-title">${escapeHtml(s.group)}</h2><div class="map-group">`
                  : '') +
                open(s.title, s.id) +
                (index === all.length - 1 || s.group !== all[index + 1].group ? '</div>' : ''),
              '',
            );
        break;
      case 'files':
        body = `${tabs(
          [
            ['files', 'Saved'],
            ['templates', 'Templates'],
            ['import', 'Import'],
            ['export', 'Export'],
          ],
          'files',
        )}<div class="screen-grid">${S.saved.map((name, i) => card(name, 'Local preview circuit · private', button('Open', 'load-file', `data-file="${i}"`) + button('Rename', 'rename-file', `data-file="${i}"`) + button('Remove', 'remove-file', `data-file="${i}"`))).join('')}</div><div class="screen-actions">${button('Save current preview', 'save-file', '', 'primary')}${open('Import a circuit', 'import')}${button('New circuit', 'new-circuit')}</div>`;
        break;
      case 'import':
        body = `${
          tabs(
            [
              ['files', 'Saved'],
              ['import', 'Import'],
              ['export', 'Export'],
            ],
            'import',
          ) +
          note(
            'Review imported content before replacing your current drawing. The design prototype accepts its own sample document format.',
          )
        }<label class="screen-field">Circuit JSON<textarea id="import-json" rows="6" spellcheck="false" placeholder='{"name":"My circuit","preview":true}'></textarea></label><output id="import-message" class="form-message" aria-live="polite"></output><div class="screen-actions">${button('Review import', 'review-import', '', 'primary')}${button('Use sample', 'sample-import')}</div>`;
        break;
      case 'export':
        body = `${
          tabs(
            [
              ['files', 'Saved'],
              ['import', 'Import'],
              ['export', 'Export'],
            ],
            'export',
          ) +
          note(
            'Choose a format. This prototype exports an explicitly labelled design document, without simulation readings.',
          )
        }<div class="screen-grid">${['JSON', 'SVG', 'PNG', 'PDF / Print', 'Mini EIC', 'Share link'].map((format) => card(format, format === 'Mini EIC' ? 'Readings remain unassessed. A design preview is not an installation certificate.' : 'Review the export layout and filename.', button(`Preview ${format}`, 'export-format', `data-format="${format}"`))).join('')}</div><section id="export-review" hidden class="review-box"></section>`;
        break;
      case 'templates':
        body = `${note(
          'Choose a starting point. Loading a template asks you to review replacing the current drawing.',
        )}<div class="screen-grid">${[
          ['Single-switch lighting', 'A source, switch and lamp.'],
          ['Two-way staircase', 'Two switching locations and travellers.'],
          ['Protected socket circuit', 'A socket and protective device.'],
          ['Three-phase DOL starter', 'Declared three-phase teaching model.'],
        ]
          .map(([title, desc], i) =>
            card(
              title,
              desc,
              button('Preview template', 'template-preview', `data-template="${i}"`) +
                button('Load and learn', 'template-load', `data-template="${i}"`, 'primary'),
            ),
          )
          .join('')}</div>`;
        break;
      case 'commands':
        body = `<input class="command-search" id="command-search" type="search" aria-label="Search commands" placeholder="Search actions, tools and screens…"><div class="screen-list" id="command-list">${screens
          .filter(
            (item) =>
              !['commands', 'map', 'variant-review', 'supply-review', 'confirm-delete'].includes(
                item.id,
              ),
          )
          .map((item) => open(item.title, item.id))
          .join('')}</div>`;
        break;
      case 'placement':
        body = `${note(
          'Placement controls keep the shelf small while preserving supply, regional and membership choices.',
        )}<h2>Placement supply</h2><nav class="segments" aria-label="Placement supply">${['Document supply', 'Independent source', 'All / fault exercise'].map((value) => button(value, 'placement-source', `data-value="${value}" aria-pressed="${S.placementSource === value}"`)).join('')}</nav><h2>Standards profile</h2><nav class="segments" aria-label="Standards profile">${['International', 'UK', 'US', 'EU'].map((value) => button(value, 'standard', `data-value="${value}" aria-pressed="${S.standard === value}"`)).join('')}</nav>${note(
          'Standards and electrical equations stay code-owned. Choosing a profile does not certify the installation.',
        )}<div class="screen-actions">${button('Open catalogue', 'catalog', '', 'primary')}${open('Review supply', 'supply')}${open('Account and capabilities', 'account')}</div>`;
        break;
      case 'settings-editing':
        body = `${
          tabs(settingsTabs, id) +
          note('Keep routine editing predictable; advanced controls stay in this screen.') +
          toggle('Confirm before deletion', 'confirmDelete', S.prefs.confirmDelete) +
          toggle(
            'Custom wiring',
            'customWiring',
            S.prefs.customWiring,
            'Place your own corners between the source and destination ports.',
          ) +
          toggle('Automatic joints', 'joints', S.prefs.joints) +
          toggle('Alignment guides', 'alignment', S.prefs.alignment) +
          toggle('Recent components', 'recent', S.prefs.recent)
        }<h2>Wire routing</h2><nav class="segments" aria-label="Wire routing">${['Orthogonal', 'Curved', 'Direct'].map((x) => button(x, 'routing', `data-value="${x}" aria-pressed="${S.routing === x}"`)).join('')}</nav>`;
        break;
      case 'settings-display':
        body = `${tabs(settingsTabs, id)}<h2>Appearance</h2><nav class="segments" aria-label="Component appearance">${[
          ['devices', 'Device'],
          ['symbols', 'Symbol'],
          ['both', 'Both'],
        ]
          .map(([value, label]) =>
            button(
              label,
              'appearance',
              `data-value="${value}" aria-pressed="${C.preferences.appearance === value}"`,
            ),
          )
          .join(
            '',
          )}</nav><h2>Theme</h2><nav class="segments" aria-label="Theme">${['light', 'dark'].map((value) => button(value, 'theme', `data-value="${value}" aria-pressed="${C.preferences.theme === value}"`)).join('')}</nav>${toggle('Dot grid', 'grid', S.prefs.grid)}${toggle('Mini-map', 'minimap', S.prefs.minimap)}${toggle('Component hover labels', 'tooltips', S.prefs.tooltips)}<h2>Interface motion</h2><nav class="segments" aria-label="Interface motion">${[
          ['subtle', 'Subtle'],
          ['off', 'Off'],
        ]
          .map(([value, label]) =>
            button(
              label,
              'motion',
              `data-value="${value}" aria-pressed="${C.preferences.motion === value}"`,
            ),
          )
          .join('')}</nav>`;
        break;
      case 'settings-simulation':
        body =
          tabs(settingsTabs, id) +
          note(
            'These switches control display effects. Electrical results remain the responsibility of the existing engine.',
          ) +
          toggle('Current-flow animation', 'currentFlow', S.prefs.currentFlow) +
          toggle('Device glow and motion', 'deviceEffects', S.prefs.deviceEffects) +
          toggle('Physics effects', 'physicsEffects', S.prefs.physicsEffects) +
          toggle('Reduced effects', 'reducedEffects', S.prefs.reducedEffects) +
          card(
            'Simulation time',
            'The real workspace shows accepted solver time. Stopping a run and starting a new run preserves the existing time/reset rules.',
            open('Review available readings', 'analytics'),
          );
        break;
      case 'settings-backup':
        body = `${
          tabs(settingsTabs, id) +
          note(
            'A portable backup includes preferences and circuit content. Restore is reviewed before it replaces anything.',
          )
        }<div class="screen-actions">${button('Download preview backup', 'backup-export', '', 'primary')}${button('Review sample restore', 'backup-restore')}</div><h2>Local recovery</h2>${card(
          'Recovery copy',
          'The original drawing stays available when creating a basic copy or restoring a backup.',
          open('Open recovery options', 'recovery'),
        )}`;
        break;
      case 'settings-about':
        body = `${
          tabs(settingsTabs, id) +
          card(
            'ElectraSim',
            'Open Drafting Table · full simulator design prototype. Existing blue/slate identity, centered commands and a full-width component shelf.',
            open('See the complete design map', 'map'),
          ) +
          note(
            'No new deployment, API connection, model change or account operation is performed by this prototype.',
          )
        }<div class="screen-actions">${open('Documentation', 'help')}${open('Contact', 'contact')}${open('Keyboard shortcuts', 'shortcuts')}</div>`;
        break;
      case 'variant':
        body = `${note(
          'Hover or focus a variant to preview it. Select one to review the change before applying it.',
        )}<div class="variant-layout"><div class="variant-choices">${family.map((def) => `<button type="button" class="variant-card" data-action="stage-variant" data-type="${escapeHtml(def.type)}" data-variant-preview="${escapeHtml(def.type)}" aria-pressed="${def.type === current.type}"><strong>${escapeHtml(def.label)}</strong><small>${def.ports.length} terminals${def.tier === 'pro' ? ' · Membership required' : ''}</small></button>`).join('')}</div><aside class="variant-preview-box" aria-live="polite"><img id="variant-photo" src="${reference}" alt="Representative ${escapeHtml(current.label)}"><h2 id="variant-name">${escapeHtml(current.label)}</h2><p id="variant-ports">${current.ports.map((p) => escapeHtml(p.label)).join(' · ')}</p><p class="screen-note">The selected component stays unchanged during preview.</p></aside></div>`;
        break;
      case 'variant-review': {
        const target = C.component(S.pendingVariant);
        const locked = S.access === 'readonly';
        const sourceReview =
          S.pendingBasic && S.pendingSupply
            ? card(
                'Proposed source output',
                `${S.pendingSupply.voltage} V · ${S.pendingSupply.frequency} Hz`,
              )
            : '';
        body = `<div class="review-columns">${card('Current variant', `${current.label}: ${current.ports.map((p) => p.label).join(', ')}`)}${card('Proposed variant', `${target.label}: ${target.ports.map((p) => p.label).join(', ')}`)}</div>${note(
          'The production editor checks terminal mapping, connected wires, ratings and access before applying. This is a representative design review.',
        )}${sourceReview}<div class="review-box"><strong>${locked ? 'Editing is locked' : target.tier === 'pro' && S.access !== 'pro' ? 'Membership required' : 'Review connections and new ratings'}</strong><p>${locked ? 'Export the original or review membership; the drawing stays available.' : current.ports.length === target.ports.length ? 'Terminal count is unchanged. The existing engine must still approve the mapping.' : 'Terminal count changes. New and removed connections must be explicitly reviewed.'}</p></div><div class="screen-actions">${button('Cancel', 'cancel-variant')}${button('Apply preview change', 'apply-variant', locked || (target.tier === 'pro' && S.access !== 'pro') ? 'disabled' : '', 'primary')}</div>`;
        break;
      }
      case 'component-info':
        body = `<div class="reference-layout"><img src="${reference}" alt="Representative ${escapeHtml(current.label)}"><div><h2>${escapeHtml(current.label)}</h2>${note(current.description)}<span class="soft-tag">Representative appearance</span><dl class="detail-list"><div><dt>Category</dt><dd>${escapeHtml(current.category)}</dd></div><div><dt>Terminals</dt><dd>${current.ports.length}</dd></div><div><dt>Nameplate power</dt><dd>${current.powerWatts === undefined ? 'Not declared' : `${escapeHtml(current.powerWatts)} W`}</dd></div></dl></div></div><div class="screen-actions">${open('Change variant', 'variant')}${open('Configuration', 'device-model')}${open('Connections', 'connections')}</div>${card(
          'Readings and safety',
          'Nameplate values are not solved readings. Unsupported or unavailable behavior remains explicit.',
          open('Calculated readings', 'analytics'),
        )}`;
        break;
      case 'device-model': {
        const specialized = {
          relay: ['coil-model', 'Coil settings'],
          contactor: ['coil-model', 'Coil settings'],
          timer: ['timer-model', 'Timer program'],
          motor: ['motor-model', 'Motor teaching model'],
          protection: ['protection-model', 'Protection settings'],
        }[current.category];
        body = `<h2>${escapeHtml(current.label)}</h2>${note(
          'Only controls supported by this device appear. Configuration stays locked when the circuit is read-only.',
        )}<fieldset class="plain-fieldset" ${S.access === 'readonly' ? 'disabled' : ''}><div class="form-grid">${field('Label', 'model-label', S.labels[S.selected] || current.label)}${current.isLoad ? field('Nominal voltage (V)', 'model-voltage', S.model.voltage, 'number', 'min="0.001" step="any"') + field('Nameplate power (W)', 'model-power', S.basics?.[S.selected]?.power ?? current.powerWatts ?? '', 'number', 'min="0.001" step="any"') : ''}</div>${current.isSwitch ? `<h2>Operating state</h2><nav class="segments" aria-label="Operating state">${['Off', 'On'].map((value) => button(value, 'device-state', `data-value="${value}" aria-pressed="${S.deviceState === value}"`)).join('')}</nav>` : ''}<div class="screen-actions">${button('Save preview settings', 'model-save', '', 'primary')}${specialized ? open(specialized[1], specialized[0]) : ''}</div></fieldset><div class="screen-actions">${open('Reference and limitations', 'component-info')}${open('Change variant', 'variant')}</div>`;
        break;
      }
      case 'coil-model':
        body = `${note(
          'Resistive coil teaching settings are independent of switched contacts. Inductance and inrush remain unassessed.',
        )}<fieldset class="plain-fieldset" ${S.access === 'readonly' ? 'disabled' : ''}><div class="form-grid">${['Coil voltage (V)', 'Coil power (W)', 'Pickup ratio', 'Dropout ratio', 'On delay (s)', 'Off delay (s)'].map((label, i) => field(label, `specific-model-${i}`, '', 'number', 'min="0" step="any"')).join('')}</div><div class="screen-actions">${button('Apply coil preview', 'specific-model-save', 'data-model="coil"', 'primary')}${button('Remove declared coil model', 'model-remove', 'data-model="coil"')}</div></fieldset>`;
        break;
      case 'timer-model':
        body = `${note(
          'Timer programs use simulation time. Interval and daily/weekly schedule layouts share a readable form.',
        )}<nav class="segments" aria-label="Timer program kind">${['Interval', 'Daily', 'Weekly'].map((value) => button(value, 'timer-kind', `data-value="${value}" aria-pressed="${S.timerKind === value}"`)).join('')}</nav><fieldset class="plain-fieldset" ${S.access === 'readonly' ? 'disabled' : ''}><div class="form-grid">${field(S.timerKind === 'Interval' ? 'Duration (s)' : 'Start position (s)', 'specific-model-0', 30, 'number', 'min="0" step="any"')}${S.timerKind === 'Interval' ? '' : field('ON window start (s)', 'specific-model-1', 1, 'number') + field('ON window end (s)', 'specific-model-2', 10, 'number')}</div><div class="screen-actions">${button('Apply timer preview', 'specific-model-save', 'data-model="timer"', 'primary')}${button('Remove declared timer model', 'model-remove', 'data-model="timer"')}</div></fieldset>`;
        break;
      case 'motor-model':
        body = `${note(
          'Declared balanced teaching model. Input power stays separate from shaft power; speed, torque and starting behavior remain unassessed.',
        )}<fieldset class="plain-fieldset" ${S.access === 'readonly' ? 'disabled' : ''}><div class="form-grid">${['Nominal line voltage (V)', 'Electrical input power (W)', 'Frequency (Hz)', 'Minimum line voltage (V)', 'Maximum line voltage (V)', 'Maximum unbalance (%)'].map((label, i) => field(label, `specific-model-${i}`, '', 'number', 'min="0" step="any"')).join('')}</div><h2>Required phase sequence</h2><nav class="segments" aria-label="Phase sequence">${['ABC', 'ACB'].map((value) => button(value, 'phase-sequence', `data-value="${value}" aria-pressed="${S.sequence === value}"`)).join('')}</nav><div class="screen-actions">${button('Apply motor preview', 'specific-model-save', 'data-model="motor"', 'primary')}</div></fieldset>`;
        break;
      case 'protection-model':
        body = `${note(
          'Trip, residual and fuse settings are declared models. Reset and replacement remain separate repair actions.',
        )}<fieldset class="plain-fieldset" ${S.access === 'readonly' ? 'disabled' : ''}><div class="form-grid">${field('Rated current (A)', 'specific-model-0', '', 'number', 'min="0.001" step="any"')}${field('Residual sensitivity (mA)', 'specific-model-1', '', 'number', 'min="1" step="any"')}${field('Fuse melting integral (s)', 'specific-model-2', '', 'number', 'min="0.001" step="any"')}</div><h2>Trip curve</h2><nav class="segments" aria-label="Protection trip curve">${['B', 'C', 'D'].map((value) => button(value, 'protection-curve', `data-value="${value}" aria-pressed="${S.curve === value}"`)).join('')}</nav><div class="screen-actions">${button('Apply protection preview', 'specific-model-save', 'data-model="protection"', 'primary')}${button('Remove declared protection model', 'model-remove', 'data-model="protection"')}</div></fieldset>`;
        break;
      case 'supply':
        body = `${note(
          'Stage a supply change, review its effect on connected devices, then apply or cancel.',
        )}<h2>Supply type</h2><nav class="segments" aria-label="Supply kind">${['AC', 'DC', 'Three-phase AC'].map((x) => button(x, 'supply-kind', `data-value="${x}" aria-pressed="${supply.kind === x}"`)).join('')}</nav><div class="form-grid">${field('Voltage (V)', 'supply-voltage', supply.voltage, 'number', 'min="0.001" step="any"')}${supply.kind === 'DC' ? '' : field('Frequency (Hz)', 'supply-frequency', supply.frequency, 'number', 'min="0.001" step="any"')}</div><div class="screen-actions">${button('Review supply change', 'supply-stage', '', 'primary')}${open('Standards and readiness', 'readiness')}</div>`;
        break;
      case 'supply-review':
        body = `<div class="review-box"><h2>${escapeHtml(S.pendingSupply?.kind || S.supply.kind)} · ${escapeHtml(S.pendingSupply?.voltage || S.supply.voltage)} V</h2><p>Device ratings and wire settings are retained. Compatibility must be reassessed and old readings become stale.</p></div>${note(
          'This example review does not calculate new electrical results. Production retains the existing Cancel / Apply / Review / Undo flow.',
        )}<div class="screen-actions">${button('Cancel', 'supply-cancel')}${button('Apply preview supply', 'supply-apply', S.access === 'readonly' ? 'disabled' : '', 'primary')}</div>`;
        break;
      case 'wire':
        body = `${note(
          'Wire properties live in one focused editor. Physical settings remain separate from solved current and capacity assessment.',
        )}<fieldset class="plain-fieldset" ${S.access === 'readonly' ? 'disabled' : ''}><div class="form-grid">${field('Wire label', 'wire-label', wire.label)}${field('Length (m)', 'wire-length', wire.length, 'number', 'min="0.001" step="any"')}${field('Cross-section (mm²)', 'wire-area', wire.area, 'number', 'min="0.001" step="any"')}</div><h2>Conductor material</h2><nav class="segments" aria-label="Conductor material">${['Copper', 'Aluminium'].map((value) => `<button type="button" class="action material-choice" data-action="wire-material" data-value="${value}" aria-pressed="${wire.material === value}"><span class="material-icon ${value === 'Copper' ? 'copper' : 'aluminium'}" aria-hidden="true">${value === 'Copper' ? 'Cu' : 'Al'}</span><span>${value}</span></button>`).join('')}</nav><h2>Installation method</h2><nav class="segments" aria-label="Installation method">${['Clipped direct', 'Conduit', 'Insulation'].map((value) => button(value, 'wire-method', `data-value="${value}" aria-pressed="${wire.method === value}"`)).join('')}</nav><div class="screen-actions">${button('Save preview wire', 'wire-save', '', 'primary')}</div></fieldset><div class="screen-actions">${open('Cable and safety assessment', 'validation')}${open('Earth-fault loop', 'zs')}</div>`;
        break;
      case 'netlist':
        body = `${note('Keyboard-accessible component and terminal lists complement the drawing.')}<div class="screen-grid choice-grid">${[
          'supply',
          'switch',
          'lamp',
        ]
          .map((part) => {
            const def = C.component(S.types[part]);
            return card(
              S.labels[part] || def.label,
              def.ports.map((port) => `${port.label} (${port.type})`).join(' · '),
              button('Select in Inspector', 'inspect-part', `data-part="${part}"`) +
                open('Inspect connections', 'connections'),
            );
          })
          .join('')}</div>`;
        break;
      case 'connections':
        body = `<h2>${escapeHtml(current.label)}</h2><div class="connection-list">${current.ports.map((port, i) => `<div><span class="port-badge">${escapeHtml(port.label)}</span><span>${escapeHtml(port.type)}</span><span class="screen-note">Terminal ${i + 1}</span>${open('Inspect wire', 'wire')}</div>`).join('')}</div>${note(
          'The production netlist and wire inspector use actual connection IDs; reference photos do not define the circuit topology.',
        )}`;
        break;
      case 'selection-tools':
        body = `${note('Selection actions appear together, rather than as permanent canvas chrome.')}<div class="screen-actions">${button('Duplicate selected', 'duplicate')}${button('Rotate 90°', 'rotate')}${button('Align left', 'align', 'data-value="left"')}${button('Distribute horizontally', 'align', 'data-value="distribute"')}${open('Connections', 'connections')}${open('Wire properties', 'wire')}${button('Remove selected', 'delete-review', '', 'danger')}</div>`;
        break;
      case 'confirm-delete':
        body = `${note(
          S.confirmText ||
            'Review removing the selected preview content. In production, connected wires and affected items are listed before confirmation.',
        )}<div class="review-box"><strong>Review affected items</strong><p>${escapeHtml(S.confirmText || 'Selected item and connected wires')}</p></div><div class="screen-actions">${button('Keep it', 'confirm-cancel')}${button('Confirm preview removal', 'confirm-remove', '', 'danger')}</div>`;
        break;
      case 'readiness':
        body = `<div class="readiness-banner ${S.readiness === 'ready' ? '' : 'attention'}"><strong>${S.readiness === 'ready' ? 'Ready state example' : S.readiness === 'blocked' ? 'Run is blocked' : 'Review required'}</strong><p>${S.readiness === 'ready' ? 'The production engine must confirm the current circuit is ready.' : S.readiness === 'blocked' ? 'A blocking configuration needs attention before Run.' : 'Missing ratings or model coverage need review; no false pass is shown.'}</p></div><div class="screen-grid">${card('Supply', 'Review the current source and compatible device variants.', open('Edit supply', 'supply'))}${card('Coverage', 'Unsupported models and unassessed values stay visible.', open('Calculated readings', 'analytics'))}${card('Connections', 'Review terminals, open paths and selected wire properties.', open('Connections', 'connections'))}${card('Safety checks', 'Warnings remain available for guests and members alike.', open('Open diagnostics', 'validation'))}</div>`;
        break;
      case 'validation':
        body = `${note(
          'Example diagnostics demonstrate the presentation of supported, unassessed and blocked checks. They are not an assessment of this sample drawing.',
        )}<nav class="segments" aria-label="Diagnostic filters">${['All', 'Needs review', 'Unassessed'].map((value) => button(value, 'diagnostic-filter', `data-value="${value}" aria-pressed="${S.diagnosticFilter === value}"`)).join('')}</nav><div class="screen-list">${card('Source configuration', 'Needs review · choose the intended supply and compatible device ratings.', open('Review source', 'supply'))}${card('Cable assessment', 'Unassessed · actual installation details are required.', open('Inspect cable', 'wire'))}${card('Protection and model scope', 'Unassessed · no blanket compliance or coordination pass.', open('Device configuration', 'device-model'))}</div><div class="screen-actions">${button('Refresh example report', 'validate-refresh', '', 'primary')}${open('Event history', 'history')}</div>`;
        break;
      case 'analytics':
        body = `${note(
          'No electrical solver runs in this prototype. The production design uses current terminal pairs, branch currents and explicit unavailable states.',
        )}<div class="reading-cards">${['Voltage · V', 'Current · A', 'Power · W'].map((label) => `<article><span>${label}</span><strong>—</strong><small>Not calculated</small></article>`).join('')}</div><details class="advanced"><summary>Unavailable measurements</summary>${note('Waveform, power factor, temperature and accumulated energy remain unavailable unless an implemented model supplies them.')}</details><div class="screen-actions">${open('Model scope', 'component-info')}${open('Circuit readiness', 'readiness')}</div>`;
        break;
      case 'zs':
        body = `${note(
          'Earth-fault loop assessment needs an explicit source, protective device and installation context. The preview shows the unassessed state.',
        )}<div class="readiness-banner attention"><strong>Unassessed</strong><p>No calculated loop impedance or disconnection pass is available in the design prototype.</p></div><div class="screen-actions">${open('Supply details', 'supply')}${open('Wire properties', 'wire')}${open('Protection settings', 'device-model')}</div>`;
        break;
      case 'history':
        body = `${note(
          'Event history is distinct from Console messages. Existing timestamps, event types and replay context remain available.',
        )}<ol class="timeline">${S.events.map((event) => `<li><span class="timeline-dot"></span><strong>${escapeHtml(event.title)}</strong><small>${escapeHtml(event.detail)}</small></li>`).join('')}</ol><div class="screen-actions">${button('Open Console', 'console')}${button('Clear preview event history', 'history-clear')}</div>`;
        break;
      case 'fault-alert':
        body = `${card(
          'A device needs attention',
          'This example alert separates a protection trip from irreversible damage.',
          open('What happened?', 'what-happened'),
        )}<div class="screen-actions">${open('Inspect affected component', 'device-model')}${button('Open Fault Lab', 'task', 'data-task="faults"', 'primary')}${button('Open Console', 'console')}</div>`;
        break;
      case 'what-happened':
        body = `<div class="screen-grid choice-grid">${card('Clear fault', 'Remove an injected fault condition. This does not reset a protection latch.', button('Preview clear fault', 'repair', 'data-kind="clear"'))}${card('Reset protection', 'Reset a tripped device after checking the cause. A normal trip is not destruction.', button('Preview reset protection', 'repair', 'data-kind="reset"'))}${card('Replace damaged item', 'Replace a failed component or wire. This is separate from fault clearing.', button('Preview replacement', 'repair', 'data-kind="replace"'))}</div>`;
        break;
      case 'faults':
        body = `${note(
          'Select a component, choose an applicable fault and use the existing repair lifecycle. Advanced exercises remain membership-controlled.',
        )}<h2>Fault choice</h2><nav class="segments" aria-label="Fault choice">${['Open path', 'Short circuit', 'Leakage'].map((value) => button(value, 'fault-choice', `data-value="${value}" aria-pressed="${S.faultChoice === value}"`)).join('')}</nav><div class="screen-actions">${button('Start Fault Lab preview', 'task', 'data-task="faults"', 'primary')}${open('Repair actions', 'what-happened')}</div>`;
        break;
      case 'diagnosis':
        body = `${note(
          'The symptom is visible; the answer stays hidden. Identification and physical repair remain distinct steps.',
        )}<h2>Difficulty</h2><nav class="segments" aria-label="Diagnosis difficulty">${['Beginner', 'Intermediate', 'Advanced'].map((value) => button(value, 'difficulty', `data-value="${value}" aria-pressed="${S.difficulty === value}"`)).join('')}</nav>${field('Replay seed', 'diagnosis-seed', S.seed)}<div class="screen-actions">${button('Start Diagnosis preview', 'task', 'data-task="diagnosis"', 'primary')}${open('Read Diagnosis guide', 'help')}</div>`;
        break;
      case 'guided':
        body = `${note('A guided circuit pairs an authored starting point with steps and a checklist.')}<ol class="step-list"><li>Place the intended supply and compatible devices.</li><li>Connect the named terminals.</li><li>Run and compare the available readings.</li></ol><div class="screen-actions">${button('Open guided preview', 'task', 'data-task="guided"', 'primary')}${open('Choose another template', 'templates')}</div>`;
        break;
      case 'practice-result':
        body = `<div class="result-summary"><span class="soft-tag">Example completion state</span><h2>Review your attempt</h2><p>No grade or competency claim is calculated in this prototype.</p></div><div class="screen-grid">${card('Identification', 'Submitted response is shown with its recorded exercise/model scope.')}${card('Repair', 'Actual repair, deletion, replacement and authored edits remain server/domain-validated.')}</div><div class="screen-actions">${button('Return to the task', 'resume-task', '', 'primary')}${open('Choose another exercise', 'templates')}${button('Exit to canvas', 'exit-task')}</div>`;
        break;
      case 'pause':
        body = `${note('Your task and drawing remain available while paused.')}<div class="screen-actions">${button('Resume task', 'resume-task', '', 'primary')}${button('Exit and restore workspace', 'exit-task')}${open('Keyboard shortcuts', 'shortcuts')}</div>`;
        break;
      case 'account':
        body = `<div class="account-summary"><span class="avatar">ES</span><div><h2>${S.access === 'guest' ? 'Guest workspace' : 'Example account'}</h2><p>${escapeHtml(S.access)} · local design state</p></div></div><div class="screen-grid">${card('Private saved circuits', 'Save and reopen your drawings with the existing owner and access rules.', open('Saved circuits', 'files'))}${card('Membership', 'Basic/Pro interface mode does not grant paid capabilities.', open('Review access and recovery', 'recovery'))}</div><div class="screen-actions">${open(S.access === 'guest' ? 'Sign in' : 'Account details', 'sign-in')}${open('Choose preview access state', 'states')}</div>`;
        break;
      case 'sign-in':
        body = `${note(
          'Form and provider states are previewed locally. No identity provider is contacted.',
        )}<form id="sign-in-form">${field('Email', 'sign-in-email', '', 'email', 'required autocomplete="email"')}${field('Password', 'sign-in-password', '', 'password', 'required autocomplete="current-password"')}<button class="action primary" type="submit">Preview sign in</button></form><h2>Continue with a provider</h2><div class="screen-actions">${['Google', 'GitHub', 'Microsoft'].map((label) => button(label, 'provider', `data-provider="${label}"`)).join('')}</div><output id="sign-in-result" class="form-message" aria-live="polite"></output>`;
        break;
      case 'recovery':
        body = `<div class="readiness-banner attention"><strong>${S.access === 'readonly' ? 'Read-only circuit' : 'Membership and recovery'}</strong><p>Keep your original drawing available even if premium access expires or changes.</p></div><div class="screen-actions">${open('Export original', 'export')}${open('Create a basic copy', 'basic-copy')}${button('Refresh preview access', 'access-refresh')}${open('Account', 'account')}</div>`;
        break;
      case 'basic-copy':
        body = `${note(
          'Choose what to remove from the copy. The original is backed up before opening it; connected wires are listed with affected components.',
        )}<label class="check-row"><input type="checkbox" id="copy-component"> Remove a sample premium component and its connected wires</label><label class="check-row"><input type="checkbox" id="copy-fault"> Remove a sample advanced injected fault</label><div class="screen-actions">${button('Review basic copy', 'copy-review', '', 'primary')}${open('Keep original', 'recovery')}</div>`;
        break;
      case 'help':
        body = `<div class="help-layout"><nav aria-label="Documentation topics">${['Getting started', 'Components & variants', 'Wiring', 'Simulation & readings', 'Faults & repair', 'Access & files'].map((topic) => button(topic, 'help-topic', `data-topic="${topic}" aria-pressed="${S.helpTopic === topic}"`)).join('')}</nav><article><h2>${escapeHtml(S.helpTopic)}</h2><p>${escapeHtml({ 'Getting started': 'Choose components from the shelf, connect their terminals and review readiness before Run.', 'Components & variants': 'Inspect a component to view its reference image, family variants, terminals and configuration. Preview changes before applying them.', Wiring: 'Use the Wire tool or inspect a wire to edit its length, material, cross-section and installation context.', 'Simulation & readings': 'Current engine evidence supplies readings. Stale, missing and unsupported values stay unavailable.', 'Faults & repair': 'Clear fault, reset protection and replace damaged items are separate actions.', 'Access & files': 'Private documents, original export and recovery copies remain available under the existing access rules.' }[S.helpTopic])}</p><div class="screen-actions">${open('Keyboard shortcuts', 'shortcuts')}${open('Workspace tour', 'tour')}</div></article></div>`;
        break;
      case 'shortcuts':
        body = `<div class="shortcut-list">${[
          ['Select', 'V'],
          ['Wire', 'W'],
          ['Undo', 'Ctrl / ⌘ Z'],
          ['Redo', 'Ctrl / ⌘ Shift Z'],
          ['Command palette', 'Ctrl / ⌘ K'],
          ['Close / cancel', 'Esc'],
          ['Remove selection', 'Delete'],
        ]
          .map(([name, key]) => `<div><span>${name}</span><kbd>${key}</kbd></div>`)
          .join('')}</div>${note(
          'The production implementation keeps the existing platform-aware shortcuts and confirms destructive actions.',
        )}`;
        break;
      case 'contact':
        body = `${note(
          'Describe an issue or suggestion. This form demonstrates validation and confirmation without sending a message.',
        )}<form id="contact-form">${field('Your email', 'contact-email', '', 'email', 'required')}<label class="screen-field">Message<textarea id="contact-message" rows="5" required></textarea></label><button class="action primary" type="submit">Preview submission</button><output id="contact-result" class="form-message" aria-live="polite"></output></form>`;
        break;
      case 'welcome':
        body = `<div class="welcome-heading"><span class="soft-tag">Your electrical workspace</span><h2>Start with room to explore</h2><p>Build freely, follow a guided circuit or practice finding faults.</p></div><div class="screen-grid choice-grid">${card('Build a circuit', 'Use the component shelf and contextual Inspector.', button('Open component catalogue', 'catalog'))}${card('Learn step by step', 'Choose a template with a guided checklist.', open('Guided circuits', 'templates'))}${card('Practice diagnosis', 'Find a fault without seeing the answer.', open('Diagnosis Lab', 'diagnosis'))}</div><div class="screen-actions">${open('Take the workspace tour', 'tour', '', 'primary')}${open('Phone workspace tips', 'mobile')}</div>`;
        break;
      case 'tour': {
        const steps = [
          ['Centered commands', 'Select, Wire, Undo and Run stay within easy reach.'],
          ['Component shelf', 'Choose a category or search the complete catalogue.'],
          [
            'Contextual Inspector',
            'Inspect properties, photos, variants and readings when needed.',
          ],
          ['Console and diagnostics', 'Errors stay visible; open the Console for details.'],
          ['Focused learning', 'A single task sheet keeps practice organised.'],
        ];
        const [title, description] = steps[S.tourStep];
        body = `<div class="tour-progress" aria-label="Step ${S.tourStep + 1} of ${steps.length}">${steps.map((_, i) => `<span class="${i <= S.tourStep ? 'active' : ''}"></span>`).join('')}</div><h2>${title}</h2>${note(description)}<div class="screen-actions">${button('Previous', 'tour-previous', S.tourStep === 0 ? 'disabled' : '')}${button(S.tourStep === steps.length - 1 ? 'Finish tour' : 'Next', 'tour-next', '', 'primary')}</div>`;
        break;
      }
      case 'mobile':
        body = `${
          card(
            'A usable phone workspace',
            'The component shelf scrolls horizontally. Inspector, Console and learning tasks open in one sheet above it.',
          ) +
          card(
            'Keep controls reachable',
            'Zoom, Console and component choices stay available below the sheet. Large controls support touch and keyboard navigation.',
          )
        }<div class="screen-actions">${button('Return to canvas', 'close', '', 'primary')}${open('Keyboard shortcuts', 'shortcuts')}</div>`;
        break;
      case 'error':
        body = `<div class="readiness-banner attention"><strong>Something could not be loaded</strong><p>Your saved drawing is retained. Retry before choosing a recovery action.</p></div><div class="screen-actions">${button('Retry preview', 'error-retry', '', 'primary')}${open('Export retained drawing', 'export')}${open('Recovery options', 'recovery')}${button('Open Console', 'console')}</div>`;
        break;
      case 'states':
        body = `${note(
          'Choose a sample UI state to review its layout. These states do not change real membership or simulation results.',
        )}<div class="screen-grid">${[
          ['guest', 'Guest'],
          ['free', 'Signed-in free'],
          ['pro', 'Active membership'],
          ['readonly', 'Expired / read-only'],
          ['offline', 'Offline'],
          ['loading', 'Loading'],
          ['blocked', 'Run blocked'],
          ['unassessed', 'Unassessed'],
          ['error', 'Runtime error'],
        ]
          .map(([value, label]) =>
            card(
              label,
              'Preview this state and its recovery actions.',
              button(`Show ${label}`, 'state', `data-state="${value}"`, 'primary'),
            ),
          )
          .join('')}</div>`;
        break;
      default:
        throw new Error(`Unmapped design screen: ${id}`);
    }
    return body;
  }
  window.PrototypeViews = { screens, view, escape: escapeHtml, button, open, field, note, card };
})();
