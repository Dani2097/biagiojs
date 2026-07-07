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

## Node version

Requires **Node ≥ 18** for build and runtime.

## This docs site

Deployed as pure SSG. Built with biagiojs — landing in `.page.js`, guides from Markdown, bilingual EN/IT with native hreflang. One interactive island on the homepage.
