---
title: Changelog
description: biagiojs release history.
order: 11
priority: 0.5
lastmod: 2026-07-08
---

# Changelog

## 0.10.1 — 2026-07-08

### Fixed

- SEO: `og:locale` per locale (`en_US` / `it_IT`), `hideBreadcrumb`, TechArticle image fallback

### Documentation

- `/llms.txt`, `/docs/ai-agents/`, mobile docs nav (accordion), `og.png`, GSC verification
- npm README: «For AI agents» section

---

## 0.10.0 — 2026-07-07

### Added

- `biagio doctor`, `biagio analyze`, `biagio preview`
- `site.deploy` presets (Cloudflare / Vercel / Netlify)
- Cloudflare adapter for Pages Functions
- gzip/brotli on Node adapter
- Granular island HMR in dev
- `biagio.config.ts` and `biagiojs/types`
- Documentation site (`biagiojs/docs/`) — bilingual EN/IT with native i18n
- Markdown parser: code fences and tables

---

## 0.9.0 — 2026-07-07

First npm publish as `biagiojs` (formerly cvw-first). CLI `biagio`, config `biagio.config.js`, `.page.biagio` syntax.

---

## 0.8.x

- Integrated PurgeCSS + minify
- Optional wrapper on static nodes
- Compact runtime with `{e,l}` plan
- Dev-only metric markers
- Font subset via `subset-font`

---

Full history: [CHANGELOG on GitHub](https://github.com/Dani2097/biagiojs/blob/main/biagiojs/CHANGELOG.md).
