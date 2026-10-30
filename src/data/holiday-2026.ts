/** Calendar facts and carrier cutoffs cited on the holiday pages. No prices, no countdown, no stock claims. */

export const GIFT_PATH = '/guides/gifts-for-chainsaw-owners-2026/';
export const BF_PATH = '/guides/black-friday-chainsaw-chain/';

export const AMAZON_BF = 'https://www.aboutamazon.com/news/retail/when-is-amazon-black-friday-faq';
export const AMAZON_GUARANTEE = 'https://www.amazon.com/gp/help/customer/display.html?nodeId=GUDRHL982ZQE9EGL';
export const USPS_DATES = 'https://www.usps.com/holiday/holiday-shipping-dates.htm';
export const USPS_NEWS = 'https://about.usps.com/newsroom/national-releases/2026/0922-usps-recommends-2026-holiday-mailing-shipping-dates.htm';
export const UPS_SCHEDULE = 'https://www.ups.com/us/en/support/shipping-support/shipping-services/holiday-shipping-schedule';
export const FEDEX_PDF = 'https://www.fedex.com/content/dam/fedex/us-united-states/services/2026_Peak_Last_Day_to_ship.pdf';
export const FEDEX_SCHEDULE = 'https://www.fedex.com/en-us/holiday/last-days-to-ship.html';

/** USPS recommended send-by dates for expected delivery before December 25, 2026, contiguous U.S. */
export const USPS_CONTIGUOUS = [
  { service: 'USPS Ground Advantage', sendBy: 'Thursday, December 17, 2026' },
  { service: 'First-Class Mail', sendBy: 'Thursday, December 17, 2026' },
  { service: 'Priority Mail', sendBy: 'Friday, December 18, 2026' },
  { service: 'Priority Mail Express', sendBy: 'Saturday, December 19, 2026' },
] as const;

export const GIFT_TIERS = [
  { name: 'Tier 1 — used up this season', description: 'Bar-and-chain oil, a file kit that matches the chain’s pitch, and gloves. The smallest useful gift. A single file size is right only when the pitch is already known.' },
  { name: 'Tier 2 — a spare chain that matches the stamp', description: 'One loop in the pitch, gauge and drive-link count stamped on the bar. The gift that fails if it is chosen from the saw model or the bar length alone.' },
  { name: 'Tier 3 — gear that stays with the saw', description: 'Chainsaw chaps long enough to overlap the boots, a forestry helmet with face and hearing protection, and a bar cover sized to the bar. These outlast a season. They are not a substitute for a chain that fits.' },
] as const;
