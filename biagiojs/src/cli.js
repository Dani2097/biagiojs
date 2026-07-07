#!/usr/bin/env node
/**
 * biagiojs CLI.
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
import { readdirSync, mkdirSync, writeFileSync, existsSync, readFileSync, watch, statSync, rmSync } from 'node:fs';
import { join, resolve, relative, sep } from 'node:path';
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
} = {}) {
  const t0 = Date.now();
  const root = resolve(projectDir);
  const pagesDir = join(root, 'pages');
  const dist = join(root, 'dist');
  mkdirSync(dist, { recursive: true });
  const log = quiet ? () => {} : console.log;

  if (!overlayDefault) await loadEnv(root, 'production');
  const config = await loadConfig(root);
  const { site, images, fonts, optimize: optimizeOpts, hooks, cache } = config;
  const fontsDir = join(root, 'fonts');
  const imgOutDir = join(dist, 'img');
  const imageDryRun = dryRun || images.dryRun;

  if (clean && existsSync(imgOutDir)) {
    rmSync(imgOutDir, { recursive: true, force: true });
    log('  clean: dist/img/ rimosso');
  }

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
  const builtHtml = [];
  const pageFiles = walkPages(pagesDir);

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

    const routeBase = file.replace(/\.page\.(js|ts|biagio)$/, '');
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
      throw new Error(`[biagio] ${missing.length} immagine/i referenziate ma assenti in dist/img/:\n${detail}${missing.length > 5 ? '\n  …' : ''}`);
    }
  }

  // Subset font dopo il render: usa HTML output + sorgenti (opt-in)
  if (fonts.subset && existsSync(fontsDir) && readdirSync(fontsDir).some(f => f.endsWith('.woff2'))) {
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

  if (existsSync(fontsDir)) {
    cpSync(fontsDir, join(dist, 'fonts'), { recursive: true, force: true });
    log('  fonts/ → dist/fonts/');
  }

  if (cache && cache !== false) {
    const headersPath = join(dist, '_headers');
    const generated = generateHeaders(typeof cache === 'object' ? cache : {});
    writeFileSync(headersPath, generated);
    log('  cache: _headers generato in dist/');
  }

  const sitemapFile = (site.sitemap || 'sitemap.xml').replace(/^\//, '');
  writeFileSync(join(dist, sitemapFile), sitemap(site, builtPages));
  writeFileSync(join(dist, 'robots.txt'), robots(site));
  log(`\n✔ ${builtPages.length} page(s) + ${sitemapFile} + robots in ${Date.now() - t0}ms → ${dist}`);
  return dist;
}

// ---------- dev server con watch + live reload (SSE) ----------
const RELOAD_SNIPPET = `<script>new EventSource('/__cvw').addEventListener('reload',()=>location.reload());</script>`;

/** Error overlay del dev server integrato (stile Vite, zero dipendenze). */
function errorPage(err) {
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return `<!doctype html><html><head><meta charset="utf-8"><title>biagio — build error</title></head>
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

  // watch: pages/, content/, images/, reports/, biagio.config.js
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

  mkdirSync(join(root, 'public'), { recursive: true });
  writeFileSync(join(root, 'package.json'), JSON.stringify({
    name, version: '0.1.0', private: true, type: 'module',
    scripts: {
      dev: 'biagio dev .',
      build: 'biagio build .',
      preview: 'node node_modules/biagiojs/src/adapters/node.js . 3000',
    },
    dependencies: { 'biagiojs': '^0.9.0' },
    devDependencies: { vite: '^6.0.0', sharp: '^0.33.0' },
  }, null, 2) + '\n');
  writeFileSync(join(root, '.gitignore'), 'node_modules\ndist\n.env\n');

  writeFileSync(join(root, 'biagio.config.js'),
`export default {
  site: {
    name: 'Il Mio Sito',
    baseUrl: 'https://example.com',
    description: 'Creato con biagiojs',
    images: { widths: [480, 960, 1440], quality: 75 },
    // bySlug: { hero: [480, 960, 1440, 1920] },
    // profiles: { hero: { widths: [480, 960, 1920], sizes: '100vw' } },
    // Immagini remote (pre-build → images/ → pipeline sharp):
    // remote: {
    //   allowedDomains: ['supabase.co', 'cdn.example.com'],
    //   sources: [
    //     { url: 'https://xxx.supabase.co/storage/v1/object/public/bucket/hero.jpg', slug: 'hero' },
    //   ],
    // },
  },
};
`);
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
else if (cmd === 'dev') { if (!await devVite(arg1 || '.')) serve(arg1 || '.', await build(arg1 || '.', { overlay: true, ...buildOpts })); }
else if (cmd === 'create') { if (!arg1) throw new Error('Usage: biagio create <dir>'); create(arg1); }
else if (cmd === 'pull-vitals') {
  if (!arg1) throw new Error('Usage: biagio pull-vitals <url> [projectDir]');
  const out = await pullVitals(arg1, join(resolve(arg2 || '.'), 'reports'));
  console.log('✔ field data salvati in reports/crux.json:', JSON.stringify(out.p75));
}
else if (cmd) console.log('Usage: biagio build|dev|create|pull-vitals [args] [--clean] [--dryRun]');
