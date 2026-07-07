---
title: Project structure
description: Folders, naming conventions and config files in a biagiojs project.
order: 2
priority: 0.85
lastmod: 2026-07-07
---

# Project structure

```
my-site/
├── biagio.config.js       # site, images, fonts, cache, deploy
├── pages/                 # one file per page → automatic routes
│   ├── index.page.biagio  # → /
│   ├── about.page.biagio  # → /about/
│   └── blog/[slug].page.js
├── islands/               # client ESM modules (vanilla, React, Preact…)
├── content/               # Markdown + frontmatter (collections)
├── images/                # sources → dist/img/ (requires sharp)
├── public/                # copied to dist/ (favicon, _headers…)
├── locales/               # translations (when site.locales is set)
├── reports/               # field data for the optimizer (optional)
└── dist/                  # build output — do not commit
```

## Routing

The filename is the route:

| File | URL |
|------|-----|
| `pages/index.page.biagio` | `/` |
| `pages/about.page.biagio` | `/about/` |
| `pages/blog/[slug].page.js` | `/blog/<slug>/` per `getStaticPaths()` |

Supported extensions: `.page.biagio`, `.page.js`, `.page.ts`.

## i18n routing

With `site.locales: ['en', 'it']` and `defaultLocale: 'en'`:

| File | English | Italian |
|------|---------|---------|
| `pages/index.page.js` | `/` | `/it/` |
| `pages/docs/index.page.js` | `/docs/` | `/it/docs/` |

Translations live in `locales/<lang>.json`. Content collections can use `content/blog/` (default) and `content/blog/it/` (Italian).

## Config (`biagio.config.js`)

| Key | Purpose |
|-----|---------|
| `site.name` | Site name, meta title fallback |
| `site.baseUrl` | Canonical, sitemap, Open Graph |
| `site.locales` | Language list for i18n |
| `site.defaultLocale` | Locale without URL prefix |
| `site.images` | sharp pipeline, profiles, remote |
| `site.cache` | Generates `dist/_headers` for CDN |
| `site.deploy` | Cloudflare / Vercel / Netlify presets |
| `hooks` | beforeImages, head, afterFonts… |

## Content collections

Markdown in `content/<name>/` with YAML frontmatter:

```md
---
title: My article
date: 2026-07-07
slug: my-article
---

# Content
```

```js
export function getStaticPaths({ getCollection }) {
  return getCollection('content/blog').map(p => ({
    params: { slug: p.slug },
    props: { post: p },
  }));
}
```

## Recommended dependencies

```bash
npm i -D sharp vite    # images + dev with HMR
npm i -D subset-font   # only if site.fonts.subset is enabled
```

`biagiojs` has zero mandatory runtime dependencies.
