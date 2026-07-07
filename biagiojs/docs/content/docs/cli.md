---
title: CLI
description: All biagio commands — build, dev, doctor, analyze, preview.
order: 10
priority: 0.75
lastmod: 2026-07-07
---

# CLI

The `biagio` command is the entry point. Run globally or via `npx`:

```bash
npx biagio <command> [directory] [options]
```

## Commands

### `biagio dev [dir]`

Dev server on port 4321. Prefers Vite (HMR, TS) when installed; built-in fallback with SSE live reload.

### `biagio build [dir]`

Production build → `dist/`. Logs render order, hydration plan and image report.

| Flag | Effect |
|------|--------|
| `--clean` | Removes `dist/img/` before pipeline |
| `--dryRun` | Plans images without writing files |

With `site.locales`, builds one variant per language (e.g. `/` and `/it/`).

### `biagio doctor [dir]`

Pre-build validation: config, sharp, pages, baseUrl, consent gating. Exit code 1 on errors.

### `biagio analyze [dir]`

Post-build report in `dist/.biagio-analyze.json`: HTML weight per page, island counts, asset totals.

### `biagio preview [dir] [port]`

Production server (Node adapter). Default port 3000.

| Flag | Effect |
|------|--------|
| `--no-compress` | Disable gzip/brotli |

### `biagio pull-vitals <url> [dir]`

Downloads CrUX/Lighthouse field data → `reports/crux.json`.

### `biagio create <dir>`

Scaffold a new site (alternative to `create-biagiojs`).

## create-biagiojs

```bash
npx create-biagiojs my-site
```

Equivalent to `biagio create` with a fuller template.

## Programmatic exports

```js
import { loadConfig } from 'biagiojs/config';
import { runDoctor } from 'biagiojs/doctor';
import { analyzeDist } from 'biagiojs/analyze';
import { createBiagioServer } from 'biagiojs/adapters/node';
```
