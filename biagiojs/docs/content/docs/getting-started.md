---
title: Getting started
description: Three commands to run a biagiojs site locally. Config, pages, build.
order: 1
priority: 0.95
lastmod: 2026-07-09
---

# Getting started

Three commands and you have a site on localhost. `create-biagiojs` handles the scaffolding; you add pages and business weights.

## Install

```bash
npx create-biagiojs my-site
# or with a starter template:
npx create-biagiojs my-site --template blog
```

Templates: `default`, `blog`, `landing`, `shop`, `docs`.

```bash
cd my-site && npm install
npm run dev
```

Dev server runs at **http://localhost:4321**. With `vite` in devDependencies you get HMR and TypeScript; otherwise a built-in fallback with **incremental rebuild**, live CWV overlay and weights inspector.

## First build

```bash
npm run build
```

Output goes to `dist/`: static HTML, sitemap, robots, optimized images. Serve from any CDN.

## Config with IntelliSense

Create `biagio.config.js` at the project root:

```js
import { defineConfig } from 'biagiojs/config';

export default defineConfig({
  site: {
    name: 'My Site',
    baseUrl: 'https://yoursite.com',  // feeds canonical, OG, sitemap
    description: 'A site built with biagiojs',
  },
});
```

For TypeScript: `biagio.config.ts` (requires `esbuild` or `vite` in devDependencies).

## First page

The fastest path is a `.biagio` file in `pages/`:

```html
<page title="Home" description="Welcome" />

<component id="hero" seo="1" conversion="0.8">
  <template>
    <section><h1>Hello world</h1></section>
  </template>
</component>
```

Save as `pages/index.page.biagio` → route `/`.

Or scaffold:

```bash
biagio new page about
biagio new page blog/[slug]
```

## Useful commands

| Command | What it does |
|---------|--------------|
| `biagio dev .` | Dev server (incremental rebuild in fallback mode) |
| `biagio build .` | Production build |
| `biagio explain index.page.biagio` | Render order + hydration plan for one page |
| `biagio doctor .` | Validate config, sharp, pages, links |
| `biagio analyze .` | Post-build weight report |
| `biagio preview .` | Node server with gzip/br |
| `biagio new island counter` | Scaffold `islands/counter.js` |

## Next steps

- [Project structure](/docs/project-structure/)
- [.biagio syntax](/docs/syntax-biagio/)
- [Content collections](/docs/content-collections/)
- [Business weights](/docs/business-weights/)
- [CLI reference](/docs/cli/)
