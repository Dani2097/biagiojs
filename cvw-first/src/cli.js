#!/usr/bin/env node
/**
 * CVW-First CLI.
 *
 *   node src/cli.js build [dir]            → pages/*.page.js → dist/
 *   node src/cli.js dev [dir]              → build + watch + live reload :4321
 *   node src/cli.js create <dir>           → scaffolding nuovo sito
 *   node src/cli.js pull-vitals <url> [dir]→ field data reali → reports/crux.json
 *
 * Routing:
 *   pages/index.page.js        → /
 *   pages/about.page.js        → /about/
 *   pages/blog/[slug].page.js  → una route per ogni entry di getStaticPaths()
 *     export function getStaticPaths(ctx) { return [{ params:{slug:'x'}, props:{...} }]; }
 *     export default (ctx) => ({...})   // ctx.params, ctx.props disponibili
 */
import { readdirSync, mkdirSync, writeFileSync, existsSync, readFileSync, watch, statSync } from 'node:fs';
import { join, resolve, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createServer } from 'node:http';
import { renderPage } from './ssr.js';
import { sitemap, robots } from './core/seo.js';
import { loadReports, optimize } from './core/optimizer.js';
import { ExperimentEngine } from './core/experiments.js';
import { renderOrder, hydrationPlan } from './core/scheduler.js';
import { processImages } from './core/image-pipeline.js';
import { getCollection } from './core/content.js';
import { pullVitals } from './core/psi.js';
import { loadCvwFile } from './compiler.js';
import { loadLocale, makeT, localePath } from './core/i18n.js';
import { cpSync } from 'node:fs';
import { optimizeHtml } from './core/minify.js';

function walkPages(dir, base = dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walkPages(p, base));
    else if (/\.page\.(js|ts|cvw)$/.test(e.name)) out.push(relative(base, p).split(sep).join('/'));
  }
  return out;
}

export async function build(projectDir, { userId = 'build-preview', quiet = false, overlay: overlayDefault = false } = {}) {
  const t0 = Date.now();
  const root = resolve(projectDir);
  const pagesDir = join(root, 'pages');
  const dist = join(root, 'dist');
  mkdirSync(dist, { recursive: true });
  const log = quiet ? () => {} : console.log;

  const configPath = join(root, 'cvw.config.js');
  const site = existsSync(configPath)
    ? (await import(pathToFileURL(configPath).href + '?t=' + Date.now())).default.site
    : { name: 'CVW Site', baseUrl: 'https://example.com' };

  // §9 — pipeline immagini reale
  const img = await processImages(join(root, 'images'), join(dist, 'img'));
  for (const line of img.log) log('  images:', line);

  // public/ → dist/ così com'è (favicon, fonts, file di verifica, _headers, ecc.)
  if (existsSync(join(root, 'public'))) {
    cpSync(join(root, 'public'), dist, { recursive: true, force: true });
    log('  public/ → dist/');
  }

  // isole → dist/islands/ minificate (esbuild se presente) + sorgenti per l'inline
  let esbuild = null;
  try { esbuild = await import('esbuild'); } catch {}
  const islandSources = {};
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

  const reports = loadReports(join(root, 'reports'));
  const builtPages = [];
  const pageFiles = walkPages(pagesDir);

  // TypeScript nei template: se ci sono .page.ts, la build passa da Vite (transpile SSR)
  let viteServer = null;
  if (pageFiles.some(f => f.endsWith('.page.ts'))) {
    try {
      const vite = await import('vite');
      viteServer = await vite.createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true } });
    } catch {
      throw new Error('[cvw] Hai pagine .page.ts: serve vite per compilarle (`npm i -D vite`)');
    }
  }

  for (const file of pageFiles) {
    let mod;
    try {
      mod = file.endsWith('.cvw')
        ? loadCvwFile(join(pagesDir, file))
        : file.endsWith('.ts')
          ? await viteServer.ssrLoadModule(join(pagesDir, file))
          : await import(pathToFileURL(join(pagesDir, file)).href + '?t=' + Date.now());
    }
    catch (e) { throw new Error(`[cvw] Errore in pages/${file}:\n  ${e.message}`); }

    if (mod.prerender === false) { log(`  skip ${file}: prerender=false → servita on-demand dall'adapter`); continue; }

    const routeBase = file.replace(/\.page\.(js|ts|cvw)$/, '');
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
      if (!mod.getStaticPaths) throw new Error(`[cvw] pages/${file} è dinamica ma non esporta getStaticPaths()`);
      variants = await mod.getStaticPaths(baseCtx);
      if (!variants?.length) { log(`  skip ${file}: getStaticPaths() vuoto`); continue; }
    }

    for (const v of variants) {
      const ctx = { ...baseCtx, params: v.params || {}, props: v.props || {} };
      let def;
      try { def = await mod.default(ctx); }
      catch (e) { throw new Error(`[cvw] Errore renderizzando pages/${file} (params=${JSON.stringify(v.params)}, locale=${locale}):\n  ${e.message}`); }

      // overlay: la pagina può forzarlo; altrimenti build prod = OFF, dev = ON
      const { graph, page, assets = [], experiments = null, head = '', overlay = overlayDefault } = def;
      const { thresholds, log: optLog } = optimize(graph, localeReports);

      let route = routeBase.replace(/\[(\w+)\]/g, (_, k) => ctx.params[k]);
      page.basePath = page.basePath || (route === 'index' ? '/' : `/${route}/`);
      page.locale = locale || undefined;
      page.path = localePath(page.basePath, locale, defaultLocale);
      if (locale && locale !== defaultLocale) route = route === 'index' ? locale : `${locale}/${route}`;

      let html = renderPage(graph, { title: page.title, head, overlay, site, page, assets, experiments, thresholds, islandSources });
      // ottimizzazione output: purge CSS + minify (solo build prod, non in dev)
      let saved = 0;
      if (!overlayDefault) ({ html, saved } = await optimizeHtml(html));
      const outDir = route === 'index' ? dist : join(dist, route);
      mkdirSync(outDir, { recursive: true });
      writeFileSync(join(outDir, 'index.html'), html);
      builtPages.push(page);

      log(`\n▸ ${page.path}${saved > 0 ? ` (−${(saved / 1024).toFixed(1)} KB: purge+minify)` : ''}`);
      log('  render order:', renderOrder(graph).map(n => n.id).join(' → '));
      const plan = hydrationPlan(graph, thresholds);
      log('  hydration:', ['eager', 'lazy', 'static'].map(k => `${k}=[${plan[k].map(x => x.node.id)}]`).join(' '));
      for (const line of optLog) log('  optimizer:', line);
    }
    }  // fine loop locales
  }

  if (viteServer) await viteServer.close();
  writeFileSync(join(dist, 'sitemap.xml'), sitemap(site, builtPages));
  writeFileSync(join(dist, 'robots.txt'), robots(site));
  log(`\n✔ ${builtPages.length} page(s) + sitemap + robots in ${Date.now() - t0}ms → ${dist}`);
  return dist;
}

// ---------- dev server con watch + live reload (SSE) ----------
const RELOAD_SNIPPET = `<script>new EventSource('/__cvw').addEventListener('reload',()=>location.reload());</script>`;

/** Error overlay del dev server integrato (stile Vite, zero dipendenze). */
function errorPage(err) {
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return `<!doctype html><html><head><meta charset="utf-8"><title>cvw — build error</title></head>
<body style="margin:0;background:#14141f;color:#eee;font:14px/1.6 ui-monospace,monospace;padding:40px">
<div style="max-width:880px;margin:0 auto">
<div style="color:#ff6b6b;font-size:18px;font-weight:700;margin-bottom:8px">✖ Errore di build</div>
<pre style="background:#1e1e2e;border:1px solid #3a3a52;border-radius:10px;padding:20px;white-space:pre-wrap;color:#ffb3b3">${esc(err.message)}</pre>
${err.stack ? `<details style="margin-top:12px"><summary style="cursor:pointer;color:#8a8a96">stack trace</summary><pre style="color:#8a8a96;white-space:pre-wrap;font-size:12px">${esc(err.stack)}</pre></details>` : ''}
<p style="color:#8a8a96">Correggi il file e salva: la pagina si ricarica da sola.</p>
</div>${RELOAD_SNIPPET}</body></html>`;
}

export function serve(projectDir, dist, port = 4321) {
  const types = { html: 'text/html', xml: 'application/xml', txt: 'text/plain', js: 'text/javascript', css: 'text/css', avif: 'image/avif', webp: 'image/webp', jpg: 'image/jpeg', png: 'image/png', svg: 'image/svg+xml' };
  const clients = new Set();
  let lastError = null;   // errore dell'ultima rebuild → overlay

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

  // watch: pages/, content/, images/, reports/, cvw.config.js
  let timer = null;
  const rebuild = () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        await build(projectDir, { quiet: true, overlay: true });
        lastError = null;
        console.log('↻ rebuilt', new Date().toLocaleTimeString());
      } catch (e) {
        lastError = e;
        console.error('✖', e.message);
      }
      for (const c of clients) c.write('event: reload\ndata: 1\n\n');
    }, 120);
  };
  for (const sub of ['pages', 'content', 'images', 'reports', '.']) {
    const d = sub === '.' ? projectDir : join(projectDir, sub);
    if (existsSync(d) && statSync(d).isDirectory()) {
      try { watch(d, { recursive: true }, (_, f) => { if (f && !f.includes('dist')) rebuild(); }); }
      catch { watch(d, () => rebuild()); }
    }
  }
}

// ---------- scaffolding ----------
export function create(dir) {
  const root = resolve(dir);
  const name = root.split(/[\\/]/).pop().toLowerCase().replace(/[^a-z0-9-]/g, '-');
  mkdirSync(join(root, 'pages'), { recursive: true });
  mkdirSync(join(root, 'content', 'blog'), { recursive: true });
  mkdirSync(join(root, 'images'), { recursive: true });
  mkdirSync(join(root, 'reports'), { recursive: true });
  mkdirSync(join(root, 'islands'), { recursive: true });

  writeFileSync(join(root, 'package.json'), JSON.stringify({
    name, version: '0.1.0', private: true, type: 'module',
    scripts: {
      dev: 'cvw dev .',
      build: 'cvw build .',
      preview: 'node node_modules/cvw-first/src/adapters/node.js . 3000',
    },
    dependencies: { 'cvw-first': '^0.2.0' },
    devDependencies: { vite: '^6.0.0' },
  }, null, 2) + '\n');
  writeFileSync(join(root, '.gitignore'), 'node_modules\ndist\n');

  writeFileSync(join(root, 'cvw.config.js'),
`export default {
  site: { name: 'Il Mio Sito', baseUrl: 'https://example.com', description: 'Creato con CVW-First' },
};
`);
  writeFileSync(join(root, 'pages', 'index.page.cvw'),
`<page title="Home — ${name}" description="Benvenuto sul mio sito CVW-First." sitemapPriority="1.0" />

<component id="hero" seo="1" conversion="0.8" cpu="2">
  <template>
    <section class="hero">
      <h1>Benvenuto 👋</h1>
      <p>Questo sito è generato da CVW-First: il rendering segue il valore business.</p>
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
  <template><footer>Generato con CVW-First</footer></template>
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
  writeFileSync(join(root, 'content', 'blog', 'hello.md'),
`---
title: Primo post
date: 2026-07-06
---
# Ciao

Questo post viene da una **content collection**.
`);
  console.log(`✔ Sito creato in ${root}\n  cd ${dir} && npm install && npm run dev`);
}

// ---------- entry ----------
/** dev: preferisce Vite (HMR, TS, error overlay); fallback al server integrato. */
async function devVite(projectDir) {
  let vite;
  try { vite = await import('vite'); }
  catch { console.log('vite non installato (`npm i -D vite` per HMR/TS) → dev server integrato'); return false; }
  const { cvw } = await import('./vite/plugin.js');
  const server = await vite.createServer({
    root: resolve(projectDir),
    appType: 'custom',
    plugins: [cvw({ projectDir })],
    server: { port: 4321 },
  });
  await server.listen();
  server.printUrls();
  return true;
}

const [cmd, arg1, arg2] = process.argv.slice(2);
if (cmd === 'build') await build(arg1 || '.');
else if (cmd === 'dev') { if (!await devVite(arg1 || '.')) serve(arg1 || '.', await build(arg1 || '.', { overlay: true })); }
else if (cmd === 'create') { if (!arg1) throw new Error('Usage: cvw create <dir>'); create(arg1); }
else if (cmd === 'pull-vitals') {
  if (!arg1) throw new Error('Usage: cvw pull-vitals <url> [projectDir]');
  const out = await pullVitals(arg1, join(resolve(arg2 || '.'), 'reports'));
  console.log('✔ field data salvati in reports/crux.json:', JSON.stringify(out.p75));
}
else if (cmd) console.log('Usage: cvw build|dev|create|pull-vitals [args]');
