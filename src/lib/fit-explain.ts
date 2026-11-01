/**
 * Fit / no-fit copy for the compatibility checker.
 * Sentences restate rules this site already attributes to Oregon's published pages,
 * plus the drive-link count on a fit-up row. No prices, no stock, no invented fit.
 */

export const OREGON_FINDING = 'https://www.oregonproducts.com/en/product-support/chainsaw/finding-the-right-saw-chain/c/finding-the-right-saw-chain-s';
export const OREGON_MANUAL = 'https://apps.oregonproducts.com/pdfs/OregonMMANUAL_EN_A106971ab.pdf';
export const OREGON_FAQ = 'https://www.oregonproducts.com/en_gb/faq';

const PITCH: Record<string, string> = {
  '3/8-lp': '3/8″ low profile',
  '325': '.325″',
  '3/8': '3/8″',
  '404': '.404″',
  '1/4': '1/4″',
};
const GAUGE: Record<string, string> = {
  '0.043': '.043″',
  '0.05': '.050″',
  '0.058': '.058″',
  '0.063': '.063″',
};

export const pitchName = (p: string | null | undefined) => (p && PITCH[p]) || (p ? p : 'not stated');
export const gaugeName = (g: number | null | undefined) => (g != null && GAUGE[String(g)]) || (g != null ? String(g) : 'not stated');
export const specKey = (pitch: string, gauge: number, dl: number) => `${pitch}|${gauge}|${dl}`;

export type FitLink = { href: string; label: string };
export type FitLine = { ok: boolean | null; title: string; text: string; links: FitLink[] };
export type FitSource = { publisher: string; title: string; url?: string; typeLabel: string; retrieved: string };
export type FitReport = { publisher: string; typeLabel: string; pitch?: string | null; gauge?: number | null; dl?: number | null };
export type BarSide = {
  pitch: string | null;
  gauge: number | null;
  dl: number | null;
  status: 'stamp' | 'ok' | 'verify' | 'conflict';
  sawName?: string;
  barLabel?: string;
  sawUrl?: string;
  gaugeNote?: string;
  dlRange?: [number, number] | null;
  note?: string;
  sources?: FitSource[];
  reported?: FitReport[];
};
export type ChainSide = { pitch: string; gauge: number; dl: number };
export type FitResult = { verdict: 'match' | 'nomatch' | 'unresolved'; headline: string; detail: string; lines: FitLine[] };

const oregonPitch: FitLink[] = [
  { href: OREGON_FINDING, label: 'Oregon, Finding the Right Saw Chain' },
  { href: OREGON_MANUAL, label: 'Oregon Maintenance and Safety Manual' },
  { href: OREGON_FAQ, label: 'Oregon FAQ' },
  { href: '/guides/chainsaw-drive-sprocket/', label: 'Drive sprocket and pitch' },
];
const oregonGauge: FitLink[] = [
  { href: OREGON_FINDING, label: 'Oregon, Finding the Right Saw Chain' },
  { href: '/guides/chainsaw-chain-gauge/', label: 'Chain gauge' },
];
const dlLinks: FitLink[] = [{ href: '/guides/how-to-count-drive-links/', label: 'How to count drive links' }];

const where = (bar: BarSide) => (bar.sawName && bar.barLabel ? `the ${bar.barLabel} bar on the ${bar.sawName}` : 'the numbers you entered for the bar');

function sourceLine(sources: FitSource[] | undefined): FitLine | null {
  if (!sources?.length) return null;
  const text = sources.map((s) => `${s.publisher} — ${s.title} (${s.typeLabel}, retrieved ${s.retrieved})`).join(' ');
  const links = sources.filter((s) => s.url).map((s) => ({ href: s.url!, label: `${s.publisher}: ${s.title}` }));
  return { ok: null, title: 'Where this row came from', text, links };
}

function reportBits(r: FitReport): string {
  const bits = [r.pitch ? `${pitchName(r.pitch)} pitch` : '', r.gauge != null ? `${gaugeName(r.gauge)} gauge` : '', r.dl != null ? `${r.dl} drive links` : ''].filter(Boolean);
  return bits.join(', ');
}

function conflictLines(bar: BarSide, chain: ChainSide): { lines: FitLine[]; anyConsistent: boolean; anyDisagree: boolean } {
  const lines: FitLine[] = [];
  let anyConsistent = false;
  let anyDisagree = false;
  for (const r of bar.reported ?? []) {
    const stated: string[] = [];
    const diffs: string[] = [];
    if (r.pitch) { stated.push('pitch'); if (r.pitch !== chain.pitch) diffs.push('pitch'); }
    if (r.gauge != null) { stated.push('gauge'); if (r.gauge !== chain.gauge) diffs.push('gauge'); }
    if (r.dl != null) { stated.push('drive links'); if (r.dl !== chain.dl) diffs.push('drive links'); }
    if (!stated.length) {
      lines.push({ ok: null, title: r.publisher, text: `${r.publisher} (${r.typeLabel}) is cited on this row and does not state pitch, gauge or drive links in the stored report.`, links: [] });
      continue;
    }
    const what = reportBits(r);
    const diffText = diffs.length <= 1 ? diffs.join('') : diffs.length === 2 ? diffs.join(' and ') : `${diffs.slice(0, -1).join(', ')} and ${diffs[diffs.length - 1]}`;
    if (!diffs.length) {
      anyConsistent = true;
      lines.push({
        ok: null,
        title: r.publisher,
        text: `${r.publisher} (${r.typeLabel}) reports ${what}. On the fields that report states, the chain matches. ${stated.length < 3 ? 'That report does not state all three numbers, so it is not a complete spec.' : 'Another cited report still disagrees, so this is not called a fit.'}`,
        links: [],
      });
    } else {
      anyDisagree = true;
      lines.push({
        ok: false,
        title: r.publisher,
        text: `${r.publisher} (${r.typeLabel}) reports ${what}. The chain differs on ${diffText}.`,
        links: [],
      });
    }
  }
  return { lines, anyConsistent, anyDisagree };
}

function pitchLine(barPitch: string, chainPitch: string): FitLine {
  if (barPitch === chainPitch) {
    return {
      ok: true,
      title: 'Pitch',
      text: `Pitch matches (${pitchName(barPitch)}). Oregon defines pitch as the distance between any three consecutive rivets divided by two, and says the drive sprocket must be the same pitch as the chain. If the bar has a sprocket nose, that nose has to match too. These rows do not record the sprocket tooth count on your saw.`,
      links: oregonPitch,
    };
  }
  const lp = new Set([barPitch, chainPitch]);
  if (lp.has('3/8') && lp.has('3/8-lp')) {
    return {
      ok: false,
      title: 'Pitch',
      text: `Pitch does not match (${pitchName(barPitch)} on the bar, ${pitchName(chainPitch)} on the chain). Oregon’s chart lists 3/8″ low profile (types 90 and 91) apart from standard 3/8″ (types 72, 73 and 75). The same gauge does not make them one chain. The drive sprocket has to be the same pitch family as the chain.`,
      links: [...oregonPitch, { href: '/guides/3-8-low-profile-vs-standard-chain/', label: '3/8″ low profile vs standard' }],
    };
  }
  return {
    ok: false,
    title: 'Pitch',
    text: `Pitch does not match (${pitchName(barPitch)} on the bar, ${pitchName(chainPitch)} on the chain). Oregon says the drive sprocket must be the same pitch as the chain, so this checker does not call it a fit.`,
    links: oregonPitch,
  };
}

function gaugeLine(barGauge: number, chainGauge: number, pitches: string[]): FitLine {
  if (barGauge === chainGauge) {
    return {
      ok: true,
      title: 'Gauge',
      text: `Gauge matches (${gaugeName(barGauge)}). Oregon defines gauge as the thickness of the drive link where it fits into the guide-bar groove, and says the chain gauge and the bar gauge have to match.`,
      links: oregonGauge,
    };
  }
  const pair = new Set([barGauge, chainGauge]);
  const classic = pitches.every((p) => p === '3/8') && pair.has(0.05) && pair.has(0.058);
  return {
    ok: false,
    title: 'Gauge',
    text: `Gauge does not match (${gaugeName(barGauge)} on the bar, ${gaugeName(chainGauge)} on the chain). Oregon’s rule is that the gauges match. A drive link thicker than the groove will not seat in it. A drive link thinner than the groove has side clearance.${classic ? ' This pair is Oregon 72 (.050″) and Oregon 73 (.058″), both standard 3/8″.' : ''}`,
    links: classic ? [...oregonGauge, { href: '/guides/oregon-72-vs-73-chain/', label: 'Oregon 72 vs 73' }] : oregonGauge,
  };
}

function dlLine(barDl: number, chainDl: number): FitLine {
  if (barDl === chainDl) {
    return {
      ok: true,
      title: 'Drive links',
      text: `Drive-link count matches (${barDl}). The count is the number of tangs in the loop. A fit-up row names one count for a bar, and this checker treats only that count as the match.`,
      links: dlLinks,
    };
  }
  return {
    ok: false,
    title: 'Drive links',
    text: `Drive-link count does not match (${barDl} on the bar, ${chainDl} on the chain). Those are different loops. Matching pitch and gauge does not replace the count.`,
    links: dlLinks,
  };
}

export function explainFit(bar: BarSide, chain: ChainSide): FitResult {
  if (bar.status === 'conflict') {
    const { lines, anyConsistent, anyDisagree } = conflictLines(bar, chain);
    const sawBit = bar.sawUrl ? ` The saw page is ${bar.sawName}.` : '';
    const note = bar.note ? ` Row note: ${bar.note}` : '';
    if (!anyConsistent && anyDisagree) {
      return {
        verdict: 'nomatch',
        headline: 'Does not match the reported specs',
        detail: `Every stored report for ${where(bar)} disagrees with this chain on a number that report states, and those sources already disagree with each other. This checker does not call a fit. The stamp on the bar is the tiebreaker.${sawBit}${note}`,
        lines,
      };
    }
    return {
      verdict: 'unresolved',
      headline: 'No fit called — sources conflict',
      detail: `Published sources disagree for ${where(bar)}. This checker does not call a fit while they disagree, even where one report matches the chain on the fields it states. The stamp on the bar is the tiebreaker.${sawBit}${note}`,
      lines,
    };
  }

  const lines: FitLine[] = [];
  let hardMiss = false;
  let open = false;

  if (bar.pitch) lines.push(pitchLine(bar.pitch, chain.pitch));
  else {
    open = true;
    lines.push({ ok: null, title: 'Pitch', text: 'This row does not publish one pitch, so pitch is not scored as a match.', links: oregonPitch });
  }

  if (bar.gauge != null) lines.push(gaugeLine(bar.gauge, chain.gauge, [bar.pitch, chain.pitch].filter(Boolean) as string[]));
  else {
    open = true;
    lines.push({
      ok: null,
      title: 'Gauge',
      text: `This row does not publish one gauge${bar.gaugeNote ? ` (${bar.gaugeNote})` : ''}. Gauge is not scored as a match. Oregon’s rule still stands for the bar in your hands: the chain gauge and the bar-groove gauge have to match.`,
      links: oregonGauge,
    });
  }

  if (bar.dl != null) lines.push(dlLine(bar.dl, chain.dl));
  else if (bar.dlRange) {
    const [lo, hi] = bar.dlRange;
    if (chain.dl < lo || chain.dl > hi) {
      hardMiss = true;
      lines.push({
        ok: false,
        title: 'Drive links',
        text: `The published range on this row is ${lo}–${hi} drive links. ${chain.dl} is outside that range, so it does not match this row. The range is not one bar’s count.`,
        links: dlLinks,
      });
    } else {
      open = true;
      lines.push({
        ok: null,
        title: 'Drive links',
        text: `${chain.dl} sits inside the published range ${lo}–${hi}, which covers more than one bar. This checker does not call a fit from a range. Read the count on the bar stamp.`,
        links: dlLinks,
      });
    }
  } else {
    open = true;
    lines.push({
      ok: null,
      title: 'Drive links',
      text: 'This row does not publish a drive-link count. The count is the number of tangs in the loop, and it has to be the count on the bar. This checker does not invent one.',
      links: dlLinks,
    });
  }

  for (const line of lines) if (line.ok === false) hardMiss = true;
  const src = sourceLine(bar.sources);
  if (bar.status !== 'stamp' && src) lines.push(src);

  const place = where(bar);
  if (hardMiss) {
    return {
      verdict: 'nomatch',
      headline: bar.status === 'stamp' ? 'Does not match the numbers you entered' : 'Does not match this bar',
      detail: bar.status === 'stamp'
        ? 'The chain and the bar numbers differ. Order the pitch, gauge and drive-link count on the stamp, not a neighbor of them.'
        : `The chain does not match the published spec for ${place}.${bar.note ? ` Row note: ${bar.note}` : ''}`,
      lines,
    };
  }
  if (open || bar.status === 'verify') {
    return {
      verdict: 'unresolved',
      headline: 'No fit called — the row is not one loop',
      detail: `This site does not print a single complete spec for ${place}, so this checker does not call a fit from the chart.${bar.note ? ` Row note: ${bar.note}` : ''} Read the stamp.`,
      lines,
    };
  }
  return {
    verdict: 'match',
    headline: bar.status === 'stamp' ? 'The three numbers match' : 'Matches the published spec',
    detail: bar.status === 'stamp'
      ? 'The chain you entered has the same pitch, gauge and drive-link count as the bar numbers you entered. This page has not seen the bar. If a number was misread, the match is wrong. Confirm the stamp before you buy.'
      : `This chain matches the published spec for ${place}: ${pitchName(bar.pitch)} pitch, ${gaugeName(bar.gauge)} gauge, ${bar.dl} drive links. The sprocket on the saw still has to be that pitch. This site does not record sprocket tooth counts.${bar.note ? ` Row note: ${bar.note}` : ''}`,
    lines,
  };
}
