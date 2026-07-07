---
title: JavaScript & TypeScript
description: Pagine programmatiche con PerformanceGraph, getStaticPaths, SSR e ISR.
order: 4
priority: 0.85
lastmod: 2026-07-07
---

# JavaScript & TypeScript

Quando serve logica custom — route dinamiche, A/B test, graph complessi — usa `.page.js` o `.page.ts`.

## Pagina base

```js
import { PerfNode, PerformanceGraph } from 'biagiojs/graph';
import { html } from 'biagiojs/html';

export default function ({ site }) {
  const g = new PerformanceGraph()
    .add(new PerfNode('hero', {
      seoWeight: 1, conversionWeight: 0.8,
      render: () => html`<section><h1>Ciao</h1></section>`.toString(),
    }));

  g.get('hero').domOrder = 0;

  return {
    graph: g,
    page: { title: 'Home', description: site.description },
  };
}
```

## Route dinamiche

```js
export function getStaticPaths({ getCollection }) {
  return getCollection('content/blog').map(post => ({
    params: { slug: post.slug },
    props: { post },
  }));
}

export default function ({ props: { post } }) {
  // usa post.html, post.data.title…
}
```

Se il file contiene `[param]` nel nome ma non esporta `getStaticPaths()`, la build fallisce con errore esplicito.

## SSR on-demand

```js
export const prerender = false;

export default function ({ request, userId }) {
  // renderizzato a ogni richiesta dall'adapter Node/Vercel/Cloudflare
}
```

## ISR (Incremental Static Regeneration)

```js
export const revalidate = 300; // secondi

export default function () { /* … */ }
```

L'adapter Node cachea l'HTML in memoria per `revalidate` secondi.

## TypeScript

File `pages/*.page.ts` richiede `vite` in devDependencies — la build li transpila via `ssrLoadModule`.

Config TypeScript: `biagio.config.ts` con tipi da `biagiojs/types`:

```ts
import type { BiagioConfig } from 'biagiojs/types';

const config: BiagioConfig = {
  site: { name: 'Sito', baseUrl: 'https://example.com' },
};
export default config;
```

## Template tag `html`

```js
import { html, raw } from 'biagiojs/html';

// Escaping automatico
html`<p>Ciao ${userName}</p>`;

// HTML già sicuro (es. output markdown)
html`<article>${raw(post.html)}</article>`;
```

## Quando usare JS vs .biagio

| Situazione | Scelta |
|------------|--------|
| Landing, about, pagine statiche | `.biagio` |
| Blog da Markdown | `.page.js` + `getCollection` |
| A/B test, graph complessi | `.page.js` |
| SSR / ISR | `.page.js` con export speciali |
