import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/** Allowed enums — a build fails on anything else. */
export const PITCHES = ['1/4', '3/8-lp', '325', '3/8', '404'] as const;
export const GAUGES = [0.043, 0.05, 0.058, 0.063] as const;
export const STATUSES = ['ok', 'verify', 'conflict'] as const;
export const SOURCE_TYPES = ['manual', 'fitup-chart', 'chain-maker', 'dealer', 'roundup', 'marketplace', 'blog', 'forum'] as const;
/** A bar may only be "ok" when at least one of its sources is one of these. */
export const AUTHORITATIVE = ['manual', 'fitup-chart', 'chain-maker', 'dealer'] as const;

const pitch = z.enum(PITCHES);
const gauge = z.union(GAUGES.map((g) => z.literal(g)) as unknown as [z.ZodLiteral<number>, z.ZodLiteral<number>, ...z.ZodLiteral<number>[]]);

const source = z.object({
  id: z.string(),
  type: z.enum(SOURCE_TYPES),
  publisher: z.string(),
  title: z.string(),
  url: z.string().url().optional(),
  retrieved: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const chainPart = z.object({
  brand: z.string(),
  part_no: z.string(),
  role: z.enum(['oem', 'equivalent']),
});

const reported = z.object({
  source_id: z.string(),
  pitch: pitch.optional(),
  gauge: gauge.optional(),
  drive_links: z.number().int().positive().optional(),
});

const bar = z.object({
  lengths_in: z.array(z.number().int().min(8).max(42)).min(1),
  label: z.string().optional(),
  pitch: pitch.nullable(),
  gauge: gauge.nullable(),
  drive_links: z.number().int().min(20).max(140).nullable(),
  drive_links_range: z.tuple([z.number().int(), z.number().int()]).optional(),
  gauge_note: z.string().optional(),
  file_size: z.enum(['1/8', '5/32', '3/16', '7/32']).nullable(),
  status: z.enum(STATUSES),
  chains: z.array(chainPart),
  reported: z.array(reported).optional(),
  source_ids: z.array(z.string()).min(1),
  note: z.string(),
});

const models = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/models' }),
  schema: z
    .object({
      brand: z.string(),
      model: z.string(),
      name: z.string(),
      aliases: z.array(z.string()).default([]),
      type: z.enum(['gas', 'battery', 'electric']),
      displacement_cc: z.number().optional(),
      popular: z.boolean().default(false),
      blurb: z.string(),
      intro: z.string(),
      bars: z.array(bar).min(1),
      sources: z.array(source).min(1),
      sources_note: z.string(),
      last_verified: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
    .superRefine((m, ctx) => {
      const byId = new Map(m.sources.map((s) => [s.id, s]));
      m.bars.forEach((b, i) => {
        const at = ['bars', i];
        for (const id of b.source_ids) {
          if (!byId.has(id)) ctx.addIssue({ code: 'custom', path: at, message: `unknown source id ${id}` });
        }
        if (b.status === 'ok') {
          if (!b.pitch || !b.gauge || !b.drive_links || !b.file_size)
            ctx.addIssue({ code: 'custom', path: at, message: 'status "ok" requires pitch, gauge, drive_links and file_size' });
          if (!b.source_ids.some((id) => (AUTHORITATIVE as readonly string[]).includes(byId.get(id)?.type ?? '')))
            ctx.addIssue({ code: 'custom', path: at, message: 'status "ok" requires a manual / fit-up chart / chain-maker / dealer source' });
        }
        if (b.status === 'conflict') {
          const vals = new Set((b.reported ?? []).flatMap((r) => [r.pitch && `p:${r.pitch}`, r.gauge && `g:${r.gauge}`, r.drive_links && `d:${r.drive_links}`]).filter(Boolean));
          const sources = new Set((b.reported ?? []).map((r) => r.source_id));
          if (vals.size < 2 || sources.size < 2)
            ctx.addIssue({ code: 'custom', path: at, message: 'status "conflict" needs ≥2 distinct reported values from ≥2 sources' });
        }
        if (b.status === 'verify' && b.drive_links && !b.drive_links_range)
          ctx.addIssue({ code: 'custom', path: at, message: 'status "verify" must not print a single drive-link count' });
      });
    }),
});

const brands = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/brands' }),
  schema: z.object({
    name: z.string(),
    label: z.string(),
    country: z.string(),
    site: z.string().url(),
    order: z.number(),
    summary: z.string(),
    trademark: z.string(),
  }),
});

export const collections = { models, brands };
