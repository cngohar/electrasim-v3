window.ElectraSim.onReady(({ onCleanup }) => {
  /* ── Anatomy cards ──────────────────────────────────────────────────
     Hotspots carry viewBox coords (`data-point-v{x,y}`, `data-point-vy`).
     The CSP (`style-src 'self'`) blocks inline style attributes, so guide-lab
     maps those coords to the rendered SVG's pixel box at runtime via CSSOM
     and positions each button. Until then the overlay is hidden and the card
     is a reading layout (SVG + parts list) — full content, no JS needed.
     Selection shows the labeled detail panel and twin-highlights the
     `data-part=<point id>` group in the drawing.                         */
  for (const card of document.querySelectorAll('[data-anatomy]')) {
    if (!(card instanceof HTMLElement)) continue;
    const stage = card.querySelector('.anatomy-stage');
    const svg = stage ? stage.querySelector('svg') : null;
    const hotspots = Array.from(card.querySelectorAll('[data-point]'));
    const hotspotsHost = card.querySelector('.anatomy-hotspots');
    const detail = card.querySelector('[data-anatomy-detail]');
    const detailTitle = card.querySelector('[data-anatomy-title]');
    const detailText = card.querySelector('[data-anatomy-text]');
    if (
      !stage ||
      !svg ||
      hotspots.length === 0 ||
      !hotspotsHost ||
      !detail ||
      !detailTitle ||
      !detailText
    )
      continue;

    const viewW = svg.viewBox.baseVal.width || 1;
    const viewH = svg.viewBox.baseVal.height || 1;

    const positionAll = () => {
      const svgRect = svg.getBoundingClientRect();
      for (const btn of hotspots) {
        const vx = Number(btn.dataset.pointVx) || 0;
        const vy = Number(btn.dataset.pointVy) || 0;
        btn.style.left = `${(vx / viewW) * svgRect.width}px`;
        btn.style.top = `${(vy / viewH) * svgRect.height}px`;
      }
      const stageRect = stage.getBoundingClientRect();
      hotspotsHost.style.left = `${svgRect.left - stageRect.left}px`;
      hotspotsHost.style.top = `${svgRect.top - stageRect.top}px`;
      hotspotsHost.style.width = `${svgRect.width}px`;
      hotspotsHost.style.height = `${svgRect.height}px`;
      hotspotsHost.style.display = 'block';
    };

    positionAll();
    if (typeof ResizeObserver === 'function') {
      const ro = new ResizeObserver(positionAll);
      ro.observe(svg);
      ro.observe(stage);
      onCleanup(() => {
        ro.disconnect();
        hotspotsHost.style.display = 'none';
        for (const btn of hotspots) {
          btn.style.removeProperty('left');
          btn.style.removeProperty('top');
        }
      });
    }

    const highlight = (id) => {
      for (const node of card.querySelectorAll('[data-part]')) {
        node.classList.toggle('is-active', node.getAttribute('data-part') === id);
      }
    };

    const introLabel = card.dataset.anatomyLabel || 'Anatomy';
    const introText = 'Select a marked part to read about it.';
    const deselect = (btn) => {
      btn.classList.remove('is-active');
      btn.setAttribute('aria-pressed', 'false');
      highlight(null);
      detail.classList.remove('is-active');
      detailTitle.textContent = introLabel;
      detailText.textContent = introText;
    };

    for (const btn of hotspots) {
      btn.setAttribute('aria-pressed', 'false');
      const select = () => {
        for (const other of hotspots) {
          if (other !== btn) deselect(other);
        }
        btn.classList.add('is-active');
        btn.setAttribute('aria-pressed', 'true');
        detailTitle.textContent = btn.dataset.pointLabel || introLabel;
        detailText.textContent = btn.dataset.pointDesc || '';
        detail.classList.add('is-active');
        highlight(btn.dataset.pointId || null);
      };
      btn.addEventListener('click', () => {
        if (btn.getAttribute('aria-pressed') === 'true') deselect(btn);
        else select();
      });
      /* Keep the panel synced when keyboard users Tab through the buttons. */
      btn.addEventListener('focus', select);
    }
  }
});
