// Generates 1200x630 Open Graph images into public/og/ from content files (dev-only; needs playwright).
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
const read = (d) => fs.readdirSync(d).filter((f) => f.endsWith('.json')).map((f) => ({ id: f.replace('.json', ''), ...JSON.parse(fs.readFileSync(path.join(d, f), 'utf8')) }));
const models = read('src/content/models'), brands = read('src/content/brands');
const spec = JSON.parse(fs.readFileSync('src/data/chain-specs.json', 'utf8'));
const keyOf = (p, g) => `${spec.pitches[p].slug}-${spec.gauges[String(g)].slug}`;
const chains = new Map();
models.forEach((m) => m.bars.forEach((b) => { if (b.pitch && b.gauge) chains.set(keyOf(b.pitch, b.gauge), `${spec.pitches[b.pitch].label} · ${spec.gauges[String(b.gauge)].short}`); }));
const items = [
  { file: 'default', kicker: 'CHAIN SIZE LOOKUP', title: 'Chainsaw chain size, bar first', sub: 'Pitch · gauge · drive links by saw model' },
  ...models.map((m) => ({ file: m.id, kicker: 'CHAIN SIZE', title: `${m.name} chain size`, sub: 'Pitch · gauge · drive links · file size' })),
  ...brands.map((b) => ({ file: `brand-${b.id}`, kicker: 'BY BRAND', title: `${b.name} chain sizes`, sub: 'Every verified saw model' })),
  ...[...chains].map(([k, t]) => ({ file: `chain-${k}`, kicker: 'CHAIN SPEC', title: `${t} chain`, sub: 'Codes · file size · saws that use it' })),
];
const html = (i) => `<body style="margin:0;width:1200px;height:630px;background:#f6f3ec;font-family:Barlow,Arial,sans-serif;position:relative;overflow:hidden">
<div style="position:absolute;left:0;top:0;bottom:0;width:28px;background:#cf4a08"></div>
<div style="position:absolute;left:84px;top:70px;font:600 28px monospace;letter-spacing:4px;color:#cf4a08">${i.kicker}</div>
<div style="position:absolute;left:84px;top:150px;right:80px;font:700 ${i.title.length > 30 ? 84 : 108}px/1.02 'Barlow Condensed','Arial Narrow',Arial,sans-serif;color:#232a30;text-transform:uppercase">${i.title}</div>
<div style="position:absolute;left:84px;bottom:150px;font:500 38px sans-serif;color:#5b636c">${i.sub}</div>
<div style="position:absolute;left:0;right:0;bottom:0;height:90px;background:#232a30;color:#f2efe7;font:600 32px monospace;line-height:90px;padding-left:84px;letter-spacing:2px">SAWCHAINSIZE.COM</div></body>`;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
fs.mkdirSync('public/og', { recursive: true });
for (const i of items) { await p.setContent(html(i)); await p.screenshot({ path: `public/og/${i.file}.png` }); }
await b.close(); console.log(items.length, 'og images');
