/** Guide catalog. The hub, llms.txt and cross-links read this so a new guide is listed in one place. */
export type GuideGroup = 'identify' | 'fit' | 'maintain' | 'safety' | 'editorial';

export type Guide = {
  href: string;
  title: string;
  /** One sentence for the hub card and llms.txt. */
  card: string;
  group: GuideGroup;
};

export const GUIDE_GROUPS: { id: GuideGroup; title: string; kicker: string }[] = [
  { id: 'identify', title: 'Identify the chain', kicker: 'Pitch, gauge, drive links' },
  { id: 'fit', title: 'Fit the bar and chain', kicker: 'Install, tension, length' },
  { id: 'maintain', title: 'Sharpen, oil and replace', kicker: 'Files, bars, fuel' },
  { id: 'safety', title: 'Kickback and safety gear', kicker: 'Before the saw starts' },
  { id: 'editorial', title: 'How the numbers get on the page', kicker: 'Sources' },
];

export const GUIDES: Guide[] = [
  { href: '/guides/how-to-verify-chain-size/', title: 'How to verify your chain size', card: 'Three checks — bar stamp, drive-link count, pitch and gauge measurement — with worked examples.', group: 'identify' },
  { href: '/guides/chain-size-chart/', title: 'Chain identification chart', card: 'Pitch × gauge × file size, plus the Oregon / Stihl / Husqvarna / Carlton code cross-reference.', group: 'identify' },
  { href: '/guides/how-to-count-drive-links/', title: 'How to count drive links', card: 'Mark one link, count the tangs under the loop, match the number on the box.', group: 'identify' },
  { href: '/guides/chain-part-numbers/', title: 'Chainsaw chain part numbers, decoded', card: 'What STIHL 33 RS3 84, Husqvarna S93G and Echo 91PX52CQ say about pitch, gauge and drive links.', group: 'identify' },
  { href: '/guides/chainsaw-chain-gauge/', title: 'Chainsaw chain gauge', card: '.043″, .050″, .058″ and .063″ — what the number measures, and why a close gauge is still the wrong chain.', group: 'identify' },
  { href: '/guides/3-8-low-profile-vs-standard-chain/', title: '3/8″ low profile vs standard 3/8″ chain', card: 'Oregon 90/91 versus 72/73/75: two families that both say 3/8″ and do not substitute for each other.', group: 'identify' },
  { href: '/guides/oregon-72-vs-73-chain/', title: 'Oregon 72 vs 73 chain', card: 'Same 3/8″ pitch family, different gauge — the classic wrong buy and how to avoid it.', group: 'identify' },
  { href: '/guides/how-to-install-chainsaw-chain/', title: 'How to install a chainsaw chain', card: 'Engine off, cutters facing forward on top of the bar, drive links in the groove, then tension before the nuts are final.', group: 'fit' },
  { href: '/guides/chainsaw-chain-tension/', title: 'How to tension a chainsaw chain', card: 'The cold-chain rule, the snap test, and why a new loop needs checking in the first half-hour.', group: 'fit' },
  { href: '/guides/longer-bar-on-chainsaw/', title: 'Can you put a longer bar on your chainsaw?', card: 'The four checks, plus the shortest and longest bar listed for every saw we cover.', group: 'fit' },
  { href: '/guides/chainsaw-drive-sprocket/', title: 'Chainsaw drive sprocket and chain pitch', card: 'The sprocket has to match the chain’s pitch, and Oregon’s replacement interval is every two chains.', group: 'fit' },
  { href: '/guides/why-a-chainsaw-chain-comes-off/', title: 'Why a chainsaw chain comes off the bar', card: 'Loose tension, a worn sprocket, a shallow groove and the wrong gauge — from Oregon’s troubleshooting list.', group: 'fit' },
  { href: '/guides/chainsaw-chain-file-size/', title: 'Chainsaw chain file size', card: 'Which round file sharpens which pitch.', group: 'maintain' },
  { href: '/guides/chainsaw-sharpening-angles/', title: 'Chainsaw sharpening angles', card: 'Top-plate angle, down angle and depth-gauge setting for each Oregon chain type.', group: 'maintain' },
  { href: '/guides/when-to-replace-chainsaw-chain/', title: 'When to replace a chainsaw chain', card: 'Chips versus dust, chrome worn through, depth gauges, and the sprocket that has to retire with the chain.', group: 'maintain' },
  { href: '/guides/chainsaw-bar-maintenance/', title: 'Chainsaw bar maintenance', card: 'Clean the groove and oil hole, flip a symmetrical bar, dress the rails, and when a sprocket nose is done.', group: 'maintain' },
  { href: '/guides/chainsaw-bar-and-chain-oil/', title: 'Chainsaw bar and chain oil', card: 'Why the oil tank is filled with the gas tank, and why used motor oil does not belong in it.', group: 'maintain' },
  { href: '/guides/chainsaw-fuel-mix/', title: 'Chainsaw fuel mix', card: 'The 50:1 ratio STIHL, Husqvarna and Echo publish for current gas saws, and the manual exception.', group: 'maintain' },
  { href: '/guides/chainsaw-kickback/', title: 'Chainsaw kickback', card: 'The kickback zone, what ANSI B175.1 requires of a consumer saw, and what a chain brake does not do.', group: 'safety' },
  { href: '/guides/chainsaw-safety-gear/', title: 'Chainsaw safety gear', card: 'Chaps, boots, helmet, eye and hearing protection — the OSHA logging rule and the Forest Service kit list.', group: 'safety' },
  { href: '/how-we-verify/', title: 'How we verify specs', card: 'Our source hierarchy and how conflicts are shown.', group: 'editorial' },
];

export const guidesIn = (group: GuideGroup) => GUIDES.filter((g) => g.group === group);
