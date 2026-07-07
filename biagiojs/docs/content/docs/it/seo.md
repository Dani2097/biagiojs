---
title: SEO automatica
description: Meta tag, canonical, Open Graph, JSON-LD, sitemap e hreflang senza plugin.
order: 7
priority: 0.8
lastmod: 2026-07-07
---

# SEO automatica

biagiojs genera tutto il markup SEO a build time. Non serve un plugin, non serve configurare meta tag a mano per ogni pagina.

## Cosa viene generato

Per ogni pagina, automaticamente:

- `<title>` e meta description
- `rel="canonical"`
- Open Graph (`og:title`, `og:description`, `og:image`, `og:url`)
- Twitter Card
- JSON-LD (WebSite, Product, Article, BreadcrumbList)
- `hreflang` (se `site.locales`)
- Favicon link

A livello sito:

- `sitemap.xml` con priorità e lastmod
- `robots.txt`

## Configurazione pagina

In `.biagio`:

```html
<page title="Prodotto X — Il Mio Shop"
      description="Descrizione per i motori di ricerca."
      type="product"
      image="/img/prodotto-960w.jpg"
      sitemapPriority="0.9"
      lastmod="2026-07-07" />
```

In `.page.js`:

```js
page: {
  title: 'Titolo pagina',
  description: '…',
  type: 'product',
  image: '/img/hero-960w.jpg',
  product: { name: 'X', price: 129, currency: 'EUR', rating: 4.7, reviewCount: 100 },
  breadcrumbs: [{ name: 'Home', path: '/' }, { name: 'Shop', path: '/shop/' }],
  noindex: false,
}
```

## Breadcrumb

Se passi `breadcrumbs`, viene generato JSON-LD `BreadcrumbList` e markup visivo.

## Multilingua

Con `site.locales: ['it', 'en']` e `site.defaultLocale: 'it'`:

- Route `/` = italiano, `/en/` = inglese
- `hreflang` alternate in ogni pagina
- Sitemap con `xhtml:link` per ogni lingua
- Report optimizer per mercato in `reports/en/`

## Immagini e LCP

Usa `smartImage()` con `aboveFold: true` e profilo `hero` per il LCP. La pipeline genera AVIF/WebP/JPEG con `srcset` corretto.

## noindex

`noindex: true` o attributo `noindex` su `<page>` esclude la pagina da `sitemap.xml`.

## baseUrl

**Obbligatorio in produzione.** `site.baseUrl` alimenta canonical, OG url e sitemap. Un placeholder `example.com` genera warning in `biagio doctor`.

Il sito docs ufficiale usa `https://biagio.danilosprovieri.com` — ogni pagina riceve quel canonical automaticamente alla build.
