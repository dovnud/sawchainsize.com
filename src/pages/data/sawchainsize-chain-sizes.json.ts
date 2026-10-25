import { datasetMeta, COLUMNS, CSV_PATH, DATASET_PATH } from '../../lib/dataset';
import { SITE } from '../../lib/data';
export const GET = async () => {
  const m = await datasetMeta();
  const body = {
    name: 'Chainsaw chain size by saw model and bar length', publisher: 'Saw Chain Size', url: SITE.url + DATASET_PATH,
    dateModified: m.dateModified, rows: m.rows, saw_models: m.models,
    note: 'Pitch, gauge and drive-link count are specifications transcribed from the sources named per row. Always confirm against the stamp on your guide bar before ordering. See https://sawchainsize.com/data/#license for reuse terms.',
    csv: SITE.url + CSV_PATH, columns: Object.fromEntries(COLUMNS),
    records: m.recs.map(({ oem_chains, equivalent_chains, oem_chain_parts, equivalent_chain_parts, ...r }) => ({ ...r, oem_chains, equivalent_chains })),
  };
  return new Response(JSON.stringify(body, null, 1) + '\n', { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
