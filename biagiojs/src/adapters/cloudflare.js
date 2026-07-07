/**
 * biagiojs — Adapter Cloudflare Pages Functions / Workers.
 *
 * Setup (generato da `site.deploy: 'cloudflare'` o `biagio build`):
 *
 *   functions/[[path]].js:
 *     import { onRequest } from 'biagiojs/adapters/cloudflare';
 *     export { onRequest };
 *
 * Le pagine statiche in dist/ le serve la CDN; questa function gestisce
 * SSR on-demand e 404 dinamici (come Vercel).
 */
import { renderRequest } from '../server-render.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const pathname = decodeURIComponent(url.pathname);

  try {
    const projectDir = env.BIAGIO_PROJECT_DIR || '.';
    const meta = {};
    const html = await renderRequest(projectDir, pathname, {
      request: {
        query: Object.fromEntries(url.searchParams),
        headers: Object.fromEntries(request.headers),
        method: request.method,
      },
      userId: request.headers.get('cf-ray') || 'anonymous',
      meta,
    });

    if (html === null) {
      return new Response('<h1>404</h1>', { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } });
    }

    const headers = new Headers({ 'content-type': 'text/html; charset=utf-8' });
    headers.set('cache-control', meta.revalidate
      ? `public, max-age=${meta.revalidate}, stale-while-revalidate=${meta.revalidate * 10}`
      : 'no-store');

    return new Response(html, { status: 200, headers });
  } catch (e) {
    console.error('[biagio:cloudflare]', e);
    return new Response('500 Internal Server Error', { status: 500 });
  }
}

export default onRequest;
