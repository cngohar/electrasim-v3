(() => {
  const $ = (selector) => document.querySelector(selector);
  let target = 'component';
  let applied = true;
  const descriptions = {
    component: [
      'Internal component path',
      'The fault belongs inside the component.',
      'Keep the external cables intact. Mark the modeled internal path as open, without inventing a particular failed physical part.',
    ],
    wire: [
      'Break on the actual conductor route',
      'The cut follows the wire, including bends.',
      'Sample the rendered route for the gap position and tangent. Keep the rest of the conductor intact and use its existing role colour.',
    ],
    terminal: [
      'Disconnection at the named terminal',
      'Withdraw only the chosen connection.',
      'Anchor the marker at the actual terminal and the direction of its rendered conductor. Other terminals and internal paths stay intact.',
    ],
  };
  const animate = () => {
    for (const node of document.querySelectorAll('.end-left,.end-right')) {
      node.style.animation = 'none';
      node.getBoundingClientRect();
      node.style.animation = '';
    }
  };
  const render = () => {
    const description = descriptions[target];
    $('#scene-title').textContent = description[0];
    $('#meaning-title').textContent = description[1];
    $('#meaning').textContent = description[2];
    $('#scene-label').textContent = description[1];
    const gap = $('#gap');
    let x = 508;
    let y = 170;
    let angle = 0;
    if (target === 'wire') {
      const path = $('#line-route');
      const length = path.getTotalLength();
      const distance = length * 0.52;
      const point = path.getPointAtLength(distance);
      const previous = path.getPointAtLength(Math.max(0, distance - 1));
      const next = path.getPointAtLength(Math.min(length, distance + 1));
      x = point.x;
      y = point.y;
      angle = (Math.atan2(next.y - previous.y, next.x - previous.x) * 180) / Math.PI;
    } else if (target === 'terminal') x = 450;
    gap.classList.toggle('on-wire', target !== 'component');
    gap.setAttribute('transform', `translate(${x} ${y}) rotate(${angle})`);
    $('#callout').setAttribute(
      'transform',
      `translate(${Math.min(432, Math.max(40, x - 95))} ${y + 42})`,
    );
    $('#callout-label').textContent =
      target === 'component'
        ? 'Internal path open'
        : target === 'wire'
          ? 'Conductor open here'
          : 'L terminal disconnected';
    gap.hidden = !applied;
    gap.style.display = applied ? '' : 'none';
    $('#callout').style.display = applied ? '' : 'none';
    $('#target-name').textContent =
      target === 'wire' ? 'Conductor' : target === 'terminal' ? 'L terminal' : 'Component';
    $('#applied-state').textContent = applied
      ? `Open circuit · applied to ${target}`
      : 'No injected cause on this target';
    $('#card-subtitle').textContent = applied
      ? `Applied to this ${target}`
      : 'Available for this target';
    $('#active-card').setAttribute('aria-pressed', String(applied));
    $('#active-card').classList.toggle('active', applied);
    $('#active-card b').textContent = applied ? 'Applied' : 'Available';
    $('#apply').disabled = applied;
    $('#apply').textContent = applied ? 'Already applied' : 'Apply preview fault';
    $('#clear').disabled = !applied;
    $('#run').disabled = !applied;
    $('.badge').textContent = applied ? '1 active' : '0 active';
    $('#result-state').textContent = 'Result not captured · illustrative preview';
    animate();
  };
  document.querySelectorAll('[data-target]').forEach((button) =>
    button.addEventListener('click', () => {
      target = button.dataset.target;
      document
        .querySelectorAll('[data-target]')
        .forEach((node) => node.setAttribute('aria-pressed', String(node === button)));
      render();
    }),
  );
  $('#replay').onclick = animate;
  $('#active-card').onclick = () => {
    $('#notice').textContent = applied
      ? 'This fault is already applied. Inspect it or use Clear fault.'
      : 'Review this target before applying.';
  };
  $('#clear').onclick = () => {
    applied = false;
    render();
    $('#notice').textContent =
      'Preview cause cleared. A real circuit still requires a fresh verification run.';
  };
  $('#apply').onclick = () => {
    applied = true;
    render();
    $('#notice').textContent = 'Preview cause applied once to the selected target.';
  };
  $('#run').onclick = () => {
    $('#result-state').textContent = 'Preview outcome: open path · accepted readings belong here';
    $('#notice').textContent = 'Design demonstration only. No electrical calculation ran.';
  };
  $('#help').onclick = () => $('#help-dialog').showModal();
  $('#close-help').onclick = () => $('#help-dialog').close();
  $('#theme').onclick = () => {
    const light = document.body.classList.toggle('light');
    $('#theme').textContent = light ? 'Dark theme' : 'Light theme';
  };
  render();
})();
