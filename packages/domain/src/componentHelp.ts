/**
 * Component help registry — public entry point.
 *
 * The former 919-line monolith now lives in `./componentHelp/` split into
 * zone modules (protection, switches/controls, sockets, lighting,
 * loads/supply). This shim preserves the historical import path.
 */

export * from './componentHelp/index';
export type { ComponentHelpData } from './componentHelp/types';
