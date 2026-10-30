/**
 * AFFILIATE CONFIG — the ONE place the Amazon Associates tracking ID lives.
 *
 * >>> SWAP POINT: change AMAZON_TAG below and every Amazon link on the site changes with it. <<<
 *
 * Rules (do not break these):
 *  - This ID belongs to sawchainsize.com ONLY. Never reuse it on another site.
 *  - Amazon is the only affiliate program used on this site. No other program IDs belong here.
 *  - Never type the tag into a page, component, markdown file or script — always build links with
 *    amazonSearchUrl() / amazonProductUrl() below (src/lib/shop.ts does this for every page).
 *  - Never show or hard-code prices. Amazon prices change; the checkout price is the real one.
 *  - /dp/<ASIN> links are only allowed for ASINs listed in ASINS below, each of which was verified by
 *    fetching the live amazon.com product page and checking that the title matches the product spec.
 *    Everything else must use amazonSearchUrl() with a precise query.
 */
export const AMAZON_TAG = 'sawchainsize-20';

export const AMAZON_DOMAIN = 'www.amazon.com';

/** Required Associates Program disclosure — shown next to every block of Amazon links. */
export const AMAZON_DISCLOSURE = 'As an Amazon Associate I earn from qualifying purchases.';

/** rel / target applied to every Amazon link. */
export const AFFILIATE_REL = 'sponsored nofollow noopener';
export const AFFILIATE_TARGET = '_blank';

/** Amazon search URL for a precise query, tagged. */
export function amazonSearchUrl(query: string): string {
  const q = encodeURIComponent(query.trim().replace(/\s+/g, ' ')).replace(/%20/g, '+');
  return `https://${AMAZON_DOMAIN}/s?k=${q}&tag=${AMAZON_TAG}`;
}

/** Amazon product URL for a VERIFIED ASIN (see ASINS), tagged. Throws on anything unverified. */
export function amazonProductUrl(asin: string): string {
  if (!Object.values(ASINS).some((a) => a.asin === asin)) throw new Error(`Unverified ASIN ${asin}: add it to ASINS only after verifying the live product page.`);
  return `https://${AMAZON_DOMAIN}/dp/${asin}?tag=${AMAZON_TAG}`;
}

/**
 * Optional product-card image. Amazon allows an image here only when it came from the Product
 * Advertising API (GetItems Images) or from the image URL inside an official SiteStripe image
 * or text-and-image link. Do not download, copy, or hotlink a photo off a product page, and do
 * not invent a widget URL. This site has no PA-API credentials and no stored SiteStripe HTML,
 * so cards ship without images until one of those two sources is actually in hand.
 */
export type AmazonImageSource = 'pa-api' | 'sitestripe';

export type AmazonImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
  source: AmazonImageSource;
};

const SITESTRIPE_HOSTS = new Set(['ws-na.amazon-adsystem.com', 'ws-eu.amazon-adsystem.com', 'ws-fe.amazon-adsystem.com']);

export function compliantAmazonImage(image: AmazonImage | undefined | null): AmazonImage | null {
  if (!image || (image.source !== 'pa-api' && image.source !== 'sitestripe')) return null;
  if (!Number.isInteger(image.width) || !Number.isInteger(image.height) || image.width < 1 || image.height < 1 || image.width > 800 || image.height > 800) return null;
  let url: URL;
  try { url = new URL(image.src); } catch { return null; }
  if (url.protocol !== 'https:') return null;
  const host = url.hostname.toLowerCase();
  if (image.source === 'sitestripe') {
    if (!SITESTRIPE_HOSTS.has(host) || !url.pathname.includes('/widgets/')) return null;
    return image;
  }
  const pa = host === 'm.media-amazon.com' || host.endsWith('.media-amazon.com') || host.endsWith('.ssl-images-amazon.com') || host.endsWith('.images-amazon.com');
  return pa ? image : null;
}

export type VerifiedAsin = {
  asin: string;
  /** Product title as shown on the amazon.com product page when verified (abridged where very long). */
  title: string;
  /** Short label used in link text. */
  label: string;
  /** Date the live product page was fetched and the title/ASIN confirmed (YYYY-MM-DD). */
  verified: string;
};

const V = '2026-10-25';

/**
 * Verified ASINs. Verification = `curl https://www.amazon.com/dp/<ASIN>` (browser UA) on the date shown:
 * the page loaded, its ASIN field matched, and its title (plus Drive Link Count / Gauge / Pitch rows, for chains)
 * matched the spec we link it for. Listings can change or go out of stock; re-run aff/verify2.py before relying on them.
 */
export const ASINS: Record<string, VerifiedAsin> = {
  // Oregon chain, by exact pitch / gauge / drive links
  'chain|3/8-lp|0.05|52': { asin: 'B00004RA88', title: 'Oregon Chainsaw Chain for 14" Bar, 3/8" LP, .050" Gauge, 52 Drive Links', label: 'Oregon chain', verified: V },
  'chain|3/8-lp|0.05|56': { asin: 'B00004RA82', title: 'Oregon Chainsaw Chain for 16" Bar, 3/8" LP, .050" Gauge, 56 Drive Links', label: 'Oregon chain', verified: V },
  'chain|3/8-lp|0.05|62': { asin: 'B00004RA81', title: 'Oregon Chainsaw Chain for 18" Bar, 3/8" LP, .050" Gauge, 62 Drive Links', label: 'Oregon chain', verified: V },
  'chain|3/8|0.05|68': { asin: 'B01M0MJ2WC', title: 'Oregon Chainsaw Chain for 18" Bar, 3/8" Pitch, .050" Gauge, 68 Drive Links', label: 'Oregon chain', verified: V },
  'chain|3/8|0.05|72': { asin: 'B001SCQ4LS', title: 'Oregon Chainsaw Chain for 20" Bar, 3/8" Pitch, .050" Gauge, 72 Drive Links', label: 'Oregon chain', verified: V },
  'chain|3/8|0.05|84': { asin: 'B002VMGVW6', title: 'Oregon 72LPX084G 84 Drive Link Super 70 Chisel Chain, 3/8-Inch, 24 inches', label: 'Oregon 72LPX084G chain', verified: V },
  'chain|325|0.05|72': { asin: 'B0000AX2JS', title: 'Oregon Chainsaw Chain for 18" Bar, .325" Pitch, .050" Gauge, 72 Drive Links', label: 'Oregon chain', verified: V },
  'chain|325|0.063|67': { asin: 'B000BQURJC', title: 'Oregon Chainsaw Chain for 16" Bar, .325" Pitch, .063" Gauge, 67 Drive Links (ControlCut)', label: 'Oregon chain', verified: V },

  // Sharpening
  'kit-5-32': { asin: 'B073XM3P6Q', title: 'Oregon 104004 Chainsaw Sharpening Kits, 5/32"', label: 'Oregon 5/32″ sharpening kit', verified: V },
  'kit-3-16': { asin: 'B00GPKD0BA', title: 'Oregon 4.8mm (3/16-Inch) Chain Sharpening and Bar Maintenance Kit for .325-Inch Chainsaw Chain', label: 'Oregon 3/16″ sharpening kit (.325″ chain)', verified: V },
  'kit-field': { asin: 'B08BLTC7SG', title: 'Oregon Universal Chainsaw Field Sharpening Kit (5/32", 3/16" and 7/32" round files, flat file, guide)', label: 'Oregon field sharpening kit (5/32″, 3/16″, 7/32″ files)', verified: V },

  // Safety
  chaps: { asin: 'B0718TQ928', title: 'FORESTER Chainsaw Chaps for Men & Women | Apron-Style Chaps with Pocket & Adjustable Waist', label: 'Chainsaw chaps (Forester)', verified: V },
  helmet: { asin: 'B00IKU0OYO', title: 'Forester Safety Helmet - Original Forestry Hard Hat Arborist Gear Mesh Face Shield Hearing Protection', label: 'Forestry helmet with face shield and ear muffs (Forester)', verified: V },
  gloves: { asin: 'B00IFEVT4E', title: 'FORESTER Hi-Vis Chainsaw Gloves | Anti-Vibration Leather Safety Gloves for Chainsaw Work', label: 'Chainsaw gloves (Forester)', verified: V },

  // Fluids
  'bar-oil': { asin: 'B00EPKP4MK', title: 'Oregon Premium Bar & Chain Oil, 1 Gallon Bottle', label: 'Oregon bar & chain oil, 1 gal', verified: V },
  'fuel-stihl': { asin: 'B005DC0IRA', title: 'STIHL 0781 313 8002 2.6 Ounce High Performance Ultra 2 Cycle Engine Oil, 6 Pack', label: 'STIHL HP Ultra 2-cycle oil, 6 × 2.6 oz', verified: V },
  'fuel-echo': { asin: 'B098BRM1WJ', title: 'Echo 6450001G Power Blend Gold Oil Mix 50:1 for 2 stroke/2 cycle Outdoor Power Equipment (6 Pack)', label: 'Echo Power Blend Gold 50:1 oil, 6 × 2.6 oz', verified: V },

  // Storage
  'scabbard-18-22': { asin: 'B0BMB6G3Y9', title: 'Husqvarna Chainsaw Scabbard 18 to 22 Inch Bar and Chain Cover', label: 'Bar & chain cover for 18–22″ bars (Husqvarna)', verified: V },
};
