---
title: SEO automatica
description: Meta tag, canonical, Open Graph, JSON-LD, sitemap, hreflang e llms.txt senza plugin.
order: 7
priority: 0.8
lastmod: 2026-07-08
---

# SEO automatica

biagiojs genera tutto il markup SEO a build time. Non serve un plugin, non serve configurare meta tag a mano per ogni pagina.

## Cosa viene generato

Per ogni pagina, automaticamente:

- `<title>` e meta description
- `rel="canonical"`
- Open Graph (`og:title`, `og:description`, `og:image`, `og:url`)
- Twitter Card
- JSON-LD (Organization, WebSite, SoftwareApplication, TechArticle, BreadcrumbList)
- `hreflang` (se `site.locales`)
- `og:locale` come `en_US` / `it_IT`
- Favicon link

A livello sito:

- `sitemap.xml` con priorità, lastmod e alternates `xhtml:link`
- `robots.txt` con link alla sitemap
- `/llms.txt` — indice curato per agenti AI ([spec](https://llmstxt.org/))

## Configurazione pagina

In `.biagio`:

```html
<page title="Prodotto X — Il Mio Shop"
      description="Descrizione per i motori di ricerca."
      type="product"
      image="/img/prodotto-960w.jpg"
      sitemapPriority="0.9"
      lastmod="2026-07-08" />
```

In `.page.js`:

```js
page: {
  title: 'Titolo pagina',
  description: '…',
  breadcrumbs: [{ name: 'Home', path: '/' }],
  hideBreadcrumb: true,  // se il layout ha già il breadcrumb visivo
}
```

## Immagine Open Graph

Usa **PNG o JPEG** 1200×630 per `site.ogImage` — i social non renderizzano SVG in modo affidabile.

```js
site: {
  ogImage: { src: '/og.png', width: 1200, height: 630, alt: '…' },
}
```

## hreflang (i18n)

Con `site.locales: ['en', 'it']` e `defaultLocale: 'en'`:

- Lingua default su `/`, le altre su `/<lang>/…`
- `hreflang` alternate su ogni pagina
- Sitemap con `xhtml:link` per lingua
- Report optimizer per mercato in `reports/it/`

**Questo sito docs** è bilingue: inglese su `/`, italiano su `/it/`.

## noindex

`noindex: true` esclude la pagina da `sitemap.xml`.

## baseUrl

**Obbligatorio in produzione.** `site.baseUrl` alimenta canonical, OG e sitemap.

Il sito ufficiale usa `https://biagio.danilosprovieri.com`. Invia `https://biagio.danilosprovieri.com/sitemap.xml` in Google Search Console. Vedi anche [Agenti AI](/it/docs/ai-agents/) per `llms.txt`.
