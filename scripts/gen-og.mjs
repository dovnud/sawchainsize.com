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
const barCount = new Map();
models.forEach((m) => new Set(m.bars.flatMap((b) => b.lengths_in)).forEach((l) => barCount.set(l, (barCount.get(l) ?? 0) + 1)));
const pages = [
  ['saws', 'ALL MODELS', 'Chain size by saw model', 'Every verified model and bar'],
  ['brands', 'BRANDS', 'Chainsaw brands', 'Stihl · Husqvarna · Echo · Poulan Pro and more'],
  ['chain', 'CHAIN SPECS', 'Chain pitch × gauge', 'Every spec with its saws and file size'],
  ['bars', 'BAR LENGTHS', 'Chain size by bar length', 'Find the chain from the bar stamp'],
  ['guides', 'GUIDES', 'Chain sizing guides', 'Bar stamp · drive links · pitch · gauge'],
  ['guides-chain-size-chart', 'GUIDE', 'Chain identification chart', 'Pitch × gauge × file size × codes'],
  ['guides-how-to-verify-chain-size', 'GUIDE', 'How to verify your chain size', 'The 60-second bar-stamp check'],
  ['guides-how-to-count-drive-links', 'GUIDE', 'How to count drive links', 'Mark one link, count the tangs'],
  ['guides-oregon-72-vs-73-chain', 'GUIDE', 'Oregon 72 vs 73 chain', '.050″ vs .058″ gauge on 3/8″ pitch'],
  ['guides-chainsaw-chain-file-size', 'GUIDE', 'Chainsaw chain file size', 'Round file size by pitch'],
  ['guides-gifts-for-chainsaw-owners-2026', 'GUIDE', 'Gifts for chainsaw owners, 2026', 'Oil · a matched chain · safety gear'],
  ['guides-black-friday-chainsaw-chain', 'GUIDE', 'Black Friday chain and accessories', 'November 27 · fit still comes first'],
  ['guides-chainsaw-sharpening-angles', 'GUIDE', 'Chain sharpening angles', 'Top plate · down angle · depth gauge'],
  ['guides-chain-part-numbers', 'GUIDE', 'Chain part numbers decoded', 'STIHL · Husqvarna · Echo codes'],
  ['guides-stihl-chain-order-numbers', 'GUIDE', 'STIHL chain order numbers', '33 RS3 72 = 3624 005 0072'],
  ['guides-longer-bar-on-chainsaw', 'GUIDE', 'Longer bar on your saw?', 'Listed bar range for every saw'],
  ['about', 'ABOUT', 'About Saw Chain Size', 'Method · sources · last-verified policy'],
  ['how-we-verify', 'EDITORIAL POLICY', 'How we verify specs', 'Source hierarchy and conflict handling'],
  ['data', 'OPEN DATASET', 'Chain size dataset', 'CSV + JSON · pitch, gauge, drive links by saw and bar'],
  ['affiliate-disclosure', 'DISCLOSURE', 'Affiliate disclosure', 'Amazon Associates · no prices shown'],
];
const items = [
  ...pages.map(([file, kicker, title, sub]) => ({ file: `page-${file}`, kicker, title, sub })),
  ...[...barCount].filter(([, n]) => n >= 2).map(([l]) => ({ file: `page-bars-${l}-inch`, kicker: 'BAR LENGTH', title: `${l}″ bar chain sizes`, sub: 'Pitch · gauge · drive links by saw' })),
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
