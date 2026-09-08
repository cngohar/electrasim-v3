import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string().default('ElectraSim'),
    tags: z.array(z.string()).default([]),
    category: z.string().default('Guide'),
    image: z.string().optional(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/pages' }),
  schema: z.record(z.string(), z.any()),
});

/** A single hotzone-point on an anatomy SVG. Coordinates live in the SVG's viewBox space. */
const anatomyPointSchema = z.object({
  id: z.string(),
  label: z.string(),
  detail: z.string(),
  x: z.number(),
  y: z.number(),
});

/**
 * Optional photorealistic render used instead of the drawing.
 *
 * `points` carries PERCENT coordinates (0–100 of the image box) for the
 * subset of anatomy points that are visible from outside the part — internal
 * parts (trip mechanisms, shutters) stay on the drawing only. Percentages
 * (rather than pixels) keep the markers correct at every render size, and
 * they are matched to the anatomy points by `id`, so the label and detail
 * copy is never duplicated.
 */
const anatomyPhotoSchema = z.object({
  /** Path under /public, without extension — `.webp` and `.png` are both emitted. */
  src: z.string(),
  alt: z.string(),
  width: z.number(),
  height: z.number(),
  points: z
    .array(
      z.object({
        id: z.string(),
        x: z.number(),
        y: z.number(),
      }),
    )
    .default([]),
});

/** Hand tools & accessories — embedded SVG + anatomy hotspots. */
const guideTools = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/guide-tools' }),
  schema: z.object({
    slug: z.string(),
    name: z.string(),
    tagline: z.string(),
    category: z.string().default('Hand tool'),
    parts: z.array(z.string()).default([]),
    safety: z.string().optional(),
    svg: z.object({ viewBox: z.string(), body: z.string() }),
    points: z.array(anatomyPointSchema),
    photo: anatomyPhotoSchema.optional(),
  }),
});

/** Electrical components — same anatomy-card treatment, plus terminal roles. */
const guideComponents = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/guide-components' }),
  schema: z.object({
    slug: z.string(),
    name: z.string(),
    tagline: z.string(),
    category: z.string().default('Electrical component'),
    terminals: z.array(z.string()).default([]),
    parts: z.array(z.string()).default([]),
    safety: z.string().optional(),
    svg: z.object({ viewBox: z.string(), body: z.string() }),
    points: z.array(anatomyPointSchema),
    photo: anatomyPhotoSchema.optional(),
  }),
});

/** Product release notes — kept out of the educational blog corpus. */
const updates = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/updates' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string().default('ElectraSim'),
    /** e.g. "v1.6" — shown as a version badge on the changelog; optional */
    version: z.string().optional(),
    tags: z.array(z.string()).default([]),
    category: z.string().default('App Update'),
    image: z.string().optional(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog, pages, updates, guideTools, guideComponents };
