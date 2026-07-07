/**
 * biagiojs — Adapter Node (SSR on-demand in produzione).
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { renderRequest, matchRoute } from '../server-render.js';
import { pathToFileURL } from 'node:url';
import { maybeCompress } from '../core/compress.js';

const TYPES = { html: 'text/html', xml: 'application/xml', txt: 'text/plain', js: 'text/javascript', css: 'text/css', json: 'application/json', avif: 'image/avif', webp: 'image/webp', jpg: 'image/jpeg', png: 'image/png', svg: 'image/svg+xml', woff2: 'font/woff2' };

async function dynamicRoutes(root) {
  const dyn = new Set();
  const pagesDir = join(root, 'pages');
  if (!existsSync(pagesDir)) return dyn;
  const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? walk(join(dir, e.name)) : /\.page\.(js|ts)$/.test(e.name) ? [join(dir, e.name)] : []);
  for (const f of walk(pagesDir)) {
    const mod = await import(pathToFileURL(f).href);
    if (mod.prerender === false) dyn.add(f);
  }
  return dyn;
}

function send(res, req, body, { contentType, cacheControl, compress }) {
  const raw = Buffer.isBuffer(body) ? body : Buffer.from(body);
  if (compress) {
    const { body: out, encoding } = maybeCompress(res, raw, req, contentType);
    const headers = { 'content-type': contentType };
    if (cacheControl) headers['cache-control'] = cacheControl;
    if (encoding) headers['content-encoding'] = encoding;
    res.writeHead(200, headers);
    return res.end(out);
  }
  res.writeHead(200, { 'content-type': contentType, ...(cacheControl ? { 'cache-control': cacheControl } : {}) });
  res.end(raw);
}

export function createBiagioServer(projectDir, { userIdFromRequest, compress = true } = {}) {
  const root = resolve(projectDir);
  const dist = join(root, 'dist');
  const dynPromise = dynamicRoutes(root);
  const isrCache = new Map();

  return createServer(async (req, res) => {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    const dyn = await dynPromise;

    try {
      if (url.includes('.')) {
        const p = join(dist, url);
        if (existsSync(p)) {
          const ct = TYPES[p.split('.').pop()] || 'application/octet-stream';
          return send(res, req, readFileSync(p), { contentType: ct, cacheControl: 'public, max-age=31536000, immutable', compress });
        }
        res.writeHead(404); return res.end('404');
      }

      const match = matchRoute(join(root, 'pages'), url);
      const isDynamic = match && dyn.has(join(root, 'pages', ...match.file.split('/')));

      if (!isDynamic) {
        const staticFile = join(dist, url === '/' ? '' : url, 'index.html');
        if (existsSync(staticFile)) {
          return send(res, req, readFileSync(staticFile), { contentType: 'text/html', cacheControl: 'public, max-age=60', compress });
        }
      }

      const cached = isrCache.get(url);
      if (cached && Date.now() < cached.until) {
        res.writeHead(200, { 'content-type': 'text/html', 'x-biagio-cache': 'hit' });
        return res.end(cached.html);
      }
      const query = Object.fromEntries(new URL(req.url, 'http://x').searchParams);
      const userId = userIdFromRequest?.(req) || req.headers['x-user-id'] || 'anonymous';
      const meta = {};
      const html = await renderRequest(root, url, { request: { query, headers: req.headers, method: req.method }, userId, meta });
      if (html === null) { res.writeHead(404, { 'content-type': 'text/html' }); return res.end('<h1>404</h1>'); }
      if (meta.revalidate) isrCache.set(url, { html, until: Date.now() + meta.revalidate * 1000 });
      const cc = isDynamic ? (meta.revalidate ? `public, max-age=${meta.revalidate}` : 'no-store') : 'public, max-age=60';
      return send(res, req, html, { contentType: 'text/html; charset=utf-8', cacheControl: cc, compress });
    } catch (e) {
      console.error('[biagio:node]', e);
      res.writeHead(500, { 'content-type': 'text/plain' });
      res.end('500 Internal Server Error');
    }
  });
}

/** @deprecated Usa createBiagioServer */
export const createCvwServer = createBiagioServer;

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const [dir = '.', port = 3000] = process.argv.slice(2);
  createBiagioServer(dir).listen(+port, () => console.log(`biagio node adapter → http://localhost:${port} (statico + SSR on-demand)`));
}
