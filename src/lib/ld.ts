import { SITE, type Model, barLabel, pitchLabel, gaugeLabel, type Faq } from './data';

export const faqLd = (faqs: Faq[], strip = false) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: strip ? f.a.replace(/<[^>]+>/g, '') : f.a } })),
});

export const ORG_ID = SITE.url + '/#organization';
/** The site's own publisher entity. No individual is named anywhere on the site, so none is invented;
 *  sameAs lists only profiles that exist (the public source repository). */
export const publisher = {
  '@type': 'Organization', '@id': ORG_ID, name: 'Saw Chain Size', alternateName: SITE.name, url: SITE.url + '/',
  logo: { '@type': 'ImageObject', url: SITE.url + '/icon-512.png', width: 512, height: 512 },
  email: SITE.email,
  sameAs: ['https://github.com/dovnud/sawchainsize.com'],
  publishingPrinciples: SITE.url + '/how-we-verify/',
};
export const organizationLd = { '@context': 'https://schema.org', ...publisher, description: 'Independent chainsaw chain and bar reference: pitch, gauge, drive links and file size by saw model, each traced to a manufacturer manual, fit-up chart or chain-maker data.' };
export const author = { '@type': 'Organization', '@id': ORG_ID, name: 'Saw Chain Size', url: SITE.url + '/about/' };

export const webPageLd = (name: string, path: string, description: string, modified?: string, type = 'WebPage') => ({
  '@context': 'https://schema.org', '@type': type, name, url: SITE.url + path, description,
  isPartOf: { '@type': 'WebSite', name: SITE.name, url: SITE.url + '/' }, publisher, author,
  ...(modified ? { dateModified: modified } : {}), inLanguage: 'en-US',
});

/**
 * A saw's chain data is a specification, not a retail offer, so it is marked up as a schema.org
 * ProductModel ("a datasheet or vendor specification of a product") inside an ItemPage. Google's
 * Product-snippet / merchant-listing validators only apply to @type Product, so this raises no
 * "missing offers / review / aggregateRating" warnings, and no prices or ratings are invented.
 */
export const specItemLd = (name: string, path: string, description: string, modified: string | undefined, entity: Record<string, unknown>) => ({
  '@context': 'https://schema.org', '@type': 'ItemPage', name, url: SITE.url + path, description,
  isPartOf: { '@type': 'WebSite', name: SITE.name, url: SITE.url + '/' }, publisher, author,
  ...(modified ? { dateModified: modified } : {}), inLanguage: 'en-US',
  mainEntity: { '@type': 'ProductModel', url: SITE.url + path, ...entity },
});

export const modelLd = (m: Model, path: string) => specItemLd(
  `${m.data.name} chain size`, path, m.data.blurb, m.data.last_verified,
  {
    name: m.data.name, category: 'Chainsaw',
    brand: { '@type': 'Brand', name: m.data.brand[0].toUpperCase() + m.data.brand.slice(1) },
    model: m.data.model, description: m.data.blurb,
    ...(m.data.aliases.length ? { alternateName: m.data.aliases } : {}),
    additionalProperty: m.data.bars.filter((b) => b.status === 'ok').map((b) => ({
      '@type': 'PropertyValue', name: `Verified chain spec — ${barLabel(b)} bar`,
      value: `${pitchLabel(b.pitch)} pitch, ${gaugeLabel(b.gauge)} gauge, ${b.drive_links} drive links`,
    })),
  },
);

export const datasetLd = (o: { name: string; description: string; path: string; csv: string; json: string; dateModified: string; keywords: string[]; variables: string[]; csvSize?: number; jsonSize?: number }) => ({
  '@context': 'https://schema.org', '@type': 'Dataset',
  '@id': SITE.url + o.path + '#dataset', name: o.name, description: o.description, url: SITE.url + o.path,
  identifier: SITE.url + o.path, creator: publisher, publisher, author,
  license: SITE.url + o.path + '#license', isAccessibleForFree: true, inLanguage: 'en-US',
  dateModified: o.dateModified, keywords: o.keywords, variableMeasured: o.variables,
  measurementTechnique: 'Transcribed from manufacturer manuals, bar-and-chain fit-up charts and chain-maker product data; each row graded ok / verify / conflict.',
  isBasedOn: SITE.url + '/how-we-verify/',
  citation: `Saw Chain Size. “${o.name}”. SawChainSize.com, data last verified ${o.dateModified}. ${SITE.url}${o.path}`,
  sameAs: ['https://github.com/dovnud/sawchainsize.com'],
  distribution: [
    { '@type': 'DataDownload', encodingFormat: 'text/csv', contentUrl: o.csv, name: 'CSV' },
    { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: o.json, name: 'JSON' },
  ],
});
