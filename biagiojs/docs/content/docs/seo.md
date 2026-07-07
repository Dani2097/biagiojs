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
- JSON-LD (WebSite, Product, Article, BreadcrumbList)
- `hreflang` (when `site.locales` is set)
- Favicon link

Site-wide:

- `sitemap.xml` with priority and lastmod
- `robots.txt`

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

## hreflang (i18n)

With `site.locales: ['en', 'it']` and `defaultLocale: 'en'`:

- Default locale at `/`, others at `/<lang>/…`
- `hreflang` alternate links on every page
- Sitemap with `xhtml:link` per language
- Per-market optimizer reports in `reports/it/`

**This documentation site** is bilingual: English at `/`, Italian at `/it/` — hreflang is generated automatically.

## Images and LCP

Use `smartImage()` with `aboveFold: true` and `hero` profile for LCP. The pipeline generates AVIF/WebP/JPEG with correct `srcset`.

## noindex

`noindex: true` excludes the page from `sitemap.xml`.

## baseUrl

**Required in production.** `site.baseUrl` feeds canonical, OG url and sitemap. A placeholder triggers a warning in `biagio doctor`.

The official docs site uses `https://biagio.danilosprovieri.com` — every page gets that canonical automatically at build time.
