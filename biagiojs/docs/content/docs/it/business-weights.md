---
title: Pesi business
description: conversion, seo, interaction e costi — come il framework decide ordine e idratazione.
order: 5
priority: 0.9
lastmod: 2026-07-07
---

# Pesi business

biagiojs non chiede «come renderizziamo più veloce?» ma «cosa va sul wire prima per massimizzare risultati di business?».

Ogni componente dichiara **pesi** (0–1) e **costi** (numerici). Il framework calcola priorità automaticamente.

## Tabella dei pesi

| Peso | Cosa controlla |
|------|----------------|
| `conversion` | Ordine nel sorgente HTML — ciò che converte arriva prima |
| `seo` | Contenuto SEO-critical, metrica SCRT |
| `interaction` | Probabilità che l'utente interagisca → idratazione |
| `cpu` | Costo rendering (1–10) |
| `network` | KB trasferiti per preload asset |

## Valori di riferimento

Non inventare numeri a caso. Usa questa tabella come guida:

| Tipo componente | conversion | seo | interaction |
|-----------------|------------|-----|-------------|
| Hero / headline | 0.8–0.9 | 1.0 | 0.1–0.2 |
| CTA primario | 1.0 | 0.3 | 0.8–0.9 |
| Prezzo / offerta | 0.9 | 0.8 | 0.1 |
| Contenuto articolo | 0.4 | 1.0 | 0.05 |
| Navigazione | 0.2 | 0.3 | 0.4 |
| Widget chat (300 KB) | 0.05 | 0.1 | 0.03 |
| Footer | 0.05 | 0.1 | 0.02 |

## Formule

**Rendering:** `priorità = businessValue / (cpuCost + 0.5 × memoryCost)`

**Idratazione:** `priorità = interaction × businessValue × cpuAvailability`

**Rete:** `priorità = businessValue / networkCost_KB`

`businessValue` è una combinazione pesata di conversion e seo.

## Esempio concreto

Un widget chat da 300 KB con `conversion="0.05"` e `interaction="0.03"`:

- Priorità idratazione: 0.03 × 0.05 = **0.0015** → sotto soglia lazy (0.05)
- Risultato: **HTML statico, zero JavaScript spedito**

Un CTA con `conversion="1"` e `interaction="0.85"`:

- Priorità: 0.85 × 1.0 = **0.85** → **eager** (idrata subito dopo paint)
- Risultato: interattivo al primo frame utile

## Optimizer e field data

Metti JSON in `reports/` (CrUX, analytics, heatmap) e a ogni build l'optimizer ricalibra `interactionProbability` e le soglie di idratazione in base ai dati reali.

```bash
biagio pull-vitals https://tuosito.it .
```

Il file `reports/crux.json` alimenta soglie più conservative su connessioni lente.

## Regola d'oro

> Statico è il default desiderabile. Ogni `hydrate` deve giustificarsi con un'interazione reale.

Prova il playground interattivo sulla [homepage](/it/) — muovi i cursori e guarda il piano cambiare in tempo reale.
