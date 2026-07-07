---
title: JavaScript & TypeScript
description: Programmatic pages with PerformanceGraph, getStaticPaths, SSR and ISR.
order: 4
priority: 0.85
lastmod: 2026-07-07
---

# JavaScript & TypeScript

When you need custom logic — dynamic routes, A/B tests, complex graphs — use `.page.js` or `.page.ts`.

## Basic page

```js
import { PerfNode, PerformanceGraph } from 'biagiojs/graph';
import { html } from 'biagiojs/html';

export default function ({ site, t, locale }) {
  const g = new PerformanceGraph()
    .add(new PerfNode('hero', {
      seoWeight: 1, conversionWeight: 0.8,
      render: () => html`<section><h1>${t('hero.title')}</h1></section>`.toString(),
    }));

  g.get('hero').domOrder = 0;

  return {
    graph: g,
    page: { title: 'Home', description: site.description },
  };
}
```

## Dynamic routes

```js
export function getStaticPaths({ getCollection }) {
  return getCollection('content/blog').map(post => ({
    params: { slug: post.slug },
    props: { post },
  }));
}

export default function ({ props: { post } }) {
  // post.html, post.data.title…
}
```

If the filename contains `[param]` but `getStaticPaths()` is missing, the build fails with an explicit error.

## SSR on-demand

```js
export const prerender = false;

export default function ({ request, userId }) {
  // rendered per request by Node/Vercel/Cloudflare adapter
}
```

## ISR

```js
export const revalidate = 300; // seconds
```

The Node adapter caches HTML in memory for `revalidate` seconds.

## TypeScript

`pages/*.page.ts` requires `vite` in devDependencies.

```ts
import type { BiagioConfig } from 'biagiojs/types';

const config: BiagioConfig = {
  site: { name: 'Site', baseUrl: 'https://example.com', locales: ['en', 'it'], defaultLocale: 'en' },
};
export default config;
```

## `html` template tag

```js
import { html, raw } from 'biagiojs/html';

html`<p>Hello ${userName}</p>`;           // auto-escaped
html`<article>${raw(post.html)}</article>`; // trusted HTML (e.g. markdown output)
```

## When to use JS vs .biagio

| Situation | Choice |
|-----------|--------|
| Landing, about, static pages | `.biagio` |
| Blog from Markdown | `.page.js` + `getCollection` |
| A/B tests, complex graphs | `.page.js` |
| SSR / ISR | `.page.js` with special exports |
| Multilingual UI strings | either — `{{t:}}` in `.biagio`, `t()` in JS |
