---
title: Idratazione adattiva
description: Eager, lazy, static — come biagiojs decide quali isole spedire e quando.
order: 6
priority: 0.85
lastmod: 2026-07-07
---

# Idratazione adattiva

Il piano di idratazione è il cuore di biagiojs: decide **quali** isole ricevono JavaScript e **quando** lo eseguono.

## I tre bucket

| Bucket | Comportamento |
|--------|---------------|
| **eager** | Idrata subito dopo il primo paint |
| **lazy** | Idrata su `requestIdleCallback` o quando entra nel viewport |
| **static** | Solo HTML — **zero JS spedito** |

## Soglie default

```
eager  ≥ 0.3
lazy   ≥ 0.05
static < 0.05
```

La priorità è `interaction × businessValue`. Con CrUX lento (LCP alto), le soglie si alzano automaticamente.

## Override esplicito

L'attributo `hydrate` su `<component>` vince sempre sullo scheduler:

| Valore | Effetto |
|--------|---------|
| `inline` | Modulo embedded come data-URI — zero richieste di rete |
| `eager` | Forza eager |
| `visible` | Forza lazy (IntersectionObserver) |
| `idle` | Forza lazy (requestIdleCallback) |
| `never` | Mai idratare |

## Runtime client

In produzione il piano è compatto:

```js
__CVW_PLAN__ = { e: ["cta"], l: ["nav"] }
```

Un solo IIFE contiene piano, props, codice isole e hydration runtime. Niente waterfall di `<script src>`.

## Signals condizionali

`window.cvw` (signal, effect, computed) viene incluso nel bundle **solo** se almeno un'isola lo usa. Pagine senza reattività → bundle più leggero.

## Cosa vede il browser

- Nodi statici: HTML puro, nessun `data-cvw-id`
- Nodi interattivi: `data-cvw-id="cta"` sul wrapper
- Dopo idratazione: `data-cvw-hydrated=""`

## Consent gating

Isole con `consent="marketing"` (o altra categoria) restano in attesa finché l'utente non accetta. Zero JS di terze parti sul critical path. Vedi [Consent & cookie](/it/docs/consent/).

## CrUX feedback

Dati di campo lenti alzano automaticamente le soglie eager/lazy. Vedi [Loop di ottimizzazione](/it/docs/optimization/).

## Benchmark

Nella demo prodotto VELOCE, biagiojs idrata **1 isola** vs **9** della baseline naive che idrata tutto — **−41% di JavaScript** spedito, stesso risultato visivo per l'utente medio.
