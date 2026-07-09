/**
 * biagiojs — rendering per-request condiviso (dev Vite + adapter Node).
 * Mappa un URL sulla pagina corrispondente e renderizza HTML on-demand.
 * Le pagine con `export const prerender = false` ricevono ctx.request
 * (url, query, headers) e possono produrre dati freschi a ogni richiesta.
 */
import { readdirSync, existsSync } from 'node:fs';
import { join, resolve, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { renderPage } from './ssr.js';
import { loadReports, optimize } from './core/optimizer.js';
import { ExperimentEngine } from './core/experiments.js';
import { getCollection, preloadContentSchemas } from './core/content.js';
import { loadBiagioFile } from './compiler.js';
import { loadLocale, makeT, localePath, splitLocaleFromUrl } from './core/i18n.js';

function walkPages(dir, base = dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walkPages(p, base));
    else if (/\.page\.(js|ts|biagio)$/.test(e.name)) out.push(relative(base, p).split(sep).join('/'));
  }
  return out;
}

/** URL → { file, params } oppure null. */
export function matchRoute(pagesDir, url) {
  const clean = url.replace(/\/+$/, '') || '/';
  const segs = clean === '/' ? [] : clean.slice(1).split('/');
  for (const file of walkPages(pagesDir)) {
    let routeSegs = file.replace(/\.page\.(js|ts|biagio)$/, '').split('/');
    // index di cartella: pages/index.page.js → /  ·  pages/docs/index.page.js → /docs/
    if (routeSegs[routeSegs.length - 1] === 'index') routeSegs = routeSegs.slice(0, -1);
    if (routeSegs.length !== segs.length) continue;
    const params = {};
    let ok = true;
    for (let i = 0; i < segs.length; i++) {
      const m = routeSegs[i].match(/^\[(\w+)\]$/);
      if (m) params[m[1]] = decodeURIComponent(segs[i]);
      else if (routeSegs[i] !== segs[i]) { ok = false; break; }
    }
    if (ok) return { file, params };
  }
  return null;
}

/**
 * Renderizza l'URL. Ritorna HTML o null (404).
 * opts.loadModule: loader (vite ssrLoadModule in dev, import() in prod)
 * opts.request: info richiesta per pagine prerender=false
 */
export async function renderRequest(root, url, { loadModule, request = {}, userId = 'ssr', dev = false, meta = {} } = {}) {
  root = resolve(root);
  await preloadContentSchemas(root);
  const load = loadModule || (id => import(pathToFileURL(id).href + (dev ? '?t=' + Date.now() : '')));
  const configPath = join(root, 'biagio.config.js');
  const site = existsSync(configPath) ? (await load(configPath)).default.site : { name: 'biagiojs Site', baseUrl: 'https://example.com' };

  // i18n: stacca l'eventuale prefisso lingua dall'URL
  const defaultLocale = site.defaultLocale || site.locales?.[0] || null;
  const { locale, path: urlPath } = site.locales?.length
    ? splitLocaleFromUrl(url, site.locales, defaultLocale)
    : { locale: null, path: url };

  const match = matchRoute(join(root, 'pages'), urlPath);
  if (!match) return null;
  const mod = match.file.endsWith('.biagio')
    ? loadBiagioFile(join(root, 'pages', match.file))
    : await load(join(root, 'pages', match.file));

  const reports = loadReports(join(root, 'reports'));
  const ctx = {
    site, reports, ExperimentEngine, userId,
    locale, defaultLocale, t: makeT(loadLocale(root, locale)),
    getCollection: d => getCollection(join(root, d), locale),
    params: match.params,
    props: {},
    request: { url, ...request },   // pagine SSR on-demand leggono da qui
  };

  // route dinamica prerenderizzata: recupera le props da getStaticPaths
  if (/\[.+\]/.test(match.file) && mod.getStaticPaths && mod.prerender !== false) {
    const variants = await mod.getStaticPaths(ctx);
    const hit = variants.find(v => Object.entries(match.params).every(([k, val]) => String(v.params?.[k]) === val));
    if (!hit) return null;
    ctx.props = hit.props || {};
  }

  const def = await mod.default(ctx);
  const { graph, page, assets = [], experiments = null, head = '', overlay = dev } = def;
  const { thresholds } = optimize(graph, reports);
  // ISR: la pagina può dichiarare `export const revalidate = 60` (secondi)
  meta.revalidate = typeof mod.revalidate === 'number' ? mod.revalidate : null;
  page.basePath = page.basePath || urlPath;
  page.locale = locale || undefined;
  page.path = page.path || localePath(page.basePath, locale, defaultLocale);
  return await renderPage(graph, { title: page.title, head, overlay, site, page, assets, experiments, thresholds });
}
