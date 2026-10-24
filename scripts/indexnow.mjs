// Submits every URL in dist/sitemap-0.xml to IndexNow. Run manually AFTER deploy: npm run indexnow
import fs from 'node:fs';
const key = fs.readdirSync('public').find((f) => /^[0-9a-f]{32}\.txt$/.test(f))?.replace('.txt', '');
const host = 'sawchainsize.com';
const xml = fs.readFileSync('dist/sitemap-0.xml', 'utf8');
const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const res = await fetch('https://api.indexnow.org/indexnow', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ host, key, keyLocation: `https://${host}/${key}.txt`, urlList }) });
console.log(res.status, urlList.length, 'urls');
