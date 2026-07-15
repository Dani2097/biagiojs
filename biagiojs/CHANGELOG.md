# Changelog — biagiojs

All notable changes to the framework are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/). Versioning [SemVer](https://semver.org/).

---

## [0.10.9] — 2026-07-15

### Added

- **`site.optimize.bundleClasses`** — post-SSR deduplication of repeated `class="..."` strings into short aliases when every token has a matching rule in page `<style>` blocks; savings reported in build log and `biagio analyze`
- **Native consent banner customization** — `text.bodyHtml` (raw HTML body, trusted content), `css` (custom CSS appended after the default; inline styles moved to stable, overridable `cvw-consent-*` classes), `categoryLabels`
- **Per-category preferences panel** — "Customize" toggle with one checkbox per category ("necessary" always on) and a "Save preferences" button for granular consent; disable with `preferences: false`
- Dev server reads `PORT` env var as fallback for the default port

### Changed

- **Consent banner default look** — frosted glass background (backdrop blur), slide-up entrance (respects `prefers-reduced-motion`), hover/active states on buttons, preferences panel in a soft inset card
- Scaffold dependency bumped to `^0.10.9`

### Fixed

- **Native consent banner reappearing on every page** — the consent runtime runs before the banner HTML is in the DOM, so its removal was a no-op; the banner's own inline script now re-checks the saved cookie and removes itself

---

## [0.10.8] — 2026-07-13

### Fixed

- **Vercel ISR runtime bundle** — `biagio build` with `site.deploy: 'vercel'` now stages `pages/`, config and optional `lib/`, `islands/`, `theme.js` into `api/_runtime/`; preset uses `includeFiles: "api/_runtime/**"` (root `includeFiles` globs are unreliable for dynamic imports on lambdas)
- **`createVercelHandler(import.meta.url)`** — reads from staged `api/_runtime/`; `?__biagio_diag=1` for production debugging

### Changed

- Scaffold and `create-biagiojs` bumped to `^0.10.8`

### Docs

- Deploy & cache: Vercel staging, `createVercelHandler`, diagnostic endpoint

---

## [0.10.7] — 2026-07-13

### Fixed

- **Vercel adapter `projectDir`** — export `projectDirFromApi(import.meta.url)`; `process.cwd()` on Vercel lambdas is not the site root, so `pages/` was missing at runtime (ISR/SSR returned 404)
- **Vercel preset `includeFiles`** — comma-separated string (Vercel schema requires string, not array)

### Changed

- Scaffold and `create-biagiojs` bumped to `^0.10.7`

---

## [0.10.6] — 2026-07-13

### Added

- **ISR on adapter deploy** — pages with `export const revalidate` are no longer written to `dist/` when `site.deploy` is set; stale HTML from prior builds is removed; HTML is served by the platform adapter with `s-maxage` / stale-while-revalidate
- **`createHandler` `cacheTags` option** (Vercel adapter) — optional `(url, meta) => string[]` callback; sets `Cache-Tag` for CDN purge integrations
- **`resolveRequestUrl`** exported from `biagiojs/adapters/vercel` — reliable path resolution from Vercel rewrites (`__path`), `x-biagio-path` header, or direct pathname

### Changed

- **Vercel deploy preset** — `vercel.json` now includes split rewrites for `/` vs other paths, `trailingSlash: true`, and `functions.includeFiles` for SSR runtime
- Scaffold and `create-biagiojs` bumped to `^0.10.6`

### Docs

- **Deploy & cache** (EN/IT): Vercel ISR routing, preset fields, `cacheTags` example

---

## [0.10.5] — 2026-07-09

### Changed

- **Lazy hydration idle cap** — `requestIdleCallback` timeout and `setTimeout` fallback reduced from 2s to **1.5s** so below-the-fold islands hydrate sooner when the main thread stays busy
- Scaffold and `create-biagiojs` bumped to `^0.10.5`

### Docs

- **Critical CSS** guide (EN/IT): `hooks.head`, inline component styles, per-page purge, defer pattern
- **Hydration** docs: document 1.5s lazy idle maximum

---

## [0.10.4] — 2026-07-09

### Fixed

- **`hooks.head` in dev/SSR** — `renderRequest()` (Vite dev, preview, on-demand adapters) now applies `hooks.head` from `biagio.config.js`, same as production build

### Changed

- Scaffold and `create-biagiojs` bumped to `^0.10.4`

---

## [0.10.3] — 2026-07-09

### Fixed

- **Link & asset checker** — expands internal routes with locale prefixes from `site.locales`, so multilingual builds (e.g. `/it/docs/`) no longer fail with false positives

### Changed

- Scaffold and `create-biagiojs` bumped to `^0.10.3`

---

## [0.10.2] — 2026-07-09

### Added

- **Configurable weights** — `BUSINESS_WEIGHTS` (the `businessValue` coefficients) exported from `biagiojs/graph`, `normalizeBusinessWeights()`, and per-node or config overrides (`site.weights` / `compileBiagio(src, file, { weights })`). The coefficients are no longer magic numbers buried in the code: a single, documented, recalibratable knob.
- **`renderPage({ contentOrder })`** — `'visual'` (default) or `'priority'`.
- **Favicon generator (opt-in)** — `site.favicon = { source, generate: true }` builds the modern essential set (`favicon.ico`, `icon.svg`, `apple-touch-icon.png`, PWA `icon-192/512.png` + `manifest.webmanifest`) at build time via sharp, with an inline zero-dependency ICO encoder. Selectable `targets`, idempotent, wired into `doctor`. Enabled by default in the `create-biagiojs` scaffold (ships a placeholder `images/logo.svg`). Module: `biagiojs/favicon`.
- **`defineConfig()`** — wrapper `import { defineConfig } from 'biagiojs/config'` per IntelliSense su `biagio.config.js`
- **`biagio new`** — generatori `page`, `island`, `collection` con scheletro e pesi preimpostati
- **`biagio explain <page>`** — render order, piano hydration e KB isole senza build completo
- **Rebuild incrementale in dev** — rigenera solo le pagine toccate (fallback full su config/images/islands)
- **Error overlay migliorato** — file:riga per errori compiler `.biagio` nel dev server integrato
- **Weights inspector** — slider pesi nell'overlay dev con export negli appunti
- **Content collections tipizzate** — `content.config.js` + `defineCollection({ schema })`, validazione a build
- **`draft: true`** — escluso in produzione, visibile in dev
- **Link & asset checker** — link interni rotti e immagini mancanti (build + doctor)
- **`create-biagiojs --template`** — `blog|landing|docs|shop`
- **Estensione VS Code** — `extensions/vscode-biagio/` (syntax, snippet, attributi peso)

### Changed

- **Accessibility (DOM order)** — by default the DOM follows reading order (`contentOrder: 'visual'`), so tab order and screen readers are correct (WCAG 2.4.3 / 1.3.2). Reordering by business value stays available with `contentOrder: 'priority'` (useful for streaming SSR). Business priority still drives **hydration and preload** in both modes.
- **Hydrate emission** — `.biagio` `hydrate` scripts are emitted from their raw source, without a `Function.prototype.toString()` round-trip (robust across engines and minifiers). `new Function` remains only as a build-time syntax validator.
- Scaffold and `create-biagiojs` bumped to `^0.10.2`

### Security

- **`<script>` break-out prevention** — `safeScript()` neutralizes `</script>` sequences in all inline-injected content (island hydrate, props JSON, plans): a hydrate containing `</script>` no longer breaks out of the tag.

### Fixed

- **`.biagio` parser** — rewritten as a quote-aware tokenizer instead of a chain of regexes: it handles `>` inside attributes, nested `<template>`, top-level HTML comments (a commented-out component is no longer compiled), and multiple concatenated `<style>` blocks.

---

## [0.10.1] — 2026-07-08

### Fixed

- **SEO** — `og:locale` per locale (`en_US` / `it_IT`), `page.hideBreadcrumb` to avoid a duplicate breadcrumb in JSON-LD, image fallback on `TechArticle`

### Documentation

- Docs site: `/llms.txt`, AI agents page, mobile accordion nav, `og.png`, Google Search Console verification
- npm README: «For AI agents» section

### Changed

- Scaffold and `create-biagiojs` bumped to `^0.10.1`

---

## [0.10.0] — 2026-07-07

### Added

- **`biagio doctor`** — pre-build project validation (config, sharp, pages, consent)
- **`biagio analyze`** — post-build HTML/JS weight report in `dist/.biagio-analyze.json`
- **`biagio preview`** — production server via the Node adapter (gzip/brotli)
- **`site.deploy`** — Cloudflare / Vercel / Netlify presets generated at build
- **Cloudflare adapter** — `biagiojs/adapters/cloudflare` for Pages Functions
- **Compression** — gzip/brotli on the Node adapter
- **Granular island HMR** — `/islands/` served via Vite `transformRequest` in dev
- **TypeScript** — `biagio.config.ts`, types in `biagiojs/types`
- **Documentation site** — `biagiojs/docs/` (bilingual EN/IT, native hreflang + `locales/*.json`), `npm run dev:docs`
- Markdown parser: code fences and tables; `collectImageRefs` ignores `<pre>`
- Benchmark: corrected conversion metric (uses `data-cvw-id` in prod, not the overlay)

### Changed

- Scaffold and `create-biagiojs` bumped to `^0.10.0`

---

## [0.9.0] — 2026-07-07

### Renamed — first npm publish as `biagiojs`

- npm package **`cvw-first`** → **`biagiojs`** (deprecated on npm)
- CLI **`cvw`** → **`biagio`**
- Scaffolding **`create-cvw`** → **`create-biagiojs`**
- Config **`cvw.config.js`** → **`biagio.config.js`**
- Syntax **`*.page.cvw`** → **`*.page.biagio`**
- GitHub repository → [`Dani2097/biagiojs`](https://github.com/Dani2097/biagiojs)
- Monorepo: `biagiojs/`, `create-biagiojs/` folders

### Documentation

- README, AI-GUIDE, CHANGELOG, DEPLOY-CACHE, IMAGE-OPTIMIZATION rewritten
- Monorepo root README with publish workflow
- New `create-biagiojs/README.md`

Internal runtime APIs (`__CVW_*`, `data-cvw-*`, `window.cvw`) are unchanged.

---

## [0.8.3] — 2026-07-07

### Added

- Optional `<div>` wrapper on static nodes without attributes
- **lightningcss** CSS minifier (optionalDependency)
- Test for a static node without a wrapper

### Note

After CSS purge + real minify + wrapper drop + CDN Brotli, the practical SSG floor is reached.

---

## [0.8.2] — 2026-07-07

### Added

- Runtime in isolated `{}` blocks inside the IIFE (no post-minify `const` collisions)
- LRU cache for `minifyClientRuntime()` (max 256 entries)
- Metric markers (`data-cvw-conversion/seo/revenue`) only with `overlay: true`

---

## [0.8.1] — 2026-07-06

### Changed

- Version alignment between `biagiojs` / `create-biagiojs`
- `renderPage()` documented as async

---

## [0.8.0] — 2026-07-06

### Runtime performance

- `data-cvw-id` only on interactive nodes; `order:0` omitted
- Compact plan `{"e":["cta"],"l":["nav"]}`
- Conditional signals; single minified IIFE
- Inline islands with `encodeURIComponent`
- Demo benchmark: HTML **21.2 KB → 14.1 KB** (−33%)

### Pipeline DX

- Image profiles, `bySlug`, `qualityBySlug`, `--clean`, `--dryRun`
- Self-hosted fonts, `site.cache`, `hooks.head`
- Guides: [IMAGE-OPTIMIZATION.md](./IMAGE-OPTIMIZATION.md), [DEPLOY-CACHE.md](./DEPLOY-CACHE.md)

---

## [0.7.0] — Production hardening

- PurgeCSS fix (`<template>`, `data-cvw-no-purge`)
- sharp image pipeline, srcset validation
- `.env` in build, remote images, opt-in font subset

---

## [0.6.0] — GDPR consent

- Native banner + optimized vendor
- Consent Mode v2, island/script/iframe gating

---

[Unreleased]: https://github.com/Dani2097/biagiojs/compare/v0.9.0...HEAD
[0.9.0]: https://github.com/Dani2097/biagiojs/releases/tag/v0.9.0
[0.8.3]: https://github.com/Dani2097/biagiojs/releases/tag/v0.8.3
[0.8.2]: https://github.com/Dani2097/biagiojs/releases/tag/v0.8.2
[0.8.1]: https://github.com/Dani2097/biagiojs/releases/tag/v0.8.1
[0.8.0]: https://github.com/Dani2097/biagiojs/releases/tag/v0.8.0
