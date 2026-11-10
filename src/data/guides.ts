/** Guide catalog. The hub, llms.txt and cross-links read this so a new guide is listed in one place. */
import { BF_PATH, GIFT_PATH } from './holiday-2026';

export type GuideGroup = 'identify' | 'fit' | 'maintain' | 'safety' | 'editorial' | 'holiday';

export type Guide = {
  href: string;
  title: string;
  /** One sentence for the hub card and llms.txt. */
  card: string;
  group: GuideGroup;
};

export const GUIDE_GROUPS: { id: GuideGroup; title: string; kicker: string }[] = [
  { id: 'holiday', title: 'Holiday 2026', kicker: 'Gifts and Black Friday' },
  { id: 'identify', title: 'Identify the chain', kicker: 'Pitch, gauge, drive links' },
  { id: 'fit', title: 'Fit the bar and chain', kicker: 'Install, tension, length' },
  { id: 'maintain', title: 'Sharpen, oil and replace', kicker: 'Files, bars, fuel' },
  { id: 'safety', title: 'Kickback and safety gear', kicker: 'Before the saw starts' },
  { id: 'editorial', title: 'How the numbers get on the page', kicker: 'Sources' },
];

export const GUIDES: Guide[] = [
  { href: GIFT_PATH, title: 'Gifts for chainsaw owners and woodcutters, 2026', card: 'Three gift tiers (consumables, a spare chain matched to the bar stamp, and safety gear) with no prices and no invented dollar cutoffs.', group: 'holiday' },
  { href: BF_PATH, title: 'Black Friday chainsaw chain and accessories', card: 'Black Friday is November 27, 2026 and Cyber Monday is November 30. How to buy a chain during a sale without buying the wrong loop, plus USPS, UPS and FedEx dates cited from the carriers.', group: 'holiday' },
  { href: '/guides/how-to-verify-chain-size/', title: 'How to verify your chain size', card: 'Three checks (bar stamp, drive-link count, pitch and gauge measurement) with worked examples.', group: 'identify' },
  { href: '/guides/chain-size-chart/', title: 'Chain identification chart', card: 'Pitch × gauge × file size, plus the Oregon / Stihl / Husqvarna / Carlton code cross-reference.', group: 'identify' },
  { href: '/guides/how-to-count-drive-links/', title: 'How to count drive links', card: 'Mark one link, count the tangs under the loop, match the number on the box.', group: 'identify' },
  { href: '/guides/chain-part-numbers/', title: 'Chainsaw chain part numbers, decoded', card: 'What STIHL 33 RS3 84, Husqvarna S93G and Echo 91PX52CQ say about pitch, gauge and drive links.', group: 'identify' },
  { href: '/guides/oregon-chain-numbers/', title: 'Oregon chain numbers', card: 'How 72LPX072, 91PX056 and S56 encode pitch family, gauge and drive links, checked against every Oregon loop on this site.', group: 'identify' },
  { href: '/guides/oregon-chain-on-stihl-husqvarna/', title: 'Oregon chain on a STIHL or Husqvarna', card: 'An Oregon loop can replace the OEM chain when pitch, gauge and drive links match the bar stamp. Equivalents on this site are size cross-references, not a claim that the cutters are the same.', group: 'identify' },
  { href: '/guides/stihl-chain-order-numbers/', title: 'STIHL chain order numbers', card: 'How 33 RS3 72 becomes 3624 005 0072: STIHL’s 4-digit chain codes and the order number for every STIHL loop we list.', group: 'identify' },
  { href: '/guides/stihl-green-vs-yellow-chain/', title: 'STIHL green vs yellow chain labels', card: 'Green is STIHL’s low-kickback label. Yellow is the caution label, including every .404″ chain in the 2025 chart. The bar stamp still sets pitch, gauge and drive links.', group: 'identify' },
  { href: '/guides/husqvarna-pixel-chain/', title: 'Husqvarna Pixel, Mini Pixel and X-Cut', card: 'What the fit-up guide means by .325″ Mini Pixel, 3/8″ Mini Pixel, .325″ Pixel and 3/8″ Mini, and which saws on this site use each.', group: 'identify' },
  { href: '/guides/pole-saw-chain-size/', title: 'Pole saw chain size', card: 'Husqvarna, ECHO and STIHL pole saw bars and chains: 39 or 40 links at 10″, 44 or 45 at 12″, and why a 12″ chainsaw loop can be one link too long.', group: 'identify' },
  { href: '/guides/chainsaw-chain-glossary/', title: 'Chainsaw chain and bar glossary', card: 'Pitch, gauge, drive links, depth gauge, skip chain, sprocket nose, and the STIHL, Husqvarna, ECHO and Oregon names for them.', group: 'identify' },
  { href: '/guides/chainsaw-chain-gauge/', title: 'Chainsaw chain gauge', card: '.043″, .050″, .058″ and .063″, what the number measures, and why a close gauge is still the wrong chain.', group: 'identify' },
  { href: '/guides/full-kerf-vs-narrow-kerf-chain/', title: 'Full-kerf vs narrow-kerf chain', card: '.043″ narrow-kerf chain needs its own bar. A .050″, .058″ or .063″ loop is a different groove, and Oregon’s SpeedCut “narrow kerf” is a .050″ system of its own.', group: 'identify' },
  { href: '/guides/full-chisel-vs-semi-chisel-chain/', title: 'Full chisel vs semi-chisel vs chipper', card: 'Oregon’s five cutter types, STIHL’s full-chisel and semi-chisel letters, and Echo’s PX versus PXL. The bar stamp still sets pitch, gauge and drive links.', group: 'identify' },
  { href: '/guides/chainsaw-skip-chain/', title: 'Full-comp, semi-skip and full-skip chain', card: 'Oregon’s standard, semi-skip and skip sequences, with bar-length bands, and STIHL’s full skip (two tie straps) and the H that also means harvester.', group: 'identify' },
  { href: '/guides/ripping-chainsaw-chain/', title: 'Ripping chain for milling', card: 'Oregon RipCut and STIHL RMX: the 10° with-the-grain grind, the depth-gauge split, and which of those chains the maker allows off a mill.', group: 'identify' },
  { href: '/guides/3-8-low-profile-vs-standard-chain/', title: '3/8″ low profile vs standard 3/8″ chain', card: 'Oregon 90/91 versus 72/73/75: two families that both say 3/8″ and do not substitute for each other.', group: 'identify' },
  { href: '/guides/1-4-pitch-chainsaw-chain/', title: '1/4″ pitch chainsaw chain', card: 'On this site 1/4″ is .043″ gauge: STIHL 71 PM3 / 71 PMM3 with a 1/8″ file, Husqvarna SP11G with a 9/64″ file, and drive-link counts that differ at the same bar length.', group: 'identify' },
  { href: '/guides/oregon-72-vs-73-chain/', title: 'Oregon 72 vs 73 chain', card: 'Same 3/8″ pitch family, different gauge, the classic wrong buy and how to avoid it.', group: 'identify' },
  { href: '/guides/how-to-install-chainsaw-chain/', title: 'How to install a chainsaw chain', card: 'Engine off, cutters facing forward on top of the bar, drive links in the groove, then tension before the nuts are final.', group: 'fit' },
  { href: '/guides/chainsaw-chain-tension/', title: 'How to tension a chainsaw chain', card: 'The cold-chain rule, the snap test, and why a new loop needs checking in the first half-hour.', group: 'fit' },
  { href: '/guides/break-in-new-chainsaw-chain/', title: 'Break in a new chainsaw chain', card: 'Oregon’s new-chain steps: oil it, run at half throttle before cutting, keep the first cuts light, and retension only after it cools.', group: 'fit' },
  { href: '/guides/longer-bar-on-chainsaw/', title: 'Can you put a longer bar on your chainsaw?', card: 'The four checks, plus the shortest and longest bar listed for every saw we cover.', group: 'fit' },
  { href: '/guides/how-to-measure-chainsaw-bar/', title: 'How to measure a chainsaw bar', card: 'Called cutting length versus the length of the steel, and why STIHL’s listed length can differ from the effective cutting length on the saw.', group: 'fit' },
  { href: '/guides/chainsaw-drive-sprocket/', title: 'Chainsaw drive sprocket and chain pitch', card: 'The sprocket has to match the chain’s pitch, and Oregon’s replacement interval is every two chains.', group: 'fit' },
  { href: '/guides/sprocket-nose-vs-solid-nose-bar/', title: 'Sprocket-nose vs solid-nose bar', card: 'A wheel in the tip versus a hard armor tip. Oregon tensions the sprocket nose tighter, and a solid bar body can still carry a sprocket.', group: 'fit' },
  { href: '/guides/can-you-change-chainsaw-chain-pitch/', title: 'Can you change chainsaw chain pitch?', card: 'Not by swapping only the loop. The drive sprocket, the chain and usually the bar are one set. Some saws are approved for two complete systems; those still do not mix.', group: 'fit' },
  { href: '/guides/why-a-chainsaw-chain-comes-off/', title: 'Why a chainsaw chain comes off the bar', card: 'Loose tension, a worn sprocket, a shallow groove and the wrong gauge, from Oregon’s troubleshooting list.', group: 'fit' },
  { href: '/guides/chainsaw-chain-file-size/', title: 'Chainsaw chain file size', card: 'Which round file sharpens which pitch.', group: 'maintain' },
  { href: '/guides/chainsaw-sharpening-angles/', title: 'Chainsaw sharpening angles', card: 'Top-plate angle, down angle and depth-gauge setting for each Oregon chain type.', group: 'maintain' },
  { href: '/guides/chainsaw-depth-gauge/', title: 'Chainsaw depth gauge (raker) setting', card: 'When Oregon says to lower depth gauges, which types are .025″ and which .404″ types are .030″, and why a crooked cut is usually not a raker problem.', group: 'maintain' },
  { href: '/guides/stihl-chain-file-size/', title: 'STIHL chain file size', card: 'STIHL’s 2025 file table with part numbers: 13/64″ for 3/8″, two sizes for .325″, and the STIHL loops on this site matched to a file.', group: 'maintain' },
  { href: '/guides/chainsaw-chain-grinding-angles/', title: 'Chainsaw chain grinding angles', card: 'Oregon’s grinder settings: 1/8″ or 3/16″ wheel, top-plate and down angles, the 55° ground side plate, and grinder faults.', group: 'maintain' },
  { href: '/guides/when-to-replace-chainsaw-chain/', title: 'When to replace a chainsaw chain', card: 'Chips versus dust, chrome worn through, depth gauges, and the sprocket that has to retire with the chain.', group: 'maintain' },
  { href: '/guides/chainsaw-bar-maintenance/', title: 'Chainsaw bar maintenance', card: 'Clean the groove and oil hole, flip a symmetrical bar, dress the rails, and when a sprocket nose is done.', group: 'maintain' },
  { href: '/guides/when-to-replace-chainsaw-bar/', title: 'When to replace a chainsaw bar', card: 'Oregon’s bar troubleshooting: a shallow groove, a rail worn thin or low, blue rails, and a nose sprocket that no longer turns.', group: 'maintain' },
  { href: '/guides/chainsaw-bar-and-chain-oil/', title: 'Chainsaw bar and chain oil', card: 'Why the oil tank is filled with the gas tank, and why used motor oil does not belong in it.', group: 'maintain' },
  { href: '/guides/chainsaw-fuel-mix/', title: 'Chainsaw fuel mix', card: 'The 50:1 ratio STIHL, Husqvarna and Echo publish for current gas saws, and the manual exception.', group: 'maintain' },
  { href: '/guides/chainsaw-kickback/', title: 'Chainsaw kickback', card: 'The kickback zone, what ANSI B175.1 requires of a consumer saw, and what a chain brake does not do.', group: 'safety' },
  { href: '/guides/chainsaw-safety-gear/', title: 'Chainsaw safety gear', card: 'Chaps, boots, helmet, eye and hearing protection, the OSHA logging rule and the Forest Service kit list.', group: 'safety' },
  { href: '/how-we-verify/', title: 'How we verify specs', card: 'Our source hierarchy and how conflicts are shown.', group: 'editorial' },
];

export const guidesIn = (group: GuideGroup) => GUIDES.filter((g) => g.group === group);
