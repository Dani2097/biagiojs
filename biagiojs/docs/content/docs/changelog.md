---
title: Changelog
description: biagiojs release history.
order: 11
priority: 0.5
lastmod: 2026-07-09
---

# Changelog

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
