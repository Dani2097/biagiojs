/**
 * biagiojs × Vite — plugin ufficiale.
 *
 * Dev:   middleware SSR che renderizza le pagine a ogni richiesta con
 *        ssrLoadModule (HMR dei moduli pagina/isola, TS out of the box,
 *        error overlay di Vite) + full-reload su modifica di content/reports.
 * Build: le isole in `islands/` diventano input Rollup (bundle, minify,
 *        tree-shaking); l'HTML statico resta compito di `biagio build`.
 *
 * Uso (vite.config.js nel progetto):
 *   import { biagio } from 'biagiojs/vite';
 *   export default { plugins: [biagio()] };
 */
import { join, resolve } from 'node:path';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const ASSET_TYPES = { avif: 'image/avif', webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', svg: 'image/svg+xml', js: 'text/javascript', css: 'text/css', woff2: 'font/woff2' };

export function biagio({ projectDir = '.' } = {}) {
  const root = resolve(projectDir);
  let framework; // caricato lazy dal server Vite per avere HMR anche sul framework

  return {
    name: 'biagiojs',

    // Build client: ogni file in islands/ è un entry point bundlato
    config(cfg, { command }) {
      if (command !== 'build') return;
      const islandsDir = join(root, 'islands');
      const input = {};
      if (existsSync(islandsDir)) {
        for (const f of readdirSync(islandsDir).filter(f => /\.(js|jsx|ts|tsx)$/.test(f))) {
          input['islands/' + f.replace(/\.(jsx|tsx|ts)$/, '')] = join(islandsDir, f);
        }
      }
      return {
        build: {
          outDir: join(root, 'dist'),
          emptyOutDir: false,
          rollupOptions: { input, output: { entryFileNames: '[name].js', format: 'es' } },
        },
      };
    },

    async configureServer(server) {
      const root = resolve(projectDir);
      const { loadConfig } = await import('../core/config.js');
      const { images, fonts } = await loadConfig(root);
      const fontsDir = join(root, 'fonts');
      const runFonts = async () => {
        try {
          if (!fonts.google?.length) return;
          const { fetchGoogleFonts } = await import('../core/fonts.js');
          const { writeFileSync } = await import('node:fs');
          const gf = await fetchGoogleFonts(fonts.google, fontsDir, {
            allowedDomains: fonts.allowedDomains,
            cssFilename: fonts.cssPath?.split('/').pop() || 'google.css',
          });
          if (gf.preloadFiles?.length) {
            writeFileSync(join(fontsDir, '.biagio-manifest.json'), JSON.stringify({ preloadFiles: gf.preloadFiles }, null, 2));
          }
          if (gf.files.length) console.log(`[biagio] fonts: ${gf.files.length} woff2 self-hosted`);
        } catch (e) { console.warn('[biagio] fonts:', e.message); }
      };
      // §9 in dev: processa immagini e font all'avvio
      const imagesDir = join(root, 'images');
      const runImages = async () => {
        try {
          const { processImages } = await import('../core/image-pipeline.js');
          const { fetchRemoteImages } = await import('../core/remote-images.js');
          if (images.remote?.sources?.length) {
            await fetchRemoteImages(images.remote.sources, imagesDir, {
              allowedDomains: images.remote.allowedDomains,
              allowLocalhost: images.remote.allowLocalhost,
            });
          }
          const r = await processImages(imagesDir, join(root, 'dist', 'img'), { ...images, strict: false });
          if (!r.skipped) console.log(`[biagio] images: ${r.processed} varianti generate`);
        } catch (e) { console.warn('[biagio] images:', e.message); }
      };
      await runFonts();
      await runImages();
      server.watcher.add(join(root, 'images'));
      server.watcher.on('change', f => { if (f.includes('images')) runImages(); });

      // servi /img/, /fonts/ e /islands/ — isole via Vite per HMR granulare
      server.middlewares.use(async (req, res, next) => {
        const url = decodeURIComponent((req.url || '').split('?')[0]);
        if (!url.startsWith('/img/') && !url.startsWith('/islands/') && !url.startsWith('/fonts/')) return next();
        if (url.startsWith('/islands/')) {
          try {
            const result = await server.transformRequest(url);
            if (result) {
              res.setHeader('content-type', 'text/javascript');
              return res.end(result.code);
            }
          } catch { /* fallback file statico */ }
        }
        const path = url.startsWith('/islands/')
          ? join(root, url)
          : url.startsWith('/fonts/')
            ? join(root, 'fonts', url.slice('/fonts/'.length))
            : join(root, 'dist', url);
        if (!existsSync(path)) return next();
        res.setHeader('content-type', ASSET_TYPES[url.split('.').pop()] || 'application/octet-stream');
        res.end(readFileSync(path));
      });

      server.watcher.add(join(root, 'islands'));
      server.watcher.on('change', file => {
        if (!file.replace(/\\/g, '/').includes('/islands/')) return;
        const mods = server.moduleGraph.getModulesByFile(file);
        if (mods) for (const m of mods) server.moduleGraph.invalidateModule(m);
      });

      // full reload quando cambiano contenuti o report (non moduli JS)
      server.watcher.add([join(root, 'content'), join(root, 'reports')]);
      server.watcher.on('change', file => {
        if (file.includes('content') || file.includes('reports') || file.endsWith('.md')) {
          server.ws.send({ type: 'full-reload' });
        }
      });

      // middleware SSR: URL → pagina → HTML
      server.middlewares.use(async (req, res, next) => {
        const url = (req.url || '/').split('?')[0];
        if (url.includes('.') || url.startsWith('/@') || url.startsWith('/islands/')) return next();

        try {
          // Risolto rispetto al plugin stesso: funziona sia nel repo
          // sia quando biagiojs è installato in node_modules.
          const rendererUrl = new URL('../server-render.js', import.meta.url).href;
          const { renderRequest } = await server.ssrLoadModule(rendererUrl)
            .catch(() => import(rendererUrl));

          const html = await renderRequest(root, url, {
            loadModule: id => server.ssrLoadModule(id),
            dev: true,
          });
          if (html === null) return next();
          res.setHeader('content-type', 'text/html');
          res.end(await server.transformIndexHtml(url, html));
        } catch (e) {
          server.ssrFixStacktrace?.(e);
          next(e); // → error overlay di Vite
        }
      });
    },
  };
}
