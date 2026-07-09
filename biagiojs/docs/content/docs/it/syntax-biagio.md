---
title: Sintassi .biagio
description: Pagine dichiarative con pesi business come attributi XML. Zero boilerplate.
order: 3
priority: 0.9
lastmod: 2026-07-07
---

# Sintassi .biagio

La sintassi `.biagio` è il modo più diretto per scrivere pagine: pesi business come attributi, template HTML, script di idratazione inline. Niente `import`, niente graph boilerplate.

## Anatomia di una pagina

```html
<page title="Home — Il Mio Sito"
      description="Benvenuto sul mio sito."
      sitemapPriority="1.0" />

<component id="hero" seo="1" conversion="0.9" cpu="2">
  <template>
    <section class="hero">
      <h1>Titolo principale</h1>
      <p>Sottotitolo descrittivo.</p>
    </section>
  </template>
</component>

<component id="cta" conversion="1" interaction="0.85">
  <template>
    <button class="cta" id="buy">Compra ora</button>
  </template>
  <script hydrate>
    el.querySelector('#buy').addEventListener('click', () => {
      el.querySelector('#buy').textContent = 'Grazie! ✓';
    });
  </script>
</component>

<style>
  .hero { padding: 80px 24px; text-align: center; }
  .cta { background: #ff4d5a; color: #fff; border: none; padding: 16px 32px; border-radius: 999px; }
</style>
```

## Attributi `<page>`

| Attributo | Descrizione |
|-----------|-------------|
| `title` | Titolo documento e meta |
| `description` | Meta description |
| `sitemapPriority` | 0.0–1.0 per sitemap.xml |
| `type` | `product`, `article`… per JSON-LD |
| `image` | Immagine OG |
| `noindex` | Esclude dalla sitemap |
| `overlay` | Metriche dev (default: on in dev, off in build) |

## Attributi `<component>`

| Attributo | Range | Effetto |
|-----------|-------|---------|
| `seo` | 0–1 | Priorità contenuto SEO-critical |
| `conversion` | 0–1 | Priorità di hydration e preload |
| `interaction` | 0–1 | Probabilità idratazione |
| `cpu` | 1–10 | Costo rendering |
| `network` | KB | Costo rete per preload |
| `hydrate` | inline/eager/visible/idle/never | Override scheduler |
| `client` | path | Modulo isola esterno |
| `props` | JSON | Props per isola client |
| `consent` | categoria | Gating GDPR |

## Isole esterne

Per React, Preact o moduli più grandi:

```html
<component id="stock" conversion="0.9" interaction="0.6"
           client="/islands/stock.js" props='{"initial": 5}'>
  <template><div data-react-root>Caricamento…</div></template>
</component>
```

Il modulo in `islands/` esporta `default function (el, props) { … }`.

## Ordine visivo vs rendering

Di default il DOM è emesso in **ordine di file (lettura)**, così ordine visivo, da tastiera e per screen reader coincidono (WCAG 2.4.3 / 1.3.2). I pesi business guidano la priorità di **hydration e preload** — non l'ordine fisico del DOM.

Passando `contentOrder: 'priority'` a `renderPage`, lo scheduler riordina il sorgente HTML per valore business (un CTA con `conversion="1"` può finire prima nel sorgente) ripristinando l'ordine visivo via flex `order` CSS. Utile con streaming SSR, ma il flex `order` non cambia il tab order né quello per gli screen reader: usalo consapevolmente.

## CSS

Il blocco `<style>` viene purgato e minificato in build. Classi non usate nel DOM visibile vengono rimosse (PurgeCSS integrato).

## Parsing robusto

Il compiler `.biagio` è un tokenizer quote-aware, non una catena di regex. Gestisce `>` dentro i valori degli attributi (es. `props` JSON), `<template>` annidati, commenti HTML a livello top (un `<component>` commentato viene ignorato) e più blocchi `<style>`. Gli script `hydrate` inline sono emessi dalla sorgente grezza — nessun round-trip via `Function.prototype.toString` — e ogni `</script>` al loro interno viene neutralizzato per non bucare il tag.
