---
title: Optimization loop
description: CrUX pull-vitals, analytics reports, A/B experiments and build-time weight tuning.
order: 11
priority: 0.8
lastmod: 2026-07-07
---

# Optimization loop

biagiojs closes the loop between **production traffic** and **the next build**. Field data in `reports/` recalibrates component weights and hydration thresholds — no manual graph edits.

```
deploy → real users → reports/ → biagio build → tuned HTML → deploy
```

## Report files

Place JSON under `reports/` (watched in dev):

| File | Source | Effect on build |
|------|--------|-----------------|
| `analytics.json` | Your analytics export | `interactionProbability` ← observed CTR per component |
| `heatmap.json` | Attention / scroll maps | `conversionWeight` nudged ±0.2 |
| `searchconsole.json` | GSC top landing components | `seoWeight` +0.15 for matched IDs |
| `crux.json` | CrUX / PageSpeed Insights | Hydration thresholds raised or relaxed |

Example `analytics.json`:

```json
{
  "componentClicks": {
    "hero-cta": 0.18,
    "newsletter": 0.03
  }
}
```

Example `crux.json` (from `pull-vitals`):

```json
{
  "p75": { "lcp": 2800, "inp": 220, "cls": 0.05 }
}
```

Slow field INP/LCP → **less eager hydration** (higher thresholds). Fast sites hydrate more aggressively.

The build log prints every optimizer decision — inspectable, deterministic, no black box.

## `biagio pull-vitals`

Fetch real-user CrUX percentiles into `reports/crux.json`:

```bash
npx biagio pull-vitals https://yoursite.com/ .
```

Optional `PSI_API_KEY` env var for PageSpeed Insights API quota.

Run after deploy (or on a schedule in CI) so the next build reflects how users actually experience the site.

## Per-locale reports

For multilingual sites, override per market:

```
reports/it/analytics.json
reports/de/crux.json
```

See [Internationalization](/docs/i18n/).

## A/B experiments

Server-side assignment — zero flicker, zero CLS, no client-side bucketing JS.

```js
export default function ({ ExperimentEngine, userId }) {
  const ab = new ExperimentEngine({ userId })
    .define('hero_cta', ['control', 'urgency'], { weights: [0.5, 0.5] });

  const cta = ab.pick('hero_cta', {
    control: () => '<button class="btn">Buy</button>',
    urgency: () => '<button class="btn">Buy now — free shipping</button>',
  });

  // … add cta to graph, optionally ab.beacon() in head for analytics
}
```

- Same `userId` → same variant (deterministic FNV hash)
- Output wrapped in `data-cvw-exp` / `data-cvw-variant` for measurement
- `ab.beacon()` exposes `window.__CVW_EXPERIMENTS__` to your analytics tag

Combine experiments with [business weights](/docs/business-weights/): winning variants can inform declared weights in the next iteration.

## `biagio analyze`

After build, inspect what shipped:

```bash
npx biagio analyze
```

Writes `dist/.biagio-analyze.json` — HTML weight per page, island counts, asset totals. Pair with Lighthouse on `biagio preview` for lab vs field comparison.

## Related

- [CLI](/docs/cli/) — all commands
- [Adaptive hydration](/docs/hydration/) — how thresholds change behaviour
- [Business weights](/docs/business-weights/) — declared vs learned weights
