import raw from '../data/exact-lookups.json';
import {
  getModels, modelUrl, chainUrl, barUrl, chainKey, barGroups, codesFor, pitchLabel, gaugeLabel, pitchShort, gaugeShort,
  fileText, partText, barLabel, type Model, type Bar,
} from './data';
import { chainLink, type ShopGroup } from './shop';

type Xref = { kind: 'xref'; slug: string; query: string; part_brand: string; part_no: string; last_verified: string };
type Fits = { kind: 'fits'; slug: string; query: string; pitch: string; gauge: number; drive_links: number; last_verified: string };
type BarLen = { kind: 'bar-length'; slug: string; query: string; model_id: string; last_verified: string };
export type Lookup = Xref | Fits | BarLen;

export const LOOKUPS = raw as Lookup[];

const prefix = (kind: Lookup['kind']) => (kind === 'xref' ? '/xref/' : kind === 'fits' ? '/fits/' : '/bar-length/');
export const lookupPath = (l: Lookup) => `${prefix(l.kind)}${l.slug}/`;
export const lookupsByKind = (kind: Lookup['kind']) => LOOKUPS.filter((l) => l.kind === kind);

export type Hit = { model: Model; bar: Bar };
export type Fact = { saw: string; href: string; bar: string; pitch: string; gauge: string; dl: string; file: string; parts: string };
export type Src = { publisher: string; title: string; url?: string; retrieved: string; type: string };

const samePart = (brand: string, part: string, c: { brand: string; part_no: string }) =>
  c.brand.toLowerCase() === brand.toLowerCase() && c.part_no.toLowerCase() === part.toLowerCase();

const ok = (b: Bar): b is Bar & { pitch: string; gauge: number; drive_links: number } =>
  b.status === 'ok' && !!b.pitch && b.gauge != null && !!b.drive_links;

function hitsForPart(models: Model[], brand: string, part: string): Hit[] {
  const out: Hit[] = [];
  for (const model of models) for (const bar of model.data.bars) {
    if (bar.chains.some((c) => samePart(brand, part, c))) out.push({ model, bar });
  }
  return out;
}

function hitsForSpec(models: Model[], pitch: string, gauge: number, dl: number): Hit[] {
  const out: Hit[] = [];
  for (const model of models) for (const bar of model.data.bars) {
    if (ok(bar) && bar.pitch === pitch && bar.gauge === gauge && bar.drive_links === dl) out.push({ model, bar });
  }
  return out;
}

function specKey(h: Hit) {
  const b = h.bar;
  return ok(b) ? `${b.pitch}|${b.gauge}|${b.drive_links}` : '';
}

function sourcesOf(hits: Hit[]): Src[] {
  const seen = new Set<string>();
  const out: Src[] = [];
  for (const { model, bar } of hits) {
    const ids = new Set([...bar.source_ids, ...(bar.file_conflict ?? []).map((f) => f.source_id)]);
    for (const s of model.data.sources) {
      if (!ids.has(s.id) || seen.has(s.id + s.title)) continue;
      seen.add(s.id + s.title);
      out.push({ publisher: s.publisher, title: s.title, url: s.url, retrieved: s.retrieved, type: s.type });
    }
  }
  return out;
}

export function toFacts(hits: Hit[]): Fact[] {
  return hits.map(({ model, bar }) => ({
    saw: model.data.name,
    href: modelUrl(model),
    bar: barLabel(bar),
    pitch: bar.pitch ? pitchLabel(bar.pitch) : 'Verify on bar stamp',
    gauge: bar.gauge ? gaugeLabel(bar.gauge) : 'Verify on bar stamp',
    dl: bar.drive_links ? String(bar.drive_links) : 'Verify on bar stamp',
    file: fileText(bar, model),
    parts: bar.chains.map(partText).join('; ') || 'None stored',
  }));
}

const lenList = (hits: Hit[]) => [...new Set(hits.flatMap((h) => h.bar.lengths_in))].sort((a, b) => a - b).map((n) => `${n}″`).join(', ');

function familySentence(pitch: string, gauge: number, dl: number) {
  const c = codesFor(pitch, gauge);
  return `The chain-code table on this site for ${pitchLabel(pitch)} and ${gaugeLabel(gauge)} reads Oregon ${c.oregon}, STIHL ${c.stihl}, Husqvarna ${c.husqvarna}, Carlton ${c.carlton}. n/a means that brand's code is not verified for this spec. A loop of ${dl} drive links is the same three numbers only when the box shows that count.`;
}

export async function resolveLookup(entry: Lookup) {
  const models = await getModels();
  const bars = await barGroups();
  const barSet = new Set(bars.map((g) => g.length));
  let hits: Hit[] = [];
  let answer = '';
  if (entry.kind === 'xref') {
    hits = hitsForPart(models, entry.part_brand, entry.part_no);
    const verified = hits.filter((h) => ok(h.bar));
    if (!verified.length) throw new Error(`xref ${entry.slug} matches no verified row`);
    const keys = new Set(verified.map(specKey));
    if (keys.size !== 1) throw new Error(`xref ${entry.slug} matches more than one pitch/gauge/drive-link spec: ${[...keys].join(', ')}`);
    const b = verified[0].bar;
    const others = hitsForSpec(models, b.pitch!, b.gauge!, b.drive_links!).flatMap((h) => h.bar.chains.map(partText));
    const otherParts = [...new Set(others)].filter((p) => p.toLowerCase() !== `${entry.part_brand} ${entry.part_no}`.toLowerCase());
    answer = `${entry.part_brand} ${entry.part_no} is ${pitchLabel(b.pitch)} pitch, ${gaugeLabel(b.gauge)} gauge, ${b.drive_links} drive links, on the verified rows that store this part number. Those rows use it on ${lenList(verified)}. ${familySentence(b.pitch!, b.gauge!, b.drive_links!)}${otherParts.length ? ` Other part numbers stored on verified rows with these same three numbers: ${otherParts.join('; ')}.` : ''}`;
    hits = verified;
  } else if (entry.kind === 'fits') {
    hits = hitsForSpec(models, entry.pitch, entry.gauge, entry.drive_links);
    if (!hits.length) throw new Error(`fits ${entry.slug} matches no verified row`);
    const names = [...new Set(hits.map((h) => h.model.data.name))];
    answer = `A ${pitchLabel(entry.pitch)} pitch, ${gaugeLabel(entry.gauge)} gauge chain with ${entry.drive_links} drive links fits ${names.length} verified bar ${names.length === 1 ? 'setup' : 'setups'}. The saws are ${names.join(', ')}. ${familySentence(entry.pitch, entry.gauge, entry.drive_links)} The count is the bar's count. A different length of the same pitch and gauge is a different loop.`;
  } else {
    const model = models.find((m) => m.id === entry.model_id);
    if (!model) throw new Error(`bar-length ${entry.slug} has no model ${entry.model_id}`);
    hits = model.data.bars.filter(ok).map((bar) => ({ model, bar }));
    if (!hits.length) throw new Error(`bar-length ${entry.slug} has no verified bar`);
    const lengths = [...new Set(hits.flatMap((h) => h.bar.lengths_in))].sort((a, b) => a - b);
    answer = `${model.data.name} bar lengths on the verified rows: ${lengths.map((n) => `${n}″`).join(', ')}. ${lengths.length > 1 ? 'Drive links change with the bar, so the length on the box is not the chain size.' : 'One bar length is on file for this saw.'} ${model.data.blurb}`;
  }
  const facts = toFacts(hits);
  const sources = sourcesOf(hits);
  const saws = [...new Map(hits.map((h) => [h.model.id, h.model])).values()];
  const specChips = [...new Map(hits.filter((h) => ok(h.bar)).map((h) => {
    const key = chainKey(h.bar.pitch!, h.bar.gauge!);
    return [key, { href: chainUrl(key), label: `${pitchShort(h.bar.pitch)} · ${gaugeShort(h.bar.gauge)} chain` }] as const;
  })).values()];
  const lenChips = [...new Set(hits.flatMap((h) => h.bar.lengths_in))].filter((n) => barSet.has(n));
  const siblings = lookupsByKind(entry.kind).filter((l) => l.slug !== entry.slug).slice(0, 8);
  const chips = [
    ...saws.map((m) => ({ href: modelUrl(m), label: `${m.data.name} chain size` })),
    ...specChips,
    ...lenChips.map((n) => ({ href: barUrl(n), label: `${n}″ bar lengths` })),
    ...siblings.map((l) => ({ href: lookupPath(l), label: l.query })),
    { href: prefix(entry.kind), label: entry.kind === 'xref' ? 'All cross references' : entry.kind === 'fits' ? 'All drive-link lookups' : 'All bar lengths' },
    { href: '/guides/how-to-verify-chain-size/', label: 'Verify on the bar stamp' },
    { href: '/guides/chain-part-numbers/', label: 'Part numbers decoded' },
    { href: '/guides/oregon-chain-numbers/', label: 'Oregon chain numbers' },
    { href: '/guides/how-to-count-drive-links/', label: 'Count drive links' },
  ];
  const shopSpecs = [...new Map(hits.filter((h) => ok(h.bar)).map((h) => {
    const b = h.bar;
    return [`${b.pitch}|${b.gauge}|${b.drive_links}`, { pitch: b.pitch!, gauge: b.gauge!, dl: b.drive_links! }] as const;
  })).values()];
  const groups: ShopGroup[] = shopSpecs.length ? [{
    title: 'Chain for this spec',
    feature: true,
    links: shopSpecs.slice(0, 4).map((s) => chainLink(s)),
  }] : [];
  const faqs = [
    { q: entry.query.endsWith('?') ? entry.query : `${entry.query}?`, a: answer },
    { q: 'Do I order from the model name alone?', a: 'No. Pitch, gauge and drive links have to match the stamp on the guide bar that is mounted now. A model is often sold with more than one bar.' },
  ];
  return { entry, path: lookupPath(entry), answer, facts, sources, chips, groups, faqs, saws };
}

export function lookupLinksForModel(id: string) {
  return LOOKUPS.filter((l) => (l.kind === 'bar-length' && l.model_id === id) || l.kind !== 'bar-length').flatMap((l) => {
    if (l.kind === 'bar-length' && l.model_id === id) return [{ href: lookupPath(l), label: l.query }];
    return [];
  });
}

export function fitLinksFor(pitch: string | null, gauge: number | null, dl?: number | null) {
  if (!pitch || gauge == null) return [];
  return LOOKUPS.filter((l): l is Fits => l.kind === 'fits' && l.pitch === pitch && l.gauge === gauge && (dl == null || l.drive_links === dl)).map((l) => ({ href: lookupPath(l), label: l.query }));
}

export function xrefLinksForParts(parts: { brand: string; part_no: string }[]) {
  return LOOKUPS.filter((l): l is Xref => l.kind === 'xref' && parts.some((p) => samePart(l.part_brand, l.part_no, p))).map((l) => ({ href: lookupPath(l), label: l.query }));
}
