#!/usr/bin/env node
/**
 * biagiojs CLI.
 *
 *   node src/cli.js build [dir]            → pages/*.page.js → dist/
 *   node src/cli.js dev [dir]              → build + watch + live reload :4321
 *   node src/cli.js create <dir>           → scaffolding nuovo sito
 *   node src/cli.js pull-vitals <url> [dir]→ field data reali → reports/crux.json
 *   node src/cli.js doctor [dir]           → validazione progetto pre-build
 *   node src/cli.js analyze [dir]          → report pesi post-build
 *   node src/cli.js preview [dir] [port]   → server produzione (adapter Node)
 *
 * Routing:
 *   pages/index.page.js        → /
 *   pages/about.page.js        → /about/
 *   pages/blog/[slug].page.js  → una route per ogni entry di getStaticPaths()
 *     export function getStaticPaths(ctx) { return [{ params:{slug:'x'}, props:{...} }]; }
 *     export default (ctx) => ({...})   // ctx.params, ctx.props disponibili
 */
import { readdirSync, mkdirSync, writeFileSync, existsSync, readFileSync, watch, statSync, rmSync } from 'node:fs';
import { join, resolve, relative, sep, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createServer } from 'node:http';
import { renderPage } from './ssr.js';
import { sitemap, robots } from './core/seo.js';
import { loadReports, optimize } from './core/optimizer.js';
import { ExperimentEngine } from './core/experiments.js';
import { renderOrder, hydrationPlan } from './core/scheduler.js';
import { processImages } from './core/image-pipeline.js';
import { fetchRemoteImages } from './core/remote-images.js';
import { fetchGoogleFonts, writeFontManifest, refreshFontManifestSizes } from './core/fonts.js';
import { getCollection } from './core/content.js';
import { pullVitals } from './core/psi.js';
import { loadBiagioFile } from './compiler.js';
import { loadLocale, makeT, localePath } from './core/i18n.js';
import { cpSync } from 'node:fs';
import { optimizeHtml } from './core/minify.js';
import { loadEnv } from './core/env.js';
import { loadConfig } from './core/config.js';
import { validateImageRefs } from './core/validate-images.js';
import { generateHeaders } from './core/cache-headers.js';
import { collectSubsetText, subsetFontFiles } from './core/font-subset.js';
import { runDoctor, formatDoctorReport } from './core/doctor.js';
import { analyzeDist, formatAnalyzeReport } from './core/analyze.js';
import { generateDeployPreset, parseDeploy } from './core/deploy-presets.js';
import { generateFavicons } from './core/favicon.js';
import { preloadContentSchemas } from './core/content.js';
import { BiagioError, formatErrorOverlay } from './core/errors.js';
import { scaffoldPage, scaffoldIsland, scaffoldCollection } from './core/scaffold.js';
import { explainPage, formatExplainReport } from './core/explain.js';
import { pagesAffectedByChange, isFullRebuild, walkPageFiles } from './core/incremental.js';
import { checkLinksAndAssets, formatLinkReport, checkPageSources } from './core/link-checker.js';
import { getTemplate, configSnippet, extraFiles } from './templates/index.js';

function walkPages(dir, base = dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walkPages(p, base));
    else if (/\.page\.(js|ts|biagio)$/.test(e.name)) out.push(relative(base, p).split(sep).join('/'));
  }
  return out;
}

export async function build(projectDir, {
  userId = 'build-preview',
  quiet = false,
  overlay: overlayDefault = false,
  clean = false,
  dryRun = false,
  onlyPages = null,
  skipGlobal = false,
  builtPagesCache = null,
} = {}) {
  const t0 = Date.now();
  const root = resolve(projectDir);
  const pagesDir = join(root, 'pages');
  const dist = join(root, 'dist');
  mkdirSync(dist, { recursive: true });
  const log = quiet ? () => {} : console.log;

  if (!overlayDefault) await loadEnv(root, 'production');
  await preloadContentSchemas(root);
  const config = await loadConfig(root);
  const { site, images, fonts, optimize: optimizeOpts, hooks, cache } = config;
  const fontsDir = join(root, 'fonts');
  const imgOutDir = join(dist, 'img');
  const imageDryRun = dryRun || images.dryRun;

  if (clean && existsSync(imgOutDir)) {
    rmSync(imgOutDir, { recursive: true, force: true });
    log('  clean: dist/img/ rimosso');
  }

  let islandSources = {};

  if (!skipGlobal) {
  // Pre-build: Google Fonts self-hosted
  if (hooks.beforeFonts) await hooks.beforeFonts({ root, fontsDir, fonts, config });
  if (fonts.google?.length) {
    const gf = await fetchGoogleFonts(fonts.google, fontsDir, {
      allowedDomains: fonts.allowedDomains,
      cssFilename: fonts.cssPath?.split('/').pop() || 'google.css',
      preload: fonts.preload,
      preloadCritical: fonts.preloadCritical,
    });
    for (const line of gf.log) log('  fonts:', line);
    if (gf.files.length) {
      site.fonts.preloadFiles = gf.preloadFiles;
      site.fonts.files = gf.files;
      site.fonts.inlineCss = gf.inlineCss;
      writeFontManifest(fontsDir, {
        preloadFiles: gf.preloadFiles,
        files: gf.files,
        inlineCss: gf.inlineCss,
        cssPath: gf.cssPath,
      });
      log(`  fonts: ${gf.files.length} file woff2 → dist/fonts/`);
    }
    if (hooks.afterFonts) await hooks.afterFonts({ root, fontsDir, fonts: site.fonts, result: gf, config });
  }

  const imagesDir = join(root, 'images');

  // Pre-build: hook custom → download remote → pipeline sharp
  if (hooks.beforeImages) await hooks.beforeImages({ root, srcDir: imagesDir, images, config });

  if (images.remote?.sources?.length) {
    const remote = await fetchRemoteImages(images.remote.sources, imagesDir, {
      allowedDomains: images.remote.allowedDomains,
      allowLocalhost: images.remote.allowLocalhost,
    });
    for (const line of remote.log) log('  remote:', line);
    if (remote.downloaded) log(`  remote: ${remote.downloaded} file scaricati in images/`);
  }

  const img = await processImages(imagesDir, imgOutDir, {
    ...images,
    images,
    dryRun: imageDryRun,
    strict: !overlayDefault,
  });
  for (const line of img.log) log('  images:', line);
  if (img.slugs?.length) log('  images: slug generati →', img.slugs.join(', '));
  if (imageDryRun && img.plan?.length) {
    log(`  images: dryRun — ${img.plan.length} varianti pianificate (nessun file scritto)`);
    for (const p of img.plan.slice(0, 8)) log(`    ${p.slug}-${p.width}w.${p.ext} (q=${p.quality})`);
    if (img.plan.length > 8) log(`    … +${img.plan.length - 8} altre`);
  }
  if (img.fileSizes?.length) {
    const top = img.fileSizes.slice(0, 10);
    log('  images: report pesi (top 10):');
    for (const f of top) log(`    ${f.file} — ${(f.bytes / 1024).toFixed(1)} KiB`);
    const total = img.fileSizes.reduce((s, f) => s + f.bytes, 0);
    log(`  images: totale dist/img/ — ${(total / 1024).toFixed(1)} KiB (${img.fileSizes.length} file)`);
  }
  if (hooks.afterImages) await hooks.afterImages({ root, srcDir: imagesDir, outDir: imgOutDir, result: img });

  // public/ → dist/ così com'è (favicon, font manuali, _headers, ecc.)
  if (existsSync(join(root, 'public'))) {
    cpSync(join(root, 'public'), dist, { recursive: true, force: true });
    log('  public/ → dist/');
  }

  // Favicon generator opt-in: site.favicon = { source, generate: true, … }
  // Gira DOPO public/ così i file generati hanno precedenza su eventuali manuali.
  if (site.favicon?.generate) {
    const fav = await generateFavicons({
      source: join(root, site.favicon.source),
      outDir: dist,
      targets: site.favicon.targets,
      themeColor: site.favicon.themeColor,
      background: site.favicon.background,
      name: site.favicon.name,
      shortName: site.favicon.shortName,
      strict: !overlayDefault,
    });
    for (const line of fav.log) log('  ' + line);
  }

  // isole → dist/islands/ minificate (esbuild se presente) + sorgenti per l'inline
  let esbuild = null;
  try { esbuild = await import('esbuild'); } catch {}
  const islandsDir = join(root, 'islands');
  if (existsSync(islandsDir)) {
    mkdirSync(join(dist, 'islands'), { recursive: true });
    for (const f of readdirSync(islandsDir).filter(f => f.endsWith('.js'))) {
      let code = readFileSync(join(islandsDir, f), 'utf8');
      if (esbuild) try { code = (await esbuild.transform(code, { minify: true, format: 'esm' })).code; } catch {}
      writeFileSync(join(dist, 'islands', f), code);
      islandSources['/islands/' + f] = code;
    }
    log('  islands:', readdirSync(islandsDir).join(', '), `→ dist/islands/${esbuild ? ' (minificate)' : ''}`);
  }
  } // fine skipGlobal

  if (skipGlobal) {
    islandSources = {};
    const idir = join(dist, 'islands');
    if (existsSync(idir)) {
      for (const f of readdirSync(idir).filter(x => x.endsWith('.js'))) {
        islandSources['/islands/' + f] = readFileSync(join(idir, f), 'utf8');
      }
    }
  }

  const reports = loadReports(join(root, 'reports'));
  const builtPages = [];
  const builtHtml = [];
  let pageFiles = walkPages(pagesDir);
  if (onlyPages?.length) {
    pageFiles = pageFiles.filter(f => onlyPages.includes(f));
    if (!pageFiles.length) {
      log('  incremental: nessuna pagina da rigenerare');
      return { dist, builtPages: builtPagesCache || [] };
    }
    log(`  incremental: ${pageFiles.length} pagina/e`);
  }

  // TypeScript nei template: se ci sono .page.ts, la build passa da Vite (transpile SSR)
  let viteServer = null;
  if (pageFiles.some(f => f.endsWith('.page.ts'))) {
    try {
      const vite = await import('vite');
      viteServer = await vite.createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true } });
    } catch {
      throw new Error('[biagio] Hai pagine .page.ts: serve vite per compilarle (`npm i -D vite`)');
    }
  }

  for (const file of pageFiles) {
    let mod;
    try {
      mod = file.endsWith('.biagio')
        ? loadBiagioFile(join(pagesDir, file))
        : file.endsWith('.ts')
          ? await viteServer.ssrLoadModule(join(pagesDir, file))
          : await import(pathToFileURL(join(pagesDir, file)).href + '?t=' + Date.now());
    }
    catch (e) { throw new Error(`[biagio] Errore in pages/${file}:\n  ${e.message}`); }

    if (mod.prerender === false) { log(`  skip ${file}: prerender=false → servita on-demand dall'adapter`); continue; }

    // index di cartella: pages/docs/index.page.js → route "docs" (→ /docs/).
    // La index top-level resta "index" (→ /), gestita dai check `route === 'index'`.
    const routeBase = file.replace(/\.page\.(js|ts|biagio)$/, '').replace(/\/index$/, '');
    // i18n: una variante per lingua (default a /, le altre a /<lang>/)
    const locales = site.locales?.length ? site.locales : [null];
    const defaultLocale = site.defaultLocale || site.locales?.[0] || null;

    for (const locale of locales) {
    const t = makeT(loadLocale(root, locale));
    // report per lingua: reports/<lang>/*.json sovrascrivono i globali (pesi per mercato)
    const localeReports = locale
      ? { ...reports, ...Object.fromEntries(Object.entries(loadReports(join(root, 'reports', locale))).filter(([, v]) => v)) }
      : reports;
    const baseCtx = { site, reports: localeReports, ExperimentEngine, userId, locale, defaultLocale, t, getCollection: d => getCollection(join(root, d), locale) };

    // Route dinamiche: [param]
    let variants = [{ params: {}, props: {} }];
    if (/\[.+\]/.test(routeBase)) {
      if (!mod.getStaticPaths) throw new Error(`[biagio] pages/${file} è dinamica ma non esporta getStaticPaths()`);
      variants = await mod.getStaticPaths(baseCtx);
      if (!variants?.length) { log(`  skip ${file}: getStaticPaths() vuoto`); continue; }
    }

    for (const v of variants) {
      const ctx = { ...baseCtx, params: v.params || {}, props: v.props || {} };
      let def;
      try { def = await mod.default(ctx); }
      catch (e) { throw new Error(`[biagio] Errore renderizzando pages/${file} (params=${JSON.stringify(v.params)}, locale=${locale}):\n  ${e.message}`); }

      // overlay: la pagina può forzarlo; altrimenti build prod = OFF, dev = ON
      const { graph, page, assets = [], experiments = null, head = '', overlay = overlayDefault } = def;
      const { thresholds, log: optLog } = optimize(graph, localeReports);

      let pageHead = head;
      if (hooks.head) {
        const extra = await hooks.head({ root, page, locale, site, config, ctx });
        if (extra) pageHead = head + (typeof extra === 'string' ? extra : '');
      }

      let route = routeBase.replace(/\[(\w+)\]/g, (_, k) => ctx.params[k]);
      page.basePath = page.basePath || (route === 'index' ? '/' : `/${route}/`);
      page.locale = locale || undefined;
      page.path = localePath(page.basePath, locale, defaultLocale);
      if (locale && locale !== defaultLocale) route = route === 'index' ? locale : `${locale}/${route}`;

      let html = await renderPage(graph, { title: page.title, head: pageHead, overlay, site, page, assets, experiments, thresholds, islandSources });
      // ottimizzazione output: purge CSS + minify (solo build prod, non in dev)
      let saved = 0;
      if (!overlayDefault) ({ html, saved } = await optimizeHtml(html, optimizeOpts));
      const outDir = route === 'index' ? dist : join(dist, route);
      mkdirSync(outDir, { recursive: true });
      writeFileSync(join(outDir, 'index.html'), html);
      builtPages.push(page);
      builtHtml.push([page.path, html]);

      log(`\n▸ ${page.path}${saved > 0 ? ` (−${(saved / 1024).toFixed(1)} KB: purge+minify)` : ''}`);
      log('  render order:', renderOrder(graph).map(n => n.id).join(' → '));
      const plan = hydrationPlan(graph, thresholds);
      log('  hydration:', ['eager', 'lazy', 'static'].map(k => `${k}=[${plan[k].map(x => x.node.id)}]`).join(' '));
      for (const line of optLog) log('  optimizer:', line);
    }
    }  // fine loop locales
  }

  if (viteServer) await viteServer.close();

  if (!overlayDefault && builtHtml.length && !imageDryRun) {
    const { missing } = validateImageRefs(builtHtml, imgOutDir, images);
    if (missing.length) {
      const detail = missing.slice(0, 5).map(m => `  ${m.page}: ${m.ref}\n    → ${m.hint}`).join('\n');
      throw new BiagioError(`${missing.length} immagine/i referenziate ma assenti in dist/img/:\n${detail}${missing.length > 5 ? '\n  …' : ''}`);
    }
    const linkIssues = checkLinksAndAssets(root, builtHtml, {
      dist,
      locales: site.locales,
      defaultLocale: site.defaultLocale || site.locales?.[0],
    });
    if (linkIssues.length) {
      const detail = linkIssues.slice(0, 5).map(i => `  ${i.page}: ${i.ref} → ${i.hint}`).join('\n');
      throw new BiagioError(`${linkIssues.length} problema/i link/asset:\n${detail}${linkIssues.length > 5 ? '\n  …' : ''}`);
    }
  }

  // Subset font dopo il render: usa HTML output + sorgenti (opt-in)
  if (!skipGlobal && fonts.subset && existsSync(fontsDir) && readdirSync(fontsDir).some(f => f.endsWith('.woff2'))) {
    const text = collectSubsetText(root, builtHtml, fonts.subset);
    const sub = await subsetFontFiles(fontsDir, text, {
      minSaving: fonts.subset.minSaving,
      strict: !overlayDefault,
    });
    for (const line of sub.log) log('  subset:', line);
    if (sub.savedBytes > 0) log(`  subset: −${(sub.savedBytes / 1024).toFixed(1)} KB totali su ${sub.processed} file`);
    const refreshed = refreshFontManifestSizes(fontsDir);
    if (refreshed) {
      site.fonts.files = refreshed.files;
      site.fonts.inlineCss = refreshed.inlineCss;
      site.fonts.preloadFiles = refreshed.preloadFiles;
      log('  subset: manifest font aggiornato (bytes + inlineCss)');
    }
    if (hooks.afterFonts) await hooks.afterFonts({ root, fontsDir, fonts: site.fonts, subset: sub, config });
  }

  if (!skipGlobal && existsSync(fontsDir)) {
    cpSync(fontsDir, join(dist, 'fonts'), { recursive: true, force: true });
    log('  fonts/ → dist/fonts/');
  }

  if (!skipGlobal && cache && cache !== false) {
    const headersPath = join(dist, '_headers');
    const generated = generateHeaders(typeof cache === 'object' ? cache : {});
    writeFileSync(headersPath, generated);
    log('  cache: _headers generato in dist/');
  }

  if (!skipGlobal) {
  const deployPlatform = parseDeploy(site);
  if (deployPlatform) {
    const created = generateDeployPreset(root, deployPlatform, { log });
    if (created.length) log(`  deploy: preset ${deployPlatform} → ${created.join(', ')}`);
  }
  }

  const allBuiltPages = mergeBuiltPages(builtPagesCache, builtPages);
  const sitemapFile = (site.sitemap || 'sitemap.xml').replace(/^\//, '');
  writeFileSync(join(dist, sitemapFile), sitemap(site, allBuiltPages));
  writeFileSync(join(dist, 'robots.txt'), robots(site));
  log(`\n✔ ${builtPages.length} page(s)${skipGlobal ? ' (incremental)' : ''} + ${sitemapFile} + robots in ${Date.now() - t0}ms → ${dist}`);
  return { dist, builtPages: allBuiltPages };
}

function mergeBuiltPages(cache, fresh) {
  if (!cache?.length) return fresh;
  const map = new Map(cache.map(p => [p.path || p.basePath, p]));
  for (const p of fresh) map.set(p.path || p.basePath, p);
  return [...map.values()];
}

// ---------- dev server con watch + live reload (SSE) ----------
const RELOAD_SNIPPET = `<script>new EventSource('/__cvw').addEventListener('reload',()=>location.reload());</script>`;

/** Error overlay del dev server integrato (stile Vite, zero dipendenze). */
function errorPage(err) {
  const { html: body } = formatErrorOverlay(err);
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const e = err instanceof BiagioError ? err : null;
  return `<!doctype html><html><head><meta charset="utf-8"><title>biagio — build error</title></head>
<body style="margin:0;background:#14141f;color:#eee;font:14px/1.6 ui-monospace,monospace;padding:40px">
<div style="max-width:880px;margin:0 auto">
<div style="color:#ff6b6b;font-size:18px;font-weight:700;margin-bottom:8px">✖ Errore di build</div>
${body}
${err.stack && !e?.file ? `<details style="margin-top:12px"><summary style="cursor:pointer;color:#8a8a96">stack trace</summary><pre style="color:#8a8a96;white-space:pre-wrap;font-size:12px">${esc(err.stack)}</pre></details>` : ''}
<p style="color:#8a8a96;margin-top:16px">Correggi il file e salva: la pagina si ricarica da sola.</p>
</div>${RELOAD_SNIPPET}</body></html>`;
}

export function serve(projectDir, dist, port = 4321) {
  const root = resolve(projectDir);
  const types = { html: 'text/html', xml: 'application/xml', txt: 'text/plain', js: 'text/javascript', css: 'text/css', avif: 'image/avif', webp: 'image/webp', jpg: 'image/jpeg', png: 'image/png', svg: 'image/svg+xml' };
  const clients = new Set();
  let lastError = null;
  let builtPagesCache = [];

  createServer((req, res) => {
    if (lastError && !req.url.includes('.') && req.url !== '/__cvw') {
      res.writeHead(500, { 'content-type': 'text/html' });
      return res.end(errorPage(lastError));
    }
    if (req.url === '/__cvw') {
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
      res.write('\n'); clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }
    let p = join(dist, decodeURIComponent(req.url.split('?')[0]));
    if (!p.includes('.')) p = join(p, 'index.html');
    try {
      let body = readFileSync(p);
      const type = types[p.split('.').pop()] || 'application/octet-stream';
      if (type === 'text/html') body = Buffer.from(body.toString().replace('</body>', RELOAD_SNIPPET + '</body>'));
      res.writeHead(200, { 'content-type': type });
      res.end(body);
    } catch { res.writeHead(404); res.end('404 — ' + req.url); }
  }).listen(port, () => console.log(`\ndev server → http://localhost:${port} (live reload attivo)`));

  // watch: pages/, content/, images/, reports/, biagio.config.js
  let timer = null;
  let firstBuild = true;
  const rebuild = (changedPath) => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        const affected = changedPath && !firstBuild ? pagesAffectedByChange(root, changedPath) : null;
        const full = firstBuild || isFullRebuild(affected);
        const result = await build(projectDir, {
          quiet: true,
          overlay: true,
          onlyPages: full ? null : affected,
          skipGlobal: !full && !!affected?.length,
          builtPagesCache,
        });
        builtPagesCache = result.builtPages || [];
        lastError = null;
        firstBuild = false;
        console.log(full ? '↻ rebuilt' : `↻ incremental (${affected?.length || 0} pagine)`, new Date().toLocaleTimeString());
      } catch (e) {
        lastError = e;
        console.error('✖', e.message);
      }
      for (const c of clients) c.write('event: reload\ndata: 1\n\n');
    }, 120);
  };
  rebuild(null);
  for (const sub of ['pages', 'content', 'images', 'reports', 'islands', '.']) {
    const d = sub === '.' ? projectDir : join(projectDir, sub);
    if (existsSync(d) && statSync(d).isDirectory()) {
      try {
        watch(d, { recursive: true }, (_, f) => {
          if (f && !f.includes('dist')) rebuild(join(d, f));
        });
      }
      catch { watch(d, () => rebuild(d)); }
    }
  }
}

// ---------- scaffolding ----------
export function create(dir, { template: templateName = 'default' } = {}) {
  const root = resolve(dir);
  const tpl = getTemplate(templateName);
  const name = root.split(/[\\/]/).pop().toLowerCase().replace(/[^a-z0-9-]/g, '-');
  mkdirSync(join(root, 'pages'), { recursive: true });
  mkdirSync(join(root, 'content', 'blog'), { recursive: true });
  mkdirSync(join(root, 'images'), { recursive: true });
  mkdirSync(join(root, 'reports'), { recursive: true });
  mkdirSync(join(root, 'islands'), { recursive: true });

  mkdirSync(join(root, 'public'), { recursive: true });
  // Logo di esempio (sorgente per il generatore di favicon). Sostituiscilo col tuo.
  writeFileSync(join(root, 'images', 'logo.svg'),
`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#111"/>
  <circle cx="32" cy="32" r="14" fill="none" stroke="#fff" stroke-width="6"/>
</svg>
`);
  writeFileSync(join(root, 'package.json'), JSON.stringify({
    name, version: '0.1.0', private: true, type: 'module',
    scripts: {
      dev: 'biagio dev .',
      build: 'biagio build .',
      preview: 'biagio preview .',
      doctor: 'biagio doctor .',
      analyze: 'biagio analyze .',
    },
    dependencies: { 'biagiojs': '^0.10.2' },
    devDependencies: { vite: '^6.0.0', sharp: '^0.33.0' },
  }, null, 2) + '\n');
  writeFileSync(join(root, '.gitignore'), 'node_modules\ndist\n.env\n');

  writeFileSync(join(root, 'biagio.config.js'), configSnippet(tpl, name === 'default' ? 'Il Mio Sito' : name));
  writeFileSync(join(root, 'public', '_headers'),
`# Cache biagiojs (Cloudflare Pages / Netlify)
# Le regole si cumulano su Cloudflare: ! forza Cache-Control anche con /* generico.
/img/*
  ! Cache-Control: public, max-age=31536000, immutable
/fonts/*
  ! Cache-Control: public, max-age=31536000, immutable
/islands/*
  ! Cache-Control: public, max-age=31536000, immutable
/*.css
  ! Cache-Control: public, max-age=31536000, immutable
/*.html
  Cache-Control: public, max-age=0, must-revalidate
`);
  const extras = extraFiles(tpl, name);
  const skipDefaultIndex = ['landing', 'shop'].includes(tpl);
  if (!skipDefaultIndex) {
  writeFileSync(join(root, 'pages', 'index.page.biagio'),
`<page title="Home — ${name}" description="Benvenuto sul mio sito biagiojs." sitemapPriority="1.0" />

<component id="hero" seo="1" conversion="0.8" cpu="2">
  <template>
    <section class="hero">
      <h1>Benvenuto 👋</h1>
      <p>Questo sito è generato da biagiojs: il rendering segue il valore business.</p>
    </section>
  </template>
</component>

<component id="cta" conversion="1" interaction="0.8">
  <template>
    <section style="text-align:center">
      <button class="cta" id="go">Contattami</button>
      <p id="status" class="muted"></p>
    </section>
  </template>
  <script hydrate>
    const b = el.querySelector('#go');
    el.querySelector('#status').textContent = 'isola idratata ✓';
    b.addEventListener('click', () => { b.textContent = 'Grazie! ✓'; });
  </script>
</component>

<component id="footer" conversion="0.05">
  <template><footer>Generato con biagiojs</footer></template>
</component>

<style>
  body{margin:0;font-family:system-ui,sans-serif;color:#14141f;background:#faf8f4}
  section{max-width:920px;margin:0 auto;padding:48px 24px}
  .hero{text-align:center;padding-top:96px}
  .hero h1{font-size:clamp(36px,6vw,60px);margin:0 0 12px}
  .cta{background:#ff4d5a;color:#fff;border:none;padding:16px 40px;font-size:17px;font-weight:700;border-radius:999px;cursor:pointer}
  .muted{color:#8a8a96;font-size:13px}
  footer{text-align:center;color:#8a8a96;padding:48px 24px}
</style>
`);
  }
  if (!extras['content/blog/hello.md']) {
  writeFileSync(join(root, 'content', 'blog', 'hello.md'),
`---
title: Primo post
date: 2026-07-06
draft: false
---
# Ciao

Questo post viene da una **content collection**.
`);
  }
  for (const [rel, content] of Object.entries(extras)) {
    const p = join(root, rel);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, content);
  }
  console.log(`✔ Sito creato (${tpl}) in ${root}\n  cd ${dir} && npm install && npm run dev`);
}

// ---------- entry ----------
/** dev: preferisce Vite (HMR, TS, error overlay); merge vite.config.js se presente. */
async function devVite(projectDir) {
  let vite;
  try { vite = await import('vite'); }
  catch { console.log('vite non installato (`npm i -D vite` per HMR/TS) → dev server integrato'); return false; }
  const { biagio } = await import('./vite/plugin.js');
  const root = resolve(projectDir);
  const { mergeConfig } = vite;

  const inline = {
    root,
    appType: 'custom',
    plugins: [biagio({ projectDir })],
    server: { port: 4321 },
  };

  const configCandidates = ['vite.config.js', 'vite.config.ts', 'vite.config.mjs'].map(f => join(root, f));
  const configPath = configCandidates.find(existsSync);
  let finalConfig = inline;
  if (configPath) {
    const loaded = await vite.loadConfigFromFile({ command: 'serve', mode: 'development' }, configPath, root);
    if (loaded?.config) {
      const plugins = [...(loaded.config.plugins || [])];
      if (!plugins.some(p => p?.name === 'biagiojs')) plugins.unshift(biagio({ projectDir }));
      finalConfig = mergeConfig(inline, { ...loaded.config, plugins });
    }
  }

  const server = await vite.createServer(finalConfig);
  await server.listen();
  server.printUrls();
  return true;
}

const args = process.argv.slice(2);
const flags = new Set(args.filter(a => a.startsWith('--')));
const positional = args.filter(a => !a.startsWith('--'));
const [cmd, arg1, arg2] = positional;
const buildOpts = { clean: flags.has('--clean'), dryRun: flags.has('--dryRun') || flags.has('--dry-run') };

if (cmd === 'build') await build(arg1 || '.', buildOpts);
else if (cmd === 'dev') {
  if (!await devVite(arg1 || '.')) serve(arg1 || '.', join(resolve(arg1 || '.'), 'dist'));
}
else if (cmd === 'create') {
  if (!arg1) throw new Error('Usage: biagio create <dir> [--template blog|landing|docs|shop]');
  const tplFlag = [...flags].find(f => f.startsWith('--template='));
  const template = tplFlag ? tplFlag.split('=')[1] : (positional.find((_, i) => positional[i - 1] === '--template') || 'default');
  create(arg1, { template });
}
else if (cmd === 'new') {
  const sub = arg1;
  const name = arg2;
  if (!sub || !name) throw new Error('Usage: biagio new page <route> | island <name> | collection <name> [dir]');
  const root = resolve(positional[3] || '.');
  if (sub === 'page') console.log('✔', scaffoldPage(root, name));
  else if (sub === 'island') console.log('✔', scaffoldIsland(root, name));
  else if (sub === 'collection') {
    const r = scaffoldCollection(root, name);
    console.log('✔', r.sample, r.configPath ? `+ ${r.configPath}` : '');
  } else throw new Error('Tipo sconosciuto: page | island | collection');
}
else if (cmd === 'explain') {
  const pageArg = positional[1];
  if (!pageArg) throw new Error('Usage: biagio explain <page> [dir]');
  const root = resolve(positional[2] || '.');
  const report = await explainPage(root, pageArg, { withReports: !flags.has('--no-reports') });
  console.log(formatExplainReport(report));
}
else if (cmd === 'doctor') {
  const root = resolve(arg1 || '.');
  const report = await runDoctor(root);
  console.log(formatDoctorReport(report));
  if (!report.ok) process.exit(1);
}
else if (cmd === 'analyze') {
  const root = resolve(arg1 || '.');
  const report = analyzeDist(root);
  console.log(formatAnalyzeReport(report));
  console.log(`\n→ ${report.reportPath}`);
}
else if (cmd === 'preview') {
  const root = resolve(arg1 || '.');
  const port = +(arg2 || process.env.PORT || 3000);
  const { createBiagioServer } = await import('./adapters/node.js');
  createBiagioServer(root, { compress: !flags.has('--no-compress') }).listen(port, () =>
    console.log(`\npreview → http://localhost:${port} (statico + ISR + SSR on-demand${flags.has('--no-compress') ? '' : ', gzip/br'})`));
}
else if (cmd === 'pull-vitals') {
  if (!arg1) throw new Error('Usage: biagio pull-vitals <url> [projectDir]');
  const out = await pullVitals(arg1, join(resolve(arg2 || '.'), 'reports'));
  console.log('✔ field data salvati in reports/crux.json:', JSON.stringify(out.p75));
}
else if (cmd) console.log('Usage: biagio build|dev|create|new|explain|doctor|analyze|preview|pull-vitals [args] [--clean] [--dryRun] [--template name] [--no-compress]');
