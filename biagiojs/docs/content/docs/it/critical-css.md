---
title: Critical CSS
description: Stili above-the-fold senza bloccare la rete — inline, hooks e purge per pagina.
order: 10
priority: 0.75
lastmod: 2026-07-09
---

# Critical CSS

biagiojs non ha ancora un estrattore “critical CSS” automatico — e per la maggior parte dei siti a isole non serve. L’HTML che emetti **è** già il critical path: i `<style>` dei componenti finiscono nel sorgente, e in build la **purge** elimina le regole inutilizzate rispetto al DOM visibile.

## Cosa è già critical

1. **Stili dei componenti** — `<style>` nei file `.biagio` (o `head` da `.page.js`) sono inlined nella risposta HTML. Componenti con `conversion` / `seo` alti tendono a comparire prima nel documento.
2. **Purge per pagina** — `site.optimize.purge` (default attivo) rimuove i selettori non usati nella pagina renderizzata.
3. **`hooks.head`** — snippet globali ( `<style>` inline o `<link>` ) valgono sia in **`biagio dev`** sia in produzione. Usalo per reset, token di layout o un foglio tema condiviso.

```js
// biagio.config.js
export default {
  site: { name: 'Mio sito', baseUrl: 'https://example.com' },
  hooks: {
    head() {
      return `<link rel="stylesheet" href="/theme.css">`;
    },
  },
};
```

Metti il file in `public/theme.css` — viene copiato in `dist/` in build e servito in dev da `/theme.css`.

## Pattern consigliato

| Livello | Dove | Quando |
|---------|------|--------|
| Reset + token | `hooks.head` (blocco inline piccolo) o `<style>` nell’hero | Primo paint |
| Pagina / sezione | `<style>` nei componenti `.biagio` | Con l’HTML di quella sezione |
| CSS solo widget | Dentro `<template>` o `data-cvw-no-purge` | Non purgato; UI solo client |

Tieni leggeri i primi ~14 KB di HTML: font di sistema o preload critical ([Font](/docs/fonts/)), niente script di terze parti bloccanti ([Consent](/docs/consent/)).

## Rimandare CSS non critical

Per fogli condivisi grandi:

```html
<link rel="preload" href="/extras.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="/extras.css"></noscript>
```

Restituisci questa stringa da `hooks.head` o da un componente statico a bassa priorità.

## Dev vs build

- **Dev** — gli stili da `hooks.head` e dai `<style>` dei componenti si applicano subito (stessa semantica della produzione).
- **Build** — purge + minify riducono il CSS per pagina; controlla le dimensioni con `biagio analyze`.

## Quando serve l’estrazione automatica

Ha senso un pipeline dedicato solo se hai **un unico CSS globale enorme** su centinaia di pagine e splittarlo a mano è ingestibile. Finché puoi, CSS per componente + purge è più semplice e si adatta al modello a isole.

Vedi anche: [Deploy & cache](/docs/deploy/) per `immutable` su `/fonts/` e `/img/`.
