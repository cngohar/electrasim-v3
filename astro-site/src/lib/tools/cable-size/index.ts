/**
 * index.ts — public surface of the Cable Size domain.
 *
 * UI code (Astro server render, browser engine, tests) imports from here only,
 * so the module layout underneath is free to move.
 */

export * from './types';
export * from './config';
export * from './presets';
export * from './validation';
export * from './evaluate';
export * from './visual';
export * from './explain';
export * from './format';
