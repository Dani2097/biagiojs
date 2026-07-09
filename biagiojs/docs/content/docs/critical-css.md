---
title: Critical CSS
description: Above-the-fold styles without blocking the network — inline, hooks, and per-page purge.
order: 10
priority: 0.75
lastmod: 2026-07-09
---

# Critical CSS

biagiojs does not ship a separate “critical CSS extractor” yet — and for most island sites you do not need one. The HTML you already emit **is** the critical path: component `<style>` blocks land in source order, and production build **purges** unused rules against the visible DOM.

## What is already critical

1. **Component styles** — `<style>` inside `.biagio` files (or `head` from `.page.js`) are inlined in the HTML response. High `conversion` / `seo` components tend to render earlier in the document.
2. **Per-page purge** — `site.optimize.purge` (default on) strips selectors not used in the rendered page. You keep only CSS that actually paints something.
3. **`hooks.head`** — global snippets (inline `<style>` or `<link>`) apply in **both** `biagio dev` and production build. Use this for resets, layout tokens, or a shared theme file.

```js
// biagio.config.js
export default {
  site: { name: 'My site', baseUrl: 'https://example.com' },
  hooks: {
    head() {
      return `<link rel="stylesheet" href="/theme.css">`;
    },
  },
};
```

Put the file in `public/theme.css` — it is copied to `dist/` at build and served in dev from `/theme.css`.

## Recommended pattern

| Layer | Where | When |
|-------|--------|------|
| Reset + tokens | `hooks.head` (small inline block) or first hero `<style>` | First paint |
| Page / section | `<style>` in `.biagio` components | With that section’s HTML |
| Widget-only CSS | Inside `<template>` or `data-cvw-no-purge` | Not purged; for client-only UI |

Keep the **first** ~14 KB of HTML lean: system fonts or preloaded critical faces ([Fonts](/docs/fonts/)), no render-blocking third-party scripts ([Consent](/docs/consent/)).

## Defer non-critical CSS

For large shared stylesheets:

```html
<link rel="preload" href="/extras.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="/extras.css"></noscript>
```

Return that string from `hooks.head` or a low-priority static component.

## Dev vs build

- **Dev** — styles from `hooks.head` and component `<style>` apply immediately (same as production semantics).
- **Build** — purge + minify shrink each page’s CSS; check output size in `biagio analyze`.

## When to add automatic extraction

Consider a dedicated critical-CSS pipeline only if you have **one huge global stylesheet** shared across hundreds of pages and manual splitting is painful. Until then, component-scoped CSS + purge is simpler and matches the island model.

See also: [Deploy & cache](/docs/deploy/) for `immutable` on `/fonts/` and `/img/`.
