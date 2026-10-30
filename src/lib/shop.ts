/**
 * Builds the Amazon link blocks for every page. All URLs come from src/config/affiliate.ts — the tracking ID
 * is never written anywhere else. Rules: /dp/ links only for verified ASINs; otherwise a precise Amazon search;
 * no prices; bars with status conflict/verify never get a spec-matched chain link.
 */
import { ASINS, amazonProductUrl, amazonSearchUrl, type AmazonImage } from '../config/affiliate';
import { type Model, type Bar, pitchShort, gaugeShort, barLabel, chainKey } from './data';

export type ShopLink = { href: string; label: string; kind: 'product' | 'search'; note?: string; why?: string; image?: AmazonImage };
export type ShopGroup = { title: string; links: ShopLink[] };

const PITCH_Q: Record<string, string> = { '3/8-lp': '3/8 low profile', '325': '.325', '3/8': '3/8', '404': '.404', '1/4': '1/4' };
const gaugeQ = (g: number) => `.${String(g).split('.')[1].padEnd(3, '0')}`; // 0.05 -> .050, 0.063 -> .063
const specText = (pitch: string, gauge: number, dl?: number) => `${pitchShort(pitch)} · ${gaugeShort(gauge)}${dl ? ` · ${dl} DL` : ''}`;

const product = (id: string, label?: string, note?: string): ShopLink => ({ href: amazonProductUrl(ASINS[id].asin), label: label ?? ASINS[id].label, kind: 'product', note });
const search = (query: string, label: string, note?: string): ShopLink => ({ href: amazonSearchUrl(query), label, kind: 'search', note });
const why = (link: ShopLink, text: string): ShopLink => ({ ...link, why: text });

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
 *  Existing pages are not listed and keep their links. Key: 'model:<id>', 'chain:<pitch-gauge key>' or 'bar:<inches>'. */
const LINK_CAP: Record<string, number> = {
  'model:husqvarna-t540-xp-mark-iii': 3,
  'model:stihl-ms-661': 3,
  'chain:325-043': 3,
  'bar:25': 3,
  'model:husqvarna-540-xp-mark-iii': 3,
  'model:stihl-ms-880': 3,
  'model:echo-cs-2511t': 3,
  'model:echo-cs-355t': 3,
  'bar:30': 3,
  'bar:36': 3,
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

/**
 * One chain for a holiday CTA on a popular saw page: the shortest verified bar that has a
 * checked product page, otherwise the shortest verified bar's spec search. Conflict / unverified
 * saws return nothing — those pages must not point at a loop.
 */
export function holidayChain(model: Model): ShopLink | null {
  const ok = model.data.bars.flatMap((b) => { const s = okSpec(b); return s ? [{ b, s }] : []; });
  if (!ok.length) return null;
  const seen = new Set<string>();
  const specs = ok.filter(({ s }) => { const k = `${s.pitch}|${s.gauge}|${s.dl}`; if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => a.b.lengths_in[0] - b.b.lengths_in[0] || a.s.gauge - b.s.gauge);
  const withProduct = specs.filter(({ s }) => ASINS[`chain|${s.pitch}|${s.gauge}|${s.dl}`]);
  const pick = (withProduct[0] ?? specs[0])!;
  const link = chainLink(pick.s, `${barLabel(pick.b)} bar: `);
  const otherGauge = specs.some((x) => x !== pick && x.b.lengths_in.some((l) => pick.b.lengths_in.includes(l)) && (x.s.gauge !== pick.s.gauge || x.s.pitch !== pick.s.pitch));
  const otherLength = specs.some((x) => x !== pick && x.b.lengths_in[0] !== pick.b.lengths_in[0]);
  let text = `Matches the ${barLabel(pick.b)} bar on this page (${specText(pick.s.pitch, pick.s.gauge, pick.s.dl)}). Buy it only if your bar stamp shows those three numbers.`;
  if (otherGauge) text += ' This saw is also listed with another pitch or gauge. This listing does not fit that bar.';
  if (otherLength) text += ' A different bar length on this page takes a different drive-link count.';
  if (model.data.bars.some((b) => b.status !== 'ok')) text += ' Rows marked verify or conflict are not what this button is for.';
  return { ...link, why: text };
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
  const capped = capGroups(groups, LINK_CAP[`bar:${len}`]);
  return { groups: capped, count: capped.reduce((n, g) => n + g.links.length, 0) };
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

const FILE_732 = () => search('7/32 chainsaw round file 5.5mm', '7/32″ round files (3/8″ standard and .404″ chain)');
const FILE_1164 = () => search('11/64 chainsaw round file 4.5mm', '11/64″ round files (3/8″ LP .043″ chain)');
const SPROCKET = () => search('chainsaw rim drive sprocket replacement', 'Replacement drive sprocket — match the pitch and tooth count to the chain and clutch');
const BAR_DRESS = () => search('chainsaw bar rail dresser groove cleaner', 'Bar-rail dresser and groove cleaner');
const HUSQ_OIL = () => search('Husqvarna 2 stroke oil 50:1 chainsaw', 'Husqvarna two-stroke oil for a 50:1 mix', 'use the ratio in your manual');
const CHAIN_72 = () => search('Oregon 72LPX chainsaw chain 3/8 .050 gauge', 'Oregon 72-series chain (3/8″ .050″) — pick your drive-link count');
const CHAIN_73 = () => search('Oregon 73LPX chainsaw chain 3/8 .058 gauge', 'Oregon 73-series chain (3/8″ .058″) — pick your drive-link count');
const CHAIN_91 = () => search('Oregon 91PX chainsaw chain 3/8 low profile .050', 'Oregon 91PX chain (3/8″ low profile .050″) — pick your drive-link count');
const CHAIN_90 = () => search('Oregon 90PX chainsaw chain 3/8 low profile .043', 'Oregon 90PX chain (3/8″ low profile .043″) — pick your drive-link count');
const BAR_18 = () => search('18 inch chainsaw guide bar .325 pitch .050 gauge', '18″ replacement bars in .325″ .050″ — then match drive links to the stamp');

/** Guides. One group, or several, of tagged Amazon links. No prices; /dp/ only for verified ASINs. */
export function guideShop(slug: string): { groups: ShopGroup[]; count: number } {
  const groups: ShopGroup[] = [];
  const add = (title: string, links: ShopLink[]) => { if (links.length) groups.push({ title, links }); };
  switch (slug) {
    case 'chain-size-chart': add('Tools mentioned in this guide', [CALIPER(), PITCH_GAUGE_TOOL(), product('kit-field'), barOilLink()]); break;
    case 'chainsaw-chain-file-size': add('Files and sharpening kits by size', [product('kit-5-32'), product('kit-3-16'), product('kit-field'), FILE_732(), FILE_1164(), DEPTH_TOOL()]); break;
    case 'chainsaw-sharpening-angles': add('Files and depth-gauge tools', [product('kit-5-32'), product('kit-3-16'), product('kit-field'), FILE_732(), DEPTH_TOOL(), search('chainsaw depth gauge flat file', 'Flat file for lowering depth gauges')]); break;
    case 'how-to-count-drive-links': add('Tools mentioned in this guide', [CALIPER(), PITCH_GAUGE_TOOL()]); break;
    case 'chain-part-numbers': add('Tools mentioned in this guide', [CALIPER(), PITCH_GAUGE_TOOL()]); break;
    case 'how-to-verify-chain-size': add('Tools mentioned in this guide', [CALIPER(), PITCH_GAUGE_TOOL(), SCRENCH()]); break;
    case 'oregon-72-vs-73-chain': add('Check the gauge, then shop by the stamp', [CALIPER(), CHAIN_72(), CHAIN_73()]); break;
    case 'chainsaw-chain-tension':
      add('Chain, bar and the wrench that tensions them', [product('chain|3/8-lp|0.05|56'), product('chain|325|0.05|72'), product('chain|3/8|0.05|72'), BAR_18(), SCRENCH()]);
      add('Oil and gloves', [barOilLink(), glovesLink()]);
      break;
    case 'chainsaw-kickback':
      add('Safety gear', [chapsLink(), helmetLink(), glovesLink()]);
      add('Low-profile chain and a file kit', [CHAIN_91(), product('kit-5-32'), product('scabbard-18-22')]);
      break;
    case 'chainsaw-safety-gear':
      add('Chainsaw safety gear', [chapsLink(), helmetLink(), glovesLink(), product('scabbard-18-22')]);
      add('A sharp chain is part of staying in control', [product('kit-field'), product('kit-5-32'), barOilLink()]);
      break;
    case 'when-to-replace-chainsaw-chain':
      add('Replacement chains by a common spec', [product('chain|3/8-lp|0.05|56'), product('chain|325|0.05|72'), product('chain|3/8|0.05|68'), product('chain|3/8|0.05|72')]);
      add('Files, sprocket and oil', [product('kit-field'), DEPTH_TOOL(), SPROCKET(), barOilLink()]);
      break;
    case 'chainsaw-bar-and-chain-oil':
      add('Bar and chain oil', [barOilLink(), product('scabbard-18-22')]);
      add('Two-stroke fuel mix is a different oil', [product('fuel-stihl'), product('fuel-echo'), HUSQ_OIL()]);
      break;
    case '3-8-low-profile-vs-standard-chain':
      add('3/8″ low-profile chain', [CHAIN_91(), CHAIN_90(), product('chain|3/8-lp|0.05|52'), product('chain|3/8-lp|0.05|56'), product('kit-5-32')]);
      add('Standard 3/8″ chain', [CHAIN_72(), CHAIN_73(), product('chain|3/8|0.05|72'), FILE_732(), search('18 inch chainsaw guide bar 3/8 pitch .050 gauge', '18″ bars in standard 3/8″ .050″ — match the nose sprocket and drive links')]);
      break;
    case 'how-to-install-chainsaw-chain':
      add('Chains and a bar', [product('chain|3/8-lp|0.05|56'), product('chain|325|0.05|72'), product('chain|3/8|0.05|72'), BAR_18()]);
      add('Wrench, gloves and oil', [SCRENCH(), glovesLink(), barOilLink()]);
      break;
    case 'chainsaw-drive-sprocket':
      add('Sprocket and the chain that has to match it', [SPROCKET(), product('chain|325|0.05|72'), product('chain|3/8|0.05|72'), CHAIN_91()]);
      add('Bar and oil', [BAR_18(), barOilLink()]);
      break;
    case 'chainsaw-chain-gauge':
      add('Measure, then match the stamp', [CALIPER(), PITCH_GAUGE_TOOL(), CHAIN_90(), CHAIN_91(), CHAIN_72(), CHAIN_73()]);
      add('Bars in a stated gauge', [search('chainsaw guide bar .050 gauge', 'Guide bars marked .050″ — then match pitch, length and drive links'), search('chainsaw guide bar .058 gauge', 'Guide bars marked .058″ — then match pitch, length and drive links'), search('chainsaw guide bar .063 gauge', 'Guide bars marked .063″ — then match pitch, length and drive links')]);
      break;
    case 'chainsaw-fuel-mix':
      add('Two-stroke oil for a 50:1 mix', [product('fuel-stihl'), product('fuel-echo'), HUSQ_OIL()]);
      add('Bar oil is not fuel oil', [barOilLink(), glovesLink()]);
      break;
    case 'chainsaw-bar-maintenance':
      add('Bar, oil and dressing tools', [barOilLink(), BAR_DRESS(), BAR_18(), product('scabbard-18-22')]);
      add('Chain and a file', [product('chain|3/8|0.05|72'), product('kit-field')]);
      break;
    case 'why-a-chainsaw-chain-comes-off':
      add('The parts that hold the chain on', [SCRENCH(), CALIPER(), SPROCKET(), BAR_18(), product('chain|3/8|0.05|72')]);
      add('Oil and a cover', [barOilLink(), product('scabbard-18-22'), glovesLink()]);
      break;
    case 'gifts-for-chainsaw-owners-2026':
      add('Tier 1 — used up this season', [
        why(barOilLink(), 'Bar-and-chain oil goes in the oil tank, filled with the gas. It is not two-stroke engine oil.'),
        why(product('kit-field'), 'Holds 5/32″, 3/16″ and 7/32″ files, so it still fits if you are not sure of the pitch. A single-size file is the wrong gift unless you know the chain.'),
        why(glovesLink(), 'For handling chain with the engine off. Pick the glove size, not a chainsaw model name.'),
        why(product('kit-5-32'), 'Only for 3/8″ low-profile chain in .050″ gauge. Wrong file for .325″ or standard 3/8″ chain.'),
      ]);
      add('Tier 2 — a spare chain, and only if the stamp matches', [
        why(product('chain|3/8-lp|0.05|56', '3/8″ low profile · .050″ · 56 drive links'), '16″ class. Not low-profile .043″, and not standard 3/8″. Wrong loop if the stamp shows a different count.'),
        why(product('chain|325|0.05|72', '.325″ · .050″ · 72 drive links'), '18″ class. A different length in the same pitch is a different drive-link count.'),
        why(product('chain|3/8|0.05|72', 'Standard 3/8″ · .050″ · 72 drive links'), '20″ class. Oregon 72, not Oregon 73 (.058″) and not 3/8″ low profile.'),
      ]);
      add('Tier 3 — gear that stays with the saw', [
        why(chapsLink(), 'Leg protection. Read the listing for an ASTM F1897 or UL mark and a length that overlaps the boots. Chaps are not cut-proof.'),
        why(helmetLink(), 'Hard hat with a mesh face shield and hearing protection. It does not replace chaps or boots.'),
        why(product('scabbard-18-22'), 'Covers an 18–22″ bar in the truck. Measure the bar if it is outside that range. It is not a substitute for shutting the engine off.'),
      ]);
      break;
    case 'black-friday-chainsaw-chain':
      add('A chain is right for one spec only', [
        why(product('chain|3/8-lp|0.05|56', '3/8″ low profile · .050″ · 56 drive links'), 'A sale does not change the spec. This is the low-profile loop, not standard 3/8″.'),
        why(product('chain|325|0.05|72', '.325″ · .050″ · 72 drive links'), 'Match the stamp, then look at the price Amazon shows. A different bar length is a different count.'),
        why(product('chain|3/8|0.05|68', 'Standard 3/8″ · .050″ · 68 drive links'), 'A common 18″ full-size loop, not a 20″ one and not 3/8″ low profile.'),
        why(product('chain|3/8|0.05|72', 'Standard 3/8″ · .050″ · 72 drive links'), 'Oregon 72. Not .058″ gauge and not 3/8″ low profile.'),
        why(product('chain|325|0.063|67', '.325″ · .063″ · 67 drive links'), 'Gauge has to match the bar groove. This is not the .050″ .325″ loop.'),
      ]);
      add('Sharpening and oil', [
        why(product('kit-field'), 'Three file diameters. Safer than a single file when you have not read the pitch off the saw.'),
        why(CALIPER(), 'Measures drive-link thickness and rivet spacing before you commit to a loop you cannot return to the woods.'),
        why(barOilLink(), 'Bar-and-chain oil. A discount does not make used motor oil acceptable in the oil tank.'),
      ]);
      add('Safety gear', [
        why(chapsLink(), 'Check ASTM F1897 or a UL mark and the overlap over the boots. No price is printed here.'),
        why(helmetLink(), 'Forestry helmet with face shield and ear muffs. Fit is the check, not a percent-off badge.'),
        why(glovesLink(), 'Gloves for sharpening and for running the saw. Size them to the hand.'),
      ]);
      break;
  }
  return { groups, count: groups.reduce((n, g) => n + g.links.length, 0) };
}
