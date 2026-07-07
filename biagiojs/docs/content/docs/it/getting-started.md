---
title: Per cominciare
description: Tre comandi per avere un sito biagiojs in locale. Config, pagine, build.
order: 1
priority: 0.95
lastmod: 2026-07-07
---

# Per cominciare

Tre comandi e hai un sito in locale. `create-biagiojs` fa il lavoro sporco; tu aggiungi pagine e pesi business.

## Installazione

```bash
npx create-biagiojs mio-sito
cd mio-sito && npm install
npm run dev
```

Il dev server parte su **http://localhost:4321**. Se hai `vite` in devDependencies ottieni HMR e supporto TypeScript; altrimenti c'è un fallback integrato con live reload.

## Primo build

```bash
npm run build
```

L'output finisce in `dist/`: HTML statico, sitemap, robots, immagini ottimizzate. Puoi servirlo da qualsiasi CDN.

## Config minima

Crea `biagio.config.js` nella root del progetto:

```js
export default {
  site: {
    name: 'Il Mio Sito',
    baseUrl: 'https://biagio.danilosprovieri.com',  // importante: alimenta canonical, OG, sitemap
    description: 'Un sito costruito con biagiojs',
  },
};
```

Per TypeScript: `biagio.config.ts` (serve `esbuild` o `vite` in devDependencies).

## Prima pagina

Il modo più rapido è un file `.biagio` in `pages/`:

```html
<page title="Home" description="Benvenuto" />

<component id="hero" seo="1" conversion="0.8">
  <template>
    <section><h1>Ciao mondo</h1></section>
  </template>
</component>
```

Salva come `pages/index.page.biagio` → route `/`.

## Comandi utili

| Comando | Cosa fa |
|---------|---------|
| `biagio dev .` | Dev server |
| `biagio build .` | Build produzione |
| `biagio doctor .` | Valida config, sharp, pagine |
| `biagio analyze .` | Report pesi post-build |
| `biagio preview .` | Server Node con gzip/br |

## Prossimi passi

- Leggi la [struttura progetto](/it/docs/project-structure/)
- Impara la [sintassi .biagio](/it/docs/syntax-biagio/)
- Assegna i [pesi business](/it/docs/business-weights/) ai componenti
