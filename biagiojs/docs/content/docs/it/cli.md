---
title: CLI
description: Tutti i comandi biagio — build, dev, doctor, analyze, preview.
order: 10
priority: 0.75
lastmod: 2026-07-07
---

# CLI

Il comando `biagio` è il punto di ingresso. Installato globalmente o via `npx`:

```bash
npx biagio <comando> [directory] [opzioni]
```

## Comandi

### `biagio dev [dir]`

Dev server su porta 4321. Preferisce Vite (HMR, TS) se installato; fallback integrato con live reload SSE.

### `biagio build [dir]`

Build produzione → `dist/`. Log con render order, piano idratazione e report immagini.

| Flag | Effetto |
|------|---------|
| `--clean` | Rimuove `dist/img/` prima della pipeline |
| `--dryRun` | Pianifica immagini senza scrivere file |

### `biagio doctor [dir]`

Validazione pre-build:

- Config presente e caricabile
- `sharp` se `images/` non vuota
- Pagine in `pages/`
- `baseUrl` non placeholder
- Script/iframe senza gating consent

Exit code 1 se ci sono errori.

### `biagio analyze [dir]`

Report post-build in `dist/.biagio-analyze.json`:

- Peso HTML per pagina
- Numero isole e piano idratazione
- Totali img/, islands/, fonts/

### `biagio preview [dir] [port]`

Server produzione (adapter Node). Default porta 3000.

| Flag | Effetto |
|------|---------|
| `--no-compress` | Disabilita gzip/brotli |

### `biagio pull-vitals <url> [dir]`

Scarica field data CrUX/Lighthouse → `reports/crux.json`. Alimenta l'optimizer alla build successiva.

### `biagio create <dir>`

Scaffolding nuovo sito (alternativa a `create-biagiojs`).

## create-biagiojs

```bash
npx create-biagiojs mio-sito
```

Equivalente a `biagio create` con template più completo.

## Export programmatici

```js
import { loadConfig } from 'biagiojs/config';
import { runDoctor } from 'biagiojs/doctor';
import { analyzeDist } from 'biagiojs/analyze';
import { createBiagioServer } from 'biagiojs/adapters/node';
```
