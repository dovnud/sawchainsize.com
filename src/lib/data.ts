import { getCollection, type CollectionEntry } from 'astro:content';
import spec from '../data/chain-specs.json';

export const SITE = {
  url: 'https://sawchainsize.com',
  name: 'SawChainSize.com',
  tagline: 'Chainsaw Chain Size Lookup by Saw Model & Bar',
  email: 'contact@sawchainsize.com',
  dataDate: '2026-10-23',
  dataDateLabel: '23 October 2026',
  defaultOg: '/og/default.png',
};

export type Model = CollectionEntry<'models'>;
export type Bar = Model['data']['bars'][number];
export type Brand = CollectionEntry<'brands'>;

export const SPEC = spec;
type PitchKey = keyof typeof spec.pitches;

export const pitchLabel = (p: string | null) => (p ? spec.pitches[p as PitchKey].label : '');
export const pitchShort = (p: string | null) => (p ? spec.pitches[p as PitchKey].short : '');
export const gaugeLabel = (g: number | null) => (g ? (spec.gauges as any)[String(g)].label : '');
export const gaugeShort = (g: number | null) => (g ? (spec.gauges as any)[String(g)].short : '');
export const fileLabel = (f: string | null) => (f ? (spec.files as any)[f] : '');

export const SOURCE_TYPE_LABEL: Record<string, string> = {
  manual: 'manufacturer manual', 'fitup-chart': 'fit-up chart', 'chain-maker': 'chain-maker data', dealer: 'dealer listing',
  roundup: 'one roundup', marketplace: 'marketplace listing', blog: 'chainsaw blog', forum: 'owner report',
};

export async function getModels(): Promise<Model[]> {
  const [models, brands] = await Promise.all([getCollection('models'), getCollection('brands')]);
  const order = new Map(brands.map((b) => [b.id, b.data.order]));
  return models.sort((a, b) => (order.get(a.data.brand)! - order.get(b.data.brand)!) || a.data.name.localeCompare(b.data.name));
}
export async function getBrands(): Promise<Brand[]> {
  return (await getCollection('brands')).sort((a, b) => a.data.order - b.data.order);
}

export const modelUrl = (m: Model | string) => `/saws/${typeof m === 'string' ? m : m.id}/`;
export const brandUrl = (b: string) => `/brands/${b}/`;
export const barUrl = (len: number) => `/bars/${len}-inch/`;
export const chainUrl = (key: string) => `/chain/${key}/`;

export const barLabel = (b: Bar) => b.label ?? b.lengths_in.map((l) => `${l}″`).join(' / ');
export const barHasLength = (b: Bar, len: number) => b.lengths_in.includes(len);

/** URL key for a pitch+gauge combination, e.g. "3-8-lp-043". */
export const chainKey = (pitch: string, gauge: number) => `${(spec.pitches as any)[pitch].slug}-${(spec.gauges as any)[String(gauge)].slug}`;
export const barChainKey = (b: Bar) => (b.pitch && b.gauge ? chainKey(b.pitch, b.gauge) : null);

export function dlText(b: Bar, m: Model): string {
  if (b.drive_links) return String(b.drive_links);
  if (b.status === 'conflict') {
    const parts = (b.reported ?? []).filter((r) => r.drive_links).map((r) => `${r.drive_links}`);
    const labelled = (b.reported ?? []).filter((r) => r.drive_links).map((r) => `${r.drive_links} (${SOURCE_TYPE_LABEL[m.data.sources.find((s) => s.id === r.source_id)?.type ?? ''] ?? 'source'})`);
    return parts.length ? labelled.join(' · ') : 'Verify on your bar stamp';
  }
  if (b.drive_links_range) return `${b.drive_links_range[0]}–${b.drive_links_range[1]} by exact bar (manual range)`;
  return 'Verify on your bar stamp';
}

export function pitchText(b: Bar): string {
  if (b.pitch) return pitchLabel(b.pitch);
  const ps = [...new Set((b.reported ?? []).map((r) => r.pitch).filter(Boolean))] as string[];
  return ps.length ? `Reported both ${ps.map(pitchShort).join(' and ')}` : 'Verify on your bar stamp';
}
export function gaugeText(b: Bar): string {
  if (b.gauge) return gaugeLabel(b.gauge);
  if (b.gauge_note) return b.gauge_note + '';
  const gs = [...new Set((b.reported ?? []).map((r) => r.gauge).filter(Boolean))] as number[];
  return gs.length ? `Reported ${gs.sort().map(gaugeShort).join(' and ')}` : 'Verify on your bar stamp';
}
export function fileText(b: Bar): string {
  if (b.file_size) return fileLabel(b.file_size);
  return 'By pitch: .325″ → 3/16″ · 3/8″ → 7/32″';
}
export const oemParts = (b: Bar) => b.chains.filter((c) => c.role === 'oem');
export const equivParts = (b: Bar) => b.chains.filter((c) => c.role === 'equivalent');
export const partText = (c: { brand: string; part_no: string }) => `${c.brand} ${c.part_no}`;
export function oregonType(b: Bar): string {
  const o = b.chains.find((c) => c.brand === 'Oregon');
  return o ? o.part_no.split(' ')[0] : '—';
}

export const statusLabel = (s: string) => (s === 'ok' ? 'VERIFIED' : s === 'conflict' ? 'SOURCES CONFLICT' : 'VERIFY ON BAR STAMP');
export const hasConflict = (m: Model) => m.data.bars.some((b) => b.status === 'conflict');

/** Group of saws for chain-spec pages / bar-length pages. */
export async function chainGroups() {
  const models = await getModels();
  const map = new Map<string, { key: string; pitch: string; gauge: number; items: { model: Model; bar: Bar }[] }>();
  for (const model of models) {
    for (const bar of model.data.bars) {
      const key = barChainKey(bar);
      if (!key) continue;
      if (!map.has(key)) map.set(key, { key, pitch: bar.pitch!, gauge: bar.gauge!, items: [] });
      map.get(key)!.items.push({ model, bar });
    }
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

/** Bar-length pages are only generated when at least two saw models share that length (no thin pages). */
export async function barGroups() {
  const models = await getModels();
  const map = new Map<number, { length: number; items: { model: Model; bar: Bar }[] }>();
  for (const model of models) {
    for (const bar of model.data.bars) for (const len of bar.lengths_in) {
      if (!map.has(len)) map.set(len, { length: len, items: [] });
      map.get(len)!.items.push({ model, bar });
    }
  }
  return [...map.values()].filter((g) => new Set(g.items.map((i) => i.model.id)).size >= 2).sort((a, b) => a.length - b.length);
}

export function codesFor(pitch: string, gauge: number) {
  return spec.codes.find((c) => c.pitch === pitch && c.gauge === gauge);
}

export type Faq = { q: string; a: string };

export function modelFaqs(m: Model): Faq[] {
  const d = m.data;
  const faqs: Faq[] = [];
  const okBars = d.bars.filter((b) => b.status === 'ok');
  if (hasConflict(m)) {
    faqs.push({ q: `What size chain does a ${d.name} take?`, a: `Published sources disagree for the ${d.name}: listings variously report .325 inch pitch / .063 inch gauge, 3/8 inch pitch / .050 inch gauge, and 62 drive links (16 inch bar) or 72 drive links (18 inch bar). The chain depends on the bar actually fitted to the saw, so read the stamp on your bar tail before ordering.` });
  } else {
    const lines = okBars.map((b) => `${barLabel(b)} bar: ${pitchLabel(b.pitch)} pitch, ${gaugeLabel(b.gauge)} gauge, ${b.drive_links} drive links${b.chains.find((c) => c.role === 'oem') ? ` (${partText(b.chains.find((c) => c.role === 'oem')!)})` : ''}`);
    faqs.push({ q: `What size chain does a ${d.name} take?`, a: `${lines.join('; ')}. Other bar lengths are listed as "verify on your bar stamp" because we only print drive-link counts we can trace to a citable source. Always confirm pitch, gauge and drive links on your own bar stamp.` });
  }
  faqs.push({ q: `How do I check the chain size on my ${d.name}?`, a: `Take the clutch cover off, lift the bar out and read the stamp on the bar tail: it shows bar length, pitch, gauge and usually the drive-link count. Match all three numbers; if your stamp disagrees with a chart, order to the stamp.` });
  const files = [...new Set(d.bars.map((b) => b.file_size).filter(Boolean))].map((f) => fileLabel(f as string));
  if (files.length) faqs.push({ q: `What file size sharpens the ${d.name} chain?`, a: `${files.join(' or ')} round file, depending on the pitch of the chain fitted. File size follows pitch: 3/8 inch low-profile takes 5/32 inch, .325 inch takes 3/16 inch, and standard 3/8 inch takes 7/32 inch.` });
  return faqs;
}

export const HOME_FAQS: Faq[] = [
  { q: 'What size chain does a Stihl MS 250 take?', a: 'There is no single honest answer, because MS 250s left dealers with different bars — and published sources disagree with each other. Listings we checked report .325″ pitch / .063″ gauge / 68 drive links, 3/8″ pitch / .050″ gauge, and 62 drive links (16″ bar) / 72 drive links (18″ bar). Read the stamp on your bar tail, then match all three numbers. The MS 250 page lays out each reported variant side by side.' },
  { q: 'How do I know my chain size if I threw the box away?', a: 'Read the stamp on the tail of the guide bar (you will need to take the bar cover off — two nuts on most saws). It shows bar length, pitch, gauge and usually the drive-link count. No readable stamp? Count the drive links on your old chain and measure the pitch: distance across three consecutive rivets, divided by two. The verification guide walks through all three methods.' },
  { q: 'Oregon 72 vs 73 chain — what is the difference?', a: 'Same pitch (3/8″), different gauge: 72 is .050″ and 73 is .058″. This is the classic wrong buy in this category — the boxes look identical. A .058″ chain will not seat in a .050″ bar groove, and a .050″ chain in a .058″ groove runs sloppy and can derail. Check the gauge number on your bar stamp before you order. Full code table on the identification chart.' },
  { q: 'How many drive links do I need?', a: 'As many as the bar fitted to your saw was built for — the count is stamped on the bar tail on most bars, and it changes with bar length even on the same saw. A 20″ Husqvarna 455 Rancher bar takes 72 drive links; the same saw on a shorter .325″ setup can take anywhere from 56 to 78 depending on the exact bar. Never order by model name alone.' },
  { q: 'Can I run a different-gauge chain if the pitch matches?', a: 'No. Gauge is the thickness of the drive links, and it must match the width of the groove in your guide bar. A thicker chain will not seat; a thinner one wobbles in the groove, wears the bar rails unevenly and can jump off. Pitch, gauge and drive links all have to match.' },
  { q: 'What file size do I need to sharpen my chain?', a: 'File size follows pitch: 3/8″ low-profile → 5/32″ (4.0 mm); .325″ → 3/16″ (4.8 mm); standard 3/8″ and .404″ → 7/32″ (5.2–5.5 mm). Every model page on this site lists the file size next to the chain spec, and the identification chart has the full table.' },
];

export const ldEscape = (o: unknown) => JSON.stringify(o).replace(/</g, '\\u003c');
