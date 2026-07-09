---
title: CLI
description: All biagio commands — build, dev, doctor, explain, new, analyze, preview.
order: 10
priority: 0.75
lastmod: 2026-07-09
---

# CLI

The `biagio` command is the entry point. Run globally or via `npx`:

```bash
npx biagio <command> [directory] [options]
```

## Commands

### `biagio dev [dir]`

Dev server on port **4321**. Prefers Vite (HMR, TS, Vite error overlay) when installed; built-in fallback with SSE live reload.

**Dev-only features** (built-in fallback and overlay pages):

- **Incremental rebuild** — only changed pages are regenerated (full rebuild on config/images/islands changes)
- **CWV overlay** — live Core Web Vitals + biagiojs metrics
- **Weights inspector** — sliders for conversion/seo/interaction; live eager/lazy/static plan; **Export** copies weights to clipboard
- **Error overlay** — compile/render errors in the browser with `file:line`

### `biagio build [dir]`

Production build → `dist/`. Logs render order, hydration plan and image report.

| Flag | Effect |
|------|--------|
| `--clean` | Removes `dist/img/` before pipeline |
| `--dryRun` | Plans images without writing files |

With `site.locales`, builds one variant per language (e.g. `/` and `/it/`).

Production build also validates image refs and internal links/assets.

### `biagio explain <page> [dir]`

Analyze a single page **without a full build**:

```bash
biagio explain index.page.biagio
biagio explain pages/blog/[slug].page.js .
```

Prints render order, hydration plan (eager/lazy/static), per-component business values and estimated island KB.

| Flag | Effect |
|------|--------|
| `--no-reports` | Skip optimizer recalibration from `reports/` |

### `biagio new page|island|collection <name> [dir]`

Scaffold files with correct weights and boilerplate:

```bash
biagio new page about              # → pages/about.page.biagio
biagio new page blog/[slug]        # → pages/blog/[slug].page.js + getStaticPaths
biagio new island counter          # → islands/counter.js
biagio new collection blog         # → content/blog/ + content.config.js
```

### `biagio doctor [dir]`

Pre-build validation: config, sharp, pages, baseUrl, consent gating, **broken internal links** in page sources. Exit code 1 on errors.

### `biagio analyze [dir]`

Post-build report in `dist/.biagio-analyze.json`: HTML weight per page, island counts, asset totals.

### `biagio preview [dir] [port]`

Production server (Node adapter). Default port 3000.

| Flag | Effect |
|------|--------|
| `--no-compress` | Disable gzip/brotli |

### `biagio pull-vitals <url> [dir]`

Downloads CrUX/Lighthouse field data → `reports/crux.json`.

### `biagio create <dir> [--template name]`

Scaffold a new site (alternative to `create-biagiojs`).

| Template | Use case |
|----------|----------|
| `default` | Generic site with `.biagio` homepage + blog example |
| `blog` | Blog with `content.config.js` and `[slug]` route |
| `landing` | High-conversion landing page |
| `shop` | Product page with CTA island |
| `docs` | Documentation-style layout |

## create-biagiojs

```bash
npx create-biagiojs my-site
npx create-biagiojs my-site --template blog
```

Delegates to `biagio create` with the same templates.

## Config with IntelliSense

```js
import { defineConfig } from 'biagiojs/config';

export default defineConfig({
  site: {
    name: 'My Site',
    baseUrl: 'https://example.com',
    description: '…',
  },
});
```

TypeScript: `biagio.config.ts` + `import type { BiagioConfig } from 'biagiojs/types'`.

## Programmatic exports

```js
import { defineConfig, loadConfig } from 'biagiojs/config';
import { defineCollection } from 'biagiojs/content';
import { runDoctor } from 'biagiojs/doctor';
import { analyzeDist } from 'biagiojs/analyze';
import { createBiagioServer } from 'biagiojs/adapters/node';
```

## VS Code extension

Syntax highlight, snippets (`comp`, `comph`, `page`, `island`) and weight-attribute highlighting for `.biagio` files:

`biagiojs/extensions/vscode-biagio/` in the framework repo — install locally or package for the Marketplace.
