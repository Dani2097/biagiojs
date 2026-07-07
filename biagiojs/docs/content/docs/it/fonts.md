---
title: Font
description: Google Fonts self-hosted, preload, CSS inline e subsetting opzionale alla build.
order: 9
priority: 0.8
lastmod: 2026-07-07
---

# Font

biagiojs scarica i Google Fonts **alla build**, riscrive gli URL in `/fonts/*.woff2` locali e inietta i tag `<link>` / `<style>` giusti — niente richiesta render-blocking a `fonts.googleapis.com` in produzione.

## Config rapida

```js
// biagio.config.js
export default {
  site: {
    fonts: {
      inject: 'inline',       // false | 'stylesheet' | 'async' | 'inline'
      preload: 'critical',    // 'critical' | 'all' | false
      google: [
        { family: 'Inter', weights: [400, 600, 700], role: 'body' },
        { family: 'Fraunces', weights: [700], role: 'display' },
      ],
      subset: false,          // true | 'latin' | { preset, scan, extra }
    },
  },
};
```

Con `biagio build`, la pipeline:

1. Scarica il CSS da Google (User-Agent compatibile woff2)
2. Salva ogni file in `dist/fonts/`
3. Scrive `dist/fonts/google.css` con path locali
4. Opzionalmente fa subset dei woff2 ai glifi usati nelle pagine
5. Emette preload per le face critiche (display + body 400 di default)

## Modalità inject

| `inject` | Comportamento |
|----------|---------------|
| `false` | Nessun tag font (gestisci il CSS tu) |
| `stylesheet` | `<link rel="stylesheet" href="/fonts/google.css">` classico |
| `async` | Caricamento non bloccante via `media="print" onload` |
| `inline` | CSS embedded in `<style>` — zero round-trip extra (miglior LCP) |

## Preload

`preload: 'critical'` (default) precarica fino a due woff2: la face con role `display` e il body weight 400.

Override esplicito:

```js
fonts: {
  preload: 'critical',
  preloadCritical: [
    { family: 'Inter', weight: 600 },
    { file: '/fonts/inter-400-normal.woff2' },
  ],
}
```

## URL CSS custom

Se hai già un URL Google Fonts:

```js
google: [{ css: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700&display=swap' }]
```

## Subsetting (opzionale)

Rimuove i glifi inutilizzati dopo il render HTML — risparmio tipico 40–70%.

```bash
npm i -D subset-font
```

```js
fonts: {
  subset: 'latin',           // oppure true
  // subset: { preset: 'latin', scan: true, extra: '€©', minSaving: 0.05 },
}
```

`scan: true` raccoglie il testo visibile dall'HTML buildato. `extra` aggiunge caratteri che sai servire (simboli valuta, ecc.). `biagio doctor` avvisa se il subset è attivo senza la dipendenza.

## Domini consentiti

Gli URL font remoti devono passare `site.fonts.allowedDomains` (default: `fonts.googleapis.com`, `fonts.gstatic.com`).

## Hook

```js
hooks: {
  beforeFonts({ fontsDir }) { /* prima del download */ },
  afterFonts({ fontsDir, result }) { /* ispeziona manifest */ },
}
```

## Questo sito docs

Il sito documentazione usa `fonts: { inject: false }` e **solo system font** — zero byte web-font sul critical path.

## Cache

I font self-hosted stanno sotto `/fonts/` e vanno serviti con cache lunga (`immutable`). Vedi [Deploy & cache](/it/docs/deploy/) e `DEPLOY-CACHE.md` nel pacchetto npm.
