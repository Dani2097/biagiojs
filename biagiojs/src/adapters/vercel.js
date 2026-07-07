/**
 * biagiojs — Adapter Vercel (SSR on-demand su serverless function).
 *
 * Le pagine statiche le serve la CDN di Vercel da dist/; questa function
 * gestisce SOLO le pagine `prerender = false` (e i 404 dinamici).
 *
 * Setup nel progetto del sito:
 *
 * 1. `api/ssr.js`:
 *      import { createHandler } from 'biagiojs/adapters/vercel';
 *      export default createHandler();          // projectDir = root del repo
 *
 * 2. `vercel.json`:
 *      {
 *        "buildCommand": "biagio build .",
 *        "outputDirectory": "dist",
 *        "rewrites": [{ "source": "/(.*)", "destination": "/api/ssr" }]
 *      }
 *    Le rewrites scattano solo se il file statico NON esiste in dist/
 *    (Vercel prova prima il filesystem), quindi le pagine prerenderizzate
 *    restano su CDN e qui arrivano solo le richieste dinamiche.
 *
 * Nota: richiede il runtime Node (default per le functions JS). Le pagine
 * .page.ts non sono supportate in runtime serverless: usa .page.js/.biagio
 * per le pagine dinamiche, o precompila.
 */
import { renderRequest } from '../server-render.js';

export function createHandler(projectDir = process.cwd(), { userIdFromRequest } = {}) {
  return async function handler(req, res) {
    try {
      const url = decodeURIComponent((req.url || '/').split('?')[0]);
      const query = Object.fromEntries(new URL(req.url || '/', 'http://x').searchParams);
      const userId = userIdFromRequest?.(req)
        || req.headers['x-user-id']
        || req.headers['x-vercel-id']   // fallback: id richiesta Vercel
        || 'anonymous';

      const meta = {};
      const html = await renderRequest(projectDir, url, {
        request: { query, headers: req.headers, method: req.method },
        userId, meta,
      });

      if (html === null) {
        res.statusCode = 404;
        res.setHeader('content-type', 'text/html; charset=utf-8');
        return res.end('<h1>404</h1>');
      }
      res.statusCode = 200;
      res.setHeader('content-type', 'text/html; charset=utf-8');
      // ISR: con `export const revalidate = N` la CDN di Vercel cachea la pagina
      // e la rigenera in background (stale-while-revalidate). Senza: mai in cache.
      res.setHeader('cache-control', meta.revalidate
        ? `s-maxage=${meta.revalidate}, stale-while-revalidate=${meta.revalidate * 10}`
        : 'no-store');
      res.end(html);
    } catch (e) {
      console.error('[biagio:vercel]', e);
      res.statusCode = 500;
      res.setHeader('content-type', 'text/plain');
      res.end('500 Internal Server Error');
    }
  };
}

export default createHandler;
