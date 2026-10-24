import { llmsFull } from '../lib/llms';
export const GET = async () => new Response(await llmsFull(), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
