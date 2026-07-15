---
title: Deploy & cache
description: SSG su CDN, preset deploy, _headers e adapter SSR/ISR.
order: 9
priority: 0.8
lastmod: 2026-07-07
---

# Deploy & cache

## SSG puro (consigliato)

```bash
npm run build
# dist/ → upload su Cloudflare Pages, Netlify, Vercel, S3…
```

Nessun server Node richiesto. HTML statico, asset con hash, sitemap inclusa.

## Cache headers

In `biagio.config.js`:

```js
site: { cache: true }
```

Genera `dist/_headers` con regole per CDN:

```
/img/*
  ! Cache-Control: public, max-age=31536000, immutable
/*.html
  Cache-Control: public, max-age=0, must-revalidate
```

Il prefisso `!` forza `Cache-Control` su Cloudflare Pages anche con regole generiche `/*`.

## Preset deploy

```js
site: { deploy: 'cloudflare' }  // o 'vercel' | 'netlify'
```

Alla build, se i file non esistono già, vengono generati:

| Platform | File |
|----------|------|
| Cloudflare | `wrangler.toml`, `functions/[[path]].js` |
| Vercel | `vercel.json`, `api/ssr.js` |
| Netlify | `netlify.toml`, `netlify/functions/ssr.mjs` |

## Preview locale

```bash
biagio preview . 3000
```

Server Node con statico + ISR + SSR on-demand + compressione gzip/brotli.

## SSR / ISR

Per pagine con `prerender = false` o `revalidate = N`:

| Adapter | Import |
|---------|--------|
| Node | `biagiojs/adapters/node` |
| Vercel | `biagiojs/adapters/vercel` |
| Cloudflare | `biagiojs/adapters/cloudflare` |

### ISR su Vercel

Imposta `site.deploy: 'vercel'` in `biagio.config.js`.

**Build** (`biagio build`):

1. Le pagine con `export const revalidate = N` **non** vengono scritte in `dist/` — Vercel le serve via `api/ssr` con cache CDN.
2. Le pagine statiche restano in `dist/`.
3. **`pages/`, `biagio.config.js` e altre sorgenti runtime vengono copiate in `api/_runtime/`** — su Vercel i glob `includeFiles` sulla root non bastano per gli `import()` dinamici della function.

**`vercel.json`** (preset):

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

Purge CDN con `cacheTags` (es. webhook Shopify):

```js
export default createVercelHandler(import.meta.url, {
  cacheTags: (url) => ['mio-tag', url === '/' ? 'home' : 'pagina'],
});
```

Debug in produzione: `GET /api/ssr?__biagio_diag=1` → JSON con `pagesExists` e `staged: true`.

Vercel prova prima i file statici in `dist/`; le rewrite scattano solo se non esiste un file corrispondente.

```js
import { createBiagioServer } from 'biagiojs/adapters/node';
createBiagioServer('.').listen(3000);
```

## Node version

Richiede **Node ≥ 18** in build e runtime (adapter).

## Questo sito docs

Questo sito è deployato come SSG puro. È costruito con biagiojs — landing in `.biagio`, guide da Markdown, una sola isola interattiva sulla homepage.
