/**
 * biagiojs — Adapter Node (SSR on-demand in produzione).
 *
 * Strategia ibrida, pensata per e-commerce:
 *   1. se esiste dist/<url>/index.html → serve lo statico (veloce, CDN-friendly)
 *   2. altrimenti renderizza on-demand la pagina corrispondente
 *      (pagine con `export const prerender = false` sono SEMPRE dinamiche:
 *       prezzi, stock, carrello, contenuto per-utente)
 *
 * Uso:
 *   import { createBiagioServer } from 'biagiojs/adapters/node';
 *   createBiagioServer('demo').listen(3000);
 * oppure: node src/adapters/node.js <projectDir> [port]
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { renderRequest, matchRoute } from '../server-render.js';
import { pathToFileURL } from 'node:url';

const TYPES = { html: 'text/html', xml: 'application/xml', txt: 'text/plain', js: 'text/javascript', css: 'text/css', json: 'application/json', avif: 'image/avif', webp: 'image/webp', jpg: 'image/jpeg', png: 'image/png', svg: 'image/svg+xml', woff2: 'font/woff2' };

/** Precarica l'elenco delle pagine dinamiche (prerender=false). */
async function dynamicRoutes(root) {
  const dyn = new Set();
  const pagesDir = join(root, 'pages');
  if (!existsSync(pagesDir)) return dyn;
  const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.page.js') ? [join(dir, e.name)] : []);
  for (const f of walk(pagesDir)) {
    const mod = await import(pathToFileURL(f).href);
    if (mod.prerender === false) dyn.add(f);
  }
  return dyn;
}

export function createBiagioServer(projectDir, { userIdFromRequest } = {}) {
  const root = resolve(projectDir);
  const dist = join(root, 'dist');
  const dynPromise = dynamicRoutes(root);
  const isrCache = new Map();   // ISR in-memory: url → { html, until }

  return createServer(async (req, res) => {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    const dyn = await dynPromise;

    try {
      // asset statici
      if (url.includes('.')) {
        const p = join(dist, url);
        if (existsSync(p)) {
          res.writeHead(200, { 'content-type': TYPES[p.split('.').pop()] || 'application/octet-stream', 'cache-control': 'public, max-age=31536000, immutable' });
          return res.end(readFileSync(p));
        }
        res.writeHead(404); return res.end('404');
      }

      // pagina dinamica? bypassa lo statico
      const match = matchRoute(join(root, 'pages'), url);
      const isDynamic = match && dyn.has(join(root, 'pages', ...match.file.split('/')));

      if (!isDynamic) {
        const staticFile = join(dist, url === '/' ? '' : url, 'index.html');
        if (existsSync(staticFile)) {
          res.writeHead(200, { 'content-type': 'text/html', 'cache-control': 'public, max-age=60' });
          return res.end(readFileSync(staticFile));
        }
      }

      // SSR on-demand (con micro-cache ISR se la pagina esporta `revalidate`)
      const cached = isrCache.get(url);
      if (cached && Date.now() < cached.until) {
        res.writeHead(200, { 'content-type': 'text/html', 'x-cvw-cache': 'hit' });
        return res.end(cached.html);
      }
      const query = Object.fromEntries(new URL(req.url, 'http://x').searchParams);
      const userId = userIdFromRequest?.(req) || req.headers['x-user-id'] || 'anonymous';
      const meta = {};
      const html = await renderRequest(root, url, { request: { query, headers: req.headers, method: req.method }, userId, meta });
      if (html === null) { res.writeHead(404, { 'content-type': 'text/html' }); return res.end('<h1>404</h1>'); }
      if (meta.revalidate) isrCache.set(url, { html, until: Date.now() + meta.revalidate * 1000 });
      res.writeHead(200, { 'content-type': 'text/html', 'cache-control': isDynamic ? (meta.revalidate ? `public, max-age=${meta.revalidate}` : 'no-store') : 'public, max-age=60' });
      res.end(html);
    } catch (e) {
      console.error('[biagio:node]', e);
      res.writeHead(500, { 'content-type': 'text/plain' });
      res.end('500 Internal Server Error');
    }
  });
}

/** @deprecated Usa createBiagioServer */
export const createCvwServer = createBiagioServer;

// entry diretto: node src/adapters/node.js demo 3000
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const [dir = '.', port = 3000] = process.argv.slice(2);
  createBiagioServer(dir).listen(+port, () => console.log(`biagio node adapter → http://localhost:${port} (statico + SSR on-demand)`));
}
