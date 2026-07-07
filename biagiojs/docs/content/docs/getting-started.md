---
title: Getting started
description: Three commands to run a biagiojs site locally. Config, pages, build.
order: 1
priority: 0.95
lastmod: 2026-07-07
---

# Getting started

Three commands and you have a site on localhost. `create-biagiojs` handles the scaffolding; you add pages and business weights.

## Install

```bash
npx create-biagiojs my-site
cd my-site && npm install
npm run dev
```

Dev server runs at **http://localhost:4321**. With `vite` in devDependencies you get HMR and TypeScript; otherwise a built-in fallback with live reload.

## First build

```bash
npm run build
```

Output goes to `dist/`: static HTML, sitemap, robots, optimized images. Serve from any CDN.

## Minimal config

Create `biagio.config.js` at the project root:

```js
export default {
  site: {
    name: 'My Site',
    baseUrl: 'https://biagio.danilosprovieri.com',  // feeds canonical, OG, sitemap
    description: 'A site built with biagiojs',
  },
};
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

## Useful commands

| Command | What it does |
|---------|--------------|
| `biagio dev .` | Dev server |
| `biagio build .` | Production build |
| `biagio doctor .` | Validate config, sharp, pages |
| `biagio analyze .` | Post-build weight report |
| `biagio preview .` | Node server with gzip/br |

## Next steps

- [Project structure](/docs/project-structure/)
- [.biagio syntax](/docs/syntax-biagio/)
- [Business weights](/docs/business-weights/)
