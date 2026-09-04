/**
 * site-search.js
 * Instant Search & Command Palette for ElectraSim
 * Pure Vanilla JavaScript • Zero Runtime Dependencies • Accessible & Fast
 *
 * Lifecycle: re-binds after every view transition (see boot.js). The fetched
 * index is module-scoped and deliberately survives navigations — it is the
 * same 60 KB payload for every page, so re-fetching it per soft nav would be
 * pure waste.
 */

(() => {
  let searchIndex = null;
  let isFetching = false;
  let fetchError = false;
  let activeFilter = 'all';
  let activeIndex = -1;
  let currentResults = [];

  const QUICK_LINKS = [
    {
      title: 'Voltage Drop Calculator',
      description: 'Calculate voltage drop, % loss, and cable limits under BS 7671 / IEC.',
      url: '/tools/voltage-drop-calculator/',
      type: 'tool',
      category: 'Calculators',
    },
    {
      title: 'How to Wire a Two-Way Switch',
      description: 'Complete guide for 2-way staircase and corridor lighting circuits.',
      url: '/blog/how-to-wire-a-two-way-switch-complete-guide/',
      type: 'article',
      category: 'Guides',
    },
    {
      title: 'What is an RCBO? Difference Between RCD, MCB & RCBO',
      description: 'Understand modern consumer unit protection devices and trip characteristics.',
      url: '/blog/what-is-an-rcbo-difference-between-rcd-mcb-rcbo/',
      type: 'article',
      category: 'Regulations',
    },
  ];

  async function loadSearchIndex() {
    if (searchIndex || isFetching) return searchIndex;
    isFetching = true;
    fetchError = false;
    try {
      const response = await fetch('/search.json');
      if (response.ok) {
        searchIndex = await response.json();
      } else {
        fetchError = true;
        console.warn('Search index fetch failed:', response.status);
      }
    } catch (err) {
      fetchError = true;
      console.warn('Unable to load search index:', err);
    } finally {
      isFetching = false;
    }
    return searchIndex;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ── Typo tolerance ──────────────────────────────────────────────────────
     Bounded Damerau-Levenshtein (optimal string alignment) so "voltge drop",
     "brekaer" or "socet" still land on the right result. Tolerance scales
     with token length: 0 edits under 4 chars, 1 edit for 4–7, 2 for 8+.
     The index is tiny (~160 items) and every call bails out early once the
     bound is exceeded, so a worst-case keystroke stays comfortably under a
     millisecond behind the existing 50 ms input debounce. */

  function editTolerance(length) {
    if (length >= 8) return 2;
    if (length >= 4) return 1;
    return 0;
  }

  function editDistanceWithin(a, b, max) {
    if (a === b) return true;
    const la = a.length;
    const lb = b.length;
    if (Math.abs(la - lb) > max) return false;

    let prevPrev = null;
    let prev = new Array(lb + 1);
    for (let j = 0; j <= lb; j++) prev[j] = j;

    for (let i = 1; i <= la; i++) {
      const cur = new Array(lb + 1);
      cur[0] = i;
      let rowMin = i;
      for (let j = 1; j <= lb; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        let value = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
        // Adjacent transposition ("brekaer" → "breaker") counts as one edit.
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
          value = Math.min(value, prevPrev[j - 2] + 1);
        }
        cur[j] = value;
        if (value < rowMin) rowMin = value;
      }
      if (rowMin > max) return false; // no path back under the bound
      prevPrev = prev;
      prev = cur;
    }
    return prev[lb] <= max;
  }

  /** Does `token` fuzzily match `word` (whole word or its leading stem)? */
  function fuzzyWordMatch(token, word) {
    const max = editTolerance(token.length);
    if (max === 0) return false;
    if (word.length < 3) return false;
    if (editDistanceWithin(token, word, max)) return true;
    // Compare against the word's stem so "brekaer" matches "breakers".
    if (word.length > token.length + max) {
      return editDistanceWithin(token, word.slice(0, token.length), max);
    }
    return false;
  }

  const itemWordsCache = new WeakMap();

  function getItemWords(item) {
    let words = itemWordsCache.get(item);
    if (!words) {
      const split = (value) =>
        String(value || '')
          .toLowerCase()
          .split(/[^a-z0-9]+/)
          .filter((w) => w.length >= 3);
      words = {
        title: split(item.title),
        tags: item.tags ? item.tags.flatMap((t) => split(t)) : [],
        desc: split(item.description),
      };
      itemWordsCache.set(item, words);
    }
    return words;
  }

  function highlightMatches(text, query) {
    const escaped = escapeHtml(text);
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return escaped;
    const tokens = cleanQuery.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return escaped;

    // Mark whole words that contain a token or fuzzily match one, skipping
    // the entity names produced by escapeHtml (e.g. the "amp" in "&amp;").
    return escaped.replace(/[A-Za-z0-9][A-Za-z0-9'-]*/g, (word, offset) => {
      if (offset > 0 && escaped[offset - 1] === '&') return word;
      const wordLower = word.toLowerCase();
      const hit = tokens.some(
        (token) => wordLower.includes(token) || fuzzyWordMatch(token, wordLower),
      );
      return hit ? `<mark class="search-highlight">${word}</mark>` : word;
    });
  }

  function scoreItem(item, queryTokens, fullQuery) {
    let score = 0;
    const titleLower = item.title.toLowerCase();
    const descLower = item.description.toLowerCase();
    const tagsLower = item.tags ? item.tags.map((t) => t.toLowerCase()) : [];

    // Exact full query matches
    if (titleLower === fullQuery) score += 200;
    else if (titleLower.startsWith(fullQuery)) score += 120;
    else if (titleLower.includes(fullQuery)) score += 80;

    if (descLower.includes(fullQuery)) score += 30;

    for (const token of queryTokens) {
      let matched = false;
      if (titleLower.includes(token)) {
        score += 40;
        matched = true;
      }
      if (descLower.includes(token)) {
        score += 15;
        matched = true;
      }
      if (tagsLower.some((t) => t.includes(token))) {
        score += 25;
        matched = true;
      }

      // Typo-tolerant fallback, only when the token matched nothing exactly.
      // Fuzzy hits score below exact ones so clean matches always rank first.
      if (!matched && editTolerance(token.length) > 0) {
        const words = getItemWords(item);
        if (words.title.some((w) => fuzzyWordMatch(token, w))) score += 24;
        else if (words.tags.some((w) => fuzzyWordMatch(token, w))) score += 15;
        else if (words.desc.some((w) => fuzzyWordMatch(token, w))) score += 9;
      }
    }

    // Boost calculators slightly as high-utility tools
    if (item.type === 'tool') score += 10;

    return score;
  }

  function search(query) {
    if (!searchIndex) return [];
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return [];

    const tokens = cleanQuery.split(/\s+/).filter(Boolean);

    let list = searchIndex;
    if (activeFilter !== 'all') {
      list = list.filter((item) => {
        if (activeFilter === 'tool') return item.type === 'tool';
        if (activeFilter === 'article') return item.type === 'article';
        if (activeFilter === 'update') return item.type === 'update';
        if (activeFilter === 'guide') return item.type === 'guide';
        return true;
      });
    }

    const scored = [];
    for (const item of list) {
      const score = scoreItem(item, tokens, cleanQuery);
      if (score > 0) {
        scored.push({ item, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 10).map((s) => s.item);
  }

  function renderItem(item, query, isSelected, index) {
    const titleHtml = highlightMatches(item.title, query);
    const descHtml = highlightMatches(item.description, query);
    const typeClass = `type-badge-${item.type}`;
    const typeLabel =
      item.type === 'tool'
        ? 'Calculator'
        : item.type === 'guide'
          ? 'Guide'
          : item.type === 'article'
            ? 'Article'
            : item.type === 'update'
              ? 'Update'
              : 'Page';

    return `
      <li
        role="option"
        id="search-opt-${index}"
        aria-selected="${isSelected ? 'true' : 'false'}"
        class="search-result-item ${isSelected ? 'selected' : ''}"
        data-url="${item.url}"
      >
        <a href="${item.url}" class="search-result-link" tabindex="-1">
          <div class="search-result-header">
            <span class="search-type-badge ${typeClass}">${typeLabel}</span>
            <span class="search-category-tag">${escapeHtml(item.category)}</span>
          </div>
          <div class="search-result-title">${titleHtml}</div>
          <div class="search-result-desc">${descHtml}</div>
        </a>
      </li>
    `;
  }

  /**
   * Keeps the combobox's `aria-activedescendant` pointing at the highlighted
   * option. `updateResultsView` re-renders the whole list, so without this the
   * initially-selected row (activeIndex 0) was visually highlighted but never
   * announced, and a stale id lingered when results emptied out.
   */
  function syncActiveDescendant() {
    const input = document.querySelector('#site-search-input');
    if (!input) return;
    if (currentResults.length > 0 && activeIndex >= 0 && activeIndex < currentResults.length) {
      input.setAttribute('aria-activedescendant', `search-opt-${activeIndex}`);
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  }

  function updateResultsView(dialog, query) {
    const listEl = dialog.querySelector('#site-search-results');
    const emptyEl = dialog.querySelector('#site-search-empty');
    const quickLinksEl = dialog.querySelector('#site-search-quicklinks');
    const loadingEl = dialog.querySelector('#site-search-loading');
    const errorEl = dialog.querySelector('#site-search-error');

    if (!listEl) return;

    const trimmed = query.trim();

    const showStatus = (status) => {
      if (loadingEl) loadingEl.hidden = status !== 'loading';
      if (errorEl) errorEl.hidden = status !== 'error';
      if (status && emptyEl) emptyEl.hidden = true;
    };

    if (!trimmed) {
      showStatus(null);
      let itemsToRender = QUICK_LINKS;
      if (activeFilter !== 'all') {
        if (searchIndex && searchIndex.length > 0) {
          itemsToRender = searchIndex.filter((item) => item.type === activeFilter);
        } else {
          itemsToRender = QUICK_LINKS.filter((item) => item.type === activeFilter);
          loadSearchIndex().then(() => {
            const dialogEl = document.getElementById('site-search-dialog');
            // `input` is not in this scope — read the live field off the dialog.
            // Getting this wrong threw a ReferenceError whenever a filter pill
            // was clicked while /search.json was still in flight.
            const inputEl = dialogEl?.querySelector('#site-search-input');
            if (dialogEl?.open && !inputEl?.value.trim()) {
              updateResultsView(dialogEl, '');
            }
          });
        }
      }
      currentResults = itemsToRender;
      if (emptyEl) {
        emptyEl.hidden = itemsToRender.length > 0;
        const queryDisplay = emptyEl.querySelector('#search-empty-query');
        if (queryDisplay) queryDisplay.textContent = `category: ${activeFilter}`;
      }
      if (quickLinksEl) {
        quickLinksEl.hidden = itemsToRender.length === 0;
        const groupTitle = quickLinksEl.querySelector('span');
        if (groupTitle) {
          const filterLabels = {
            all: 'POPULAR & QUICK ACCESS',
            tool: 'ELECTRICAL CALCULATORS & TOOLS',
            article: 'EDUCATIONAL ARTICLES & TUTORIALS',
            guide: 'CIRCUIT GUIDES & SCHEMATICS',
            update: 'PRODUCT UPDATES & CHANGELOGS',
          };
          groupTitle.textContent = filterLabels[activeFilter] || 'FILTERED ITEMS';
        }
      }
      listEl.innerHTML = currentResults
        .map((item, idx) => renderItem(item, '', idx === activeIndex, idx))
        .join('');
      syncActiveDescendant();
      return;
    }

    if (quickLinksEl) quickLinksEl.hidden = true;

    // Index not ready yet: never claim "no results" while loading or on failure.
    if (!searchIndex) {
      currentResults = [];
      listEl.innerHTML = '';
      syncActiveDescendant();
      if (isFetching) {
        showStatus('loading');
      } else if (fetchError) {
        showStatus('error');
      } else {
        loadSearchIndex().then(() => updateResultsView(dialog, query));
      }
      return;
    }

    showStatus(null);
    currentResults = search(trimmed);

    if (currentResults.length === 0) {
      listEl.innerHTML = '';
      if (emptyEl) {
        emptyEl.hidden = false;
        const queryDisplay = emptyEl.querySelector('#search-empty-query');
        if (queryDisplay) queryDisplay.textContent = trimmed;
      }
    } else {
      if (emptyEl) emptyEl.hidden = true;
      listEl.innerHTML = currentResults
        .map((item, idx) => renderItem(item, trimmed, idx === activeIndex, idx))
        .join('');
    }
    syncActiveDescendant();
  }

  function selectOption(index) {
    const listEl = document.querySelector('#site-search-results');
    if (!listEl || currentResults.length === 0) return;

    activeIndex = Math.max(0, Math.min(index, currentResults.length - 1));

    const options = listEl.querySelectorAll('.search-result-item');
    options.forEach((opt, idx) => {
      if (idx === activeIndex) {
        opt.classList.add('selected');
        opt.setAttribute('aria-selected', 'true');
        opt.scrollIntoView({ block: 'nearest' });
      } else {
        opt.classList.remove('selected');
        opt.setAttribute('aria-selected', 'false');
      }
    });

    syncActiveDescendant();
  }

  function navigateToActive() {
    if (activeIndex >= 0 && activeIndex < currentResults.length) {
      const item = currentResults[activeIndex];
      if (item?.url) {
        window.location.href = item.url;
      }
    }
  }

  function openSearchModal() {
    const dialog = document.getElementById('site-search-dialog');
    if (!dialog) return;

    // Load search index in background
    loadSearchIndex().then(() => {
      const input = dialog.querySelector('#site-search-input');
      updateResultsView(dialog, input ? input.value : '');
    });

    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }

    const input = dialog.querySelector('#site-search-input');
    input?.setAttribute('aria-expanded', 'true');
    if (input) {
      input.value = '';
      activeIndex = 0;
      updateResultsView(dialog, '');
      setTimeout(() => input.focus(), 50);
    }
  }

  function closeSearchModal() {
    const dialog = document.getElementById('site-search-dialog');
    if (!dialog) return;

    if (typeof dialog.close === 'function') {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
    }
    dialog.querySelector('#site-search-input')?.setAttribute('aria-expanded', 'false');
  }

  function init({ signal }) {
    const dialog = document.getElementById('site-search-dialog');
    if (!dialog) return;

    const input = dialog.querySelector('#site-search-input');
    const filterBtns = dialog.querySelectorAll('.search-filter-pill');
    const closeBtn = dialog.querySelector('#site-search-close-btn');

    // Trigger button listeners
    const triggers = document.querySelectorAll('[data-search-trigger]');
    triggers.forEach((btn) => {
      btn.addEventListener(
        'click',
        (e) => {
          e.preventDefault();
          openSearchModal();
        },
        { signal },
      );
    });

    // Close button
    if (closeBtn) {
      closeBtn.addEventListener('click', closeSearchModal, { signal });
    }

    // Retry after a failed index fetch
    const retryBtn = dialog.querySelector('#site-search-retry-btn');
    retryBtn?.addEventListener(
      'click',
      () => {
        const currentInput = dialog.querySelector('#site-search-input');
        const value = currentInput ? currentInput.value : '';
        updateResultsView(dialog, value);
        loadSearchIndex().then(() => {
          const dialogEl = document.getElementById('site-search-dialog');
          if (dialogEl?.open) updateResultsView(dialogEl, value);
        });
      },
      { signal },
    );

    // Light-dismiss fallback for browsers without native closedby support
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      dialog.addEventListener(
        'click',
        (event) => {
          if (event.target !== dialog) return;
          const rect = dialog.getBoundingClientRect();
          const isDialogContent =
            rect.top <= event.clientY &&
            event.clientY <= rect.top + rect.height &&
            rect.left <= event.clientX &&
            event.clientX <= rect.left + rect.width;

          if (!isDialogContent) {
            closeSearchModal();
          }
        },
        { signal },
      );
    }

    // Input typing & keyboard navigation
    if (input) {
      let debounceTimer;
      input.addEventListener(
        'input',
        () => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            activeIndex = 0;
            updateResultsView(dialog, input.value);
          }, 50);
        },
        { signal },
      );

      input.addEventListener(
        'keydown',
        (e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectOption(activeIndex + 1);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectOption(activeIndex - 1);
          } else if (e.key === 'Enter') {
            e.preventDefault();
            navigateToActive();
          } else if (e.key === 'Escape') {
            closeSearchModal();
          }
        },
        { signal },
      );
    }

    // Filter pill buttons
    filterBtns.forEach((btn) => {
      btn.addEventListener(
        'click',
        () => {
          filterBtns.forEach((b) => {
            b.classList.remove('active');
            b.setAttribute('aria-pressed', 'false');
          });
          btn.classList.add('active');
          btn.setAttribute('aria-pressed', 'true');
          activeFilter = btn.getAttribute('data-filter') || 'all';
          activeIndex = 0;
          if (input) {
            updateResultsView(dialog, input.value);
          }
        },
        { signal },
      );
    });

    // Global keyboard shortcuts: Cmd+K, Ctrl+K, or "/"
    window.addEventListener(
      'keydown',
      (e) => {
        const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
        const isSlash =
          e.key === '/' &&
          !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName || '');

        if (isCmdK || isSlash) {
          e.preventDefault();
          if (dialog.open) {
            closeSearchModal();
          } else {
            openSearchModal();
          }
        }
      },
      { signal },
    );

    // Filter state belongs to the dialog instance, not the session — a soft
    // navigation gives us a fresh dialog with "All" pre-selected in markup.
    activeFilter =
      dialog.querySelector('.search-filter-pill.active')?.getAttribute('data-filter') || 'all';
    activeIndex = 0;
    currentResults = [];

    // Preload index on idle or initial hover (only once — the fetch memoises).
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => loadSearchIndex(), { timeout: 3000 });
    } else {
      setTimeout(() => loadSearchIndex(), 2000);
    }
  }

  window.ElectraSim.onReady(init);
})();
