---
title: .biagio syntax
description: Declarative pages with business weights as XML attributes. Zero boilerplate.
order: 3
priority: 0.9
lastmod: 2026-07-07
---

# .biagio syntax

The `.biagio` syntax is the most direct way to write pages: business weights as attributes, HTML templates, inline hydration scripts. No `import`, no graph boilerplate.

## Page anatomy

```html
<page title="Home — My Site"
      description="Welcome to my site."
      sitemapPriority="1.0" />

<component id="hero" seo="1" conversion="0.9" cpu="2">
  <template>
    <section class="hero">
      <h1>Main headline</h1>
      <p>Descriptive subtitle.</p>
    </section>
  </template>
</component>

<component id="cta" conversion="1" interaction="0.85">
  <template>
    <button class="cta" id="buy">Buy now</button>
  </template>
  <script hydrate>
    el.querySelector('#buy').addEventListener('click', () => {
      el.querySelector('#buy').textContent = 'Thanks! ✓';
    });
  </script>
</component>

<style>
  .hero { padding: 80px 24px; text-align: center; }
  .cta { background: #ff4d5a; color: #fff; border: none; padding: 16px 32px; border-radius: 999px; }
</style>
```

## i18n in templates

With `site.locales` configured, use `{{t:key}}` in templates:

```html
<h1>{{t:hero.title}}</h1>
<p>{{t:hero.lead}}</p>
```

Strings live in `locales/en.json`, `locales/it.json`, etc.

## `<page>` attributes

| Attribute | Description |
|-----------|-------------|
| `title` | Document title and meta |
| `description` | Meta description |
| `sitemapPriority` | 0.0–1.0 for sitemap.xml |
| `type` | `product`, `article`… for JSON-LD |
| `image` | OG image |
| `noindex` | Exclude from sitemap |
| `overlay` | Dev metrics (on in dev, off in build) |

## `<component>` attributes

| Attribute | Range | Effect |
|-----------|-------|--------|
| `seo` | 0–1 | SEO-critical content priority |
| `conversion` | 0–1 | Hydration & preload priority |
| `interaction` | 0–1 | Hydration probability |
| `cpu` | 1–10 | Render cost |
| `network` | KB | Network cost for preload |
| `hydrate` | inline/eager/visible/idle/never | Scheduler override |
| `client` | path | External island module |
| `props` | JSON | Props for client island |
| `consent` | category | GDPR gating |

## External islands

For React, Preact or larger modules:

```html
<component id="stock" conversion="0.9" interaction="0.6"
           client="/islands/stock.js" props='{"initial": 5}'>
  <template><div data-react-root>Loading…</div></template>
</component>
```

The module in `islands/` exports `default function (el, props) { … }`.

## Visual order vs render order

By default the DOM is emitted in **file (reading) order**, so visual, keyboard and screen-reader order all match (WCAG 2.4.3 / 1.3.2). Business weights drive **hydration and preload** priority — not the physical DOM order.

Pass `contentOrder: 'priority'` to `renderPage` to reorder the HTML source by business value (a CTA with `conversion="1"` can appear earlier in source), restoring the visual order via CSS flex `order`. This helps streaming SSR, but flex `order` doesn't change tab/AT order — use it deliberately.

## CSS

The `<style>` block is purged and minified at build. Unused classes not in the visible DOM are removed (integrated PurgeCSS).

## Robust parsing

The `.biagio` compiler is a quote-aware tokenizer, not a chain of regexes. It handles `>` inside attribute values (e.g. JSON `props`), nested `<template>`, top-level HTML comments (a commented-out `<component>` is ignored), and multiple `<style>` blocks. Inline `hydrate` scripts are emitted from their raw source — no `Function.prototype.toString` round-trip — and any `</script>` inside them is neutralized so it can't break out of the tag.
