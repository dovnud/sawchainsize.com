import { getModels, modelUrl, SITE, pitchLabel, gaugeLabel, fileLabel, partText, oemParts, equivParts, barPart, SOURCE_TYPE_LABEL, type Model } from './data';

export const DATASET_PATH = '/data/';
export const CSV_PATH = '/data/sawchainsize-chain-sizes.csv';
export const JSON_PATH = '/data/sawchainsize-chain-sizes.json';

export const COLUMNS: [string, string][] = [
  ['model_id', 'URL slug of the saw model page (https://sawchainsize.com/saws/<model_id>/)'],
  ['brand', 'Saw brand'],
  ['saw_model', 'Saw model name as printed on the page'],
  ['power', 'gas, battery or electric'],
  ['displacement_cc', 'Engine displacement in cc, only where a source states it (blank otherwise)'],
  ['bar_length_in', 'Guide-bar length in inches (one row per saw, bar setup and length)'],
  ['pitch', 'Chain pitch in inches, e.g. 3/8 or .325; blank where sources conflict or none is verified'],
  ['gauge_in', 'Drive-link gauge in inches, e.g. 0.050; blank where sources conflict or none is verified'],
  ['drive_links', 'Drive-link count for that bar length; blank unless a source states it'],
  ['file_size', 'Round file size for that pitch'],
  ['status', 'ok = a manufacturer, fit-up chart or chain-maker source states it; verify = not traced to an authoritative source; conflict = credible sources disagree'],
  ['oem_chain_parts', 'Manufacturer chain part numbers named by a source'],
  ['equivalent_chain_parts', 'Equivalent (aftermarket or chain-maker) chain part numbers named by a source'],
  ['bar_part_number', 'Recommended guide-bar part number where the source states it'],
  ['reported_values', 'For conflict/verify rows: what each source reported, as source_id: pitch / gauge / drive links'],
  ['sources', 'Publisher and type of each source behind the row'],
  ['last_verified', 'Date (YYYY-MM-DD) the saw’s sources were last checked'],
  ['page_url', 'Canonical page for the saw on sawchainsize.com'],
];

export interface Row { [k: string]: string | number | null }
export interface Rec extends Row { oem_chains: string[]; equivalent_chains: string[] }

export async function datasetRecords(): Promise<Rec[]> {
  const models: Model[] = await getModels();
  const out: Rec[] = [];
  for (const m of models) {
    const d = m.data;
    for (const b of d.bars) for (const len of b.lengths_in) {
      const srcs = d.sources.filter((s) => b.source_ids.includes(s.id));
      out.push({
        model_id: m.id, brand: d.brand, saw_model: d.name, power: d.type, displacement_cc: d.displacement_cc ?? null,
        bar_length_in: len,
        pitch: b.pitch ? pitchLabel(b.pitch).replace('″', '') : null,
        gauge_in: b.gauge ? Number(b.gauge).toFixed(3) : null,
        drive_links: b.drive_links ?? null,
        file_size: b.file_size ? fileLabel(b.file_size) : null,
        status: b.status,
        oem_chain_parts: oemParts(b).map(partText).join(' | ') || null,
        equivalent_chain_parts: equivParts(b).map(partText).join(' | ') || null,
        bar_part_number: barPart(b.note),
        reported_values: (b.reported ?? []).map((r) => `${r.source_id}: ${r.pitch ?? '?'} / ${r.gauge ?? '?'} / ${r.drive_links ?? '?'} DL`).join(' | ') || null,
        sources: srcs.map((s) => `${s.publisher} (${SOURCE_TYPE_LABEL[s.type]})`).join(' | ') || null,
        last_verified: d.last_verified,
        page_url: SITE.url + modelUrl(m),
        oem_chains: oemParts(b).map(partText), equivalent_chains: equivParts(b).map(partText),
      });
    }
  }
  return out;
}

const esc = (v: unknown) => { if (v === null || v === undefined) return ''; const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export const toCsv = (recs: Rec[]) => [COLUMNS.map(([c]) => c).join(','), ...recs.map((r) => COLUMNS.map(([c]) => esc(r[c])).join(','))].join('\n') + '\n';

export async function datasetMeta() {
  const recs = await datasetRecords();
  const models = await getModels();
  return {
    recs, models: models.length, rows: recs.length,
    dateModified: models.map((m) => m.data.last_verified).sort().pop()!,
    brands: [...new Set(models.map((m) => m.data.brand))],
    verifiedRows: recs.filter((r) => r.status === 'ok').length,
  };
}
