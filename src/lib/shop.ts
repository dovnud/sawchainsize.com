/**
 * Builds the Amazon link blocks for every page. All URLs come from src/config/affiliate.ts — the tracking ID
 * is never written anywhere else. Rules: /dp/ links only for verified ASINs; otherwise a precise Amazon search;
 * no prices; bars with status conflict/verify never get a spec-matched chain link.
 */
import { ASINS, amazonProductUrl, amazonSearchUrl } from '../config/affiliate';
import { type Model, type Bar, pitchShort, gaugeShort, barLabel, chainKey } from './data';

export type ShopLink = { href: string; label: string; kind: 'product' | 'search'; note?: string };
export type ShopGroup = { title: string; links: ShopLink[] };

const PITCH_Q: Record<string, string> = { '3/8-lp': '3/8 low profile', '325': '.325', '3/8': '3/8', '404': '.404', '1/4': '1/4' };
const gaugeQ = (g: number) => `.${String(g).split('.')[1].padEnd(3, '0')}`; // 0.05 -> .050, 0.063 -> .063
const specText = (pitch: string, gauge: number, dl?: number) => `${pitchShort(pitch)} · ${gaugeShort(gauge)}${dl ? ` · ${dl} DL` : ''}`;

const product = (id: string, label?: string, note?: string): ShopLink => ({ href: amazonProductUrl(ASINS[id].asin), label: label ?? ASINS[id].label, kind: 'product', note });
const search = (query: string, label: string, note?: string): ShopLink => ({ href: amazonSearchUrl(query), label, kind: 'search', note });

export type Spec = { pitch: string; gauge: number; dl: number };
export const okSpec = (b: Bar): Spec | null => (b.status === 'ok' && b.pitch && b.gauge && b.drive_links ? { pitch: b.pitch, gauge: b.gauge, dl: b.drive_links } : null);

/** Replacement chain matched to an exact pitch / gauge / drive-link spec. */
export function chainLink(s: Spec, prefix = ''): ShopLink {
  const id = `chain|${s.pitch}|${s.gauge}|${s.dl}`;
  const label = `${prefix}${specText(s.pitch, s.gauge, s.dl)} chain`;
  if (ASINS[id]) return product(id, `${label} — ${ASINS[id].label}`);
  return search(`Oregon chainsaw chain ${PITCH_Q[s.pitch]} pitch ${gaugeQ(s.gauge)} gauge ${s.dl} drive links`, `${label} — find matching chains`);
}

/** Replacement guide bar for a length plus the chain spec it must carry. */
export function barLink(len: number, s: Spec, prefix = ''): ShopLink {
  return search(`${len} inch chainsaw guide bar ${PITCH_Q[s.pitch]} pitch ${gaugeQ(s.gauge)} gauge ${s.dl} drive links`, `${prefix}${len}″ replacement bar — ${specText(s.pitch, s.gauge, s.dl)}`);
}

/** Sharpening kit for the file size the pitch/gauge needs. */
export function kitLink(s: { pitch: string; gauge: number } | null): ShopLink {
  if (s) {
    if (s.pitch === '3/8-lp' && s.gauge === 0.05) return product('kit-5-32', 'Oregon 5/32″ file kit — fits 3/8″ LP .050″ chain');
    if (s.pitch === '3/8-lp') return search('11/64 chainsaw sharpening kit round file 4.5mm', '11/64″ file kit — for 3/8″ LP .043″ chain');
    if (s.pitch === '325') return product('kit-3-16', 'Oregon 3/16″ file kit — fits .325″ chain');
  }
  return product('kit-field');
}

export const barOilLink = () => product('bar-oil');
export const chapsLink = () => product('chaps', 'Chainsaw chaps (Forester) — check the listing for its protection rating');
export const helmetLink = () => product('helmet');
export const glovesLink = () => product('gloves');

export function fuelLink(brand: string): ShopLink {
  if (brand === 'stihl') return product('fuel-stihl', undefined, 'use the ratio in your manual');
  if (brand === 'echo') return product('fuel-echo', undefined, 'use the ratio in your manual');
  return search('2 stroke engine oil chainsaw 50:1 premix bottle', '2-stroke engine oil for premix', 'use the ratio in your manual');
}

export function scabbardLink(len: number): ShopLink {
  if (len >= 18 && len <= 22) return product('scabbard-18-22');
  return search(`chainsaw bar cover scabbard ${len} inch`, `Bar & chain cover for a ${len}″ bar`);
}

/** Per-page Amazon link caps for pages added after the bulk link pass (reference pages: 0-3 links).
 *  Existing pages are not listed and keep their links. Key: 'model:<id>' or 'chain:<pitch-gauge key>'. */
const LINK_CAP: Record<string, number> = {
  'model:husqvarna-t540-xp-mark-iii': 3,
  'model:stihl-ms-661': 3,
  'chain:325-043': 3,
};
const capGroups = (groups: ShopGroup[], cap: number | undefined): ShopGroup[] => {
  if (cap === undefined) return groups;
  let left = cap;
  return groups.map((g) => { const links = g.links.slice(0, Math.max(0, left)); left -= links.length; return { ...g, links }; }).filter((g) => g.links.length);
};

const pick3 = <T,>(a: T[]): T[] => (a.length <= 3 ? a : [a[0], a[Math.floor(a.length / 2)], a[a.length - 1]]);

/** Model page. */
export function modelShop(model: Model): { groups: ShopGroup[]; flagged: boolean; count: number } {
  const d = model.data;
  const gas = d.type === 'gas';
  const ok = d.bars.filter((b) => okSpec(b));
  const flagged = d.bars.some((b) => b.status !== 'ok');
  // one chain per distinct spec, ordered by bar length, at most three
  const seen = new Set<string>();
  const specs = ok.flatMap((b) => { const s = okSpec(b)!; const k = `${s.pitch}|${s.gauge}|${s.dl}`; if (seen.has(k)) return []; seen.add(k); return [{ b, s }]; })
    .sort((a, b) => a.b.lengths_in[0] - b.b.lengths_in[0]);
  const chosen = pick3(specs);
  const chains = chosen.map(({ b, s }) => chainLink(s, `${barLabel(b)} bar: `));
  const first = chosen[0];
  const bar = first ? [barLink(first.b.lengths_in[0], first.s, `${d.name}: `)] : [];
  const kit = kitLink(first ? first.s : null);
  const mid = ok.length ? ok[Math.floor((ok.length - 1) / 2)].lengths_in[0] : 0;
  const gear: ShopLink[] = [kit, ...(gas ? [chapsLink()] : []), ...bar, barOilLink(), ...(gas ? [fuelLink(d.brand)] : []), helmetLink(), glovesLink(), ...(mid ? [scabbardLink(mid)] : [])];
  const links = [...chains, ...gear].slice(0, 8);
  const groups: ShopGroup[] = [];
  const cl = links.filter((l) => chains.includes(l));
  if (cl.length) groups.push({ title: `Replacement chains matched to the ${d.name}`, links: cl });
  groups.push({ title: ok.length ? 'Bar, sharpening, safety and fluids' : 'Sharpening, safety and fluids', links: links.filter((l) => !chains.includes(l)) });
  const capped = capGroups(groups, LINK_CAP[`model:${model.id}`]);
  return { groups: capped, flagged, count: capped.reduce((n, g) => n + g.links.length, 0) };
}

/** Chain-spec page: one link per common drive-link count for this exact pitch + gauge. */
export function chainSpecShop(group: { pitch: string; gauge: number; items: { bar: Bar }[] }): { groups: ShopGroup[]; count: number } {
  const counts = new Map<number, number>();
  const lens = new Map<number, number>();
  for (const { bar } of group.items) { const s = okSpec(bar); if (!s) continue; counts.set(s.dl, (counts.get(s.dl) ?? 0) + 1); lens.set(s.dl, bar.lengths_in[0]); }
  const dls = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, 5).map(([dl]) => dl).sort((a, b) => a - b);
  const chains = dls.map((dl) => chainLink({ pitch: group.pitch, gauge: group.gauge, dl }));
  const gearSpec = { pitch: group.pitch, gauge: group.gauge };
  const topDl = dls[0];
  const gear: ShopLink[] = [
    ...(topDl ? [search(`replacement chainsaw guide bar ${PITCH_Q[group.pitch]} pitch ${gaugeQ(group.gauge)} gauge`, `Replacement bars in ${specText(group.pitch, group.gauge)} — then match length and drive links to your stamp`)] : []),
    kitLink(gearSpec), barOilLink(),
  ];
  const groups: ShopGroup[] = [];
  if (chains.length) groups.push({ title: `${specText(group.pitch, group.gauge)} chain by drive-link count`, links: chains });
  groups.push({ title: 'Bars, sharpening and oil', links: gear });
  const capped = capGroups(groups, LINK_CAP[`chain:${chainKey(group.pitch, group.gauge)}`]);
  return { groups: capped, count: capped.reduce((n, g) => n + g.links.length, 0) };
}

/** Bar-length page. */
export function barLengthShop(len: number, items: { model: Model; bar: Bar }[]): { groups: ShopGroup[]; count: number } {
  const tally = new Map<string, { s: Spec; n: Set<string> }>();
  for (const { model, bar } of items) { const s = okSpec(bar); if (!s || !bar.lengths_in.includes(len)) continue; const k = `${s.pitch}|${s.gauge}|${s.dl}`; if (!tally.has(k)) tally.set(k, { s, n: new Set() }); tally.get(k)!.n.add(model.id); }
  const top = [...tally.values()].sort((a, b) => b.n.size - a.n.size || a.s.dl - b.s.dl);
  const chains = top.slice(0, 4).map((t) => chainLink(t.s, `${len}″ bar: `));
  const bars = top.slice(0, 2).map((t) => barLink(len, t.s));
  const gear = [...bars, kitLink(top[0] ? top[0].s : null), scabbardLink(len)];
  const groups: ShopGroup[] = [];
  if (chains.length) groups.push({ title: `Chains for ${len}″ bars (most common specs on this page)`, links: chains });
  groups.push({ title: 'Bars, sharpening and storage', links: gear });
  return { groups, count: chains.length + gear.length };
}

/** Brand hub. */
export function brandShop(brandId: string, brandName: string, models: Model[]): { groups: ShopGroup[]; count: number } {
  const gas = models.some((m) => m.data.type === 'gas');
  const tally = new Map<string, { s: Spec; n: number }>();
  for (const m of models) for (const b of m.data.bars) { const s = okSpec(b); if (!s) continue; const k = `${s.pitch}|${s.gauge}|${s.dl}`; if (!tally.has(k)) tally.set(k, { s, n: 0 }); tally.get(k)!.n++; }
  const top = [...tally.values()].sort((a, b) => b.n - a.n || a.s.dl - b.s.dl).slice(0, 2);
  const chains = top.map((t) => chainLink(t.s, `Common on ${brandName} saws: `));
  const gear: ShopLink[] = [
    search(`${brandName} chainsaw replacement guide bar`, `Replacement bars for ${brandName} saws — match your model and bar stamp`),
    kitLink(top[0] ? top[0].s : null), barOilLink(),
    ...(gas ? [chapsLink(), fuelLink(brandId)] : []), helmetLink(),
  ];
  const groups: ShopGroup[] = [];
  if (chains.length) groups.push({ title: `Chains matched to common ${brandName} setups`, links: chains });
  groups.push({ title: 'Bars, sharpening, safety and fluids', links: gear });
  return { groups, count: chains.length + gear.length };
}

const CALIPER = () => search('digital caliper 6 inch 0.001 inch', 'Digital caliper — measure drive-link gauge and rivet spacing');
const PITCH_GAUGE_TOOL = () => search('chainsaw chain pitch gauge measuring tool', 'Chain pitch and gauge measuring tool');
const SCRENCH = () => search('chainsaw scrench combination wrench bar nut', 'Scrench / combination wrench for bar nuts and spark plug');
const DEPTH_TOOL = () => search('chainsaw depth gauge tool raker file guide', 'Depth-gauge (raker) filing tool');

/** Guides. */
export function guideShop(slug: string): { groups: ShopGroup[]; count: number } {
  let links: ShopLink[] = [];
  let title = 'Tools mentioned in this guide';
  switch (slug) {
    case 'chain-size-chart': links = [CALIPER(), PITCH_GAUGE_TOOL(), product('kit-field'), barOilLink()]; break;
    case 'chainsaw-chain-file-size': title = 'Files and sharpening kits by size'; links = [product('kit-5-32'), product('kit-3-16'), product('kit-field'), search('7/32 chainsaw round file 5.5mm', '7/32″ round files (3/8″ standard and .404″ chain)'), search('11/64 chainsaw round file 4.5mm', '11/64″ round files (3/8″ LP .043″ chain)'), DEPTH_TOOL()]; break;
    case 'chainsaw-sharpening-angles': title = 'Files and depth-gauge tools'; links = [product('kit-5-32'), product('kit-3-16'), product('kit-field'), search('7/32 chainsaw round file 5.5mm', '7/32″ round files (3/8″ standard and .404″ chain)'), DEPTH_TOOL(), search('chainsaw depth gauge flat file', 'Flat file for lowering depth gauges')]; break;
    case 'how-to-count-drive-links': links = [CALIPER(), PITCH_GAUGE_TOOL()]; break;
    case 'how-to-verify-chain-size': links = [CALIPER(), PITCH_GAUGE_TOOL(), SCRENCH()]; break;
    case 'oregon-72-vs-73-chain': title = 'Check the gauge, then shop by the stamp'; links = [CALIPER(), search('Oregon 72LPX chainsaw chain 3/8 .050 gauge', 'Oregon 72LPX chain (3/8″ .050″) — pick your drive-link count'), search('Oregon 73LPX chainsaw chain 3/8 .058 gauge', 'Oregon 73LPX chain (3/8″ .058″) — pick your drive-link count')]; break;
  }
  return { groups: links.length ? [{ title, links }] : [], count: links.length };
}
