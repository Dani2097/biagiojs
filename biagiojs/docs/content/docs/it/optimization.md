---
title: Loop di ottimizzazione
description: CrUX pull-vitals, report analytics, esperimenti A/B e tuning pesi alla build.
order: 11
priority: 0.8
lastmod: 2026-07-07
---

# Loop di ottimizzazione

biagiojs chiude il ciclo tra **traffico in produzione** e **la build successiva**. I dati di campo in `reports/` ricalibrano i pesi dei componenti e le soglie di idratazione — senza modificare il grafo a mano.

```
deploy → utenti reali → reports/ → biagio build → HTML ottimizzato → deploy
```

## File report

Metti JSON sotto `reports/` (osservati in dev):

| File | Fonte | Effetto sulla build |
|------|-------|---------------------|
| `analytics.json` | Export analytics | `interactionProbability` ← CTR osservato per componente |
| `heatmap.json` | Mappe attenzione / scroll | `conversionWeight` spostato ±0.2 |
| `searchconsole.json` | Componenti top da GSC | `seoWeight` +0.15 per ID corrispondenti |
| `crux.json` | CrUX / PageSpeed Insights | Soglie idratazione alzate o rilassate |

Esempio `analytics.json`:

```json
{
  "componentClicks": {
    "hero-cta": 0.18,
    "newsletter": 0.03
  }
}
```

Esempio `crux.json` (da `pull-vitals`):

```json
{
  "p75": { "lcp": 2800, "inp": 220, "cls": 0.05 }
}
```

INP/LCP lenti nel campo → **meno idratazione eager** (soglie più alte). Siti veloci idratano in modo più aggressivo.

Il log di build stampa ogni decisione dell'optimizer — ispezionabile, deterministico, niente scatola nera.

## `biagio pull-vitals`

Scarica i percentili CrUX reali in `reports/crux.json`:

```bash
npx biagio pull-vitals https://tuosito.com/ .
```

Opzionale variabile `PSI_API_KEY` per la quota API PageSpeed Insights.

Eseguilo dopo il deploy (o in CI su schedule) così la build successiva riflette l'esperienza reale degli utenti.

## Report per locale

Per siti multilingua, override per mercato:

```
reports/it/analytics.json
reports/de/crux.json
```

Vedi [Internazionalizzazione](/it/docs/i18n/).

## Esperimenti A/B

Assegnazione lato server — zero flicker, zero CLS, niente bucketing JS lato client.

```js
export default function ({ ExperimentEngine, userId }) {
  const ab = new ExperimentEngine({ userId })
    .define('hero_cta', ['control', 'urgency'], { weights: [0.5, 0.5] });

  const cta = ab.pick('hero_cta', {
    control: () => '<button class="btn">Compra</button>',
    urgency: () => '<button class="btn">Compra ora — spedizione gratis</button>',
  });

  // … aggiungi cta al graph, opzionalmente ab.beacon() in head per analytics
}
```

- Stesso `userId` → stessa variante (hash FNV deterministico)
- Output wrappato in `data-cvw-exp` / `data-cvw-variant` per la misurazione
- `ab.beacon()` espone `window.__CVW_EXPERIMENTS__` al tag analytics

Combina gli esperimenti con i [pesi business](/it/docs/business-weights/): le varianti vincenti possono informare i pesi dichiarati nell'iterazione successiva.

## `biagio analyze`

Dopo la build, ispeziona cosa è stato spedito:

```bash
npx biagio analyze
```

Scrive `dist/.biagio-analyze.json` — peso HTML per pagina, conteggio isole, totali asset. Abbinalo a Lighthouse su `biagio preview` per confronto lab vs campo.

## Correlati

- [CLI](/it/docs/cli/) — tutti i comandi
- [Idratazione adattiva](/it/docs/hydration/) — come le soglie cambiano il comportamento
- [Pesi business](/it/docs/business-weights/) — pesi dichiarati vs appresi
