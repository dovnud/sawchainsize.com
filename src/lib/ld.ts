import { SITE, type Model, barLabel, pitchLabel, gaugeLabel, type Faq } from './data';
import { isoDate } from './seo';

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
  ...(modified ? { dateModified: isoDate(modified) } : {}), inLanguage: 'en-US',
});

/** Editorial guide. No prices, offers, or ratings — those are not known and are not invented. */
export const articleLd = (headline: string, path: string, description: string, modified?: string) => ({
  '@context': 'https://schema.org', '@type': 'Article', headline, name: headline, description,
  url: SITE.url + path, mainEntityOfPage: SITE.url + path,
  isPartOf: { '@type': 'WebSite', name: SITE.name, url: SITE.url + '/' }, publisher, author,
  ...(modified ? { datePublished: isoDate(modified), dateModified: isoDate(modified) } : {}), inLanguage: 'en-US',
});

export const itemListLd = (name: string, items: { name: string; description: string }[]) => ({
  '@context': 'https://schema.org', '@type': 'ItemList', name,
  itemListElement: items.map((item, i) => ({ '@type': 'ListItem', position: i + 1, name: item.name, description: item.description })),
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
  ...(modified ? { dateModified: isoDate(modified) } : {}), inLanguage: 'en-US',
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
  dateModified: isoDate(o.dateModified), keywords: o.keywords, variableMeasured: o.variables,
  measurementTechnique: 'Transcribed from manufacturer manuals, bar-and-chain fit-up charts and chain-maker product data; each row graded ok / verify / conflict.',
  isBasedOn: SITE.url + '/how-we-verify/',
  citation: `Saw Chain Size. “${o.name}”. SawChainSize.com, data last verified ${o.dateModified}. ${SITE.url}${o.path}`,
  sameAs: ['https://github.com/dovnud/sawchainsize.com'],
  distribution: [
    { '@type': 'DataDownload', encodingFormat: 'text/csv', contentUrl: o.csv, name: 'CSV' },
    { '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: o.json, name: 'JSON' },
  ],
});

const PAGE_TYPES = new Set(['WebPage', 'AboutPage', 'ContactPage', 'CollectionPage', 'ItemPage', 'ProfilePage', 'SearchResultsPage']);
const typesOf = (node: Record<string, unknown>) => {
  const value = node['@type'];
  return (Array.isArray(value) ? value : [value]).filter((t): t is string => typeof t === 'string');
};
const stripContext = (node: Record<string, unknown>) => {
  const copy = { ...node };
  delete copy['@context'];
  return copy;
};

/** One JSON-LD document for every page: organization, website, webpage, breadcrumbs, and the page entities. */
export function pageGraph(opts: {
  title: string;
  description: string;
  path: string;
  modified?: string;
  crumbs: { name: string; path: string }[];
  extra: Record<string, unknown>[];
}) {
  const canonical = SITE.url + opts.path;
  const dateModified = isoDate(opts.modified);
  const orgId = ORG_ID;
  const siteId = SITE.url + '/#website';
  const pageId = canonical + '#webpage';
  const crumbId = canonical + '#breadcrumb';
  const extras = opts.extra.filter((n) => n && typeof n === 'object').map(stripContext);

  const org: Record<string, unknown> = { ...publisher };
  const website: Record<string, unknown> = {
    '@type': 'WebSite', '@id': siteId, name: SITE.name, url: SITE.url + '/',
    publisher: { '@id': orgId }, inLanguage: 'en-US',
  };
  const kept: Record<string, unknown>[] = [];
  for (const node of extras) {
    const types = typesOf(node);
    if (types.includes('Organization')) {
      if (typeof node.description === 'string') org.description = node.description;
      continue;
    }
    if (types.includes('WebSite') && !types.some((t) => PAGE_TYPES.has(t))) {
      if (typeof node.description === 'string') website.description = node.description;
      continue;
    }
    if (types.some((t) => PAGE_TYPES.has(t))) {
      if (!types.includes('WebPage')) node['@type'] = [...types, 'WebPage'];
      node['@id'] = node['@id'] ?? pageId;
      node.dateModified = dateModified ?? isoDate(typeof node.dateModified === 'string' ? node.dateModified : undefined);
      node.publisher = { '@id': orgId };
      node.isPartOf = { '@id': siteId };
      if (opts.path !== '/') node.breadcrumb = { '@id': crumbId };
    }
    if (types.includes('Article')) {
      node.dateModified = dateModified ?? isoDate(typeof node.dateModified === 'string' ? node.dateModified : undefined);
      node.datePublished = isoDate(typeof node.datePublished === 'string' ? node.datePublished : undefined) ?? node.dateModified;
    }
    if ((types.includes('Dataset') || types.includes('Product') || types.includes('ProductModel')) && dateModified && !node.dateModified) {
      node.dateModified = dateModified;
    }
    kept.push(node);
  }

  const graph: Record<string, unknown>[] = [org, website];
  const hasPage = kept.some((n) => typesOf(n).some((t) => PAGE_TYPES.has(t)));
  if (!hasPage) {
    graph.push({
      '@type': 'WebPage', '@id': pageId, url: canonical, name: opts.title, description: opts.description,
      dateModified, isPartOf: { '@id': siteId }, publisher: { '@id': orgId }, inLanguage: 'en-US',
      ...(opts.path !== '/' ? { breadcrumb: { '@id': crumbId } } : {}),
      ...(opts.path === '/' ? { mainEntity: { '@id': canonical + '#finder' } } : {}),
    });
  }
  if (opts.path === '/') {
    graph.push({
      '@type': 'WebApplication', '@id': canonical + '#finder', name: 'SawChainSize Chain Finder',
      applicationCategory: 'ReferenceApplication', operatingSystem: 'Any', url: canonical + '#finder',
      isAccessibleForFree: true, publisher: { '@id': orgId },
      description: 'Look up chainsaw chain pitch, gauge and drive links by saw model and fitted bar length.',
    });
  }
  if (opts.path !== '/' && !kept.some((n) => typesOf(n).includes('BreadcrumbList'))) {
    const crumbs = [{ name: 'Home', path: '/' }, ...(opts.crumbs.length ? opts.crumbs : [{ name: opts.title, path: opts.path }])];
    graph.push({
      '@type': 'BreadcrumbList', '@id': crumbId,
      itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: SITE.url + c.path })),
    });
  }
  graph.push(...kept);
  return { '@context': 'https://schema.org', '@graph': graph };
}
