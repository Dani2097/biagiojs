---
title: Per cominciare
description: Tre comandi per avere un sito biagiojs in locale. Config, pagine, build.
order: 1
priority: 0.95
lastmod: 2026-07-09
---

# Per cominciare

Tre comandi e hai un sito in locale. `create-biagiojs` fa il lavoro sporco; tu aggiungi pagine e pesi business.

## Installazione

```bash
npx create-biagiojs mio-sito
# oppure con template:
npx create-biagiojs mio-sito --template blog
```

Template: `default`, `blog`, `landing`, `shop`, `docs`.

```bash
cd mio-sito && npm install
npm run dev
```

Il dev server parte su **http://localhost:4321**. Con `vite` ottieni HMR e TypeScript; altrimenti fallback integrato con **rebuild incrementale**, overlay CWV e weights inspector.

## Primo build

```bash
npm run build
```

L'output finisce in `dist/`: HTML statico, sitemap, robots, immagini ottimizzate.

## Config con IntelliSense

Crea `biagio.config.js` nella root:

```js
import { defineConfig } from 'biagiojs/config';

export default defineConfig({
  site: {
    name: 'Il Mio Sito',
    baseUrl: 'https://tuosito.com',  // canonical, OG, sitemap
    description: 'Un sito costruito con biagiojs',
  },
});
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

Oppure:

```bash
biagio new page about
biagio new page blog/[slug]
```

## Comandi utili

| Comando | Cosa fa |
|---------|---------|
| `biagio dev .` | Dev server (rebuild incrementale in fallback) |
| `biagio build .` | Build produzione |
| `biagio explain index.page.biagio` | Render order + piano idratazione per una pagina |
| `biagio doctor .` | Valida config, sharp, pagine, link |
| `biagio analyze .` | Report pesi post-build |
| `biagio preview .` | Server Node con gzip/br |
| `biagio new island counter` | Crea `islands/counter.js` |

## Prossimi passi

- [Struttura progetto](/it/docs/project-structure/)
- [Sintassi .biagio](/it/docs/syntax-biagio/)
- [Content collections](/it/docs/content-collections/)
- [Pesi business](/it/docs/business-weights/)
- [CLI](/it/docs/cli/)
