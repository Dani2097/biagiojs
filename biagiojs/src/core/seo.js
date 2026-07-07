/**
 * biagiojs §8 — Automatic SEO Optimization.
 * From a single `site`+`page` config generates: metadata, canonical, Open Graph,
 * Twitter cards, JSON-LD (Product/Article/etc. + BreadcrumbList), robots.txt, sitemap.xml.
 * Zero configuration beyond declaring the page.
 */

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
import { hreflangLinks, localePath } from './i18n.js';

/** Head tags for one page. */
export function seoHead(site, page) {
  const url = new URL(page.path, site.baseUrl).href;
  const tags = [
    // i18n: hreflang alternates (se il sito è multilingua e la pagina ha basePath)
    ...(site.locales?.length && page.basePath ? [hreflangLinks(site, page.basePath)] : []),
    ...(page.locale ? [`<meta property="og:locale" content="${esc(page.locale)}">`] : []),
    // favicon: site.favicon = '/favicon.svg' | { svg, ico, apple, themeColor }
    ...faviconTags(site.favicon),
    `<meta name="description" content="${esc(page.description || site.description || '')}">`,
    `<link rel="canonical" href="${url}">`,
    `<meta name="robots" content="${page.noindex ? 'noindex,nofollow' : 'index,follow'}">`,
    // Open Graph
    `<meta property="og:title" content="${esc(page.title)}">`,
    `<meta property="og:description" content="${esc(page.description || '')}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:type" content="${page.type === 'product' ? 'product' : 'website'}">`,
    ...ogImageTags(site, page),
    `<meta property="og:site_name" content="${esc(site.name)}">`,
    // Twitter
    `<meta name="twitter:card" content="${page.image || site.ogImage ? 'summary_large_image' : 'summary'}">`,
    `<meta name="twitter:title" content="${esc(page.title)}">`,
    `<meta name="twitter:description" content="${esc(page.description || '')}">`,
  ].filter(Boolean);

  // JSON-LD principal entity
  const ld = [];
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
  // Breadcrumbs
  if (page.breadcrumbs?.length) {
    ld.push({
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: page.breadcrumbs.map((b, i) => ({
        '@type': 'ListItem', position: i + 1, name: b.name,
        item: new URL(b.path, site.baseUrl).href,
      })),
    });
  }
  for (const obj of ld) tags.push(`<script type="application/ld+json">${JSON.stringify(obj)}</scr` + `ipt>`);
  return tags.join('\n');
}

/** og:image + twitter:image per pagina, con fallback di sito (site.ogImage). */
function ogImageTags(site, page) {
  // page.image vince; site.ogImage è il default per tutte le pagine senza immagine
  const img = page.image || site.ogImage;
  if (!img) return [];
  const url = new URL(typeof img === 'string' ? img : img.src, site.baseUrl).href;
  const tags = [
    `<meta property="og:image" content="${url}">`,
    `<meta name="twitter:image" content="${url}">`,
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
  if (favicon.apple) tags.push(`<link rel="apple-touch-icon" href="${esc(favicon.apple)}">`);   // 180×180 png
  if (favicon.themeColor) tags.push(`<meta name="theme-color" content="${esc(favicon.themeColor)}">`);
  return tags;
}

/** Visible breadcrumb HTML (also SEO-relevant content). */
export function breadcrumbHtml(page) {
  if (!page.breadcrumbs?.length) return '';
  return `<nav aria-label="breadcrumb" style="font-size:13px;color:#888;padding:8px 24px">` +
    page.breadcrumbs.map(b => `<a href="${b.path}" style="color:#888">${esc(b.name)}</a>`).join(' › ') +
    ` › <span>${esc(page.title)}</span></nav>`;
}

/** sitemap.xml for all pages. */
export function sitemap(site, pages) {
  const hasI18n = site.locales?.length > 0;
  const urls = pages.filter(p => !p.noindex).map(p => {
    const alternates = hasI18n && p.basePath
      ? site.locales.map(l =>
          `<xhtml:link rel="alternate" hreflang="${l}" href="${new URL(localePath(p.basePath, l, site.defaultLocale), site.baseUrl).href}"/>`
        ).join('')
      : '';
    return `  <url><loc>${new URL(p.path, site.baseUrl).href}</loc>${alternates}${p.lastmod ? `<lastmod>${p.lastmod}</lastmod>` : ''}<priority>${p.sitemapPriority ?? 0.5}</priority></url>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${hasI18n ? ' xmlns:xhtml="http://www.w3.org/1999/xhtml"' : ''}>\n${urls}\n</urlset>\n`;
}

/** robots.txt. */
export function robots(site) {
  const sitemapPath = (site.sitemap || 'sitemap.xml').replace(/^\//, '');
  return `User-agent: *\nAllow: /\nSitemap: ${new URL('/' + sitemapPath, site.baseUrl).href}\n`;
}
