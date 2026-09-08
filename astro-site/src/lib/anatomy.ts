import type { CollectionEntry } from 'astro:content';

export type AnatomyPoint = {
  id: string;
  label: string;
  detail: string;
  /** Position in the SVG's viewBox coordinate space. */
  x: number;
  y: number;
};

/**
 * Optional photorealistic render. `points[].x/y` are PERCENTAGES of the image
 * box (see the schema note in content.config.ts) matched to anatomy points
 * by `id`, so labels and descriptions stay in one place.
 */
export type AnatomyPhoto = {
  /** Path under /public without extension; both `.webp` and `.png` exist. */
  src: string;
  alt: string;
  width: number;
  height: number;
  points: { id: string; x: number; y: number }[];
};

export type ToolAnatomy = {
  slug: string;
  name: string;
  tagline: string;
  category: string;
  parts: string[];
  safety?: string;
  svg: { viewBox: string; body: string };
  points: AnatomyPoint[];
  photo?: AnatomyPhoto;
};

export type ComponentAnatomy = {
  slug: string;
  name: string;
  tagline: string;
  category: string;
  terminals: string[];
  parts: string[];
  safety?: string;
  svg: { viewBox: string; body: string };
  points: AnatomyPoint[];
  photo?: AnatomyPhoto;
};

export type ToolEntry = CollectionEntry<'guideTools'>;
export type ComponentEntry = CollectionEntry<'guideComponents'>;

/**
 * Embeddable SVG fragments for anatomy cards are declared in the content JSON
 * as `{ viewBox, body }`, where `body` is the SVG inner markup (no root
 * element) rendered with `set:html`. The markup carries only class hooks (no
 * inline style attributes) so the strict CSP (`style-src 'self'`) holds and
 * the drawings can be re-themed purely in CSS (`guide-lab.css`).
 */
export type AnatomySvgFragment = { viewBox: string; body: string };
