/**
 * emoji-icons.ts — inline SVG replicas of the pictographs previously used as
 * literal emoji in the site UI.
 *
 * Why: emoji are rendered by whatever font the visitor's OS happens to ship
 * (Apple Color Emoji, Noto, Segoe UI Emoji…), so the exact glyph, its weight
 * and even whether it appears at all differ per device. Each entry below is a
 * flat-colour vector drawing of the same pictograph on a 128×128 grid, so the
 * icon is pixel-identical on every platform, inherits `currentColor`
 * surroundings, scales without blurring and never triggers a font fallback.
 *
 * Keys are both the semantic name (used by content JSON) and the emoji char
 * (used by markup that used to carry the literal character), so call sites can
 * be migrated without inventing new copy.
 *
 * NOTE: `astro-site/public/js/voltage-drop-tool.js` mirrors the handful of
 * icons it needs (info/warning/success/reset/ruler/bolt/link/bulb) because
 * files in `public/` are shipped verbatim and cannot import this module.
 */

/** viewBox shared by every glyph. */
export const EMOJI_ICON_VIEWBOX = '0 0 128 128';

interface IconDef {
  /** Inner SVG markup (paths/shapes only). */
  body: string;
  /** Accessible-ish label describing the pictograph. */
  label: string;
}

const DEFS: Record<string, IconDef> = {
  bolt: {
    label: 'high voltage',
    body: '<path d="M74 8 24 76h26l-10 44 64-70H70z" fill="#FFCC4D" stroke="#F4900C" stroke-width="7" stroke-linejoin="round"/>',
  },
  bulb: {
    label: 'idea',
    body: '<path d="M64 12c-20 0-36 15-36 34 0 12 6 20 13 27 4 4 5 8 5 12h36c0-4 1-8 5-12 7-7 13-15 13-27 0-19-16-34-36-34z" fill="#FFD422"/><path d="M50 98h28v9H50zM53 111h22a9 9 0 0 1-9 8h-4a9 9 0 0 1-9-8z" fill="#8899A6"/><path d="M56 40v20M72 40v20" stroke="#F4900C" stroke-width="6" stroke-linecap="round"/><path d="M64 4v8M20 26l6 6M108 26l-6 6" stroke="#FFAC33" stroke-width="7" stroke-linecap="round"/>',
  },
  link: {
    label: 'link',
    body: '<g fill="none" stroke="#66757F" stroke-width="13" stroke-linecap="round"><rect x="12" y="46" width="54" height="36" rx="18" transform="rotate(-45 39 64)"/><rect x="62" y="46" width="54" height="36" rx="18" transform="rotate(-45 89 64)"/></g>',
  },
  info: {
    label: 'information',
    body: '<circle cx="64" cy="64" r="52" fill="#1D9BF0"/><circle cx="64" cy="38" r="9" fill="#fff"/><rect x="56" y="54" width="16" height="42" rx="8" fill="#fff"/>',
  },
  warning: {
    label: 'warning',
    body: '<path d="M64 12 122 116H6z" fill="#FFCC4D" stroke="#F4900C" stroke-width="9" stroke-linejoin="round"/><rect x="57" y="52" width="14" height="36" rx="7" fill="#fff"/><circle cx="64" cy="100" r="8" fill="#fff"/>',
  },
  check: {
    label: 'done',
    body: '<rect x="8" y="8" width="112" height="112" rx="26" fill="#17BF63"/><path d="M34 66 55 87l39-45" fill="none" stroke="#fff" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  cross: {
    label: 'not done',
    body: '<g stroke="#DD2E44" stroke-width="18" stroke-linecap="round" fill="none"><path d="M32 32l64 64"/><path d="M96 32 32 96"/></g>',
  },
  chart: {
    label: 'chart',
    body: '<rect x="12" y="14" width="104" height="100" rx="10" fill="#F5F8FA"/><g fill="#5C9EDE"><rect x="28" y="70" width="16" height="28" rx="3"/><rect x="52" y="50" width="16" height="48" rx="3"/><rect x="76" y="60" width="16" height="38" rx="3"/></g><path d="M24 102h80" stroke="#8899A6" stroke-width="7" stroke-linecap="round"/>',
  },
  reset: {
    label: 'refresh',
    body: '<g fill="none" stroke="#1D9BF0" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"><path d="M104 60a40 40 0 1 1-12-28"/><path d="M100 12v24H76"/></g>',
  },
  ruler: {
    label: 'measure',
    body: '<path d="M14 114 114 114 14 18z" fill="#A6D7F0" stroke="#1D9BF0" stroke-width="9" stroke-linejoin="round"/><path d="M14 92h16M22 78v16M34 66h16M42 52v16" stroke="#1D9BF0" stroke-width="7" stroke-linecap="round"/>',
  },
  book: {
    label: 'open book',
    body: '<path d="M64 28c-11-8-26-11-46-9v76c20-2 35 1 46 9 11-8 26-11 46-9V19c-20-2-35 1-46 9z" fill="#F5F8FA" stroke="#1D9BF0" stroke-width="9" stroke-linejoin="round"/><path d="M64 28v76" stroke="#1D9BF0" stroke-width="9"/><path d="M30 44h18M30 60h18M80 44h18M80 60h18" stroke="#85C8F2" stroke-width="7" stroke-linecap="round"/>',
  },
  box: {
    label: 'package',
    body: '<path d="M64 62 12 38v54l52 24z" fill="#A0785A"/><path d="M64 62 116 38v54L64 116z" fill="#C8875A"/><path d="M64 12 116 38 64 62 12 38z" fill="#E1A975"/><path d="M36 26 88 50v22L36 48z" fill="#F5D7B0" opacity=".85"/>',
  },
  question: {
    label: 'help',
    body: '<path d="M40 44a24 24 0 1 1 36 21l-8 6v11" fill="none" stroke="#DD2E44" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/><circle cx="68" cy="104" r="10" fill="#DD2E44"/>',
  },
  contrast: {
    label: 'theme',
    body: '<circle cx="64" cy="64" r="52" fill="#8899A6"/><path d="M64 12a52 52 0 0 1 0 104z" fill="#F5F8FA"/>',
  },
  home: {
    label: 'home',
    body: '<path d="M64 12 122 60h-16v52H22V60H6z" fill="#A0AEC0"/><path d="M34 66h60v46H34z" fill="#F1D7AE"/><rect x="54" y="82" width="20" height="30" rx="3" fill="#5C9EDE"/><rect x="42" y="72" width="14" height="12" rx="2" fill="#BBDDFF"/><rect x="72" y="72" width="14" height="12" rx="2" fill="#BBDDFF"/><path d="M64 12 122 60H6z" fill="#E1707C"/>',
  },
  sun: {
    label: 'light mode',
    body: '<circle cx="64" cy="64" r="26" fill="#FFD422"/><g stroke="#FFAC33" stroke-width="9" stroke-linecap="round"><path d="M64 8v16M64 104v16M8 64h16M104 64h16M24 24l12 12M92 92l12 12M104 24 92 36M36 92 24 104"/></g>',
  },
  moon: {
    label: 'dark mode',
    body: '<path d="M98 84A46 46 0 1 1 46 16a36 36 0 0 0 52 68z" fill="#FFD422"/>',
  },
  search: {
    label: 'search',
    body: '<circle cx="56" cy="56" r="30" fill="#C7E8FA" opacity=".7"/><g fill="none" stroke="#66757F" stroke-width="13" stroke-linecap="round"><circle cx="56" cy="56" r="30"/><path d="M80 80l30 30"/></g>',
  },
  ice: {
    label: 'clear',
    body: '<path d="M64 12 114 38v52L64 116 14 90V38z" fill="#C7E8FA" opacity=".95"/><path d="M64 12v52m50-26L64 64 14 38m0 52 50 26 50-26" fill="none" stroke="#8FD4F2" stroke-width="7" stroke-linejoin="round"/>',
  },
  scroll: {
    label: 'document',
    body: '<rect x="24" y="20" width="80" height="88" rx="6" fill="#F5D7B0"/><rect x="12" y="10" width="104" height="18" rx="9" fill="#E1A975"/><rect x="12" y="100" width="104" height="18" rx="9" fill="#E1A975"/><path d="M40 46h48M40 62h48M40 78h32" stroke="#B78A57" stroke-width="7" stroke-linecap="round"/>',
  },
  clipboard: {
    label: 'checklist',
    body: '<rect x="22" y="18" width="84" height="98" rx="10" fill="#9B6A3E"/><rect x="32" y="34" width="64" height="72" rx="6" fill="#F5F8FA"/><rect x="50" y="10" width="28" height="20" rx="7" fill="#8899A6"/><path d="M44 56h40M44 74h32M44 90h24" stroke="#8899A6" stroke-width="7" stroke-linecap="round"/>',
  },
  mouse: {
    label: 'mouse',
    body: '<rect x="38" y="12" width="52" height="104" rx="26" fill="#8899A6"/><rect x="45" y="20" width="38" height="34" rx="19" fill="#BCCCDC"/><path d="M64 20v22" stroke="#66757F" stroke-width="6" stroke-linecap="round"/><circle cx="64" cy="54" r="6" fill="#F5F8FA"/>',
  },
  scissors: {
    label: 'cutaway',
    body: '<g stroke="#8899A6" stroke-width="11" stroke-linecap="round" fill="none"><path d="M46 70 104 18"/><path d="M82 70 24 18"/></g><g fill="none" stroke="#DD2E44" stroke-width="11"><circle cx="40" cy="94" r="17"/><circle cx="88" cy="94" r="17"/></g><circle cx="64" cy="60" r="6" fill="#66757F"/>',
  },
  burst: {
    label: 'explosion',
    body: '<path d="M64 4 78 44l34-18-16 36 38 8-38 8 16 36-34-18-14 40-14-40-34 18 16-36-38-8 38-8L36 26l34 18z" fill="#FFAC33"/><path d="M64 34 72 58l24-6-14 16 14 16-24-6-8 24-8-24-24 6 14-16-14-16 24 6z" fill="#FFD422"/>',
  },
  flask: {
    label: 'experiment',
    body: '<path d="M52 12h24v54l18 32a12 12 0 0 1-11 18H45a12 12 0 0 1-11-18l18-32z" fill="#E8F5FD" stroke="#8899A6" stroke-width="7" stroke-linejoin="round"/><path d="M40 92h48l7 12a6 6 0 0 1-6 10H40a6 6 0 0 1-6-10z" fill="#5CB85C"/><path d="M48 10h32" stroke="#66757F" stroke-width="8" stroke-linecap="round"/><circle cx="58" cy="72" r="5" fill="#85C8F2"/><circle cx="70" cy="82" r="4" fill="#85C8F2"/>',
  },
  puzzle: {
    label: 'parts',
    body: '<path d="M28 42h20a14 14 0 1 1 28 0h20a8 8 0 0 1 8 8v20a14 14 0 1 0 0 28v16a8 8 0 0 1-8 8H28a8 8 0 0 1-8-8V50a8 8 0 0 1 8-8z" fill="#85C861" stroke="#5C9E3F" stroke-width="6" stroke-linejoin="round"/>',
  },
  microscope: {
    label: 'lab',
    body: '<g fill="#66757F"><path d="M68 12h18l10 34H58z"/><rect x="66" y="46" width="16" height="20" rx="4"/><rect x="28" y="66" width="76" height="12" rx="6"/><path d="M50 82h32v14H50z"/><rect x="20" y="100" width="88" height="14" rx="7"/></g><circle cx="76" cy="36" r="7" fill="#85C8F2"/>',
  },
  gear: {
    label: 'settings',
    body: '<circle cx="64" cy="64" r="32" fill="#8899A6"/><g stroke="#8899A6" stroke-width="15" stroke-linecap="round"><path d="M64 12v16M64 100v16M12 64h16M100 64h16M27 27l11 11M90 90l11 11M101 27 90 38M38 90 27 101"/></g><circle cx="64" cy="64" r="13" fill="#F5F8FA"/>',
  },
  lock: {
    label: 'locked',
    body: '<path d="M42 58V42a22 22 0 0 1 44 0v16" fill="none" stroke="#8899A6" stroke-width="13"/><rect x="26" y="56" width="76" height="58" rx="12" fill="#FFCC4D"/><rect x="58" y="74" width="12" height="24" rx="6" fill="#8899A6"/>',
  },
  unlock: {
    label: 'unlocked',
    body: '<path d="M40 58V42a22 22 0 0 1 43-4" fill="none" stroke="#8899A6" stroke-width="13"/><rect x="26" y="56" width="76" height="58" rx="12" fill="#FFCC4D"/><rect x="58" y="74" width="12" height="24" rx="6" fill="#8899A6"/>',
  },
  compass: {
    label: 'guide',
    body: '<circle cx="64" cy="64" r="52" fill="#5C9EDE"/><circle cx="64" cy="64" r="38" fill="#F5F8FA"/><path d="M64 34 78 62 64 94 50 62z" fill="#DD2E44"/><path d="M64 34 78 62 64 62z" fill="#F4900C"/>',
  },
  toolbox: {
    label: 'tools',
    body: '<rect x="14" y="50" width="100" height="58" rx="10" fill="#DD2E44"/><path d="M48 50V38a16 16 0 0 1 32 0v12" fill="none" stroke="#8899A6" stroke-width="11"/><rect x="50" y="66" width="28" height="14" rx="6" fill="#FFCC4D"/><path d="M14 78h100" stroke="#A02034" stroke-width="8"/>',
  },
  magnet: {
    label: 'attraction',
    body: '<path d="M28 20h24v46a12 12 0 0 0 24 0V20h24v46a36 36 0 0 1-72 0z" fill="#DD2E44"/><rect x="28" y="14" width="24" height="16" rx="3" fill="#C1694F"/><rect x="76" y="14" width="24" height="16" rx="3" fill="#C1694F"/>',
  },
  envelope: {
    label: 'email',
    body: '<rect x="10" y="30" width="108" height="68" rx="10" fill="#F5F8FA" stroke="#8899A6" stroke-width="8"/><path d="M14 38 64 74l50-36" fill="none" stroke="#8899A6" stroke-width="8" stroke-linejoin="round"/>',
  },
  bookClosed: {
    label: 'guide book',
    body: '<path d="M24 14h66a14 14 0 0 1 14 14v72a14 14 0 0 1-14 14H24z" fill="#1D9BF0"/><rect x="24" y="14" width="12" height="100" fill="#0C7ABF"/><path d="M50 44h34M50 62h24" stroke="#BBDDFF" stroke-width="9" stroke-linecap="round"/>',
  },
  memo: {
    label: 'notes',
    body: '<rect x="18" y="18" width="76" height="94" rx="8" fill="#F5F8FA" stroke="#8899A6" stroke-width="6"/><path d="M32 44h46M32 62h36" stroke="#8899A6" stroke-width="8" stroke-linecap="round"/><path d="M112 36 80 68l-6 18 18-6 32-32z" fill="#FFAC33" stroke="#F4900C" stroke-width="6" stroke-linejoin="round"/>',
  },
  calendar: {
    label: 'date',
    body: '<rect x="14" y="26" width="100" height="90" rx="12" fill="#F5F8FA"/><rect x="14" y="26" width="100" height="26" rx="12" fill="#DD2E44"/><g stroke="#8899A6" stroke-width="9" stroke-linecap="round"><path d="M40 12v22M88 12v22"/></g><g fill="#8899A6"><rect x="30" y="64" width="18" height="15" rx="4"/><rect x="55" y="64" width="18" height="15" rx="4"/><rect x="80" y="64" width="18" height="15" rx="4"/><rect x="30" y="88" width="18" height="15" rx="4"/><rect x="55" y="88" width="18" height="15" rx="4"/></g>',
  },
  writing: {
    label: 'author',
    body: '<path d="M96 12 58 50l20 20 38-38z" fill="#FFAC33" stroke="#F4900C" stroke-width="6" stroke-linejoin="round"/><path d="M52 56 24 84l-8 28 28-8 28-28z" fill="#FFD983" stroke="#F4900C" stroke-width="6" stroke-linejoin="round"/><path d="M20 108 30 86l14 14z" fill="#55AEA6"/>',
  },
  phone: {
    label: 'mobile',
    body: '<rect x="34" y="8" width="60" height="112" rx="14" fill="#66757F"/><rect x="41" y="22" width="46" height="76" rx="5" fill="#C7E8FA"/><rect x="50" y="14" width="28" height="5" rx="2.5" fill="#8899A6"/><circle cx="64" cy="109" r="6" fill="#8899A6"/>',
  },
  redCircle: {
    label: 'alert dot',
    body: '<circle cx="64" cy="64" r="46" fill="#DD2E44"/>',
  },
  plug: {
    label: 'plug',
    body: '<path d="M46 12v30M82 12v30" stroke="#8899A6" stroke-width="14" stroke-linecap="round"/><path d="M30 42h68v16a34 34 0 0 1-68 0z" fill="#66757F"/><path d="M64 92v26" stroke="#66757F" stroke-width="13" stroke-linecap="round"/>',
  },
  wrench: {
    label: 'repair',
    body: '<path d="M92 16a30 30 0 0 0-38 38L18 90a12 12 0 0 0 17 17l36-36a30 30 0 0 0 38-38l-18 18-17-3-3-17z" fill="#8899A6" stroke="#66757F" stroke-width="6" stroke-linejoin="round"/>',
  },
  graduation: {
    label: 'learn',
    body: '<path d="M64 20 122 46 64 72 6 46z" fill="#66757F"/><path d="M34 62v26c0 12 14 20 30 20s30-8 30-20V62L64 76z" fill="#8899A6"/><path d="M118 50v34" stroke="#FFCC4D" stroke-width="8" stroke-linecap="round"/><circle cx="118" cy="90" r="8" fill="#FFCC4D"/>',
  },
  books: {
    label: 'library',
    body: '<rect x="12" y="52" width="20" height="60" rx="4" fill="#DD2E44"/><rect x="34" y="40" width="20" height="72" rx="4" fill="#5C9EDE"/><rect x="56" y="56" width="20" height="56" rx="4" fill="#FFCC4D"/><path d="M78 108 118 56l10 6-40 52z" fill="#85C861"/>',
  },
  floppy: {
    label: 'save',
    body: '<rect x="16" y="16" width="96" height="96" rx="10" fill="#5C9EDE"/><rect x="36" y="16" width="56" height="34" rx="4" fill="#F5F8FA"/><rect x="68" y="22" width="14" height="22" rx="3" fill="#66757F"/><rect x="34" y="66" width="60" height="40" rx="6" fill="#C7E8FA"/>',
  },
  shuffle: {
    label: 'swap',
    body: '<g fill="none" stroke="#66757F" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"><path d="M12 40h22c14 0 20 48 34 48h18"/><path d="M12 88h22c14 0 20-48 34-48h18"/><path d="M94 16l24 24-24 24M94 64l24 24-24 24"/></g>',
  },
  nerd: {
    label: 'nerd',
    body: '<circle cx="64" cy="64" r="52" fill="#FFD983"/><g fill="#F5F8FA" stroke="#66757F" stroke-width="7"><circle cx="44" cy="60" r="17"/><circle cx="84" cy="60" r="17"/></g><path d="M27 60h74" stroke="#66757F" stroke-width="7"/><g fill="#66757F"><circle cx="46" cy="60" r="6"/><circle cx="82" cy="60" r="6"/></g><path d="M42 92q22 16 44 0" fill="none" stroke="#66757F" stroke-width="8" stroke-linecap="round"/>',
  },
  print: {
    label: 'print',
    body: '<rect x="28" y="14" width="72" height="30" rx="4" fill="#8899A6"/><rect x="14" y="44" width="100" height="44" rx="8" fill="#66757F"/><rect x="32" y="76" width="64" height="38" rx="4" fill="#F5F8FA"/><circle cx="98" cy="58" r="6" fill="#5CB85C"/>',
  },
  globe: {
    label: 'web',
    body: '<circle cx="64" cy="64" r="52" fill="#5C9EDE"/><path d="M12 64h104M64 12c-20 22-20 82 0 104 20-22 20-82 0-104z" fill="none" stroke="#C7E8FA" stroke-width="8"/>',
  },
  paint: {
    label: 'palette',
    body: '<path d="M64 14a50 50 0 0 0 0 100c10 0 14-6 14-12s-4-10-4-16 6-10 14-10h12a14 14 0 0 0 14-14C114 38 92 14 64 14z" fill="#FFAC33"/><g fill="#F5F8FA"><circle cx="44" cy="42" r="8"/><circle cx="70" cy="34" r="8"/><circle cx="94" cy="52" r="8"/><circle cx="38" cy="70" r="8"/></g>',
  },
  eye: {
    label: 'visibility',
    body: '<path d="M4 64c14-26 34-38 60-38s46 12 60 38c-14 26-34 38-60 38S18 90 4 64z" fill="#C7E8FA"/><circle cx="64" cy="64" r="20" fill="#5C9EDE"/><circle cx="64" cy="64" r="8" fill="#22303C"/>',
  },
  chat: {
    label: 'tooltip',
    body: '<path d="M14 24a12 12 0 0 1 12-12h76a12 12 0 0 1 12 12v48a12 12 0 0 1-12 12H56l-24 20V84H26a12 12 0 0 1-12-12z" fill="#5C9EDE"/><g fill="#F5F8FA"><circle cx="46" cy="48" r="7"/><circle cx="66" cy="48" r="7"/><circle cx="86" cy="48" r="7"/></g>',
  },
  bellOff: {
    label: 'muted',
    body: '<path d="M64 12a26 26 0 0 1 26 26v18l8 18H30l8-18V38z" fill="#8899A6"/><path d="M52 84a12 12 0 0 0 24 0z" fill="#66757F"/><path d="M20 20 108 108" stroke="#DD2E44" stroke-width="12" stroke-linecap="round"/>',
  },
  grid: {
    label: 'grid',
    body: '<rect x="14" y="14" width="100" height="100" rx="12" fill="#C7E8FA"/><g fill="#5C9EDE"><circle cx="42" cy="42" r="9"/><circle cx="86" cy="42" r="9"/><circle cx="42" cy="86" r="9"/><circle cx="86" cy="86" r="9"/></g>',
  },
  map: {
    label: 'mini-map',
    body: '<path d="M14 30 46 18l32 12 32-12v74l-32 12-32-12-32 12z" fill="#A6D7F0"/><path d="M46 18v74M78 30v74" stroke="#1D9BF0" stroke-width="7"/><circle cx="64" cy="56" r="10" fill="#DD2E44"/>',
  },
  wave: {
    label: 'waveform',
    body: '<path d="M6 64c12-28 22-28 32 0s20 28 32 0 22-28 32 0" fill="none" stroke="#5C9EDE" stroke-width="13" stroke-linecap="round"/>',
  },
  car: {
    label: 'performance',
    body: '<path d="M18 78l10-26a14 14 0 0 1 13-9h38a14 14 0 0 1 12 7l12 22 12 4a8 8 0 0 1 6 8v12h-18a14 14 0 0 0-28 0H42a14 14 0 0 0-28 0H14V86a8 8 0 0 1 4-8z" fill="#DD2E44"/><g fill="#C7E8FA"><path d="M44 48h28l10 20H40z"/></g><g fill="#22303C"><circle cx="36" cy="96" r="11"/><circle cx="94" cy="96" r="11"/></g>',
  },
  cap: {
    label: 'study',
    body: '<path d="M64 20 122 46 64 72 6 46z" fill="#66757F"/><path d="M34 62v26c0 12 14 20 30 20s30-8 30-20V62L64 76z" fill="#8899A6"/><path d="M118 50v34" stroke="#FFCC4D" stroke-width="8" stroke-linecap="round"/><circle cx="118" cy="90" r="8" fill="#FFCC4D"/>',
  },
  trophy: {
    label: 'achievement',
    body: '<path d="M36 18h56v26a28 28 0 0 1-56 0z" fill="#FFCC4D"/><path d="M36 24H20a16 16 0 0 0 16 24zM92 24h16a16 16 0 0 1-16 24z" fill="none" stroke="#FFCC4D" stroke-width="9"/><rect x="56" y="70" width="16" height="18" fill="#F4900C"/><rect x="38" y="90" width="52" height="16" rx="6" fill="#FFCC4D"/>',
  },
  stopwatch: {
    label: 'reading time',
    body: '<circle cx="64" cy="72" r="44" fill="#F5F8FA" stroke="#66757F" stroke-width="9"/><circle cx="64" cy="72" r="33" fill="#C7E8FA"/><path d="M64 40v32l22 13" fill="none" stroke="#1D9BF0" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><rect x="47" y="10" width="34" height="16" rx="8" fill="#8899A6"/><circle cx="81" cy="18" r="11" fill="#8899A6"/><circle cx="64" cy="72" r="4" fill="#1D9BF0"/>',
  },
};

/**
 * Pictograph code point → icon name, so legacy markup and content can still be
 * matched mechanically. Keys are written as escapes on purpose: the repository
 * stays free of literal emoji (which is what this module replaces) while the
 * map still matches them at runtime.
 */
export const EMOJI_TO_NAME: Record<string, string> = {
  '\u26A1': 'bolt',
  '\uD83D\uDCA1': 'bulb',
  '\uD83D\uDD17': 'link',
  '\u2139\uFE0F': 'info',
  '\u26A0\uFE0F': 'warning',
  '\u2705': 'check',
  '\u274C': 'cross',
  '\uD83D\uDCCA': 'chart',
  '\uD83D\uDD04': 'reset',
  '\uD83D\uDCD0': 'ruler',
  '\uD83D\uDCD6': 'book',
  '\uD83D\uDCE6': 'box',
  '\u2753': 'question',
  '\uD83C\uDF13': 'contrast',
  '\uD83C\uDFE0': 'home',
  '\u2600\uFE0F': 'sun',
  '\uD83C\uDF19': 'moon',
  '\uD83D\uDD0D': 'search',
  '\uD83E\uDDCA': 'ice',
  '\uD83D\uDCDC': 'scroll',
  '\uD83D\uDCCB': 'clipboard',
  '\uD83D\uDDB1\uFE0F': 'mouse',
  '\u2702\uFE0F': 'scissors',
  '\uD83D\uDCA5': 'burst',
  '\uD83E\uDDEA': 'flask',
  '\uD83E\uDDE9': 'puzzle',
  '\uD83D\uDD2C': 'microscope',
  '\u2699\uFE0F': 'gear',
  '\uD83D\uDD12': 'lock',
  '\uD83D\uDD13': 'unlock',
  '\uD83E\uDDED': 'compass',
  '\uD83E\uDDF0': 'toolbox',
  '\uD83E\uDDF2': 'magnet',
  '\u2709\uFE0F': 'envelope',
  '\uD83D\uDCD8': 'bookClosed',
  '\uD83D\uDCDD': 'memo',
  '\uD83D\uDCC5': 'calendar',
  '\u270D\uFE0F': 'writing',
  '\uD83D\uDCF1': 'phone',
  '\uD83D\uDD34': 'redCircle',
  '\uD83D\uDD0C': 'plug',
  '\uD83D\uDD27': 'wrench',
  '\uD83C\uDF93': 'graduation',
  '\uD83D\uDCDA': 'books',
  '\uD83D\uDCBE': 'floppy',
  '\uD83D\uDD00': 'shuffle',
  '\uD83E\uDD13': 'nerd',
  '\uD83D\uDDA8\uFE0F': 'print',
  '\uD83C\uDF10': 'globe',
  '\uD83C\uDFA8': 'paint',
  '\uD83D\uDC41\uFE0F': 'eye',
  '\uD83D\uDCAC': 'chat',
  '\uD83D\uDD15': 'bellOff',
  '\uD83D\uDD32': 'grid',
  '\uD83D\uDDFA\uFE0F': 'map',
  '\u3030\uFE0F': 'wave',
  '\uD83C\uDFCE\uFE0F': 'car',
  '\uD83C\uDFC6': 'trophy',
  // Text-presentation forms (no variation selector) — authors use both, and the
  // markdown/legacy matchers must resolve either spelling to the same vector.
  '\u26A0': 'warning',
  '\u2139': 'info',
  '\u2600': 'sun',
  '\u270D': 'writing',
  '\u2702': 'scissors',
  '\u2699': 'gear',
  '\u23F1': 'stopwatch',
  '\u23F1\uFE0F': 'stopwatch',
};

export interface EmojiIconEntry {
  name: string;
  body: string;
  label: string;
}

/**
 * Resolve either an emoji character or a semantic icon name to its vector
 * definition. Unknown keys fall back to the bolt (the site's brand glyph) so
 * a stray character in content JSON can never render an empty box.
 */
export function resolveEmojiIcon(key: string | undefined | null): EmojiIconEntry {
  const trimmed = (key ?? '').trim();
  const name = EMOJI_TO_NAME[trimmed] ?? trimmed;
  const def = DEFS[name];
  if (def) return { name, body: def.body, label: def.label };
  return { name: 'bolt', body: DEFS.bolt.body, label: DEFS.bolt.label };
}

/** Is there a vector replica registered for this icon name? */
export function hasEmojiIcon(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(DEFS, name);
}

/** Number of distinct emoji still present in the palette (used by tests/docs). */
export const EMOJI_ICON_COUNT = Object.keys(EMOJI_TO_NAME).length;
