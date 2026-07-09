---
title: Automatic SEO
description: Meta tags, canonical, Open Graph, JSON-LD, sitemap and hreflang without plugins.
order: 7
priority: 0.8
lastmod: 2026-07-07
---

# Automatic SEO

biagiojs generates all SEO markup at build time. No plugin, no hand-written meta tags per page.

## What gets generated

Per page, automatically:

- `<title>` and meta description
- `rel="canonical"`
- Open Graph (`og:title`, `og:description`, `og:image`, `og:url`)
- Twitter Card
- JSON-LD (Organization, WebSite, SoftwareApplication, TechArticle, BreadcrumbList)
- `hreflang` (when `site.locales` is set)
- `og:locale` as `en_US` / `it_IT` (Open Graph format)
- Favicon link

Site-wide:

- `sitemap.xml` with priority, lastmod and `xhtml:link` hreflang alternates
- `robots.txt` pointing to the sitemap
- `/llms.txt` — curated index for AI agents ([spec](https://llmstxt.org/))

## Page configuration

In `.biagio`:

```html
<page title="Product X — My Shop"
      description="Description for search engines."
      type="product"
      image="/img/product-960w.jpg"
      sitemapPriority="0.9"
      lastmod="2026-07-07" />
```

In `.page.js`:

```js
page: {
  title: 'Page title',
  description: '…',
  type: 'product',
  image: '/img/hero-960w.jpg',
  product: { name: 'X', price: 129, currency: 'EUR', rating: 4.7, reviewCount: 100 },
  breadcrumbs: [{ name: 'Home', path: '/' }, { name: 'Shop', path: '/shop/' }],
}
```

## Open Graph image

Use a **PNG or JPEG** at 1200×630 for `site.ogImage` — social networks do not reliably render SVG.

```js
site: {
  ogImage: { src: '/og.png', width: 1200, height: 630, alt: '…' },
}
```

## Duplicate breadcrumbs

If your layout renders its own breadcrumb, set `hideBreadcrumb: true` on `page` — JSON-LD `BreadcrumbList` is still emitted.

## hreflang (i18n)

With `site.locales: ['en', 'it']` and `defaultLocale: 'en'`:

- Default locale at `/`, others at `/<lang>/…`
- `hreflang` alternate links on every page
- Sitemap with `xhtml:link` per language
- Per-market optimizer reports in `reports/it/`

**This documentation site** is bilingual: English at `/`, Italian at `/it/` — hreflang is generated automatically.

## Images and LCP

Use `smartImage()` with `aboveFold: true` and `hero` profile for LCP. The pipeline generates AVIF/WebP/JPEG with correct `srcset`.

## Favicon generator (opt-in)

Point `site.favicon` at a single source and biagiojs builds the modern essential set at build time — no legacy 20-file dump:

```js
// biagio.config.js
site: {
  favicon: {
    source: 'images/logo.svg',   // SVG ideal, or PNG ≥512
    generate: true,              // opt-in
    themeColor: '#111',
    // targets: ['ico', 'svg', 'apple', 'pwa'],  // opt out of what you don't need
  },
}
```

Outputs written to `dist/`:

| File | Purpose |
|------|---------|
| `favicon.ico` | 16/32/48, SERP + legacy (inline ICO encoder — sharp can't emit `.ico`) |
| `icon.svg` | Scalable, modern browsers (only from an SVG source) |
| `apple-touch-icon.png` | 180×180, iOS |
| `icon-192.png` + `icon-512.png` + `manifest.webmanifest` | Android / PWA (`pwa` target) |

The `<link>`/`<meta>` tags (including `rel="manifest"` and `theme-color`) are injected automatically. Raster targets (`ico`, `apple`, `pwa`) require `sharp`; `biagio doctor` warns if it's missing or the source is too small. Generation is idempotent — it skips when outputs are newer than the source.

## noindex

`noindex: true` excludes the page from `sitemap.xml`.

## baseUrl

**Required in production.** `site.baseUrl` feeds canonical, OG url and sitemap. A placeholder triggers a warning in `biagio doctor`.

The official docs site uses `https://biagio.danilosprovieri.com` — every page gets that canonical automatically at build time.

Submit `https://biagio.danilosprovieri.com/sitemap.xml` in Google Search Console after deploy. See also [AI agents](/docs/ai-agents/) for `llms.txt`.
