# biagiojs — Guide for AI agents

> **Version:** 0.10.2 · Canonical document for LLMs/agents building sites with biagiojs.
>
> Human overview: [README](./README.md) · Images: [IMAGE-OPTIMIZATION.md](./IMAGE-OPTIMIZATION.md) · Cache: [DEPLOY-CACHE.md](./DEPLOY-CACHE.md)

---

## Mental model

biagiojs is **SSG-first + islands, business-aware**. Every component declares **business weights** (`conversion`, `seo`, `interaction`, 0–1) and **costs** (`cpu`, `memory`, `network` in KB). The framework decides:

- hydration and preload priority (and HTML source order in `contentOrder: 'priority'`);
- which islands to hydrate and when (eager / lazy / never);
- preload by value/KB;
- SEO, GDPR consent, i18n.

**Golden rule:** static is the desired default. In production, a page without islands ships **zero JavaScript**. Every `hydrate`/`client` must justify itself with a real interaction.

---

## Workflow

1. `npx create-biagiojs <dir>` → `cd <dir> && npm install` (optional: `--template blog|landing|docs|shop`)
2. Configure `biagio.config.js` with `defineConfig` (a real `baseUrl`: it feeds canonical, sitemap, OG, hreflang)
3. Scaffold: `biagio new page …`, `biagio new island …`, `biagio new collection …`
4. One page per file in `pages/` — prefer `.page.biagio`
5. Assign weights from the table (don't invent values)
6. `biagio explain pages/foo.page.biagio` — instant render/hydration feedback
7. `npx biagio build .` — check render order and the eager/lazy/static plan in the log
8. `npx biagio dev .` — live CWV overlay + weights inspector

---

## Project structure

```
my-site/
├── biagio.config.js
├── content.config.js      # optional: defineCollection schemas
├── pages/                    # index.page.biagio → /
│   └── blog/[slug].page.js
├── islands/                  # export default (el, props) => void
├── content/blog/*.md
├── images/                   # requires sharp if not empty
├── public/                   # favicon, _headers, …
├── locales/it.json
├── reports/                  # optimizer (optional; per language: reports/en/)
└── dist/
```

---

## `.biagio` syntax

```html
<page title="…" description="…" sitemapPriority="1.0"
      type="product" image="/img/x.jpg" overlay="false" />

<component id="hero" seo="1" conversion="0.9" cpu="2">
  <template><section><h1>Title</h1></section></template>
</component>

<component id="cta" conversion="1" interaction="0.85">
  <template><button id="buy">Buy</button></template>
  <script hydrate>
    el.querySelector('#buy').addEventListener('click', () => { /* self-contained */ });
  </script>
</component>

<component id="stock" conversion="0.9" interaction="0.6"
           client="/islands/stock.js" props='{"initial": 5}'>
  <template><div data-react-root>…</div></template>
</component>

<component id="theme" client="/islands/theme.js" hydrate="inline">
  <template><button>🌙</button></template>
</component>

<style>/* purged and minified at build */</style>
```

**`<component>` attributes:** `id`, `seo`, `conversion`, `interaction`, `cpu`, `memory`, `network`, `deps`, `client`, `props`, `hydrate`, `consent`.

**`<page>` attributes:** `title`, `description`, `type`, `image`, `sitemapPriority`, `lastmod`, `noindex`, `overlay`.

The `.biagio` compiler is a quote-aware tokenizer: it handles `>` inside attribute values, nested `<template>`, top-level HTML comments (a commented-out `<component>` is ignored), and multiple `<style>` blocks. Inline `hydrate` scripts are emitted from their raw source (no `Function.prototype.toString` round-trip), and any `</script>` inside them is neutralized so it can't break out of the tag.

---

## JS syntax (`.page.js` / `.page.ts`)

```js
import { PerfNode, PerformanceGraph } from 'biagiojs/graph';
import { html, raw } from 'biagiojs/html';

export const prerender = false;   // SSR on-demand
// export const revalidate = 300;  // ISR

export function getStaticPaths({ getCollection }) {
  return getCollection('content/blog').map(p => ({
    params: { slug: p.slug }, props: { post: p },
  }));
}

export default function (ctx) {
  const g = new PerformanceGraph().add(new PerfNode('article', {
    seoWeight: 1, conversionWeight: 0.4, cpuCost: 2,
    render: () => html`<article>${raw(ctx.props.post.html)}</article>`.toString(),
  }));
  g.get('article').domOrder = 0;   // required in .page.js
  return {
    graph: g,
    page: { title, description, sitemapPriority },
    assets: [{ url: '/fonts/x.woff2', kb: 30, businessValue: 0.5 }],
    experiments: ab,
  };
}
```

**`ctx`:** `{ site, params, props, request, locale, t, getCollection, ExperimentEngine, userId, reports }`.

---

## Weight table

| Component | conversion | seo | interaction |
|-----------|------------|-----|-------------|
| Primary CTA | 0.9–1.0 | 0–0.2 | 0.7–0.9 |
| Price / offer | 0.8–0.9 | 0.7–0.9 | ~0.1 |
| Hero / H1 | 0.7–0.9 | 1.0 | ~0.2 |
| Reviews | 0.4–0.6 | 0.7–0.9 | ~0.3 |
| Navigation | 0.2 | 0.3 | 0.3–0.5 |
| Carousel | 0.1–0.3 | 0–0.2 | 0.1–0.2 |
| Chat / third-party widget | ≤0.05 | 0 | ≤0.05 |
| Footer | ≤0.05 | 0.1 | ≤0.05 |

**Constraints:** `businessValue = 0.6·conversion + 0.25·seo + 0.15·interaction` (`BUSINESS_WEIGHTS`, overridable via `site.weights` or `compileBiagio(..., { weights })`; the optimizer recalibrates them from field data). Default thresholds eager ≥0.3, lazy ≥0.05 (the optimizer adapts them). `conversion ≥ 0.7` + interactivity ⇒ revenue island (FAR/RFI).

**DOM order:** by default the DOM is in reading order (`contentOrder: 'visual'`) → correct tab order and screen reader (WCAG 2.4.3 / 1.3.2). Business priority still drives hydration and preload. `contentOrder: 'priority'` reorders the source by value (for streaming SSR), restoring the visual order via CSS flex `order`.

---

## Page mode

| Case | Action |
|------|--------|
| Fixed content | SSG (default) |
| Data that changes periodically | `export const revalidate = N` |
| Per-user / real-time | `export const prerender = false` |

---

## Hydration

| Case | Action |
|------|--------|
| No interaction | no `hydrate`/`client` |
| Theme, language, critical nav | `hydrate="inline"` |
| Main CTA | high weights → scheduler eager |
| Below the fold | real weights → automatic lazy |
| JS never shipped | `hydrate="never"` |
| Marketing tracker | `consent="marketing"` |

---

## GDPR consent

```js
site: { consent: { mode: 'native', categories: ['analytics','marketing'], policyUrl: '/privacy/' } }
site: { consent: { mode: 'vendor', vendor: 'cookiebot', id: '…', strategy: 'idle' } }
```

Gating:
- islands: `consent="marketing"`
- scripts: `<script type="text/plain" data-cvw-consent="marketing" src="…">`
- iframes: `<iframe data-cvw-consent="marketing" data-src="…">`
- video: `videoFacadeHtml({ id, title })` from `biagiojs/consent`

Consent Mode v2 default-denied is always emitted. **Do not bypass** the gating for trackers.

---

## i18n

```js
site: { locales: ['it','en'], defaultLocale: 'it' }
```

- Routes: `/` (default), `/en/…` (other languages)
- `{{t:key}}` in `.biagio`; `ctx.t('key')` in `.page.js`
- hreflang, sitemap alternates, `og:locale` automatic
- Per-market reports: `reports/en/crux.json`

---

## SEO / OG / favicon

Automatic from `page` + `site`:

- `page.image` → og:image (fallback `site.ogImage`)
- `type="product"` + `page.product` → JSON-LD Product
- `site.favicon` → icon tag (file in `public/`)
- `sitemap.xml`, `robots.txt` every build

---

## A/B experiments

```js
const ab = new ctx.ExperimentEngine({ userId: ctx.userId });
ab.define('checkout_v2', ['control', 'variant_b']);
// ab.pick('checkout_v2', { control: () => html, variant_b: () => html })
```

Deterministic per-user assignment. For unique visitors: `prerender = false`.

---

## Feedback loop

```bash
npx biagio pull-vitals https://site.com .
npx biagio build .
```

Optional: `reports/analytics.json`, `reports/heatmap.json`, `reports/searchconsole.json`.

---

## Config (`biagio.config.js`)

```js
import { defineConfig } from 'biagiojs/config';

export default defineConfig({
  site: {
    name: '…', baseUrl: 'https://…', description: '…',
    weights: { conversion: 0.6, seo: 0.25, interaction: 0.15 },  // optional: businessValue coefficients (normalized)
    images: {
      widths: [480, 960, 1440], quality: 75,
      bySlug: { hero: [480, 960, 1440, 1920] },
      remote: {
        allowedDomains: ['cdn.example.com'],
        sources: [{ url: 'https://…/hero.jpg', slug: 'hero' }],
      },
    },
    fonts: {
      inject: 'inline',       // 'async' | 'stylesheet' | false
      preload: 'critical',    // 'all' | false
      google: [
        { family: 'Inter', weights: [400, 600], role: 'body' },
      ],
      subset: false,          // 'latin' or { preset, scan, extra }
    },
    cache: true,
    favicon: { source: 'images/logo.svg', generate: true, themeColor: '#111', targets: ['ico','svg','apple','pwa'] },
    consent: { mode: 'native', categories: ['analytics'], policyUrl: '/privacy/' },
    locales: ['it', 'en'], defaultLocale: 'it',
  },
  hooks: {
    head({ page, locale }) { return ''; },
    beforeImages({ srcDir }) {},
    afterImages({ outDir, result }) {},
    beforeFonts({ fontsDir }) {},
    afterFonts({ fontsDir, result }) {},
  },
});
```

See [IMAGE-OPTIMIZATION.md](./IMAGE-OPTIMIZATION.md) for profiles and `smartImage()`. See [DEPLOY-CACHE.md](./DEPLOY-CACHE.md) for `site.cache`.

---

## Content collections

```js
// content.config.js
import { defineCollection } from 'biagiojs/content';

export const collections = {
  blog: defineCollection({
    schema: {
      title: { type: 'string', required: true },
      date: { type: 'string' },
      draft: { type: 'boolean', default: false },
    },
  }),
};
```

`draft: true` in frontmatter → visible in dev, **excluded in production** (`NODE_ENV=production`).

```bash
biagio new collection blog
biagio new page blog/[slug]
```

---

## Dev tooling

| Tool | What it does |
|------|----------------|
| **Incremental rebuild** | Dev fallback rebuilds only touched pages |
| **Weights inspector** | Sliders in overlay; export weight snippets |
| **Error overlay** | Compile/render errors in browser with `file:line` |
| **`biagio explain`** | Render order + hydration plan without full build |
| **VS Code extension** | `extensions/vscode-biagio/` — syntax + snippets |

---

## Common mistakes (checklist)

1. Hydrating everything — static is the framework's advantage
2. Weighting everything high — the scheduler degenerates
3. Critical islands as external files — use `hydrate="inline"`
4. `render()` returning DOM — it must return a **string**
5. Closure in a `.page.js` `hydrate` — serialized with `.toString()` (loses scope); use `clientModule` + `clientProps`. `.biagio` hydrate scripts are emitted from raw source (no toString round-trip).
6. Forgetting `domOrder` in `.page.js`
7. XSS — use `html\`\``; `raw()` only on trusted framework output
8. Ungated trackers — `data-cvw-consent` or `consent=`
9. Fake `baseUrl` — breaks canonical/sitemap/hreflang
10. Editing `dist/` by hand

---

## Commands

```bash
npx biagio dev .
npx biagio build .
npx biagio build . --clean --dryRun
npx biagio explain pages/index.page.biagio
npx biagio new page blog/[slug]
npx biagio new island counter
npx biagio new collection posts
npx biagio doctor .
npx biagio analyze .
npx biagio preview .
npx biagio pull-vitals <url> .
npx create-biagiojs <dir> [--template blog|landing|docs|shop]
npm test    # in the framework repo
```

Deploy: static → Cloudflare Pages / Netlify / Vercel (`dist/`). SSR/ISR → `biagiojs/adapters/node`, `biagiojs/adapters/vercel`, `biagiojs/adapters/cloudflare`. Presets: `site.deploy: 'cloudflare' | 'vercel' | 'netlify'`.

Docs site: `npm run dev:docs` in the framework repo (`biagiojs/docs/`).

TypeScript config: `biagio.config.ts` (requires esbuild or vite). Types: `import type { BiagioConfig } from 'biagiojs/types'`. Config helper: `import { defineConfig } from 'biagiojs/config'`.
