import { llmsTxt } from '../lib/llms';
export const GET = async () => new Response(await llmsTxt(), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
