---
title: Deploy & cache
description: SSG on CDN, deploy presets, _headers and SSR/ISR adapters.
order: 9
priority: 0.8
lastmod: 2026-07-07
---

# Deploy & cache

## Pure SSG (recommended)

```bash
npm run build
# dist/ → upload to Cloudflare Pages, Netlify, Vercel, S3…
```

No Node server required. Static HTML, hashed assets, sitemap included.

## Cache headers

In `biagio.config.js`:

```js
site: { cache: true }
```

Generates `dist/_headers` for CDN:

```
/img/*
  ! Cache-Control: public, max-age=31536000, immutable
/*.html
  Cache-Control: public, max-age=0, must-revalidate
```

The `!` prefix forces `Cache-Control` on Cloudflare Pages even with generic `/*` rules.

## Deploy presets

```js
site: { deploy: 'cloudflare' }  // or 'vercel' | 'netlify'
```

At build, if files don't exist yet:

| Platform | Files |
|----------|-------|
| Cloudflare | `wrangler.toml`, `functions/[[path]].js` |
| Vercel | `vercel.json`, `api/ssr.js` |
| Netlify | `netlify.toml`, `netlify/functions/ssr.mjs` |

## Local preview

```bash
biagio preview . 3000
```

Node server with static + ISR + SSR on-demand + gzip/brotli compression.

## SSR / ISR

For pages with `prerender = false` or `revalidate = N`:

| Adapter | Import |
|---------|--------|
| Node | `biagiojs/adapters/node` |
| Vercel | `biagiojs/adapters/vercel` |
| Cloudflare | `biagiojs/adapters/cloudflare` |

### Vercel ISR

Set `site.deploy: 'vercel'` in `biagio.config.js`.

**Build** (`biagio build`):

1. Pages with `export const revalidate = N` are **not** written to `dist/` — Vercel serves them via `api/ssr` with CDN caching (`s-maxage`, stale-while-revalidate).
2. Static pages stay in `dist/` and are served directly by the CDN.
3. **`pages/`, `biagio.config.js`, and other runtime sources are copied to `api/_runtime/`** so the serverless function can load them (Vercel does not bundle dynamic `import()` paths from project root reliably).

**`vercel.json`** (preset) — split rewrites so `/` reaches SSR, plus:

```json
{
  "functions": {
    "api/ssr.js": { "includeFiles": "api/_runtime/**" }
  },
  "trailingSlash": true,
  "rewrites": [
    { "source": "/", "destination": "/api/ssr?__path=" },
    { "source": "/:path((?!api/).+)", "destination": "/api/ssr?__path=:path" }
  ]
}
```

**`api/ssr.js`:**

```js
import { createVercelHandler } from 'biagiojs/adapters/vercel';
export default createVercelHandler(import.meta.url);
```

CDN purge via `cacheTags` (e.g. Shopify webhooks):

```js
export default createVercelHandler(import.meta.url, {
  cacheTags: (url) => ['my-tag', url === '/' ? 'home' : 'page'],
});
```

Debug on Vercel: `GET /api/ssr?__biagio_diag=1` returns JSON with `pagesExists` and `staged: true`.

Vercel tries static files in `dist/` first; rewrites apply only when no matching file exists.

## Node version

Requires **Node ≥ 18** for build and runtime.

## This docs site

Deployed as pure SSG. Built with biagiojs — landing in `.page.js`, guides from Markdown, bilingual EN/IT with native hreflang. One interactive island on the homepage.
