---
title: Changelog
description: Storia delle release biagiojs.
order: 11
priority: 0.5
lastmod: 2026-07-09
---

# Changelog

## 0.10.5 — 2026-07-09

### Docs

- Guida **Critical CSS** (EN/IT)
- **Idratazione**: tetto idle lazy 1,5s documentato

### Modifiche

- Cap idle idratazione lazy: 2s → **1,5s**

---

## 0.10.4 — 2026-07-09

### Corretto

- **`hooks.head` in dev** — CSS/link globali da `hooks.head` in `biagio.config.js` applicati anche in `biagio dev` e SSR, non solo in build

---

## 0.10.3 — 2026-07-09

### Corretto

- Link & asset checker: route con prefisso lingua (`/it/docs/`, ecc.) riconosciute quando `site.locales` è configurato — niente più falsi errori in build multilingua

---

## 0.10.2 — 2026-07-09

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
