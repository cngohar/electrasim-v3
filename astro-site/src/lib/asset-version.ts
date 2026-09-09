import { createHash } from 'node:crypto';
// Vite inlines the file at build time, so the token always tracks the shipped bytes.
import guideLabSource from '../../public/js/guide-lab.js?raw';

/**
 * Cache-busting token for the guide lab script.
 *
 * Files under `public/` are copied verbatim and get no build hash, and a query
 * string built from the package version stays identical across any number of
 * edits — so a visitor who loaded an earlier build keeps the old script until
 * the version number moves. Hashing the contents means the URL changes exactly
 * when the script does, which is the difference between a fix landing and a fix
 * that only lands for new visitors.
 */
export const GUIDE_LAB_VERSION = createHash('sha256')
  .update(guideLabSource)
  .digest('hex')
  .slice(0, 10);
