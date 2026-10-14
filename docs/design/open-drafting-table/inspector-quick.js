/* Compact editing layouts. Values are drafts; flows.js owns review and commit. */
(() => {
  const V = PrototypeViews;
  const field = (label, key, value, type = 'text', extra = '') =>
    V.field(label, `config-${key}`, value, type, extra);
  const number = (label, key, value) =>
    field(label, key, value, 'number', 'min="0.001" step="any" required');
  const help = (text) => `<p class="config-note">${V.escape(text)}</p>`;
  const summary = (rows) =>
    `<dl class="property-summary">${rows
      .map(([name, value]) => `<div><dt>${V.escape(name)}</dt><dd>${V.escape(value)}</dd></div>`)
      .join('')}</dl>`;
  function view(S, C, draft) {
    const wire = S.inspectorTarget === 'wire';
    const def = C.component(S.types[S.selected]);
    const family = DeviceArtwork.mapping[def.type].family;
    const locked =
      S.access === 'readonly' || document.querySelector('.workspace').classList.contains('running');
    const header = help(
      locked
        ? 'Editing is locked. Stop the preview run or review access to edit.'
        : 'Edit the essentials here. Apply keeps the change together; Undo restores it.',
    );
    let fields = field(
      wire ? 'Wire label' : 'Component label',
      'label',
      draft.label,
      'text',
      'maxlength="60" required',
    );
    if (wire) {
      fields += `<div class="config-pair">${number('Length · m', 'length', draft.length)}${number('Cross-section · mm²', 'area', draft.area)}</div><h3>Conductor</h3><nav class="segments" aria-label="Conductor material">${[
        'Copper',
        'Aluminium',
      ]
        .map(
          (value) =>
            `<button type="button" class="action material-choice" data-action="quick-material" data-value="${value}" aria-pressed="${draft.material === value}"><span class="material-icon ${value === 'Copper' ? 'copper' : 'aluminium'}" aria-hidden="true">${value === 'Copper' ? 'Cu' : 'Al'}</span><span>${value}</span></button>`,
        )
        .join('')}</nav>`;
    } else {
      const variants = DesignCatalog.variants[def.type] || [def.type];
      if (variants.length > 1)
        fields += `<label class="screen-field">Variant<select id="config-variant">${variants
          .map((type) => {
            const item = C.component(type);
            return `<option value="${type}" ${type === draft.variant ? 'selected' : ''}>${V.escape(item.label)}${item.tier === 'pro' ? ' · Membership' : ''}</option>`;
          })
          .join(
            '',
          )}</select></label><p class="config-note" id="config-variant-note">Changes are reviewed before connections or ratings are replaced.</p>`;
      if (def.isLoad)
        fields += `<h3>Nameplate</h3><div class="config-pair">${number('Nominal voltage · V', 'voltage', draft.voltage)}${number('Input power · W', 'power', draft.power)}</div>${help('Declared ratings, separate from calculated readings.')}`;
      if (def.isSwitch && !['relay', 'contactor', 'timer', 'smartrelay'].includes(family))
        fields += `<label class="screen-field">Operating state<select id="config-on"><option value="Off" ${draft.on === 'Off' ? 'selected' : ''}>Off</option><option value="On" ${draft.on === 'On' ? 'selected' : ''}>On</option></select></label>`;
      if (['mains', 'battery', 'solar', 'generator'].includes(family))
        fields += `<h3>Source output</h3><div class="config-pair">${number('Voltage · V', 'source-voltage', draft.sourceVoltage)}${
          S.supply.kind === 'AC'
            ? number('Frequency · Hz', 'source-frequency', draft.sourceFrequency)
            : ''
        }</div>${help('Source changes keep their review step.')}`;
    }
    let advanced = wire
      ? V.open('Detailed cable settings', 'wire')
      : V.open('Detailed device settings', 'device-model');
    if (!wire) {
      const models = {
        relay: ['coil-model', 'Coil model'],
        contactor: ['coil-model', 'Coil model'],
        timer: ['timer-model', 'Timer program'],
        motor: ['motor-model', 'Motor model'],
      };
      const match =
        models[family] ||
        (def.category === 'protection' ? ['protection-model', 'Protection model'] : null);
      if (match) advanced += V.open(match[1], match[0]);
      if (family === 'transformer') advanced += V.open('Winding model & scope', 'component-info');
    }
    return `${header}<form id="quick-config-form"><fieldset class="plain-fieldset" ${locked ? 'disabled' : ''}>${fields}</fieldset></form><section class="config-advanced"><h3>Advanced settings</h3>${help(
      wire
        ? 'Installation method, derating and assessment context.'
        : 'Timing, coil behaviour, trip models and detailed electrical configuration.',
    )}<div class="inspector-tools">${advanced}</div></section>`;
  }
  window.QuickInspector = { view, summary };
})();
