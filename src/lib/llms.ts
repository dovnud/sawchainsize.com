import { getModels, getBrands, chainGroups, barGroups, modelUrl, brandUrl, barUrl, chainUrl, barLabel, pitchLabel, gaugeLabel, dlText, pitchText, gaugeText, fileText, partText, statusLabel, SITE } from './data';

const abs = (p: string) => SITE.url + p;

const guides = [
  ['/guides/how-to-verify-chain-size/', 'How to verify your chain size', 'Bar stamp, drive-link count, pitch and gauge measurement.'],
  ['/guides/chain-size-chart/', 'Chain identification chart', 'Pitch x gauge x file size and Oregon/Stihl/Husqvarna/Carlton code cross-reference.'],
  ['/guides/how-to-count-drive-links/', 'How to count drive links', 'Mark one link, count the tangs, match the box.'],
  ['/guides/oregon-72-vs-73-chain/', 'Oregon 72 vs 73 chain', '3/8" pitch; 72 is .050" gauge, 73 is .058" gauge.'],
  ['/guides/chainsaw-chain-file-size/', 'Chainsaw chain file size', 'Round file size by pitch.'],
  ['/how-we-verify/', 'How we verify specs', 'Source hierarchy and conflict handling.'],
  ['/affiliate-disclosure/', 'Affiliate disclosure', 'Amazon Associates participant (Amazon only): Amazon links are affiliate links and the site earns from qualifying purchases. No other affiliate programs; Oregon and other links are untagged.'],
];

export async function llmsTxt() {
  const models = await getModels(); const brands = await getBrands(); const chains = await chainGroups(); const bars = await barGroups();
  const L: string[] = [];
  L.push('# SawChainSize.com', '');
  L.push('> Chainsaw chain size lookup by saw model and fitted bar length. For each saw we publish pitch, gauge, drive-link count, file size and chain part numbers, marked VERIFIED, VERIFY ON BAR STAMP or SOURCES CONFLICT, with the sources behind every figure and a last-verified date. The bar is what decides the chain: always match pitch, gauge and drive links against the stamp on your guide-bar tail.', '');
  L.push('Contact: ' + SITE.email, 'Full content for LLMs: ' + abs('/llms-full.txt'), 'Sitemap: ' + abs('/sitemap-index.xml'), 'Data last verified: ' + SITE.dataDateLabel, '');
  L.push('## Saw models', '');
  for (const m of models) L.push(`- [${m.data.name} chain size](${abs(modelUrl(m))}): ${m.data.blurb}`);
  L.push('', '## Brands', '');
  for (const b of brands) L.push(`- [${b.data.name}](${abs(brandUrl(b.id))}): ${b.data.summary}`);
  L.push('', '## Chain specs (pitch x gauge)', '');
  for (const g of chains) L.push(`- [${pitchLabel(g.pitch)} pitch, ${gaugeLabel(g.gauge)} gauge](${abs(chainUrl(g.key))})`);
  L.push('', '## Bar lengths', '');
  for (const g of bars) L.push(`- [${g.length}-inch bar](${abs(barUrl(g.length))})`);
  L.push('', '## Guides', '');
  for (const [p, t, d] of guides) L.push(`- [${t}](${abs(p)}): ${d}`);
  L.push('', '## Optional', '', `- [About](${abs('/about/')})`, `- [Contact](${abs('/contact/')})`, `- [Privacy](${abs('/privacy/')})`, `- [Terms](${abs('/terms/')})`, '');
  return L.join('\n');
}

export async function llmsFull() {
  const models = await getModels();
  const L: string[] = [];
  L.push('# SawChainSize.com — full reference data', '');
  L.push(`Generated from the site's content files. Data last verified ${SITE.dataDateLabel}. Canonical site: ${SITE.url}/. Contact: ${SITE.email}.`, '');
  L.push('Rules: pitch, gauge and drive links must all match the guide bar stamped spec. Never order by saw model or bar length alone. Where sources conflict, the conflicting values are listed and no single value is asserted. Amazon links on the site are affiliate links (Amazon Associates; the site earns from qualifying purchases) and always sit next to that disclosure; they are either a verified product page or an Amazon search by pitch, gauge and drive links. No prices are shown. No other affiliate programs are used.', '');
  for (const m of models) {
    const d = m.data;
    L.push(`## ${d.name}`, '', `URL: ${abs(modelUrl(m))}`, `Type: ${d.type}${d.displacement_cc ? `, ${d.displacement_cc} cc` : ''}`, `Last verified: ${d.last_verified}`, '', d.intro, '');
    for (const b of d.bars) {
      L.push(`### ${barLabel(b)} bar — ${statusLabel(b.status)}`, '');
      L.push(`- Pitch: ${pitchText(b)}`, `- Gauge: ${gaugeText(b)}`, `- Drive links: ${dlText(b, m)}`, `- File size: ${fileText(b)}`);
      if (b.chains.length) L.push(`- Chain part numbers: ${b.chains.map((c) => `${partText(c)} (${c.role})`).join('; ')}`);
      if (b.reported?.length) L.push('- Reported by sources: ' + b.reported.map((r) => [r.pitch && `pitch ${r.pitch}`, r.gauge && `gauge ${r.gauge}`, r.drive_links && `${r.drive_links} DL`, r.source_id].filter(Boolean).join(' / ')).join(' | '));
      L.push(`- Note: ${b.note}`, '');
    }
    L.push('Sources: ' + d.sources.map((s) => `${s.publisher} (${s.type}, retrieved ${s.retrieved})`).join('; '), '');
  }
  L.push('## File size by pitch', '', '- 3/8" low-profile: 5/32" (4.0 mm) at .050" gauge; 11/64" (4.5 mm) at .043" gauge', '- .325": 3/16" (4.8 mm)', '- 3/8": 7/32" (5.5 mm)', '- .404": 7/32" (5.5 mm)', '');
  L.push('## Oregon 72 vs 73', '', 'Both 3/8" pitch. Oregon 72 is .050" gauge; Oregon 73 is .058" gauge. Gauge must match the guide-bar groove.', '');
  return L.join('\n');
}
