# biagiojs

**Business-first web framework** — Core Web Vitals as constraints, conversion / SEO / engagement as first-class citizens. SSG + adaptive islands + file-based routing. Zero mandatory runtime dependencies.

[![npm](https://img.shields.io/npm/v/biagiojs)](https://www.npmjs.com/package/biagiojs)
[![license](https://img.shields.io/npm/l/biagiojs)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-green)](https://nodejs.org)

**[Site](https://biagio.danilosprovieri.com)** · **[Documentation](https://biagio.danilosprovieri.com/docs)** · **[GitHub](https://github.com/Dani2097/biagiojs)**

Where other frameworks ask *“how do we render faster?”*, biagiojs asks *“what should hit the wire first to maximize business outcomes and user experience?”*.

---

## Table of contents

- [Quick start](#quick-start)
- [How it works](#how-it-works)
- [Installation](#installation)
- [Commands](#commands)
- [Project structure](#project-structure)
- [Syntax](#syntax)
- [Features](#features)
- [Deploy](#deploy)
- [Documentation](#documentation)
- [License](#license)

---

## Quick start

```bash
npx create-biagiojs my-site
# or: npx create-biagiojs my-site --template blog|landing|docs|shop
cd my-site && npm install && npm run dev   # → http://localhost:4321
```

Production:

```bash
npm run build    # → dist/ (static HTML + sitemap + optimized images)
```

---

## How it works

Every component declares **business weights** alongside technical costs. The framework decides HTML render order, hydration plan, preload and SEO.

| You declare | Framework decides |
|-------------|-------------------|
| `conversion` (0–1) | Hydration & preload priority (and HTML source order with `contentOrder: 'priority'`) |
| `seo` (0–1) | SEO-critical content, SCRT metric |
| `interaction` (0–1) | **eager** / **lazy** / **static** islands (JS never shipped) |
| `cpu`, `network` (costs) | Priority = value/cost; preload ordered by value/KB |

A 300 KB chat widget with `conversion="0.05"` stays static HTML. A CTA with `conversion="1"` hydrates first.

**Golden rule:** static is the desired default. In production, a page without islands ships **zero JavaScript**.

**Accessible by default:** the DOM is emitted in reading order, so keyboard and screen-reader order match the visual layout (WCAG 2.4.3 / 1.3.2). Business priority still drives hydration and preload. Opt into source-order reordering (for streaming SSR) with `contentOrder: 'priority'`.

**Weights are a documented knob, not magic numbers:** `businessValue = 0.6·conversion + 0.25·seo + 0.15·interaction` (`BUSINESS_WEIGHTS`), overridable via `site.weights` and recalibrated from field data by the optimizer.

---

## Installation

### New project

```bash
npx create-biagiojs my-site
```

### Existing project

```bash
npm i biagiojs
```

Optional dependencies (recommended in production):

```bash
npm i -D sharp vite          # AVIF/WebP/JPEG images + dev with HMR
npm i -D subset-font         # only if site.fonts.subset is enabled
```

`lightningcss` is an optionalDependency of the framework: real CSS minification in build when present.

---

## Commands

| Command | Description |
|---------|-------------|
| `npx biagio dev .` | Dev server (incremental rebuild, CWV + weights overlay in fallback mode) |
| `npx biagio build .` | Build → `dist/` |
| `npx biagio build . --clean` | Clears `dist/img/` before the image pipeline |
| `npx biagio build . --dryRun` | Plans image buckets without writing files |
| `npx biagio explain <page>` | Render order + hydration plan for one page (no full build) |
| `npx biagio new page\|island\|collection <name>` | Scaffold pages, islands or collections |
| `npx biagio doctor .` | Project validation (config, sharp, pages, links, consent) |
| `npx biagio analyze .` | Post-build HTML/JS weight report → `dist/.biagio-analyze.json` |
| `npx biagio preview . [port]` | Node production server (static + ISR + SSR, gzip/br) |
| `npx biagio pull-vitals <url> .` | CrUX/Lighthouse → `reports/crux.json` |
| `npx create-biagiojs <dir> [--template name]` | Scaffold a new site |

TypeScript config: `biagio.config.ts` (requires esbuild or vite in devDependencies).

Deploy presets: set `site.deploy: 'cloudflare' | 'vercel' | 'netlify'` in `biagio.config.js` — generates adapter files at build if missing.

---

## Project structure

```
my-site/
├── biagio.config.js       # defineConfig({ site, images, fonts, cache, consent, hooks })
├── content.config.js      # optional: defineCollection schemas
├── pages/
│   ├── index.page.biagio  # → /
│   ├── about.page.biagio  # → /about/
│   └── blog/[slug].page.js
├── islands/               # client ESM modules (React, Preact, vanilla)
├── content/               # Markdown + frontmatter (collections)
├── images/                # sources → dist/img/ (sharp)
├── public/                # copied to dist/ (favicon, _headers, …)
├── locales/               # translations (if site.locales)
├── reports/               # field data for the optimizer (optional)
└── dist/                  # build output
```

---

## Syntax

### `.biagio` (recommended)

`pages/index.page.biagio` → route `/`. Filename is the route.

```html
<page title="Home" description="…" sitemapPriority="1.0" />

<component id="hero" seo="1" conversion="0.8">
  <template><section><h1>Welcome</h1></section></template>
</component>

<component id="cta" conversion="1" interaction="0.85">
  <template><button id="buy">Buy — €129</button></template>
  <script hydrate>
    el.querySelector('#buy').addEventListener('click', () => { /* … */ });
  </script>
</component>

<component id="theme" client="/islands/theme.js" hydrate="inline">
  <template><button>🌙</button></template>
</component>

<style>body { margin: 0; font-family: system-ui; }</style>
```

- Order in the file = **visual** order; **render** order = scheduler.
- `hydrate="inline|eager|visible|idle|never"` explicit scheduler override.
- `hydrate="inline"` → module embedded as ESM data-URI, zero network requests.

### `.page.js` / `.page.ts`

For `getStaticPaths`, `prerender = false`, `revalidate`, custom logic:

```js
import { PerfNode, PerformanceGraph } from 'biagiojs/graph';
import { html, raw } from 'biagiojs/html';

export function getStaticPaths({ getCollection }) {
  return getCollection('content/blog').map(post => ({
    params: { slug: post.slug },
    props: { post },
  }));
}

export default function ({ props: { post } }) {
  const g = new PerformanceGraph().add(new PerfNode('article', {
    seoWeight: 1, conversionWeight: 0.4,
    render: () => html`<article>${raw(post.html)}</article>`.toString(),
  }));
  g.get('article').domOrder = 0;
  return { graph: g, page: { title: post.data.title, description: '…' } };
}
```

| Export | Effect |
|--------|--------|
| *(default)* | SSG — page in `dist/` |
| `revalidate = N` | ISR — regenerates every N seconds |
| `prerender = false` | SSR on-demand (Node or Vercel adapter) |

---

## Features

### SEO, images, network

- **Automatic SEO**: meta, canonical, Open Graph, Twitter, JSON-LD, breadcrumb, `sitemap.xml`, `robots.txt`, favicon, hreflang (multilingual).
- **Favicon generator** (opt-in): `site.favicon = { source, generate: true }` builds the modern essential set (`.ico`, SVG, Apple touch, PWA icons + `manifest.webmanifest`) at build time from one source. Zero-dependency ICO encoder.
- **Images**: `smartImage()` with profiles (`hero`, `content`, `thumb`, `full`), `bySlug`, post-build validation. → **[IMAGE-OPTIMIZATION.md](./IMAGE-OPTIMIZATION.md)**
- **Network**: preload/prefetch ordered by value/KB with budget (default 200 KB).

### Build and performance

- **Zero JS** on pages without interactive islands.
- **PurgeCSS + minify** built-in; optional `lightningcss` for real CSS.
- **Optional `<div>` wrapper** on static nodes (fewer structural bytes).
- **Compact runtime**: `{e,l}` plan, single IIFE, conditional signals.
- **Demo benchmark**: produced HTML ~**14 KB** (−33% vs naive baseline).

### GDPR consent

Native banner (0 KB critical path) or optimized vendor (Cookiebot/Iubenda). Declarative gating on islands, scripts and iframes. Consent Mode v2 default-denied.

```js
site: { consent: { mode: 'native', categories: ['analytics', 'marketing'], policyUrl: '/privacy/' } }
```

### i18n, experiments, optimizer

- **i18n**: `site.locales` → `/en/…` routes, hreflang, sitemap alternates, per-market reports.
- **A/B tests**: deterministic server-side assignment, zero CLS.
- **Optimizer**: `reports/` (CrUX, analytics, heatmap) recalibrate weights on every build.

### Dev

- Live Core Web Vitals overlay + business metrics (dev only).
- **Weights inspector** — adjust component weights in the browser, export snippets.
- **Incremental rebuild** — only changed pages in dev fallback mode.
- CFP, FAR, RFI, SCRT, CDI metrics in-page (`cvw:metrics` event).

---

## Deploy

| Scenario | Solution |
|----------|----------|
| Static site | `dist/` on Cloudflare Pages, Netlify, Vercel, any CDN |
| Local preview | `biagio preview .` (Node adapter with compression) |
| ISR / SSR | `biagiojs/adapters/node`, `biagiojs/adapters/vercel`, `biagiojs/adapters/cloudflare` |

**Deploy presets:** `site.deploy: 'cloudflare'` generates `wrangler.toml` + `functions/[[path]].js`. Same for Vercel and Netlify.

**Cloudflare Pages (SSG):** build `npm run build`, output `dist/`, Node ≥ 18. Asset cache via `site.cache` → **[DEPLOY-CACHE.md](./DEPLOY-CACHE.md)**.

---

## Documentation

| Document | Content |
|----------|---------|
| **[biagio.danilosprovieri.com](https://biagio.danilosprovieri.com/docs)** | Documentation site (EN default, IT at `/it/`) |
| **[AI-GUIDE.md](./AI-GUIDE.md)** | Operational reference for AI agents and developers |
| **[IMAGE-OPTIMIZATION.md](./IMAGE-OPTIMIZATION.md)** | Image pipeline, profiles, `bySlug`, `smartImage()` |
| **[DEPLOY-CACHE.md](./DEPLOY-CACHE.md)** | `_headers`, `! Cache-Control`, Cloudflare / Netlify |
| **[CHANGELOG.md](./CHANGELOG.md)** | Version history and release notes |
| **VS Code extension** | `extensions/vscode-biagio/` — syntax, snippets for `.biagio` |

### Feedback loop

```
deploy → real users → pull-vitals + analytics → reports/ → build → recalibrated weights → deploy
```

---

## For AI agents

biagiojs is designed for use with coding agents and LLMs.

| Resource | Description |
|----------|-------------|
| **[llms.txt](https://biagio.danilosprovieri.com/llms.txt)** | Curated site index ([llmstxt.org](https://llmstxt.org/)) — point your agent here first |
| **[AI-GUIDE.md](./AI-GUIDE.md)** | Full operational reference (weights, syntax, consent, deploy, pitfalls) |
| **[Docs: AI agents](https://biagio.danilosprovieri.com/docs/ai-agents/)** | Web summary + workflow |

```bash
npx create-biagiojs my-site
# Then read AI-GUIDE.md in node_modules/biagiojs/ or on GitHub
```

**Golden rule for agents:** static HTML is the default; only hydrate islands with real interaction value. Use the weight tables in AI-GUIDE — do not invent numbers.

---

## License

MIT © [Danilo Sprovieri](https://github.com/Dani2097)
