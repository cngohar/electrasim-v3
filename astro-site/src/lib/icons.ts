/**
 * Line-art icon bodies (24×24, stroked, no fill).
 *
 * Kept in a plain module rather than component frontmatter: Astro's
 * frontmatter scanner treats a line beginning with `export` as a hoisted
 * export, so `export:` as an object key breaks the compile.
 */
export const ICON_PATHS: Record<string, string> = {
  bolt: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>',
  palette:
    '<rect x="3" y="4" width="7" height="7" rx="1.5"></rect><rect x="14" y="4" width="7" height="7" rx="1.5"></rect><rect x="3" y="15" width="7" height="5" rx="1.5"></rect><path d="M14 17.5h7M17.5 15v5"></path>',
  flow: '<path d="M2 12h4l3-7 4 14 3-7h6"></path>',
  fault:
    '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"></path><path d="M12 9v4.5M12 17h.01"></path>',
  route:
    '<circle cx="5" cy="6" r="2"></circle><circle cx="19" cy="18" r="2"></circle><path d="M5 8v6a2 2 0 0 0 2 2h6a2 2 0 0 1 2 2"></path><path d="M17 18h-2"></path>',
  standards:
    '<path d="M12 3 4 6v5.5c0 4.4 3.4 8.5 8 9.5 4.6-1 8-5.1 8-9.5V6l-8-3z"></path><path d="m9 12 2 2 4-4"></path>',
  share:
    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="M17 8l-5-5-5 5M12 3v13"></path>',
  monitor:
    '<rect x="2" y="3" width="20" height="14" rx="2"></rect><path d="M8 21h8M12 17v4"></path>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect><path d="M14 17.5h7M17.5 14v7"></path>',
  cable:
    '<path d="M17 12H7M7 12l4-4M7 12l4 4"></path><circle cx="19" cy="12" r="2"></circle><circle cx="5" cy="12" r="2"></circle>',
  student:
    '<path d="M22 10 12 5 2 10l10 5 10-5Z"></path><path d="M6 12v5c0 1.1 2.7 3 6 3s6-1.9 6-3v-5"></path>',
  teacher:
    '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z"></path><path d="M8 7h8M8 11h6"></path>',
  sparky:
    '<path d="M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 1 5.4-5.4l-2.6 2.6"></path>',
  hobby:
    '<circle cx="12" cy="12" r="9"></circle><path d="M9.5 9a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.4v.3"></path><path d="M12 17h.01"></path>',
  check: '<path d="m4 12 5 5L20 6"></path>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"></path>',
  chart:
    '<path d="M4 19V5M4 19h16"></path><path d="m7 15 3-4 3 2 4-6"></path><circle cx="7" cy="15" r="1"></circle><circle cx="10" cy="11" r="1"></circle><circle cx="13" cy="13" r="1"></circle><circle cx="17" cy="7" r="1"></circle>',
  pin: '<path d="m15 4 5 5-3 3-1-1-4 4v4l-2 2-2-6-6-2 2-2h4l4-4-1-1z"></path>',
};
