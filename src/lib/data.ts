import { getCollection, type CollectionEntry } from 'astro:content';
import spec from '../data/chain-specs.json';

export const SITE = {
  url: 'https://sawchainsize.com',
  name: 'SawChainSize.com',
  tagline: 'Chainsaw Chain Size Lookup by Saw Model & Bar',
  email: 'contact@sawchainsize.com',
  dataDate: '2026-10-24',
  dataDateLabel: '24 October 2026',
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
  return 'Not stated in the source — see the chain box';
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

const NO_CODES = { oregon: '—', stihl: '—', husqvarna: '—', carlton: '—' };
export function codesFor(pitch: string, gauge: number) {
  return spec.codes.find((c) => c.pitch === pitch && c.gauge === gauge) ?? { pitch, gauge, ...NO_CODES };
}

/** File size(s) seen in the data for one chain-spec group, falling back to the pitch default. */
export function groupFile(g: { pitch: string; items: { bar: Bar }[] }): string {
  const fs = [...new Set(g.items.map((i) => i.bar.file_size).filter(Boolean))] as string[];
  return fs.length ? fs.map((f) => fileLabel(f)).join(' / ') : (spec.pitches as any)[g.pitch].file;
}

/** Related models for a model page: same chain spec first, then same brand, then same bar length. Deterministic, capped. */
export async function relatedModels(model: Model, limit = 6): Promise<Model[]> {
  const all = await getModels();
  const keys = new Set(model.data.bars.map(barChainKey).filter(Boolean));
  const lens = new Set(model.data.bars.flatMap((b) => b.lengths_in));
  const score = (m: Model) => {
    const shared = m.data.bars.filter((b) => keys.has(barChainKey(b))).length > 0 ? 1 : 0;
    const sameBrand = m.data.brand === model.data.brand ? 1 : 0;
    const sharedLen = m.data.bars.some((b) => b.lengths_in.some((l) => lens.has(l))) ? 1 : 0;
    return shared * 4 + sameBrand * 2 + sharedLen;
  };
  return all.filter((m) => m.id !== model.id).map((m) => ({ m, s: score(m) })).filter((x) => x.s >= 4 || (x.s >= 2 && x.m.data.brand === model.data.brand))
    .sort((a, b) => b.s - a.s || (a.m.data.popular === b.m.data.popular ? 0 : a.m.data.popular ? -1 : 1) || a.m.data.name.localeCompare(b.m.data.name)).slice(0, limit).map((x) => x.m);
}

export type Faq = { q: string; a: string };

export function modelFaqs(m: Model): Faq[] {
  const d = m.data;
  const faqs: Faq[] = [];
  const okBars = d.bars.filter((b) => b.status === 'ok');
  if (hasConflict(m)) {
    const spots = d.bars.filter((b) => b.status === 'conflict').map((b) => {
      const rep = (b.reported ?? []).map((r) => [r.pitch && `${pitchShort(r.pitch)} pitch`, r.gauge && `${gaugeShort(r.gauge)} gauge`, r.drive_links && `${r.drive_links} drive links`].filter(Boolean).join(' / ')).filter(Boolean);
      return `${barLabel(b)} bar: ${[...new Set(rep)].join(' vs ')}`;
    });
    const okLines = okBars.map((b) => `${barLabel(b)} bar: ${pitchLabel(b.pitch)} pitch, ${gaugeLabel(b.gauge)} gauge, ${b.drive_links} drive links`);
    faqs.push({ q: `What size chain does a ${d.name} take?`, a: `Published sources disagree for part of the ${d.name} range. Reported variants — ${spots.join('; ')}.${okLines.length ? ` The setups where sources agree: ${okLines.join('; ')}.` : ''} The chain depends on the bar actually fitted to the saw, so read the stamp on your bar tail before ordering.` });
  } else {
    const lines = okBars.map((b) => `${barLabel(b)} bar: ${pitchLabel(b.pitch)} pitch, ${gaugeLabel(b.gauge)} gauge, ${b.drive_links} drive links${b.chains.find((c) => c.role === 'oem') ? ` (${partText(b.chains.find((c) => c.role === 'oem')!)})` : ''}`);
    if (!okBars.length) {
      const vb = d.bars.map((b) => `${barLabel(b)} bar: ${b.pitch ? `${pitchLabel(b.pitch)} pitch` : 'pitch not confirmed'}${b.gauge ? `, ${gaugeLabel(b.gauge)} gauge` : ''}, drive-link count not confirmed`);
      faqs.push({ q: `What size chain does a ${d.name} take?`, a: `${vb.join('; ')}. We only print a drive-link count when a source states it, so count the links on your old chain or read the bar-tail stamp before ordering.` });
    } else
    faqs.push({ q: `What size chain does a ${d.name} take?`, a: `${lines.join('; ')}.${okBars.length < d.bars.length ? ' Other bar lengths are listed as "verify on your bar stamp" because we only print drive-link counts we can trace to a citable source.' : ''} Always confirm pitch, gauge and drive links on your own bar stamp.` });
  }
  const lens = [...new Set(d.bars.flatMap((b) => b.lengths_in))].sort((a, b) => a - b);
  faqs.push({ q: `Which bar lengths does the ${d.name} come with, and does the drive-link count change?`, a: `${lenList(lens)} bars are on file for the ${d.name}. ${okBars.length ? (okBars.length <= 4 ? `Drive links by bar: ${okBars.map((b) => `${barLabel(b)} → ${b.drive_links}`).join(', ')}.` : `Verified drive-link counts run from ${Math.min(...okBars.map((b) => b.drive_links!))} to ${Math.max(...okBars.map((b) => b.drive_links!))} across ${okBars.length} setups; the table gives each bar's count.`) : 'We have no source-confirmed drive-link count for it, so the stamp on the bar tail is the only reliable number.'} ${d.bars.some((b) => b.status !== 'ok') ? 'Setups flagged conflict or verify in the table are not asserted here.' : ''}`.trim() });
  const files = [...new Set(d.bars.map((b) => b.file_size).filter(Boolean))].map((f) => fileLabel(f as string));
  if (files.length) faqs.push({ q: `What file size sharpens the ${d.name} chain?`, a: `${files.join(' or ')} round file for the chain fitted to the ${d.name} (${[...new Set(d.bars.map((b) => (b.pitch ? pitchShort(b.pitch) : null)).filter(Boolean))].join(' / ')} pitch).` });
  return faqs;
}

export const HOME_FAQS: Faq[] = [
  { q: 'What size chain does a Stihl MS 250 take?', a: 'There is no single honest answer, because MS 250s left dealers with different bars — and published sources disagree with each other. Listings we checked report .325″ pitch / .063″ gauge / 68 drive links, 3/8″ pitch / .050″ gauge, and 62 drive links (16″ bar) / 72 drive links (18″ bar). Read the stamp on your bar tail, then match all three numbers. The MS 250 page lays out each reported variant side by side.' },
  { q: 'How do I know my chain size if I threw the box away?', a: 'Read the stamp on the tail of the guide bar (you will need to take the bar cover off — two nuts on most saws). It shows bar length, pitch, gauge and usually the drive-link count. No readable stamp? Count the drive links on your old chain and measure the pitch: distance across three consecutive rivets, divided by two. The verification guide walks through all three methods.' },
  { q: 'Oregon 72 vs 73 chain — what is the difference?', a: 'Same pitch (3/8″), different gauge: 72 is .050″ and 73 is .058″. This is the classic wrong buy in this category — the boxes look identical. A .058″ chain will not seat in a .050″ bar groove, and a .050″ chain in a .058″ groove runs sloppy and can derail. Check the gauge number on your bar stamp before you order. Full code table on the identification chart.' },
  { q: 'How many drive links do I need?', a: 'As many as the bar fitted to your saw was built for — the count is stamped on the bar tail on most bars, and it changes with bar length even on the same saw. A 20″ Husqvarna 455 Rancher bar takes 72 drive links; the same saw on a shorter .325″ setup can take anywhere from 56 to 78 depending on the exact bar. Never order by model name alone.' },
  { q: 'Can I run a different-gauge chain if the pitch matches?', a: 'No. Gauge is the thickness of the drive links, and it must match the width of the groove in your guide bar. A thicker chain will not seat; a thinner one wobbles in the groove, wears the bar rails unevenly and can jump off. Pitch, gauge and drive links all have to match.' },
  { q: 'What file size do I need to sharpen my chain?', a: 'File size follows pitch: 3/8″ low-profile → 5/32″ (4.0 mm), or 11/64″ (4.5 mm) for .043″ gauge; .325″ → 3/16″ (4.8 mm); standard 3/8″ and .404″ → 7/32″ (5.5 mm). Every model page on this site lists the file size next to the chain spec, and the identification chart has the full table.' },
];

export const ldEscape = (o: unknown) => JSON.stringify(o).replace(/</g, '\\u003c');

/* ---------- model-specific facts derived from the sourced data (no invented values) ---------- */

/** Bar part number printed in a bar's source note, for the three note formats the data uses. */
export function barPart(note: string): string | null {
  let m = note.match(/pairs this \d+″ setup with bars? (.+?) and chains? /);
  if (m) return m[1];
  m = note.match(/(?:recommended|lightweight) bar (\d{4} \d{3} \d{4})/);
  if (m) return m[1];
  m = note.match(/^Echo bar (\S+?);/);
  if (m) return m[1];
  return null;
}

/** Table-note text with the templated lead-in removed (the part numbers stay; the chain is in the OEM column). */
export function compactNote(b: Bar): string {
  const n = b.note;
  let m = n.match(/^Husqvarna's 2026 fit-up guide pairs this \d+″ setup with bars? (.+?) and chains? .+?\.(?: (.*))?$/);
  if (m) return `Bar part: ${m[1]}.${m[2] ? ' ' + m[2] : ''}`;
  m = n.match(/^STIHL's chart lists chain .+? with (recommended|lightweight) bar ([\d ]+?)\.(?: (.*))?$/);
  if (m) return `${m[1] === 'lightweight' ? 'Lightweight bar' : 'Bar'} part: ${m[2]}.${m[3] ? ' ' + m[3] : ''}`;
  m = n.match(/^Echo bar (\S+?); chain \S+\.\s*(.*)$/);
  if (m) return `Bar part: ${m[1]}.${m[2] ? ' ' + m[2] : ''}`;
  return n;
}

const lenList = (ls: number[]) => ls.map((l) => `${l}″`).join(', ').replace(/, ([^,]*)$/, ' and $1');
const specOf = (b: Bar) => (b.pitch && b.gauge ? `${pitchShort(b.pitch)} ${gaugeShort(b.gauge)} ${b.drive_links ? `${b.drive_links} DL` : 'drive links not confirmed'}` : null);

/** length → set of spec strings for that bar length. */
function byLength(m: Model) {
  const map = new Map<number, { specs: Set<string>; part: string | null }>();
  for (const b of m.data.bars) for (const l of b.lengths_in) {
    const e = map.get(l) ?? { specs: new Set<string>(), part: null };
    const s = specOf(b) ?? 'no confirmed spec';
    e.specs.add(s); e.part = e.part ?? barPart(b.note); map.set(l, e);
  }
  return map;
}

/** Facts for the "At a glance" list. */
export function glanceFacts(m: Model): { k: string; v: string }[] {
  const d = m.data;
  const out: { k: string; v: string }[] = [];
  out.push({ k: 'Power', v: `${d.type === 'battery' ? 'Battery' : d.type === 'electric' ? 'Electric' : 'Gas'}${d.displacement_cc ? `, ${d.displacement_cc} cc` : ''}` });
  const lens = [...new Set(d.bars.flatMap((b) => b.lengths_in))].sort((a, b) => a - b);
  const ok = d.bars.filter((b) => b.status === 'ok').length;
  out.push({ k: 'Bar lengths on file', v: `${lenList(lens)} — ${d.bars.length} setup${d.bars.length > 1 ? 's' : ''}, ${ok} verified${d.bars.length - ok ? `, ${d.bars.length - ok} flagged` : ''}` });
  const specs = [...new Set(d.bars.map((b) => (b.pitch && b.gauge ? `${pitchShort(b.pitch)} · ${gaugeShort(b.gauge)}` : null)).filter(Boolean))] as string[];
  if (specs.length) out.push({ k: 'Chain spec(s)', v: specs.join(' / ') });
  const dls = d.bars.filter((b) => b.drive_links).map((b) => `${b.lengths_in[0]}″ → ${b.drive_links}`);
  if (dls.length && dls.length <= 8) out.push({ k: 'Drive links by bar', v: dls.join(' · ') });
  else if (dls.length) { const n = d.bars.filter((b) => b.drive_links).map((b) => b.drive_links!); out.push({ k: 'Drive links', v: `${Math.min(...n)}–${Math.max(...n)} across ${dls.length} verified setups` }); }
  const files = [...new Set(d.bars.map((b) => b.file_size).filter(Boolean))].map((f) => fileLabel(f as string));
  if (files.length) out.push({ k: 'Round file', v: files.join(' / ') });
  const alias = d.aliases.filter((a) => a.toLowerCase() !== d.model.toLowerCase());
  if (alias.length) out.push({ k: 'Also listed as', v: alias.join(', ') });
  const src = d.sources.map((s) => s.publisher + ' ' + SOURCE_TYPE_LABEL[s.type]).filter((v, i, a) => a.indexOf(v) === i);
  out.push({ k: 'Data from', v: `${src.join(' · ')}, retrieved ${[...new Set(d.sources.map((s) => s.retrieved))].sort().pop()}` });
  return out;
}

/** What differs between model a and model b, from the data only. */
export function compareText(a: Model, b: Model): string {
  const A = byLength(a), B = byLength(b);
  const bothL = [...A.keys()].filter((l) => B.has(l)).sort((x, y) => x - y);
  const same: number[] = [], diff: number[] = [];
  for (const l of bothL) ([...A.get(l)!.specs].sort().join('|') === [...B.get(l)!.specs].sort().join('|') ? same : diff).push(l);
  const onlyA = [...A.keys()].filter((l) => !B.has(l)).sort((x, y) => x - y);
  const onlyB = [...B.keys()].filter((l) => !A.has(l)).sort((x, y) => x - y);
  const parts: string[] = [];
  const an = a.data.name, bn = b.data.name;
  if (a.data.type !== b.data.type) parts.push(`the ${an} is a ${a.data.type === 'battery' ? 'battery' : 'gas'} saw and the ${bn} is a ${b.data.type === 'battery' ? 'battery' : 'gas'} saw`);
  else if (a.data.displacement_cc && b.data.displacement_cc && a.data.displacement_cc !== b.data.displacement_cc) parts.push(`the ${an} is ${a.data.displacement_cc} cc against the ${bn}'s ${b.data.displacement_cc} cc`);
  if (same.length && !diff.length && !onlyA.length && !onlyB.length) parts.push(`both list the same bar lengths (${lenList(same)}) with identical pitch, gauge and drive-link counts`);
  else {
    if (same.length) parts.push(`${lenList(same)} ${same.length > 1 ? 'bars carry' : 'bar carries'} identical chain specs on both`);
    for (const l of diff.slice(0, 2)) parts.push(`on a ${l}″ bar the ${an} runs ${[...A.get(l)!.specs].join(' or ')} while the ${bn} runs ${[...B.get(l)!.specs].join(' or ')}`);
    if (diff.length > 2) parts.push(`${diff.length - 2} more shared length${diff.length > 3 ? 's' : ''} differ in gauge or drive links`);
    if (onlyA.length) parts.push(`only the ${an} lists ${lenList(onlyA)}`);
    if (onlyB.length) parts.push(`only the ${bn} lists ${lenList(onlyB)}`);
  }
  const partDiffs = same.map((l) => ({ l, pa: A.get(l)!.part, pb: B.get(l)!.part })).filter((x) => x.pa && x.pb && x.pa !== x.pb);
  if (partDiffs.length) parts.push(`the recommended bar part numbers differ (${partDiffs.slice(0, 2).map((x) => `${x.l}″: ${x.pa} vs ${x.pb}`).join('; ')})`);
  const fa = a.data.bars.filter((x) => x.status !== 'ok').length, fb = b.data.bars.filter((x) => x.status !== 'ok').length;
  if (fa !== fb) parts.push(`${fa > fb ? `the ${an}` : `the ${bn}`} has ${Math.max(fa, fb)} setup${Math.max(fa, fb) > 1 ? 's' : ''} flagged conflict or verify, ${fa > fb ? `the ${bn}` : `the ${an}`} ${Math.min(fa, fb) ? `has ${Math.min(fa, fb)}` : 'has none'}`);
  const pubs = (m: Model) => [...new Set(m.data.sources.map((x) => `${x.publisher} (${SOURCE_TYPE_LABEL[x.type]})`))].sort();
  const pa = pubs(a), pb = pubs(b);
  if (pa.join('|') !== pb.join('|')) parts.push(`the ${an} data comes from ${pa.join(' and ')}, the ${bn} data from ${pb.join(' and ')}`);
  const s = parts.join('; ');
  return s ? s[0].toUpperCase() + s.slice(1) + '.' : '';
}
