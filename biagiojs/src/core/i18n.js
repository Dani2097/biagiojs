/**
 * biagiojs — i18n.
 *
 * Config (biagio.config.js):
 *   site: { ..., locales: ['it', 'en'], defaultLocale: 'it' }
 *
 * Routing per prefisso: lingua default a /, le altre a /<lang>/...
 * Traduzioni in locales/<lang>.json (chiavi annidate, dot-path):
 *   { "hero": { "title": "Corri più leggero" }, "cta": { "buy": "Compra — {price}" } }
 *
 * Nelle pagine .page.js: ctx.t('hero.title'), ctx.locale
 * Nei template .biagio:     {{t:hero.title}}
 *
 * SEO: hreflang alternate + x-default e sitemap con xhtml:link automatici.
 * Optimizer: reports/<lang>/*.json sovrascrivono reports/*.json per quella lingua
 * (il CTR tedesco non è quello italiano: pesi ricalibrati per mercato).
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/** Carica locales/<lang>.json (vuoto se assente). */
export function loadLocale(root, lang) {
  if (!lang) return {};
  const p = join(root, 'locales', lang + '.json');
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : {};
}

/** t('a.b.c', {x: 1}) con dot-path e interpolazione {x}. Fallback: la chiave stessa. */
export function makeT(dict) {
  return function t(key, vars = {}) {
    let v = key.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), dict);
    if (typeof v !== 'string') return key;
    return v.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : '{' + k + '}'));
  };
}

/** /about/ + 'en' → /en/about/ (la lingua default resta senza prefisso). */
export function localePath(path, locale, defaultLocale) {
  if (!locale || locale === defaultLocale) return path;
  return '/' + locale + (path === '/' ? '/' : path);
}

/** Se il primo segmento dell'URL è una lingua configurata → { locale, path senza prefisso }. */
export function splitLocaleFromUrl(url, locales = [], defaultLocale) {
  const segs = url.replace(/^\/+/, '').split('/');
  if (locales.includes(segs[0]) && segs[0] !== defaultLocale) {
    return { locale: segs[0], path: '/' + segs.slice(1).join('/') || '/' };
  }
  return { locale: defaultLocale, path: url };
}

/** <link rel="alternate" hreflang> per tutte le lingue + x-default. */
export function hreflangLinks(site, basePath) {
  if (!site.locales?.length) return '';
  const abs = p => new URL(p, site.baseUrl).href;
  const links = site.locales.map(l =>
    `<link rel="alternate" hreflang="${l}" href="${abs(localePath(basePath, l, site.defaultLocale))}">`);
  links.push(`<link rel="alternate" hreflang="x-default" href="${abs(localePath(basePath, site.defaultLocale, site.defaultLocale))}">`);
  return links.join('\n');
}
