/**
 * ANALYTICS CONFIG — the ONE place the Google Analytics 4 Measurement ID lives.
 *
 * >>> SWAP POINT: change GA4_ID below. Set it to '' and NO analytics script is emitted anywhere. <<<
 *
 * Behaviour (keep /privacy/ and the cookie note in sync with this):
 *  - gtag.js is loaded only after the page has loaded and the browser is idle (or on first interaction),
 *    never in the critical path.
 *  - Google signals and ad personalization are disabled; the site runs no ads.
 *  - Visitors can opt out: the cookie note's "Opt out" button / the Privacy page toggle set the first-party
 *    cookie `scs_ga=0`, after which gtag.js is never loaded for that browser.
 */
export const GA4_ID = 'G-F0MSKNDHBK';

/** First-party cookie that records an analytics opt-out ('0' = opted out). */
export const GA_OPTOUT_COOKIE = 'scs_ga';
