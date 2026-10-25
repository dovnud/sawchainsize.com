// Writes src/data/page-dates.json: a real lastmod (YYYY-MM-DD) for every indexable URL.
//  - /saws/<id>/            -> that model's last_verified date
//  - /brands/<b>/, /chain/<k>/, /bars/<n>-inch/ -> newest last_verified among the models they list
//  - /data/ and index pages -> newest last_verified in the dataset, or the template's last git commit if newer
//  - static pages / guides  -> git last-commit date of the page's source file (uncommitted edits count as today)
// Committed to the repo because Cloudflare Pages clones may be shallow (no usable git history at build time).
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const sh = (c) => execSync(c, { encoding: 'utf8' }).trim();
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
const dirty = new Set(sh('git status --porcelain').split('\n').filter(Boolean).map((l) => l.slice(3).replace(/^"|"$/g, '')));
const gitDate = (...files) => {
  const ds = files.map((f) => {
    if (!fs.existsSync(f)) return null;
    if (dirty.has(f)) return today;
    const d = sh(`git log -1 --format=%cd --date=format-local:%Y-%m-%d -- ${f}`);
    return d || today;
  }).filter(Boolean);
  return ds.sort().pop();
};
const read = (d) => fs.readdirSync(d).filter((f) => f.endsWith('.json')).map((f) => ({ id: f.replace('.json', ''), ...JSON.parse(fs.readFileSync(path.join(d, f), 'utf8')) }));
const models = read('src/content/models');
const spec = JSON.parse(fs.readFileSync('src/data/chain-specs.json', 'utf8'));
const max = (a) => a.sort().pop();
const out = {};
for (const m of models) out[`/saws/${m.id}/`] = m.last_verified;
for (const b of new Set(models.map((m) => m.brand))) out[`/brands/${b}/`] = max(models.filter((m) => m.brand === b).map((m) => m.last_verified));
const chains = new Map(), bars = new Map();
for (const m of models) for (const b of m.bars) {
  if (b.pitch && b.gauge) { const k = `${spec.pitches[b.pitch].slug}-${spec.gauges[String(b.gauge)].slug}`; (chains.get(k) ?? chains.set(k, []).get(k)).push(m.last_verified); }
  for (const l of b.lengths_in) (bars.get(l) ?? bars.set(l, []).get(l)).push(m.last_verified);
}
for (const [k, v] of chains) out[`/chain/${k}/`] = max(v);
for (const [l, v] of bars) out[`/bars/${l}-inch/`] = max(v);
const dataNewest = max(models.map((m) => m.last_verified));
const idx = (url, ...tpl) => (out[url] = max([dataNewest, gitDate(...tpl)]));
idx('/', 'src/pages/index.astro');
idx('/saws/', 'src/pages/saws/index.astro');
idx('/brands/', 'src/pages/brands/index.astro');
idx('/chain/', 'src/pages/chain/index.astro');
idx('/bars/', 'src/pages/bars/index.astro');
idx('/data/', 'src/pages/data/index.astro');
for (const [url, f] of [['/about/', 'about'], ['/how-we-verify/', 'how-we-verify'], ['/affiliate-disclosure/', 'affiliate-disclosure'], ['/privacy/', 'privacy'], ['/terms/', 'terms'], ['/contact/', 'contact']]) out[url] = gitDate(`src/pages/${f}.astro`);
out['/guides/'] = gitDate('src/pages/guides/index.astro');
for (const f of fs.readdirSync('src/pages/guides').filter((f) => f !== 'index.astro')) out[`/guides/${f.replace('.astro', '')}/`] = gitDate(`src/pages/guides/${f}`);
const sorted = Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync('src/data/page-dates.json', JSON.stringify(sorted, null, 2) + '\n');
console.log(Object.keys(sorted).length, 'urls; distinct dates:', [...new Set(Object.values(sorted))].sort().join(', '));
