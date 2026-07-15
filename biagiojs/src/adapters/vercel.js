/**
 * biagiojs — Adapter Vercel (SSR on-demand su serverless function).
 *
 * Le pagine statiche le serve la CDN di Vercel da dist/; questa function
 * gestisce le pagine ISR (`revalidate`) e SSR (`prerender = false`).
 *
 * Setup (preset `site.deploy: 'vercel'`):
 *
 * 1. `biagio build` stages `pages/` → `api/_runtime/` automatically.
 * 2. `api/ssr.js`:
 *      import { createVercelHandler } from 'biagiojs/adapters/vercel';
 *      export default createVercelHandler(import.meta.url);
 * 3. `vercel.json` — rewrites + `includeFiles: "api/_runtime/**"`.
 *
 * Le rewrites scattano solo se il file statico NON esiste in dist/.
 * Con `site.deploy`, le pagine ISR non vengono scritte in dist/.
 */
import { renderRequest } from '../server-render.js';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

/** Project root when the handler file lives at `api/ssr.js`. */
export function projectDirFromApi(metaUrl) {
  return join(dirname(fileURLToPath(metaUrl)), '..');
}

/** Prefer api/_runtime (staged at build); fall back to repo root. */
export function stagedProjectDir(metaUrl) {
  const apiDir = dirname(fileURLToPath(metaUrl));
  const staged = join(apiDir, '_runtime');
  if (existsSync(join(staged, 'pages'))) return staged;
  return resolveProjectRoot(join(apiDir, '..'), process.cwd());
}

/** Walk up from candidate dirs until `pages/` exists. */
export function resolveProjectRoot(...candidates) {
  const seen = new Set();
  for (const start of candidates) {
    if (!start) continue;
    let dir = resolve(start);
    for (let i = 0; i < 8; i++) {
      if (seen.has(dir)) break;
      seen.add(dir);
      if (existsSync(join(dir, 'pages'))) return dir;
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  return resolve(candidates.find(Boolean) || process.cwd());
}

/** @param {import('node:http').IncomingMessage} req */
export function resolveRequestUrl(req) {
  const fromHeader = req.headers['x-biagio-path'];
  if (fromHeader) return fromHeader;
  const base = new URL(req.url || '/', 'http://localhost');
  const captured = base.searchParams.get('__path');
  if (captured !== null) {
    const clean = captured.replace(/^\/+|\/+$/g, '');
    return clean ? `/${clean}/` : '/';
  }
  const pathname = decodeURIComponent(base.pathname);
  if (pathname === '/api/ssr' || pathname === '/api/ssr/') return '/';
  return pathname.endsWith('/') ? pathname : `${pathname}/`;
}

/** Recommended entry point for `api/ssr.js` on Vercel. */
export function createVercelHandler(metaUrl, { userIdFromRequest, cacheTags } = {}) {
  return createHandler(stagedProjectDir(metaUrl), { userIdFromRequest, cacheTags, metaUrl });
}

export function createHandler(projectDir, { userIdFromRequest, cacheTags, metaUrl } = {}) {
  const root = projectDir
    ? resolveProjectRoot(projectDir, metaUrl && projectDirFromApi(metaUrl), process.cwd())
    : stagedProjectDir(metaUrl || import.meta.url);

  return async function handler(req, res) {
    try {
      const url = resolveRequestUrl(req);
      const query = Object.fromEntries(new URL(req.url || '/', 'http://x').searchParams);
      delete query.__path;

      if (query.__biagio_diag === '1') {
        const pagesDir = join(root, 'pages');
        res.statusCode = 200;
        res.setHeader('content-type', 'application/json');
        return res.end(JSON.stringify({
          root,
          staged: root.includes('_runtime'),
          cwd: process.cwd(),
          pagesExists: existsSync(pagesDir),
        }));
      }

      delete query.__biagio_diag;
      const userId = userIdFromRequest?.(req)
        || req.headers['x-user-id']
        || req.headers['x-vercel-id']
        || 'anonymous';

      const meta = {};
      const html = await renderRequest(root, url, {
        request: { url, query, headers: req.headers, method: req.method },
        userId, meta,
      });

      if (html === null) {
        console.error('[biagio:vercel] 404', { url, root, pagesExists: existsSync(join(root, 'pages')) });
        res.statusCode = 404;
        res.setHeader('content-type', 'text/html; charset=utf-8');
        return res.end('<h1>404</h1>');
      }
      res.statusCode = 200;
      res.setHeader('content-type', 'text/html; charset=utf-8');
      res.setHeader('cache-control', meta.revalidate
        ? `s-maxage=${meta.revalidate}, stale-while-revalidate=${meta.revalidate * 10}`
        : 'no-store');
      const tags = cacheTags?.(url, meta) || [];
      if (tags.length) res.setHeader('Cache-Tag', tags.join(','));
      res.end(html);
    } catch (e) {
      console.error('[biagio:vercel]', e);
      res.statusCode = 500;
      res.setHeader('content-type', 'text/plain');
      res.end('500 Internal Server Error');
    }
  };
}

export default createVercelHandler;
