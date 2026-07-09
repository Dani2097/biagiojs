---
title: CLI
description: Tutti i comandi biagio — build, dev, doctor, explain, new, analyze, preview.
order: 10
priority: 0.75
lastmod: 2026-07-09
---

# CLI

Il comando `biagio` è il punto di ingresso. Installato globalmente o via `npx`:

```bash
npx biagio <comando> [directory] [opzioni]
```

## Comandi

### `biagio dev [dir]`

Dev server su porta **4321**. Preferisce Vite (HMR, TS, error overlay Vite) se installato; fallback integrato con live reload SSE.

**Solo in dev** (fallback integrato e pagine con overlay):

- **Rebuild incrementale** — rigenera solo le pagine modificate (full rebuild su config/images/islands)
- **Overlay CWV** — Core Web Vitals live + metriche biagiojs
- **Weights inspector** — slider conversion/seo/interaction; piano eager/lazy/static in tempo reale; **Esporta** copia i pesi
- **Error overlay** — errori compile/render nel browser con `file:riga`

### `biagio build [dir]`

Build produzione → `dist/`. Log con render order, piano idratazione e report immagini.

| Flag | Effetto |
|------|---------|
| `--clean` | Rimuove `dist/img/` prima della pipeline |
| `--dryRun` | Pianifica immagini senza scrivere file |

In produzione valida anche riferimenti immagini e link/asset interni.

### `biagio explain <page> [dir]`

Analizza **una sola pagina** senza build completo:

```bash
biagio explain index.page.biagio
biagio explain pages/blog/[slug].page.js .
```

Stampa render order, piano idratazione (eager/lazy/static), business value per componente e KB isole stimate.

| Flag | Effetto |
|------|--------|
| `--no-reports` | Salta ricalibrazione optimizer da `reports/` |

### `biagio new page|island|collection <nome> [dir]`

Crea file con pesi e boilerplate corretti:

```bash
biagio new page about              # → pages/about.page.biagio
biagio new page blog/[slug]        # → pages/blog/[slug].page.js + getStaticPaths
biagio new island counter          # → islands/counter.js
biagio new collection blog         # → content/blog/ + content.config.js
```

### `biagio doctor [dir]`

Validazione pre-build:

- Config presente e caricabile
- `sharp` se `images/` non vuota
- Pagine in `pages/`
- `baseUrl` non placeholder
- Script/iframe senza gating consent
- **Link interni rotti** nei sorgenti pagina

Exit code 1 se ci sono errori.

### `biagio analyze [dir]`

Report post-build in `dist/.biagio-analyze.json`.

### `biagio preview [dir] [port]`

Server produzione (adapter Node). Default porta 3000.

| Flag | Effetto |
|------|--------|
| `--no-compress` | Disabilita gzip/brotli |

### `biagio pull-vitals <url> [dir]`

Scarica field data CrUX/Lighthouse → `reports/crux.json`.

### `biagio create <dir> [--template nome]`

Scaffolding nuovo sito.

| Template | Uso |
|----------|-----|
| `default` | Sito generico con homepage `.biagio` + esempio blog |
| `blog` | Blog con `content.config.js` e route `[slug]` |
| `landing` | Landing ad alta conversione |
| `shop` | Pagina prodotto con isola CTA |
| `docs` | Layout stile documentazione |

## create-biagiojs

```bash
npx create-biagiojs mio-sito
npx create-biagiojs mio-sito --template blog
```

## Config con IntelliSense

```js
import { defineConfig } from 'biagiojs/config';

export default defineConfig({
  site: {
    name: 'Il Mio Sito',
    baseUrl: 'https://example.com',
    description: '…',
  },
});
```

TypeScript: `biagio.config.ts` + `import type { BiagioConfig } from 'biagiojs/types'`.

## Export programmatici

```js
import { defineConfig, loadConfig } from 'biagiojs/config';
import { defineCollection } from 'biagiojs/content';
import { runDoctor } from 'biagiojs/doctor';
import { analyzeDist } from 'biagiojs/analyze';
import { createBiagioServer } from 'biagiojs/adapters/node';
```

## Estensione VS Code

Syntax highlight, snippet (`comp`, `comph`, `page`, `island`) e attributi peso per file `.biagio`:

`biagiojs/extensions/vscode-biagio/` nel repo del framework.
