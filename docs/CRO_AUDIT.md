# CRO audit — SawChainSize.com

## Implemented

Built on this branch after the review. Expert estimate, not measured data.

**Moneymaker score now: 8/10.** Affiliate 8/10. AdSense stays 1/10. Leads stay later.

- Finder result: “See on Amazon” or “Search on Amazon” for a verified bar, with the Associates sentence under the button. Conflict results say “Sources disagree — read the stamp” and do not link a product. Hrefs come from `amazonProductUrl` / `amazonSearchUrl`.
- Model pages: the same buttons sit under the spec table (`#shop`) and again at the end. Gear is behind “Also on Amazon”. Page head links to `#shop`.
- Conflict saws (MS 250): a pitch / gauge / drive-link form labeled “Search on Amazon”. It does not guess a loop.
- Phone: the finder is above the saw, and a Menu control lists all seven header links. The cookie note is in normal flow so it does not cover the form.
- Guides: “Optional.” removed. A button sits after the first answer. How-to pages that used to offer a specific unmatched loop now lead with “Look up your chain”. Safety gear, files, oil and the 72-vs-73 / gauge compares still shop the thing the page names.
- Chain-spec pages: the gauge warning states that the buttons are this gauge only, and one button per drive-link count sits under that note.
- Hubs: model cards go to `#shop` (“See the spec”). The homepage buying band links popular saws there. Guide cards say “See the spec”.

Skipped: ad slots, `ads.txt`, privacy edits, and any AdSense prep. No second affiliate program — this site has no other approved ID, so none was added. No new saw models; specs are not invented here. Contact remains contact@sawchainsize.com. The only Amazon tag is `sawchainsize-20`.



Live review, 27 Oct 2026, at 1280px and 390px: homepage, Stihl MS 250, Husqvarna 450 Rancher, verification guide, guides hub, models hub, a chain-spec page, about, affiliate disclosure, and contact. Repo read alongside. Scores are expert estimates, not measured data. No traffic or revenue figures.

## 1. Conversion score

**4/10.** A visitor can leave with pitch, gauge and drive links and never meet a retailer link.

**Affiliate-click likelihood: low.** The homepage has zero Amazon links. The finder (tested: Husqvarna 450 Rancher, 18″) shows the five numbers and a link to the model page, not Amazon. On that page the first Amazon link is a text list about 2,080px down on desktop and about 3,370px on a phone; the 16″ row is a search (“find matching chains”), the 18″ .325″ .050″ 72 DL row a product page. On the MS 250 the first link is a sharpening kit (~2,690px / ~4,150px) because those bars are `conflict` and get no chain. Guide shops sit near the end (about 90% through the tension guide) and start with “Optional.”

## 2. Scorecard

| Criterion | Score |
| --- | ---: |
| First impression / purpose in 5 seconds | 5 |
| CTA visibility (above the fold, in content, end) | 2 |
| CTA wording and relevance | 3 |
| Affiliate context and disclosure | 5 |
| Mobile usability | 3 |
| Navigation and internal linking | 4 |
| Trust (editorial name, dates, sources, legal) | 5 |
| Visual design and readability | 4 |
| Page speed feel | 4 |
| Accessibility | 3 |

“Show my chain spec” is fully visible at 1280px. At 390px the saw fills the screen, the cookie covers the brand field, and the button sits below the fold. Shop blocks are underlined text under “As an Amazon Associate I earn from qualifying purchases.”, `rel="sponsored"`, tag `sawchainsize-20` only. At 390px the header fade hides About, Verify Guide and Contact. Bylines say Saw Chain Size, with dates, sources, and legal links; mail is contact@sawchainsize.com. Homepage HTML returned in about 160ms. Skip link and labels exist; `.glance dt` (`#5b636c`) fails on the dark card.

## 3. Top 10 fixes

1. **Chain button in the finder result** — `main.ts`; hrefs from `shop.ts` via `index.astro`; tag only in `affiliate.ts`. S, high.
2. **Same button under the spec table** — `saws/[slug].astro`, ahead of the source essay; `BuyBlock` repeats it. S, high.
3. **One chain, then gear** — `ShopBlock.astro`. Loop is a button; chaps, helmet, oil and files collapse. S, high.
4. **Stamp search on conflict saws** — `BuyBlock.astro` (MS 250). Three fields, `amazonSearchUrl()` only. M, high.
5. **Finder above the saw on a phone** — `index.astro`, `global.css`, `CookieNote.astro`. S, medium.
6. **Menu for the seven header links** — `Header.astro`. S, medium.
7. **On-topic guide button; delete “Optional.”** — `guideShop()`. How-to pages that list a 56-link loop should shop the tool and send the chain to the finder. Safety gear is already chaps, helmet, gloves. S, medium.
8. **Hub cards jump to the spec** — model cards to `#shop`; guide cards stay “See the spec”. S, medium.
9. **Compare block on chain-spec pages** — `chain/[key].astro`, one difference, one link. M, medium.
10. **Ad slot clear of the button** — after the spec or first guide section. Privacy and `ads.txt` (404 today) first. M, medium.

## 4. Where the primary CTA sits

**Home.** Button inside the finder result, under the five cells, disclosure on the next line. Phone: finder, then saw; cookie below the form. The buying band links popular saws to `#shop`.

**Model.** Under the table: “Shop the 18″ loop — .325″ · .050″ · 72 DL”. Repeated in `BuyBlock`. Gear under a second heading. Conflict: stamp search in that spot.

**Guide.** One button after the step that names the tool or the spec. A chain SKU only if this page named all three numbers. Same block again at the end. Hub: no retailer button.

**Chain spec / bar length.** One button per drive-link count under the table. Disclosure once above the group.

**Brand hub.** Each card goes to that saw’s `#shop`.

**Contact and legal.** No retailer button. Mail stays contact@sawchainsize.com.

## 5. Quick wins

- Delete “Optional.” on guide shop leads.
- `id="shop"` on `ShopBlock`, and “Shop this spec” in the model pagehead.
- Orange button style on the first chain link.
- Below 860px, order the finder above `.hero-saw`.
- Homepage buying band: link popular saws to `#shop`.
- Remove chain ASINs from general how-to entries in `guideShop()`.

## 6. Moneymaker scale

**Review score, before the fixes: 4/10.** The implemented score is 8/10 (see the top of this file). Readiness to earn, not a revenue figure.

| Channel | Score | Why |
| --- | ---: | --- |
| Affiliate | 4/10 | Tag, disclosure and real product URLs exist. The click is late, plain text, and missing on the homepage. |
| AdSense | 1/10 | Privacy says no display ads. `ads.txt` is 404. Ad personalization is off. The guides are real articles, which is the useful raw material. |
| Leads | Later | The form only opens the visitor’s mail app to contact@sawchainsize.com. |

### Path to a higher score

Readiness estimates. Extra units piled on to force a 10 move the score down.

| Action | Score after | Effort | Channel |
| --- | --- | --- | --- |
| Chain button in the finder result and under the spec table | 4 → 6 | S | Affiliate |
| One chain button; gear collapsed; stamp search on conflict saws; “Optional” removed; unmatched chain SKUs off general guides | 6 → 7 | S | Affiliate |
| On-topic mid-guide button, plus a compare-and-shop block on chain-spec pages | 7 → 8 | M | Affiliate |
| More verified models, linked from the guide hub and the homepage | 8 → 9 | M | Traffic, then affiliate |
| One below-answer ad slot after privacy and `ads.txt`; a second retailer program on an account this site opens, disclosed. Amazon stays `sawchainsize-20` only | stays 9 | M | AdSense; affiliate later |

A 10 needs demand the site measures itself, plus the steps above.

### Moves that lower the score

- An interstitial, a sticky ad, or an ad flush against the orange button.
- Equal buttons for chaps, a helmet, oil and three chains.
- Dropping the Associates sentence to tidy the button.
- Publishing one MS 250 spec so a product link can hang off it.
- Stock counters, star ratings, countdown copy.
- Any Amazon tag other than `sawchainsize-20`, including a tag from another site.
- Pages that are only a link.
- A person’s name on the byline, or any address other than contact@sawchainsize.com.
- Ads while privacy still says there are none.

### Top moves, with wording

1. **Finder** (`main.ts`). Verified bar: button “Shop this .325″ .050″ 72 DL chain”, then the Associates sentence. Href from `amazonProductUrl` or `amazonSearchUrl`. Conflict: “Sources disagree — read the stamp”, to `/guides/how-to-verify-chain-size/`. No product.
2. **Model page** (`saws/[slug].astro`, `ShopBlock`). Button under the table, `id="shop"`, using that row’s numbers. End block repeats it. Gear in `<details>`.
3. **Conflict helper** (`BuyBlock`). “Search Amazon for the numbers on your stamp.” Pitch, gauge, drive links. Query only via `amazonSearchUrl()`.
4. **Guides** (`shop.ts`). Safety gear keeps chaps, helmet, gloves, plus “check the listing for its protection rating.” Tension, install, sprocket and derailment keep the tool and replace chain ASINs with “Look up your chain” to `/#finder`. File-size guide, after the diameter table: “Shop the 5/32″ file for 3/8″ LP .050″ chain”.
5. **Ads, after the policy edit.** One slot after the first section, about 32px clear of `.f-btn` and `.buy`. First rewrite the advertising bullet in `privacy.astro` and ship `ads.txt` for this site’s own publisher ID. The cookie note is not a consent banner for European ad traffic. Leads stay off; a later “tell me when this model is added” still writes to contact@sawchainsize.com.
