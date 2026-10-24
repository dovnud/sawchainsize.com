# sawchainsize.com

Static Astro site. Data lives in `src/content/models/*.json` and `src/content/brands/*.json` (Zod-validated in `src/content.config.ts`); chain codes in `src/data/chain-specs.json`.

```
npm ci
npm run dev       # local dev
npm run build     # -> dist/
npm run icons     # regenerate favicons (needs playwright chromium)
npm run og        # regenerate public/og/*.png
npm run indexnow  # manual: submit sitemap URLs to IndexNow after deploy
```

Deploy: Cloudflare Pages (Git-connected), build `npm run build`, output `dist`, `NODE_VERSION=22`.
Retailer links are intentionally untagged — no affiliate tags.
