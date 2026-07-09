---
title: Struttura progetto
description: Cartelle, convenzioni di naming e file di configurazione in un progetto biagiojs.
order: 2
priority: 0.85
lastmod: 2026-07-09
---

# Struttura progetto

```
mio-sito/
├── biagio.config.js       # defineConfig({ site, hooks })
├── content.config.js      # opzionale: schema collection tipizzate
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
| `pages/about.page.biagio` | `/about/` |
| `pages/blog/[slug].page.js` | `/blog/<slug>/` via `getStaticPaths()` |

Estensioni supportate: `.page.biagio`, `.page.js`, `.page.ts`.

## Routing i18n

Con `site.locales: ['en', 'it']` e `defaultLocale: 'en'`:

| File | Inglese | Italiano |
|------|---------|----------|
| `pages/index.page.js` | `/` | `/it/` |
| `pages/docs/index.page.js` | `/docs/` | `/it/docs/` |

Traduzioni in `locales/<lang>.json`. Collection per lingua: `content/blog/it/`.

## Config (`biagio.config.js`)

Usa `defineConfig` per IntelliSense:

```js
import { defineConfig } from 'biagiojs/config';

export default defineConfig({
  site: {
    name: 'Il Mio Sito',
    baseUrl: 'https://example.com',
    // images, fonts, cache, deploy, consent, locales…
  },
});
```

| Chiave | Scopo |
|--------|-------|
| `site.name` | Nome sito, fallback title |
| `site.baseUrl` | Canonical, sitemap, Open Graph |
| `site.locales` | Lingue per i18n |
| `site.defaultLocale` | Locale senza prefisso URL |
| `site.images` | Pipeline sharp, profili, remote |
| `site.cache` | Genera `dist/_headers` per CDN |
| `site.deploy` | Preset Cloudflare / Vercel / Netlify |
| `hooks` | beforeImages, head, afterFonts… |

## Content collections

Vedi [Content collections](/it/docs/content-collections/) per frontmatter tipizzato, `draft: true` e `getCollection()`.

```bash
biagio new collection blog
biagio new page blog/[slug]
```

## Dipendenze consigliate

```bash
npm i -D sharp vite    # immagini + dev con HMR
npm i -D subset-font   # solo se site.fonts.subset è attivo
```

`biagiojs` non ha dipendenze runtime obbligatorie.
