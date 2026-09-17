/**
 * SEO copy helpers.
 *
 * Search snippets are measured in characters. Google truncates a title at
 * roughly 60 and a description at roughly 155–160, and if we hand it more it
 * cuts them itself — mid-word, wherever the pixel budget runs out, which is
 * how a guide page ends up advertising "…terminals cold tail, factory joint
 * between the cold tail and the heat…" in the results.
 *
 * These helpers cut the copy ourselves so the part that survives is always
 * readable: a sentence boundary where one exists, otherwise a word boundary.
 * They are applied in `Base.astro`, the one component every page routes
 * through, so a new page cannot ship an over-length snippet by accident.
 */

/** Google truncates descriptions at ~155–160 characters. */
export const MAX_DESCRIPTION = 157;

/** Google truncates titles at ~60 characters. */
export const MAX_TITLE = 60;

/** Shortest snippet worth shipping — also the gate's minimum. */
const MIN_USEFUL_DESCRIPTION = 40;

/** Floor for a title: shorter than this and the clause has lost the subject. */
const MIN_USEFUL_TITLE = 25;

function collapse(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Index just past the last sentence-ending punctuation at or before `limit`.
 *
 * Guarded against the false positives that matter in electrical copy: a
 * decimal point ("1.5 ") and a mid-sentence abbreviation ("etc. ") are not
 * sentence ends, so the preceding character must be a letter and the next
 * word must start like a sentence.
 */
function lastSentenceEnd(text: string, limit: number): number {
  let best = -1;
  for (let i = 0; i < limit && i < text.length; i += 1) {
    const ch = text[i];
    if (ch !== '.' && ch !== '!' && ch !== '?') continue;
    if (!/[A-Za-z)]/.test(text[i - 1] ?? '')) continue;
    const next = text[i + 1];
    if (next === undefined || (next === ' ' && /[A-Z"(]/.test(text[i + 2] ?? ''))) {
      best = i + 1;
    }
  }
  return best;
}

/** Punctuation that cannot end a phrase. */
const DANGLING_PUNCTUATION = /[\s,;:—–\-/&]+$/;

/**
 * Words that read as broken when they are the last thing in a snippet:
 * "…Simulator &", "…and", "…of the". The homepage title shipped as
 * "ElectraSim — Free Online Electrical Wiring Simulator &" because the word
 * boundary fell right before "Circuit" and `&` survived the trim.
 */
const DANGLING_WORD =
  /(?:\s(?:a|an|and|as|at|by|for|from|in|into|of|on|or|per|the|to|via|with|without|&))+$/i;

/** Cut at the last word boundary that still leaves a useful amount of copy. */
function cutAtWord(text: string, max: number): string {
  const window = text.slice(0, max);
  const space = window.lastIndexOf(' ');
  const cut = space > max * 0.6 ? space : max;
  const trimmed = window.slice(0, cut).replace(DANGLING_PUNCTUATION, '').trim();
  const withoutDanglingWords = trimmed
    .replace(DANGLING_WORD, '')
    .replace(DANGLING_PUNCTUATION, '')
    .trim();
  // Only keep the extra trim when something real is left to say.
  return withoutDanglingWords.length > 0 ? withoutDanglingWords : trimmed;
}

/**
 * A meta description that fits a search snippet.
 *
 * Reads the same when the input already fits; otherwise prefers to end on a
 * complete sentence, and falls back to a word boundary.
 */
export function metaDescription(text: string, max: number = MAX_DESCRIPTION): string {
  const clean = collapse(text);
  if (clean.length <= max) return clean;

  const sentenceEnd = lastSentenceEnd(clean, max);
  if (sentenceEnd >= Math.min(max, MIN_USEFUL_DESCRIPTION)) {
    return clean.slice(0, sentenceEnd).trim();
  }
  return cutAtWord(clean, max);
}

/** Separators that split a title into clauses, strongest first. */
const TITLE_SEPARATORS = [/\s+\|\s+/, /\s+—\s+/, /\s+–\s+/, /:\s+/, /\s+-\s+/];

/**
 * A page title that fits a search snippet.
 *
 * Titles are built as "Thing: more detail | Brand". Cutting one mid-phrase is
 * what produced titles like "How to Wire a Ceiling Rose and Light Fitting:
 * Loop-In," so the order of preference is:
 *
 *   1. drop the trailing brand segment if the rest still stands on its own
 *   2. otherwise fall back to the longest leading clause that fits
 *   3. only then cut at a word boundary
 */
export function metaTitle(text: string, max: number = MAX_TITLE): string {
  const clean = collapse(text);
  if (clean.length <= max) return clean;

  const floor = Math.min(max, MIN_USEFUL_TITLE);

  /* 1. "Thing: detail | Brand" → "Thing: detail". */
  const segments = clean.split(/\s+[—|]\s+/);
  if (segments.length > 1) {
    const withoutBrand = segments.slice(0, -1).join(' — ').trim();
    if (withoutBrand.length <= max && withoutBrand.length >= floor) return withoutBrand;
  }

  /* 2. The longest leading clause that fits, e.g. the part before a colon. */
  for (const separator of TITLE_SEPARATORS) {
    if (!separator.test(clean)) continue;
    const clauses = clean.split(separator);
    for (let take = clauses.length - 1; take >= 1; take -= 1) {
      const candidate = clauses
        .slice(0, take)
        .join(separator.source === ':\\s+' ? ': ' : ' ')
        .trim();
      if (candidate.length <= max && candidate.length >= floor) return candidate;
    }
  }

  /* 3. Nothing structured to cut on — fall back to a word boundary. */
  return cutAtWord(clean, max);
}
