---
title: Adaptive hydration
description: Eager, lazy, static — how biagiojs decides which islands ship JS and when.
order: 6
priority: 0.85
lastmod: 2026-07-07
---

# Adaptive hydration

The hydration plan is the heart of biagiojs: it decides **which** islands receive JavaScript and **when** they run.

## Three buckets

| Bucket | Behavior |
|--------|----------|
| **eager** | Hydrates right after first paint |
| **lazy** | Hydrates on `requestIdleCallback` or viewport entry |
| **static** | HTML only — **zero JS shipped** |

## Default thresholds

```
eager  ≥ 0.3
lazy   ≥ 0.05
static < 0.05
```

Priority is `interaction × businessValue`. With slow CrUX (high LCP), thresholds rise automatically.

## Explicit override

The `hydrate` attribute on `<component>` always wins over the scheduler:

| Value | Effect |
|-------|--------|
| `inline` | Module embedded as data-URI — zero network requests |
| `eager` | Force eager |
| `visible` | Force lazy (IntersectionObserver) |
| `idle` | Force lazy (requestIdleCallback) |
| `never` | Never hydrate |

## Content order & accessibility

The hydration priority above governs **when** islands hydrate and the **preload** order — not the physical DOM order. By default the DOM is emitted in reading order (`contentOrder: 'visual'`), so keyboard tab order and screen-reader order match the visual layout (WCAG 2.4.3 / 1.3.2).

Set `contentOrder: 'priority'` to reorder the HTML source by business value (useful for streaming SSR); visual order is restored with CSS flex `order`. Trade-off: flex `order` does **not** change tab/AT order, so in this mode keyboard focus follows the source (priority) order.

## Client runtime

In production the plan is compact:

```js
__CVW_PLAN__ = { e: ["cta"], l: ["nav"] }
```

A single IIFE contains plan, props, island code and hydration runtime. No waterfall of `<script src>` tags.

## Conditional signals

`window.cvw` (signal, effect, computed) is bundled **only** if at least one island uses it. Pages without reactivity get a lighter bundle.

## What the browser sees

- Static nodes: pure HTML, no `data-cvw-id`
- Interactive nodes: `data-cvw-id="cta"` on the wrapper
- After hydration: `data-cvw-hydrated=""`

## Consent gating

Islands with `consent="marketing"` wait until the user accepts. Zero third-party JS on the critical path. See [Consent & cookies](/docs/consent/).

## CrUX feedback

Slow field data raises eager/lazy thresholds automatically. See [Optimization loop](/docs/optimization/).

## Benchmark

In the VELOCE product demo, biagiojs hydrates **1 island** vs **9** for a naive baseline that hydrates everything — **−41% JavaScript** shipped with the same visual result for most users.
