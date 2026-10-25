// Submits URLs to IndexNow. Run manually AFTER deploy.
//   npm run indexnow                      -> every URL in dist/sitemap-0.xml
//   npm run indexnow -- urls.txt          -> only the URLs listed in urls.txt (one per line)
import fs from 'node:fs';
const key = fs.readdirSync('public').find((f) => /^[0-9a-f]{32}\.txt$/.test(f))?.replace('.txt', '');
const host = 'sawchainsize.com';
const xml = fs.readFileSync('dist/sitemap-0.xml', 'utf8');
const only = process.argv[2];
const urlList = only
  ? fs.readFileSync(only, 'utf8').split(/\s+/).filter(Boolean)
  : [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const res = await fetch('https://api.indexnow.org/indexnow', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ host, key, keyLocation: `https://${host}/${key}.txt`, urlList }) });
console.log(res.status, urlList.length, 'urls');
