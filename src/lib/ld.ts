import { SITE, type Model, barLabel, pitchLabel, gaugeLabel, type Faq } from './data';

export const faqLd = (faqs: Faq[], strip = false) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: strip ? f.a.replace(/<[^>]+>/g, '') : f.a } })),
});

export const publisher = { '@type': 'Organization', name: SITE.name, url: SITE.url + '/', logo: { '@type': 'ImageObject', url: SITE.url + '/icon-512.png' } };

export const webPageLd = (name: string, path: string, description: string, modified?: string, type = 'WebPage') => ({
  '@context': 'https://schema.org', '@type': type, name, url: SITE.url + path, description,
  isPartOf: { '@type': 'WebSite', name: SITE.name, url: SITE.url + '/' }, publisher,
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
  isPartOf: { '@type': 'WebSite', name: SITE.name, url: SITE.url + '/' }, publisher,
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
