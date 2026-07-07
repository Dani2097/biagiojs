---
title: Business weights
description: conversion, seo, interaction and costs — how the framework decides order and hydration.
order: 5
priority: 0.9
lastmod: 2026-07-07
---

# Business weights

biagiojs doesn't ask "how do we render faster?" but "what should hit the wire first to maximize business outcomes?"

Every component declares **weights** (0–1) and **costs** (numeric). The framework computes priority automatically.

## Weight table

| Weight | What it controls |
|--------|------------------|
| `conversion` | Order in HTML source — high-converting content arrives first |
| `seo` | SEO-critical content, SCRT metric |
| `interaction` | User interaction probability → hydration |
| `cpu` | Render cost (1–10) |
| `network` | KB transferred for asset preload |

## Reference values

Don't invent random numbers. Use this guide:

| Component type | conversion | seo | interaction |
|----------------|------------|-----|-------------|
| Hero / headline | 0.8–0.9 | 1.0 | 0.1–0.2 |
| Primary CTA | 1.0 | 0.3 | 0.8–0.9 |
| Price / offer | 0.9 | 0.8 | 0.1 |
| Article body | 0.4 | 1.0 | 0.05 |
| Navigation | 0.2 | 0.3 | 0.4 |
| Chat widget (300 KB) | 0.05 | 0.1 | 0.03 |
| Footer | 0.05 | 0.1 | 0.02 |

## Formulas

**Rendering:** `priority = businessValue / (cpuCost + 0.5 × memoryCost)`

**Hydration:** `priority = interaction × businessValue × cpuAvailability`

**Network:** `priority = businessValue / networkCost_KB`

`businessValue` is a weighted combination of conversion and seo.

## Concrete example

A 300 KB chat widget with `conversion="0.05"` and `interaction="0.03"`:

- Hydration priority: 0.03 × 0.05 = **0.0015** → below lazy threshold (0.05)
- Result: **static HTML, zero JavaScript shipped**

A CTA with `conversion="1"` and `interaction="0.85"`:

- Priority: 0.85 × 1.0 = **0.85** → **eager** (hydrates right after paint)

## Optimizer and field data

Put JSON in `reports/` (CrUX, analytics, heatmap) and each build recalibrates `interactionProbability` and hydration thresholds from real data.

```bash
biagio pull-vitals https://yoursite.com .
```

## Golden rule

> Static is the desired default. Every `hydrate` must justify a real interaction.

Try the interactive playground on the [homepage](/) — move the sliders and watch the plan update live.
