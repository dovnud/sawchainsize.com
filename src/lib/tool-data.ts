import { AFFILIATE_REL, AFFILIATE_TARGET } from '../config/affiliate';
import { SPEC, SOURCE_TYPE_LABEL, barLabel, barPart, chainKey, chainUrl, codesFor, fileLabel, barFiles, fileText, gaugeLabel, getBrands, getModels, modelUrl, pitchLabel, type Bar, type Model } from './data';
import { specKey } from './fit-explain';
import { barLink, chainLink, type ShopLink } from './shop';
import type { ToolBar, ToolData, ToolModel, ToolPart, ToolShop, ToolSpec, ToolSpecSaw } from './tool-types';

export { AFFILIATE_REL, AFFILIATE_TARGET };

const SHOP_WHY = {
  product: 'Product page whose title matched this spec when it was checked. Confirm the listing still shows the same pitch, gauge and drive links.',
  search: 'Amazon search for this description, not one listing. Match the result to your bar stamp before you buy.',
};
const BAR_SHOP_WHY = 'Amazon search for this bar length with the pitch, gauge and drive-link count on the row. Match the listing to the bar part number when the row stores one, and to the stamp. This is not a claim that the first result is the factory bar.';

function toShop(link: ShopLink, why: string): ToolShop {
  if (link.kind === 'page') throw new Error('A matcher shop link has to be an Amazon URL');
  return { href: link.href, kind: link.kind, label: link.label, why };
}

function shopsFor(bar: Bar): ToolBar['shops'] {
  if (bar.status !== 'ok' || !bar.pitch || bar.gauge == null || !bar.drive_links) return [];
  const spec = { pitch: bar.pitch, gauge: bar.gauge, dl: bar.drive_links };
  const chain = chainLink(spec);
  const chainShop = toShop(chain, SHOP_WHY[chain.kind === 'search' ? 'search' : 'product']);
  return bar.lengths_in.map((length) => ({ length, chain: chainShop, bar: toShop(barLink(length, spec), BAR_SHOP_WHY) }));
}

const BRAND_ORDER = ['Oregon', 'STIHL', 'Stihl', 'Husqvarna', 'Echo', 'Makita', 'Poulan', 'Carlton', 'Ryobi'];

function brandRank(brand: string) {
  const i = BRAND_ORDER.findIndex((b) => b.toLowerCase() === brand.toLowerCase());
  return i === -1 ? 50 : i;
}

function fileFor(pitch: string, files: (string | null)[]): string {
  const labels = [...new Set(files.filter(Boolean) as string[])];
  if (labels.length) return labels.join(' / ');
  const fallback = (SPEC.pitches as Record<string, { file?: string }>)[pitch]?.file;
  return fallback && fallback !== 'n/a' ? fallback : 'Not stated on the verified rows';
}

function toBar(model: Model, bar: Bar): ToolBar {
  const sources = model.data.sources.filter((s) => bar.source_ids.includes(s.id)).map((s) => ({
    id: s.id,
    publisher: s.publisher,
    title: s.title,
    ...(s.url ? { url: s.url } : {}),
    typeLabel: SOURCE_TYPE_LABEL[s.type] ?? s.type,
    retrieved: s.retrieved,
  }));
  return {
    lengths: bar.lengths_in,
    label: barLabel(bar),
    pitch: bar.pitch,
    gauge: bar.gauge,
    dl: bar.drive_links,
    status: bar.status,
    file: bar.file_size,
    fileText: fileText(bar, model),
    barPart: barPart(bar.note),
    note: bar.note,
    ...(bar.gauge_note ? { gaugeNote: bar.gauge_note } : {}),
    dlRange: bar.drive_links_range ?? null,
    chains: bar.chains.map((c) => ({ brand: c.brand, partNo: c.part_no, role: c.role })),
    reported: (bar.reported ?? []).map((r) => {
      const src = model.data.sources.find((s) => s.id === r.source_id);
      return {
        publisher: src?.publisher ?? r.source_id,
        typeLabel: SOURCE_TYPE_LABEL[src?.type ?? ''] ?? 'source',
        pitch: r.pitch ?? null,
        gauge: r.gauge ?? null,
        dl: r.drive_links ?? null,
      };
    }),
    sources,
    shops: shopsFor(bar),
  };
}

export async function toolDataset(): Promise<ToolData> {
  const [models, brands] = await Promise.all([getModels(), getBrands()]);
  const chainPages = new Set<string>();
  const modelMap: Record<string, ToolModel> = {};
  for (const m of models) {
    for (const bar of m.data.bars) {
      if (bar.pitch && bar.gauge) chainPages.add(chainKey(bar.pitch, bar.gauge));
    }
    const url = modelUrl(m);
    modelMap[m.id] = {
      id: m.id,
      name: m.data.name,
      brand: m.data.brand,
      url,
      emailUrl: `${url}#email-specs`,
      lastVerified: m.data.last_verified,
      bars: m.data.bars.map((b) => toBar(m, b)),
    };
  }

  type Acc = ToolPart & { lengths: Map<string, Set<number>> };
  const bySpec = new Map<string, { pitch: string; gauge: number; dl: number; files: (string | null)[]; parts: Map<string, Acc>; saws: Map<string, ToolSpecSaw> }>();
  for (const m of models) {
    for (const bar of m.data.bars) {
      if (bar.status !== 'ok' || !bar.pitch || bar.gauge == null || !bar.drive_links) continue;
      const key = specKey(bar.pitch, bar.gauge, bar.drive_links);
      if (!bySpec.has(key)) bySpec.set(key, { pitch: bar.pitch, gauge: bar.gauge, dl: bar.drive_links, files: [], parts: new Map(), saws: new Map() });
      const bucket = bySpec.get(key)!;
      if (bar.file_size) bucket.files.push(fileLabel(bar.file_size));
      else for (const f of barFiles(bar, m)) bucket.files.push(`${f.label} (${f.by}; sources differ)`);
      const saw = bucket.saws.get(m.id) ?? { id: m.id, name: m.data.name, url: modelUrl(m), lengths: [], labels: [] };
      const label = barLabel(bar);
      if (!saw.labels.includes(label)) saw.labels.push(label);
      for (const len of bar.lengths_in) if (!saw.lengths.includes(len)) saw.lengths.push(len);
      saw.lengths.sort((a, b) => a - b);
      bucket.saws.set(m.id, saw);
      for (const c of bar.chains) {
        const id = `${c.role}|${c.brand}|${c.part_no}`;
        if (!bucket.parts.has(id)) {
          bucket.parts.set(id, { brand: c.brand, partNo: c.part_no, role: c.role, saws: [], lengths: new Map() });
        }
        const part = bucket.parts.get(id)!;
        if (!part.lengths.has(m.id)) part.lengths.set(m.id, new Set());
        for (const len of bar.lengths_in) part.lengths.get(m.id)!.add(len);
      }
    }
  }

  const specs: ToolSpec[] = [...bySpec.values()].map((bucket) => {
    const parts: ToolPart[] = [...bucket.parts.values()]
      .map((p) => ({
        brand: p.brand,
        partNo: p.partNo,
        role: p.role,
        saws: [...p.lengths.entries()]
          .map(([id, lens]) => ({ id, name: modelMap[id].name, url: modelMap[id].url, lengths: [...lens].sort((a, b) => a - b) }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => brandRank(a.brand) - brandRank(b.brand) || (a.role === b.role ? 0 : a.role === 'oem' ? -1 : 1) || a.partNo.localeCompare(b.partNo));
    const codes = codesFor(bucket.pitch, bucket.gauge);
    const hasCode = [codes.oregon, codes.stihl, codes.husqvarna, codes.carlton].some((c) => c && c !== 'n/a');
    const pageKey = chainKey(bucket.pitch, bucket.gauge);
    const link = chainLink({ pitch: bucket.pitch, gauge: bucket.gauge, dl: bucket.dl });
    return {
      key: specKey(bucket.pitch, bucket.gauge, bucket.dl),
      pitch: bucket.pitch,
      gauge: bucket.gauge,
      dl: bucket.dl,
      pitchLabel: pitchLabel(bucket.pitch),
      gaugeLabel: gaugeLabel(bucket.gauge),
      file: fileFor(bucket.pitch, bucket.files),
      chainUrl: chainPages.has(pageKey) ? chainUrl(pageKey) : null,
      codes: hasCode ? { oregon: codes.oregon, stihl: codes.stihl, husqvarna: codes.husqvarna, carlton: codes.carlton } : null,
      shop: link.kind === 'page' ? null : { href: link.href, kind: link.kind, label: link.label, why: SHOP_WHY[link.kind] },
      parts,
      saws: [...bucket.saws.values()].sort((a, b) => a.name.localeCompare(b.name)),
    };
  }).sort((a, b) => a.pitch.localeCompare(b.pitch) || a.gauge - b.gauge || a.dl - b.dl);

  const brandList = brands.map((b) => ({
    id: b.id,
    label: b.data.label,
    models: models.filter((m) => m.data.brand === b.id).map((m) => m.id),
  }));

  return { brands: brandList, models: modelMap, specs, chainPages: [...chainPages] };
}
