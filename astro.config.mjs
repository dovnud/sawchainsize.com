import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readFileSync } from 'node:fs';

// lastmod per URL comes from src/data/page-dates.json (npm run lastmod): model/brand/chain/bar pages use the
// data's last_verified date; static pages use their source file's last git commit. No constant fallback:
// a URL missing from the file is left without <lastmod> rather than given a made-up date.
const lastmodByPath = JSON.parse(readFileSync('./src/data/page-dates.json', 'utf8'));

export default defineConfig({
  site: 'https://sawchainsize.com',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'always' },
  compressHTML: true,
  integrations: [
    sitemap({
      filter: (page) => new URL(page).pathname !== '/404/',
      serialize(item) {
        const path = new URL(item.url).pathname;
        if (lastmodByPath[path]) item.lastmod = new Date(`${lastmodByPath[path]}T00:00:00Z`).toISOString();
        else delete item.lastmod;
        return item;
      },
    }),
  ],
});
