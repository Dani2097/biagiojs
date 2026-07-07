---
title: Fonts
description: Self-hosted Google Fonts, preload, inline CSS and optional subsetting at build time.
order: 9
priority: 0.8
lastmod: 2026-07-07
---

# Fonts

biagiojs downloads Google Fonts at **build time**, rewrites URLs to local `/fonts/*.woff2`, and injects the right `<link>` / `<style>` tags — no render-blocking request to `fonts.googleapis.com` in production.

## Quick config

```js
// biagio.config.js
export default {
  site: {
    fonts: {
      inject: 'inline',       // false | 'stylesheet' | 'async' | 'inline'
      preload: 'critical',    // 'critical' | 'all' | false
      google: [
        { family: 'Inter', weights: [400, 600, 700], role: 'body' },
        { family: 'Fraunces', weights: [700], role: 'display' },
      ],
      subset: false,          // true | 'latin' | { preset, scan, extra }
    },
  },
};
```

On `biagio build`, the pipeline:

1. Fetches CSS from Google (with a woff2-capable User-Agent)
2. Downloads each font file into `dist/fonts/`
3. Writes `dist/fonts/google.css` with local paths
4. Optionally subsets woff2 to glyphs used on your pages
5. Emits preload tags for critical faces (display + body 400 by default)

## Inject modes

| `inject` | Behaviour |
|----------|-----------|
| `false` | No font tags (you manage CSS yourself) |
| `stylesheet` | Classic `<link rel="stylesheet" href="/fonts/google.css">` |
| `async` | Non-blocking load via `media="print" onload` |
| `inline` | Embeds CSS in `<style>` — zero extra round-trip (best LCP) |

## Preload

`preload: 'critical'` (default) preloads up to two woff2 files: the `display` role face and body weight 400.

Override explicitly:

```js
fonts: {
  preload: 'critical',
  preloadCritical: [
    { family: 'Inter', weight: 600 },
    { file: '/fonts/inter-400-normal.woff2' },
  ],
}
```

## Custom CSS URL

If you already have a Google Fonts CSS URL:

```js
google: [{ css: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700&display=swap' }]
```

## Subsetting (optional)

Strip unused glyphs after HTML is rendered — typical savings 40–70%.

```bash
npm i -D subset-font
```

```js
fonts: {
  subset: 'latin',           // or true
  // subset: { preset: 'latin', scan: true, extra: '€©', minSaving: 0.05 },
}
```

`scan: true` collects visible text from built HTML. `extra` adds characters you know you need (currency symbols, etc.). `biagio doctor` warns if subset is enabled without the dependency.

## Allowed domains

Remote font URLs must pass `site.fonts.allowedDomains` (defaults: `fonts.googleapis.com`, `fonts.gstatic.com`).

## Hooks

```js
hooks: {
  beforeFonts({ fontsDir }) { /* mutate before download */ },
  afterFonts({ fontsDir, result }) { /* inspect manifest */ },
}
```

## This docs site

The documentation site sets `fonts: { inject: false }` and uses **system fonts** only — zero web-font bytes on the critical path.

## Cache

Self-hosted fonts live under `/fonts/` and should be served with long cache (`immutable`). See [Deploy & cache](/docs/deploy/) and `DEPLOY-CACHE.md` in the npm package.
