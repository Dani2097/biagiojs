/**
 * biagiojs §8 — Automatic SEO Optimization.
 * From a single `site`+`page` config generates: metadata, canonical, Open Graph,
 * Twitter cards, JSON-LD (Product/Article/SoftwareApplication/WebSite/Organization + BreadcrumbList),
 * robots.txt, sitemap.xml.
 * Zero configuration beyond declaring the page.
 */

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
import { hreflangLinks, localePath } from './i18n.js';

function absUrl(site, path) {
  return new URL(path, site.baseUrl).href;
}

function ogType(page) {
  if (page.type === 'product') return 'product';
  if (page.type === 'article') return 'article';
  return 'website';
}

function publisherFromSite(site) {
  if (!site.organization) return undefined;
  const o = site.organization;
  const pub = { '@type': 'Organization', name: o.name || site.name };
  if (o.logo) pub.logo = { '@type': 'ImageObject', url: absUrl(site, o.logo) };
  return pub;
}

/** JSON-LD entities for one page. */
function buildJsonLd(site, page, url) {
  const ld = [];

  if (site.organization) {
    const o = site.organization;
    ld.push({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: o.name || site.name,
      url: o.url || site.baseUrl,
      ...(o.logo ? { logo: absUrl(site, o.logo) } : {}),
      ...(o.sameAs?.length ? { sameAs: o.sameAs } : {}),
    });
  }

  if (site.website && page.basePath === '/') {
    const w = site.website;
    const entry = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: w.name || site.name,
      url: w.url || site.baseUrl,
      description: w.description || site.description,
      ...(site.locales?.length ? { inLanguage: site.locales } : {}),
      publisher: publisherFromSite(site),
    };
    if (w.searchUrl) {
      entry.potentialAction = {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: w.searchUrl },
        'query-input': 'required name=search_term_string',
      };
    }
    ld.push(entry);
  }

  if (page.software) {
    const s = page.software;
    ld.push({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: s.name || site.name,
      applicationCategory: s.applicationCategory || 'DeveloperApplication',
      operatingSystem: s.operatingSystem || 'Any',
      ...(s.version ? { softwareVersion: s.version } : {}),
      description: page.description || site.description,
      url,
      ...(s.downloadUrl ? { downloadUrl: s.downloadUrl } : {}),
      offers: {
        '@type': 'Offer',
        price: String(s.price ?? '0'),
        priceCurrency: s.currency || 'USD',
      },
    });
  }

  if (page.type === 'product' && page.product) {
    ld.push({
      '@context': 'https://schema.org', '@type': 'Product',
      name: page.product.name, image: page.image,
      description: page.description,
      offers: {
        '@type': 'Offer', price: String(page.product.price),
        priceCurrency: page.product.currency || 'EUR',
        availability: 'https://schema.org/' + (page.product.availability || 'InStock'),
        url,
      },
      ...(page.product.rating ? {
        aggregateRating: { '@type': 'AggregateRating', ratingValue: page.product.rating, reviewCount: page.product.reviewCount || 1 },
      } : {}),
    });
  }

  if (page.type === 'article' && page.article) {
    const a = page.article;
    ld.push({
      '@context': 'https://schema.org',
      '@type': a.schemaType || 'TechArticle',
      headline: a.headline || page.title,
      description: page.description,
      url,
      datePublished: a.datePublished,
      dateModified: a.dateModified || a.datePublished,
      author: { '@type': 'Person', name: a.author || site.organization?.name || site.name },
      publisher: publisherFromSite(site),
      ...(page.locale ? { inLanguage: page.locale } : {}),
      ...(a.section ? { articleSection: a.section } : {}),
      ...(a.keywords ? { keywords: a.keywords } : {}),
      ...(page.image ? { image: absUrl(site, typeof page.image === 'string' ? page.image : page.image.src) } : {}),
    });
  }

  if (page.breadcrumbs?.length) {
    ld.push({
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: page.breadcrumbs.map((b, i) => ({
        '@type': 'ListItem', position: i + 1, name: b.name,
        item: absUrl(site, b.path),
      })),
    });
  }

  for (const obj of page.jsonLd || []) {
    ld.push(obj['@context'] ? obj : { '@context': 'https://schema.org', ...obj });
  }

  return ld;
}

/** Head tags for one page. */
export function seoHead(site, page) {
  const url = absUrl(site, page.path);
  const desc = page.description || site.description || '';
  const tags = [
    ...(site.locales?.length && page.basePath ? [hreflangLinks(site, page.basePath)] : []),
    ...(page.locale ? [`<meta property="og:locale" content="${esc(page.locale)}">`] : []),
    ...(site.locales?.length && page.locale
      ? site.locales.filter(l => l !== page.locale).map(l =>
          `<meta property="og:locale:alternate" content="${esc(l)}">`)
      : []),
    ...faviconTags(site.favicon),
    `<meta name="description" content="${esc(desc)}">`,
    `<link rel="canonical" href="${url}">`,
    `<meta name="robots" content="${page.noindex ? 'noindex,nofollow' : 'index,follow,max-image-preview:large'}">`,
    `<meta property="og:title" content="${esc(page.title)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:type" content="${ogType(page)}">`,
    ...ogImageTags(site, page),
    `<meta property="og:site_name" content="${esc(site.name)}">`,
    ...(page.article?.datePublished
      ? [`<meta property="article:published_time" content="${esc(page.article.datePublished)}">`]
      : []),
    ...(page.article?.dateModified || page.article?.datePublished
      ? [`<meta property="article:modified_time" content="${esc(page.article.dateModified || page.article.datePublished)}">`]
      : []),
    `<meta name="twitter:card" content="${page.image || site.ogImage ? 'summary_large_image' : 'summary'}">`,
    ...(site.twitter ? [`<meta name="twitter:site" content="${esc(site.twitter)}">`] : []),
    `<meta name="twitter:title" content="${esc(page.title)}">`,
    `<meta name="twitter:description" content="${esc(desc)}">`,
    ...(page.article?.author
      ? [`<meta name="author" content="${esc(page.article.author)}">`]
      : site.organization?.name
        ? [`<meta name="author" content="${esc(site.organization.name)}">`]
        : []),
  ].filter(Boolean);

  const ld = buildJsonLd(site, page, url);
  for (const obj of ld) tags.push(`<script type="application/ld+json">${JSON.stringify(obj)}</scr` + `ipt>`);
  return tags.join('\n');
}

/** og:image + twitter:image per pagina, con fallback di sito (site.ogImage). */
function ogImageTags(site, page) {
  const img = page.image || site.ogImage;
  if (!img) return [];
  const imgUrl = absUrl(site, typeof img === 'string' ? img : img.src);
  const tags = [
    `<meta property="og:image" content="${imgUrl}">`,
    `<meta name="twitter:image" content="${imgUrl}">`,
  ];
  if (typeof img === 'object') {
    if (img.width) tags.push(`<meta property="og:image:width" content="${img.width}">`);
    if (img.height) tags.push(`<meta property="og:image:height" content="${img.height}">`);
    if (img.alt) tags.push(`<meta property="og:image:alt" content="${esc(img.alt)}">`);
  }
  return tags;
}

/** Tag favicon da site.favicon (stringa o oggetto). I file vanno in public/. */
export function faviconTags(favicon) {
  if (!favicon) return [];
  if (typeof favicon === 'string') {
    const type = favicon.endsWith('.svg') ? 'image/svg+xml' : favicon.endsWith('.png') ? 'image/png' : 'image/x-icon';
    return [`<link rel="icon" type="${type}" href="${esc(favicon)}">`];
  }
  const tags = [];
  if (favicon.svg) tags.push(`<link rel="icon" type="image/svg+xml" href="${esc(favicon.svg)}">`);
  if (favicon.ico) tags.push(`<link rel="icon" sizes="32x32" href="${esc(favicon.ico)}">`);
  if (favicon.apple) tags.push(`<link rel="apple-touch-icon" href="${esc(favicon.apple)}">`);
  if (favicon.themeColor) tags.push(`<meta name="theme-color" content="${esc(favicon.themeColor)}">`);
  return tags;
}

/** Visible breadcrumb HTML (also SEO-relevant content). Set page.hideBreadcrumb to skip. */
export function breadcrumbHtml(page) {
  if (page.hideBreadcrumb || !page.breadcrumbs?.length) return '';
  const items = page.breadcrumbs.map((b, i) => {
    const isLast = i === page.breadcrumbs.length - 1;
    if (isLast) return `<span aria-current="page">${esc(b.name)}</span>`;
    return `<a href="${b.path}">${esc(b.name)}</a>`;
  });
  return `<nav class="breadcrumb-nav" aria-label="Breadcrumb">${items.join(' <span aria-hidden="true">/</span> ')}</nav>`;
}

/** sitemap.xml for all pages. */
export function sitemap(site, pages) {
  const hasI18n = site.locales?.length > 0;
  const urls = pages.filter(p => !p.noindex).map(p => {
    const alternates = hasI18n && p.basePath
      ? [
          ...site.locales.map(l =>
            `<xhtml:link rel="alternate" hreflang="${l}" href="${absUrl(site, localePath(p.basePath, l, site.defaultLocale))}"/>`
          ),
          `<xhtml:link rel="alternate" hreflang="x-default" href="${absUrl(site, localePath(p.basePath, site.defaultLocale, site.defaultLocale))}"/>`,
        ].join('')
      : '';
    return `  <url><loc>${absUrl(site, p.path)}</loc>${alternates}${p.lastmod ? `<lastmod>${p.lastmod}</lastmod>` : ''}<priority>${p.sitemapPriority ?? 0.5}</priority></url>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${hasI18n ? ' xmlns:xhtml="http://www.w3.org/1999/xhtml"' : ''}>\n${urls}\n</urlset>\n`;
}

/** robots.txt. */
export function robots(site) {
  const sitemapPath = (site.sitemap || 'sitemap.xml').replace(/^\//, '');
  return `User-agent: *\nAllow: /\nSitemap: ${absUrl(site, '/' + sitemapPath)}\n`;
}
