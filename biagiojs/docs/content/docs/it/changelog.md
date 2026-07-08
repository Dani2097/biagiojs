---
title: Changelog
description: Storico versioni biagiojs.
order: 11
priority: 0.5
lastmod: 2026-07-07
---

# Changelog

## 0.10.0 — 2026-07-07

### Aggiunto

- `biagio doctor` — validazione progetto pre-build
- `biagio analyze` — report pesi post-build
- `biagio preview` — server produzione con gzip/brotli
- `site.deploy` — preset Cloudflare / Vercel / Netlify
- Adapter Cloudflare per Pages Functions
- Compressione gzip/brotli sull'adapter Node
- HMR granulare isole in dev
- `biagio.config.ts` e tipi in `biagiojs/types`
- Sito documentazione (questo sito)
- Parser Markdown: blocchi codice e tabelle

### Sito docs (aggiornamenti)

- Guide: font, consent, i18n, optimization loop
- `/llms.txt` e `/docs/ai-agents/` per agenti LLM
- SEO: `og.png`, `og:locale` (`en_US`/`it_IT`), `hideBreadcrumb`
- Nav mobile docs: sezioni accordion
- README in inglese, link sito in navbar

---

## 0.9.0 — 2026-07-07

### Rinominato

Primo publish npm come `biagiojs` (ex cvw-first). CLI `biagio`, config `biagio.config.js`, sintassi `.page.biagio`.

---

## 0.8.x

- PurgeCSS + minify integrati
- Wrapper opzionale su nodi statici
- Runtime compatto con piano `{e,l}`
- Marker metrici solo in dev overlay
- Font subset con `subset-font`

---

Per lo storico completo: [CHANGELOG su GitHub](https://github.com/Dani2097/biagiojs/blob/main/biagiojs/CHANGELOG.md).
