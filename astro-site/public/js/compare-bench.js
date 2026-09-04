/* Comparison bench enhancement. The static matrix remains fully readable
 * without JavaScript; this layer adds filtering, sorting, pinning and the
 * selected-tool instrument view. It follows the site's boot.js lifecycle. */
(() => {
  const setup = ({ signal }) => {
    const root = document.querySelector('[data-compare-bench]');
    if (!root) return;

    const rowsHost = root.querySelector('#cb-tool-rows');
    const matrixStatus = root.querySelector('#cb-matrix-status');
    const sortSelect = root.querySelector('[data-compare-sort]');
    const radarArea = root.querySelector('#cb-radar-area');
    const radarName = root.querySelector('#cb-radar-name');
    const radarSub = root.querySelector('#cb-radar-sub');
    const sourceSection = root.querySelector('#cb-sources');
    if (!rowsHost || !matrixStatus || !sortSelect || !radarArea || !radarName || !radarSub) return;

    let activeFilter = 'all';
    let selectedId = 'electrasim';

    const getRows = () => Array.from(rowsHost.querySelectorAll('[data-tool-id]'));

    const scorePoints = (scores) => {
      const count = 6;
      const radius = 112;
      return scores
        .map((value, index) => {
          const angle = -Math.PI / 2 + (Math.PI * 2 * index) / count;
          const x = 170 + Math.cos(angle) * radius * (Number(value) / 5);
          const y = 170 + Math.sin(angle) * radius * (Number(value) / 5);
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ');
    };

    const updateRadar = (row) => {
      const scores = String(row.dataset.scores || '0,0,0,0,0,0').split(',');
      radarArea.setAttribute('points', scorePoints(scores));
      const profile = root.querySelector(
        `[data-profile-for="${CSS.escape(row.dataset.toolId || '')}"]`,
      );
      const name = row.dataset.toolName || 'Selected tool';
      radarName.textContent = name;
      radarSub.textContent =
        profile?.querySelector('.cb-profile-tag')?.textContent || 'selected profile';

      scores.forEach((value, index) => {
        const dimensionIds = ['wiring', 'analysis', 'teaching', 'sharing', 'offline', 'access'];
        const dot = root.querySelector(`[data-radar-dot="${dimensionIds[index]}"]`);
        if (!dot) return;
        const angle = -Math.PI / 2 + (Math.PI * 2 * index) / dimensionIds.length;
        const x = 170 + Math.cos(angle) * 112 * (Number(value) / 5);
        const y = 170 + Math.sin(angle) * 112 * (Number(value) / 5);
        dot.setAttribute('cx', x.toFixed(1));
        dot.setAttribute('cy', y.toFixed(1));
      });
    };

    const selectTool = (id, shouldScroll = false) => {
      const row = root.querySelector(`[data-tool-id="${CSS.escape(id)}"]`);
      if (!row) return;
      selectedId = id;
      getRows().forEach((candidate) =>
        candidate.classList.toggle('is-selected', candidate === row),
      );
      root.querySelectorAll('[data-bar-tool]').forEach((bar) => {
        bar.classList.toggle('is-selected', bar.dataset.barTool === id);
      });
      root.querySelectorAll('[data-profile-for]').forEach((profile) => {
        profile.hidden = profile.dataset.profileFor !== id;
      });
      updateRadar(row);
      if (shouldScroll) {
        root.querySelector('#cb-inspector')?.scrollIntoView({
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 'auto'
            : 'smooth',
          block: 'nearest',
        });
      }
    };

    const visibleRows = () => getRows().filter((row) => !row.classList.contains('is-hidden'));

    const applyFilter = () => {
      const rows = getRows();
      rows.forEach((row) => {
        const tags = String(row.dataset.filterTags || '').split(',');
        const matches =
          activeFilter === 'all'
            ? true
            : activeFilter === 'pinned'
              ? row.dataset.pinned === 'true'
              : tags.includes(activeFilter);
        row.classList.toggle('is-hidden', !matches);
      });

      const visible = visibleRows();
      const label = visible.length === 1 ? 'tool' : 'tools';
      matrixStatus.textContent =
        activeFilter === 'all'
          ? `Showing all ${visible.length} tools.`
          : `Showing ${visible.length} ${label} for the ${activeFilter} lens.`;

      if (!visible.some((row) => row.dataset.toolId === selectedId) && visible[0]) {
        selectTool(visible[0].dataset.toolId || 'electrasim');
      }
    };

    const sortRows = () => {
      const rows = getRows();
      const mode = sortSelect.value;
      rows.sort((a, b) => {
        if (mode === 'name')
          return String(a.dataset.toolName).localeCompare(String(b.dataset.toolName));
        if (mode === 'fit') return Number(b.dataset.fitScore) - Number(a.dataset.fitScore);
        const aScores = String(a.dataset.scores || '')
          .split(',')
          .map(Number);
        const bScores = String(b.dataset.scores || '')
          .split(',')
          .map(Number);
        const positions = { wiring: 0, analysis: 1, teaching: 2 };
        const position = positions[mode] ?? 0;
        return (bScores[position] || 0) - (aScores[position] || 0);
      });
      rows.forEach((row) => rowsHost.append(row));
      applyFilter();
    };

    root.querySelectorAll('[data-compare-filter]').forEach((button) => {
      button.addEventListener(
        'click',
        () => {
          activeFilter = button.dataset.compareFilter || 'all';
          root.querySelectorAll('[data-compare-filter]').forEach((candidate) => {
            const active = candidate === button;
            candidate.classList.toggle('is-active', active);
            candidate.setAttribute('aria-pressed', String(active));
          });
          applyFilter();
        },
        { signal },
      );
    });

    sortSelect.addEventListener('change', sortRows, { signal });

    root.addEventListener(
      'click',
      (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;

        const pin = target.closest('[data-pin-tool]');
        if (pin) {
          const id = pin.dataset.pinTool;
          const row = id ? root.querySelector(`[data-tool-id="${CSS.escape(id)}"]`) : null;
          if (!row || !id) return;
          const next = row.dataset.pinned !== 'true';
          row.dataset.pinned = String(next);
          pin.setAttribute('aria-pressed', String(next));
          applyFilter();
          return;
        }

        const selector = target.closest('[data-select-tool]');
        if (selector) {
          const id = selector.dataset.selectTool;
          if (id) selectTool(id, true);
          return;
        }

        const sourceJump = target.closest('[data-source-jump]');
        if (sourceJump) {
          const id = sourceJump.dataset.sourceJump;
          const entry = id ? root.querySelector(`[data-source-entry="${CSS.escape(id)}"]`) : null;
          if (entry) {
            entry.open = true;
            entry.scrollIntoView({
              behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
                ? 'auto'
                : 'smooth',
              block: 'center',
            });
          }
        }
      },
      { signal },
    );

    root.addEventListener(
      'pointerover',
      (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const row = target.closest('[data-tool-id]');
        if (row && !row.classList.contains('is-hidden'))
          selectTool(row.dataset.toolId || selectedId);
      },
      { signal },
    );

    root.addEventListener(
      'focusin',
      (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const row = target.closest('[data-tool-id]');
        if (row && !row.classList.contains('is-hidden'))
          selectTool(row.dataset.toolId || selectedId);
      },
      { signal },
    );

    root.addEventListener(
      'keydown',
      (event) => {
        const target = event.target;
        if (!(target instanceof Element) || !target.matches('[data-tool-id]')) return;
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        selectTool(target.dataset.toolId || selectedId, true);
      },
      { signal },
    );

    // Keep the first profile and chart in sync with the server-rendered state.
    const initial = root.querySelector('[data-tool-id="electrasim"]');
    if (initial) selectTool('electrasim');
    applyFilter();
    sortRows();

    // Source entries are native <details>; this anchor simply makes the jump
    // target explicit for assistive technology and deep links.
    if (sourceSection) sourceSection.dataset.ready = 'true';
  };

  if (window.ElectraSim?.onReady) {
    window.ElectraSim.onReady(setup);
  } else {
    document.addEventListener(
      'DOMContentLoaded',
      () => setup({ signal: new AbortController().signal }),
      { once: true },
    );
  }
})();
