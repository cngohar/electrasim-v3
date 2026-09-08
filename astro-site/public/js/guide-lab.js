window.ElectraSim.onReady(({ onCleanup }) => {
  /* ── Anatomy cards ──────────────────────────────────────────────────
     Two figure modes, both positioned here rather than in markup:
       • drawing — hotspots carry viewBox coords (`data-point-v{x,y}`), mapped
         onto the rendered SVG's pixel box.
       • photo   — hotspots carry PERCENT coords (`data-point-p{x,y}`) of the
         image box, so the markers stay put at any render size.
     The CSP (`style-src 'self'`) blocks inline style attributes, so guide-lab
     maps those coords to pixels at runtime via CSSOM. Until then the overlay
     is hidden and the card is a reading layout (figure + parts list) — full
     content, no JS needed. Selection shows the labeled detail panel and twin-
     highlights the `data-part=<point id>` group in the drawing.           */
  for (const card of document.querySelectorAll('[data-anatomy]')) {
    if (!(card instanceof HTMLElement)) continue;
    const stage = card.querySelector('.anatomy-stage');
    const svg = stage ? stage.querySelector('svg') : null;
    const photo = stage ? stage.querySelector('.anatomy-photo') : null;
    /* The figure the hotspots are pinned to: photo wins when both exist. */
    const figure = photo || svg;
    const hotspots = Array.from(card.querySelectorAll('[data-point]'));
    const hotspotsHost = card.querySelector('.anatomy-hotspots');
    /* Detail pages put the panel in the side rail (beside the figure) and point
       the card at it with `data-anatomy-detail-target`; cards on index pages
       keep the panel inside themselves. */
    const detailHost = card.dataset.anatomyDetailTarget
      ? document.getElementById(card.dataset.anatomyDetailTarget)
      : card;
    const scope = detailHost || card;
    /* The target element is usually the panel itself, and querySelector only
       walks descendants — so match the scope before searching inside it. */
    const findIn = (selector) =>
      scope.matches?.(selector) ? scope : scope.querySelector(selector);
    const detail = findIn('[data-anatomy-detail]');
    const detailTitle = findIn('[data-anatomy-title]');
    const detailText = findIn('[data-anatomy-text]');
    if (
      !stage ||
      !figure ||
      hotspots.length === 0 ||
      !hotspotsHost ||
      !detail ||
      !detailTitle ||
      !detailText
    )
      continue;

    const viewBox = svg?.viewBox ? svg.viewBox.baseVal : null;
    const viewW = viewBox?.width || 1;
    const viewH = viewBox?.height || 1;

    const positionAll = () => {
      const rect = figure.getBoundingClientRect();
      for (const btn of hotspots) {
        if (photo) {
          const px = Number(btn.dataset.pointPx);
          const py = Number(btn.dataset.pointPy);
          btn.style.left = `${(px / 100) * rect.width}px`;
          btn.style.top = `${(py / 100) * rect.height}px`;
        } else {
          const vx = Number(btn.dataset.pointVx) || 0;
          const vy = Number(btn.dataset.pointVy) || 0;
          btn.style.left = `${(vx / viewW) * rect.width}px`;
          btn.style.top = `${(vy / viewH) * rect.height}px`;
        }
      }
      const stageRect = stage.getBoundingClientRect();
      hotspotsHost.style.left = `${rect.left - stageRect.left}px`;
      hotspotsHost.style.top = `${rect.top - stageRect.top}px`;
      hotspotsHost.style.width = `${rect.width}px`;
      hotspotsHost.style.height = `${rect.height}px`;
      hotspotsHost.style.display = 'block';
    };

    positionAll();
    /* The render's box can change as it decodes (and on slow connections the
       first measurement happens before the bytes land), so place again. */
    if (photo && !photo.complete) {
      photo.addEventListener('load', positionAll, { once: true });
    }
    if (typeof ResizeObserver === 'function') {
      const ro = new ResizeObserver(positionAll);
      ro.observe(figure);
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
