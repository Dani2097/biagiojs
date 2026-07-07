---
title: Struttura progetto
description: Cartelle, convenzioni di naming e file di configurazione in un progetto biagiojs.
order: 2
priority: 0.85
lastmod: 2026-07-07
---

# Struttura progetto

```
mio-sito/
├── biagio.config.js       # site, images, fonts, cache, deploy
├── pages/                 # una pagina per file → route automatica
│   ├── index.page.biagio  # → /
│   ├── about.page.biagio  # → /about/
│   └── blog/[slug].page.js
├── islands/               # moduli client ESM (vanilla, React, Preact…)
├── content/               # Markdown + frontmatter (collections)
├── images/                # sorgenti → dist/img/ (richiede sharp)
├── public/                # copiato in dist/ (favicon, _headers…)
├── locales/               # traduzioni (se site.locales)
├── reports/               # field data per l'optimizer (opzionale)
└── dist/                  # output build — non committare
```

## Routing

Il nome del file è la route:

| File | URL |
|------|-----|
| `pages/index.page.biagio` | `/` |
| `pages/chi-siamo.page.biagio` | `/chi-siamo/` |
| `pages/blog/[slug].page.js` | `/blog/<slug>/` per ogni `getStaticPaths()` |

Estensioni supportate: `.page.biagio`, `.page.js`, `.page.ts`.

## Routing i18n

Con `site.locales: ['en', 'it']` e `defaultLocale: 'en'`:

| File | Inglese | Italiano |
|------|---------|----------|
| `pages/index.page.js` | `/` | `/it/` |
| `pages/docs/index.page.js` | `/docs/` | `/it/docs/` |

Traduzioni UI in `locales/<lang>.json`. Le content collection usano `content/blog/` (default) e `content/blog/it/` (italiano).

## Config (`biagio.config.js`)

| Chiave | Scopo |
|--------|-------|
| `site.name` | Nome sito, meta title fallback |
| `site.baseUrl` | Canonical, sitemap, Open Graph |
| `site.locales` | Lista lingue per i18n |
| `site.defaultLocale` | Lingua senza prefisso URL |
| `site.images` | Pipeline sharp, profili, remote |
| `site.fonts` | Google Fonts self-hosted, subset |
| `site.cache` | Genera `dist/_headers` per CDN |
| `site.deploy` | Preset Cloudflare / Vercel / Netlify |
| `site.consent` | Banner GDPR nativo o vendor |
| `site.locales` | i18n con route `/en/…` |
| `hooks` | beforeImages, head, afterFonts… |

## Content collections

Markdown in `content/<nome>/` con frontmatter YAML:

```md
---
title: Il mio articolo
date: 2026-07-07
slug: mio-articolo
---

# Contenuto
```

Caricamento in pagine dinamiche:

```js
export function getStaticPaths({ getCollection }) {
  return getCollection('content/blog').map(p => ({
    params: { slug: p.slug },
    props: { post: p },
  }));
}
```

## Dipendenze consigliate

```bash
npm i -D sharp vite    # immagini + dev con HMR
npm i -D subset-font   # solo se site.fonts.subset è attivo
```

`biagiojs` stesso non ha dipendenze obbligatorie in runtime.
