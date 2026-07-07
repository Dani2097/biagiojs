# Changelog — biagiojs

Tutte le modifiche rilevanti al framework sono documentate qui.

Formato basato su [Keep a Changelog](https://keepachangelog.com/). Versioning [SemVer](https://semver.org/).

---

## [Non rilasciato]

---

## [0.10.0] — 2026-07-07

### Aggiunto

- **`biagio doctor`** — validazione progetto pre-build (config, sharp, pagine, consent)
- **`biagio analyze`** — report pesi HTML/JS post-build in `dist/.biagio-analyze.json`
- **`biagio preview`** — server produzione via adapter Node (gzip/brotli)
- **`site.deploy`** — preset Cloudflare / Vercel / Netlify generati alla build
- **Adapter Cloudflare** — `biagiojs/adapters/cloudflare` per Pages Functions
- **Compressione** gzip/brotli sull'adapter Node
- **HMR granulare isole** — `/islands/` servite via Vite `transformRequest` in dev
- **TypeScript** — `biagio.config.ts`, tipi in `biagiojs/types`
- **Documentation site** — `biagiojs/docs/` (bilingual EN/IT, native hreflang + `locales/*.json`), `npm run dev:docs`
- Parser Markdown: blocchi codice e tabelle; `collectImageRefs` ignora `<pre>`
- Benchmark: metrica conversion corretta (usa `data-cvw-id` in prod, non overlay)

### Modificato

- Scaffold e `create-biagiojs` aggiornati a `^0.10.0`

---

## [0.9.0] — 2026-07-07

### Rinominato — primo publish npm come `biagiojs`

- Pacchetto npm **`cvw-first`** → **`biagiojs`** (deprecato su npm)
- CLI **`cvw`** → **`biagio`**
- Scaffolding **`create-cvw`** → **`create-biagiojs`**
- Config **`cvw.config.js`** → **`biagio.config.js`**
- Sintassi **`*.page.cvw`** → **`*.page.biagio`**
- Repository GitHub → [`Dani2097/biagiojs`](https://github.com/Dani2097/biagiojs)
- Monorepo: cartelle `biagiojs/`, `create-biagiojs/`

### Documentazione

- README, AI-GUIDE, CHANGELOG, DEPLOY-CACHE, IMAGE-OPTIMIZATION riscritti
- README monorepo root con workflow publish
- `create-biagiojs/README.md` nuovo

Le API runtime interne (`__CVW_*`, `data-cvw-*`, `window.cvw`) restano invariate.

---

## [0.8.3] — 2026-07-07

### Aggiunto

- Wrapper `<div>` opzionale su nodi statici senza attributi
- Minificatore CSS **lightningcss** (optionalDependency)
- Test nodo statico senza wrapper

### Nota

Dopo purge CSS + minify reale + drop wrapper + Brotli CDN si raggiunge il pavimento pratico SSG.

---

## [0.8.2] — 2026-07-07

### Aggiunto

- Runtime in blocchi `{}` isolati nell'IIFE (niente collisioni `const` post-minify)
- Cache LRU per `minifyClientRuntime()` (max 256 entry)
- Marker metrici (`data-cvw-conversion/seo/revenue`) solo con `overlay: true`

---

## [0.8.1] — 2026-07-06

### Modificato

- Allineamento versione `biagiojs` / `create-biagiojs`
- `renderPage()` documentato come async

---

## [0.8.0] — 2026-07-06

### Performance runtime

- `data-cvw-id` solo su nodi interattivi; `order:0` omesso
- Piano compatto `{"e":["cta"],"l":["nav"]}`
- Signals condizionale; IIFE unico minificato
- Isole inline con `encodeURIComponent`
- Benchmark demo: HTML **21.2 KB → 14.1 KB** (−33%)

### Pipeline DX

- Profili immagine, `bySlug`, `qualityBySlug`, `--clean`, `--dryRun`
- Font self-hosted, `site.cache`, `hooks.head`
- Guide: [IMAGE-OPTIMIZATION.md](./IMAGE-OPTIMIZATION.md), [DEPLOY-CACHE.md](./DEPLOY-CACHE.md)

---

## [0.7.0] — Production hardening

- PurgeCSS fix (`<template>`, `data-cvw-no-purge`)
- Pipeline immagini sharp, validazione srcset
- `.env` in build, immagini remote, font subset opt-in

---

## [0.6.0] — Consent GDPR

- Banner native + vendor ottimizzato
- Consent Mode v2, gating isole/script/iframe

---

[Non rilasciato]: https://github.com/Dani2097/biagiojs/compare/v0.9.0...HEAD
[0.9.0]: https://github.com/Dani2097/biagiojs/releases/tag/v0.9.0
[0.8.3]: https://github.com/Dani2097/biagiojs/releases/tag/v0.8.3
[0.8.2]: https://github.com/Dani2097/biagiojs/releases/tag/v0.8.2
[0.8.1]: https://github.com/Dani2097/biagiojs/releases/tag/v0.8.1
[0.8.0]: https://github.com/Dani2097/biagiojs/releases/tag/v0.8.0
