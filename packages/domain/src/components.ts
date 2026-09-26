/**
 * Component registry — public entry point.
 *
 * The 90-entry, ~1,400-line registry now lives in `./components/`, split
 * into cohesive zones (switches, lighting, protection, ...). This shim
 * preserves the historical import path.
 *
 * IMPORTANT: keep this file free of direct component declarations — add new
 * components to the matching zone module instead.
 */

export * from './components/index';
