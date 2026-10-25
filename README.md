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
Amazon Associates links are generated only through `src/config/affiliate.ts` (the single swap point for the tracking ID; never write the tag anywhere else). Amazon is the only affiliate program; no prices are shown; `/dp/` links are limited to ASINs verified in that file.
