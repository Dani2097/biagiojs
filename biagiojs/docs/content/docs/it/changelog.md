---
title: Changelog
description: Storia delle release biagiojs.
order: 11
priority: 0.5
lastmod: 2026-07-09
---

# Changelog

## Unreleased

### Aggiunte

- Pesi `businessValue` configurabili: `BUSINESS_WEIGHTS`, `site.weights`
- `renderPage({ contentOrder })` — `'visual'` (default) o `'priority'`
- Generatore favicon opt-in: `site.favicon = { source, generate: true }`
- **`defineConfig()`** — IntelliSense su `biagio.config.js` via `biagiojs/config`
- **`biagio new`** — scaffold `page`, `island`, `collection`
- **`biagio explain <page>`** — render order e piano idratazione senza build completo
- **Rebuild incrementale in dev** — solo pagine modificate
- **Weights inspector** — slider live nell'overlay dev con export
- **Content collections tipizzate** — `content.config.js`, `defineCollection()`, `draft: true`
- **Link & asset checker** — link rotti e immagini mancanti (build + doctor)
- **`create-biagiojs --template`** — `blog`, `landing`, `docs`, `shop`
- **Estensione VS Code** — `extensions/vscode-biagio/`

### Modifiche

- **Ordine DOM accessibile di default** (`contentOrder: 'visual'`)
- Script hydrate `.biagio` emessi da sorgente grezza
- **Error overlay dev** — `file:riga` per errori compiler

### Sicurezza

- `safeScript()` neutralizza `</script>` nel contenuto inline

### Correzioni

- Parser `.biagio` riscritto come tokenizer quote-aware

---

## 0.10.1 — 2026-07-08

### Correzioni

- SEO: `og:locale`, `hideBreadcrumb`, fallback immagine TechArticle

---

## 0.10.0 — 2026-07-07

### Aggiunte

- `biagio doctor`, `biagio analyze`, `biagio preview`
- Preset `site.deploy` (Cloudflare / Vercel / Netlify)
- Sito documentazione bilingue EN/IT
- Config TypeScript e `biagiojs/types`

Storia completa: [CHANGELOG su GitHub](https://github.com/Dani2097/biagiojs/blob/main/biagiojs/CHANGELOG.md).
