---
title: Changelog
description: biagiojs release history.
order: 11
priority: 0.5
lastmod: 2026-07-15
---

# Changelog

## 0.10.9 — 2026-07-15

### Added

- **`site.optimize.bundleClasses`** — post-SSR dedup of repeated `class="..."` strings into short aliases
- **Consent banner customization** — `text.bodyHtml` (raw HTML body), `css` (custom CSS over stable `cvw-consent-*` classes), `categoryLabels`
- **Per-category preferences panel** — granular consent with "Save preferences"; opt out with `preferences: false`

### Fixed

- **Consent banner reappearing on every page** after a saved choice — the banner now re-checks the cookie itself

### Changed

- **Consent banner default look** — backdrop blur, slide-up entrance, button hover states, inset preferences card

---

## 0.10.8 — 2026-07-13

### Fixed

- **Vercel ISR runtime** — `biagio build` stages `api/_runtime/`; `createVercelHandler(import.meta.url)`; preset `includeFiles: api/_runtime/**`

### Docs

- Deploy & cache: Vercel staging and diagnostics

---

## 0.10.6 — 2026-07-13

### Added

- **ISR on Vercel** — `revalidate` pages skip `dist/` when `site.deploy` is set; adapter serves with CDN cache headers
- **`cacheTags`** option on Vercel `createHandler` for on-demand purge
- **`resolveRequestUrl`** exported from Vercel adapter

### Changed

- Vercel deploy preset: split rewrites, `trailingSlash`, `includeFiles`

### Docs

- Deploy & cache: Vercel ISR routing guide (EN/IT)

---

## 0.10.5 — 2026-07-09

### Docs

- Guida **Critical CSS** (EN/IT)
- **Hydration**: tetto idle lazy 1,5s documentato

### Changed

- Cap idle idratazione lazy: 2s → **1,5s**

---

## 0.10.4 — 2026-07-09

### Fixed

- **`hooks.head` in dev** — global CSS/links from `biagio.config.js` `hooks.head` now apply in `biagio dev` and SSR paths, not only at build time

---

## 0.10.3 — 2026-07-09

### Fixed

- Link & asset checker: locale-prefixed routes (`/it/docs/`, etc.) recognized when `site.locales` is set — fixes false build failures on multilingual sites

---

## 0.10.2 — 2026-07-09

### Added

- Configurable `businessValue` weights: `BUSINESS_WEIGHTS`, `normalizeBusinessWeights()`, `site.weights` override
- `renderPage({ contentOrder })` — `'visual'` (default) or `'priority'`
- Favicon generator (opt-in): `site.favicon = { source, generate: true }`
- **`defineConfig()`** — IntelliSense on `biagio.config.js` via `biagiojs/config`
- **`biagio new`** — scaffold `page`, `island`, `collection`
- **`biagio explain <page>`** — render order and hydration plan without full build
- **Incremental dev rebuild** — only changed pages (full rebuild on config/images/islands)
- **Weights inspector** — live sliders in dev overlay with export
- **Typed content collections** — `content.config.js`, `defineCollection()`, `draft: true`
- **Link & asset checker** — broken internal links and missing images (build + doctor)
- **`create-biagiojs --template`** — `blog`, `landing`, `docs`, `shop`
- **VS Code extension** — `extensions/vscode-biagio/` (syntax, snippets)

### Changed

- **Accessible DOM order by default** (`contentOrder: 'visual'`)
- `.biagio` hydrate scripts emitted from raw source (no `toString` round-trip)
- **Dev error overlay** — `file:line` for compiler errors

### Security

- `safeScript()` neutralizes `</script>` in all inline-injected content

### Fixed

- `.biagio` parser rewritten as a quote-aware tokenizer

---

## 0.10.1 — 2026-07-08

### Fixed

- SEO: `og:locale` per locale (`en_US` / `it_IT`), `hideBreadcrumb`, TechArticle image fallback

### Documentation

- `/llms.txt`, `/docs/ai-agents/`, mobile docs nav (accordion), `og.png`, GSC verification

---

## 0.10.0 — 2026-07-07

### Added

- `biagio doctor`, `biagio analyze`, `biagio preview`
- `site.deploy` presets (Cloudflare / Vercel / Netlify)
- Documentation site (bilingual EN/IT)
- TypeScript config and `biagiojs/types`

Full history: [GitHub CHANGELOG](https://github.com/Dani2097/biagiojs/blob/main/biagiojs/CHANGELOG.md).
