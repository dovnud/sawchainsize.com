import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readFileSync, readdirSync } from 'node:fs';

// lastmod per URL comes from the data's last_verified dates (see src/lib/data.ts); fallback = site data date.
const SITE_DATE = '2026-10-23';
const lastmodByPath = {};
for (const f of readdirSync('./src/content/models')) {
  const m = JSON.parse(readFileSync(`./src/content/models/${f}`, 'utf8'));
  lastmodByPath[`/saws/${f.replace('.json', '')}/`] = m.last_verified;
}

export default defineConfig({
  site: 'https://sawchainsize.com',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'always' },
  compressHTML: true,
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/404'),
      serialize(item) {
        const path = new URL(item.url).pathname;
        item.lastmod = new Date(lastmodByPath[path] ?? SITE_DATE).toISOString();
        return item;
      },
    }),
  ],
});
