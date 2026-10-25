import { datasetRecords, toCsv } from '../../lib/dataset';
export const GET = async () => new Response(toCsv(await datasetRecords()), { headers: { 'Content-Type': 'text/csv; charset=utf-8' } });
