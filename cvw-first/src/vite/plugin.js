/**
 * CVW-First × Vite — plugin ufficiale.
 *
 * Dev:   middleware SSR che renderizza le pagine a ogni richiesta con
 *        ssrLoadModule (HMR dei moduli pagina/isola, TS out of the box,
 *        error overlay di Vite) + full-reload su modifica di content/reports.
 * Build: le isole in `islands/` diventano input Rollup (bundle, minify,
 *        tree-shaking); l'HTML statico resta compito di `cvw build`.
 *
 * Uso (vite.config.js nel progetto):
 *   import { cvw } from 'cvw-first/vite';
 *   export default { plugins: [cvw()] };
 */
import { join, resolve } from 'node:path';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const ASSET_TYPES = { avif: 'image/avif', webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', svg: 'image/svg+xml', js: 'text/javascript' };

export function cvw({ projectDir = '.' } = {}) {
  const root = resolve(projectDir);
  let framework; // caricato lazy dal server Vite per avere HMR anche sul framework

  return {
    name: 'cvw-first',

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
      // §9 in dev: processa le immagini una volta all'avvio (e al cambio di images/)
      const runImages = async () => {
        try {
          const { processImages } = await import('../core/image-pipeline.js');
          const r = await processImages(join(root, 'images'), join(root, 'dist', 'img'));
          if (!r.skipped) console.log(`[cvw] images: ${r.processed} varianti generate`);
        } catch (e) { console.warn('[cvw] images:', e.message); }
      };
      await runImages();
      server.watcher.add(join(root, 'images'));
      server.watcher.on('change', f => { if (f.includes('images')) runImages(); });

      // servi /img/ e /islands/ da dist/ (Vite non li conosce: li genera cvw)
      server.middlewares.use((req, res, next) => {
        const url = decodeURIComponent((req.url || '').split('?')[0]);
        if (!url.startsWith('/img/') && !url.startsWith('/islands/')) return next();
        // isole: servite dai sorgenti in dev (islands/x.js), immagini da dist/img
        const path = url.startsWith('/islands/') ? join(root, url) : join(root, 'dist', url);
        if (!existsSync(path)) return next();
        res.setHeader('content-type', ASSET_TYPES[url.split('.').pop()] || 'application/octet-stream');
        res.end(readFileSync(path));
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
          // sia quando cvw-first è installato in node_modules.
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
