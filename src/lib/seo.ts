/** SERP title and meta description limits. Applied in the base layout so every page inherits them. */

const BRAND = 'SawChainSize.com';
const SEP = ' | ';

/** Drop a brand prefix or suffix so the query can lead and the brand can be reattached once. */
function primaryTitle(input: string): string {
  return input
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s*\|\s*SawChainSize(?:\.com)?\s*$/i, '')
    .replace(/^SawChainSize\.com\s*[—–-]\s*/i, '')
    .trim();
}

/** Count the way the character appears in HTML, so an ampersand does not push a 60-character title over. */
function htmlLen(input: string): number {
  return input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').length;
}

function shorten(input: string, maxHtml: number): string {
  let cut = input.trim();
  while (cut.length > 15 && htmlLen(cut) > maxHtml) {
    const space = cut.lastIndexOf(' ');
    if (space < 15) break;
    cut = cut.slice(0, space);
  }
  return cut.replace(/[\s,;:|·—–&-]+$/u, '').trim();
}

/** 15–60 characters in both the decoded title and its HTML source. Primary query first, brand last when it fits. */
export function serpTitle(input: string): string {
  const primary = primaryTitle(input);
  const branded = (text: string) => `${text}${SEP}${BRAND}`;
  const fitted = shorten(primary, 60 - htmlLen(SEP + BRAND));
  if (fitted.length >= 15 && htmlLen(branded(fitted)) <= 60) return branded(fitted);
  const bare = shorten(primary, 60);
  return bare.length >= 15 ? bare : shorten(`${primary} chain size`, 60);
}

const DESC_SUFFIX = ' Confirm pitch, gauge and drive links on the bar stamp.';

function clipSentence(input: string, max: number): string {
  let cut = input.trim();
  while (htmlLen(cut) > max - 1 && cut.length > 40) {
    const space = cut.lastIndexOf(' ');
    if (space < 40) break;
    cut = cut.slice(0, space);
  }
  cut = cut.replace(/[\s,;:|·—–&-]+$/u, '').replace(/\b(with|and|or|the|a|an|for|to|of|in)$/i, '').replace(/[\s,;:|·—–&-]+$/u, '').replace(/\.+$/, '');
  const sentence = `${cut}.`;
  return htmlLen(sentence) <= max ? sentence : sentence.slice(0, max);
}

/** 70–160 characters, aimed at 120–155. Keeps the opening fact and closes on a word. */
export function metaDescription(input: string): string {
  let text = input.replace(/\s+/g, ' ').trim();
  if (htmlLen(text) > 155) text = clipSentence(text, 155);
  if (text.length < 120) {
    const base = text.replace(/\s+$/, '').replace(/\.+$/, '');
    const extended = `${base}.${DESC_SUFFIX}`;
    text = htmlLen(extended) <= 155 ? extended : clipSentence(extended, 155);
  }
  if (htmlLen(text) > 160) text = clipSentence(text, 150);
  if (text.length < 70) text = clipSentence(`${text} Chainsaw chain size by pitch, gauge and drive links.`, 155);
  return text;
}

/** Date-only values become a UTC ISO 8601 datetime. Values that already include a time are kept. */
export function isoDate(input?: string): string | undefined {
  if (!input) return undefined;
  const value = input.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T00:00:00Z`;
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return value;
  return value;
}
