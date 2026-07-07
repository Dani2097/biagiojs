# biagiojs

**Framework web business-first** — Core Web Vitals come vincoli, conversione / SEO / engagement come cittadini di prima classe. SSG + isole adattive + routing file-based. Zero dipendenze obbligatorie in runtime.

[![npm](https://img.shields.io/npm/v/biagiojs)](https://www.npmjs.com/package/biagiojs)
[![license](https://img.shields.io/npm/l/biagiojs)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-green)](https://nodejs.org)

Dove gli altri framework chiedono *«come renderizziamo più veloce?»*, biagiojs chiede *«cosa va sul wire prima per massimizzare risultati di business e esperienza utente?»*.

---

## Indice

- [Quick start](#quick-start)
- [Migrazione](#migrazione-da-cvw-first)
- [Come funziona](#come-funziona)
- [Installazione](#installazione)
- [Comandi](#comandi)
- [Struttura progetto](#struttura-progetto)
- [Sintassi](#sintassi)
- [Funzionalità](#funzionalità)
- [Deploy](#deploy)
- [Documentazione](#documentazione)
- [Licenza](#licenza)

---

## Quick start

```bash
npx create-biagiojs mio-sito
cd mio-sito && npm install && npm run dev   # → http://localhost:4321
```

Produzione:

```bash
npm run build    # → dist/ (HTML statico + sitemap + immagini ottimizzate)
```

---

## Migrazione da cvw-first

Il pacchetto npm **`cvw-first`** è stato rinominato in **`biagiojs`**. Stesso codice, nuovi nomi pubblici.

| Prima | Dopo |
|-------|------|
| `npm i cvw-first` | `npm i biagiojs` |
| `cvw dev` / `cvw build` | `biagio dev` / `biagio build` |
| `cvw.config.js` | `biagio.config.js` |
| `pages/*.page.cvw` | `pages/*.page.biagio` |
| `import … from 'cvw-first/…'` | `import … from 'biagiojs/…'` |

```bash
npm uninstall cvw-first
npm i biagiojs@^0.9.0
```

Le API runtime interne (`data-cvw-*`, `window.cvw`, `__CVW_PLAN__`) restano invariate per retrocompatibilità del codice già in produzione.

Dettagli versione per versione: **[CHANGELOG.md](./CHANGELOG.md)**.

---

## Come funziona

Ogni componente dichiara **pesi business** oltre ai costi tecnici. Il framework decide ordine di rendering HTML, piano di idratazione, preload e SEO.

| Dichiari | Il framework decide |
|----------|---------------------|
| `conversion` (0–1) | Ordine nel sorgente HTML (ciò che converte arriva prima sul wire) |
| `seo` (0–1) | Contenuto SEO-critical, metrica SCRT |
| `interaction` (0–1) | Isole **eager** / **lazy** / **static** (JS mai spedito) |
| `cpu`, `network` (costi) | Priorità = valore/costo; preload ordinato per valore/KB |

Un widget chat da 300 KB con `conversion="0.05"` resta HTML statico. Un CTA con `conversion="1"` si idrata per primo.

**Regola d'oro:** statico è il default desiderabile. In produzione, una pagina senza isole spedisce **zero JavaScript**.

---

## Installazione

### Nuovo progetto

```bash
npx create-biagiojs mio-sito
```

### Progetto esistente

```bash
npm i biagiojs
```

Dipendenze opzionali (consigliate in produzione):

```bash
npm i -D sharp vite          # immagini AVIF/WebP/JPEG + dev con HMR
npm i -D subset-font         # solo se site.fonts.subset è abilitato
```

`lightningcss` è optionalDependency del framework: minify CSS reale in build se presente.

---

## Comandi

| Comando | Descrizione |
|---------|-------------|
| `npx biagio dev .` | Dev server (Vite se installato, altrimenti fallback integrato) |
| `npx biagio build .` | Build → `dist/` |
| `npx biagio build . --clean` | Pulisce `dist/img/` prima della pipeline immagini |
| `npx biagio build . --dryRun` | Pianifica bucket immagini senza scrivere file |
| `npx biagio pull-vitals <url> .` | CrUX/Lighthouse → `reports/crux.json` |
| `npx create-biagiojs <dir>` | Scaffolding nuovo sito |
| `npm run preview` | Adapter Node: statico + ISR + SSR on-demand |

---

## Struttura progetto

```
mio-sito/
├── biagio.config.js       # site, images, fonts, cache, consent, hooks
├── pages/
│   ├── index.page.biagio  # → /
│   ├── about.page.biagio  # → /about/
│   └── blog/[slug].page.js
├── islands/               # moduli client ESM (React, Preact, vanilla)
├── content/               # Markdown + frontmatter (collections)
├── images/                # sorgenti → dist/img/ (sharp)
├── public/                # copiato in dist/ (favicon, _headers, …)
├── locales/               # traduzioni (se site.locales)
├── reports/               # field data per l'optimizer (opzionale)
└── dist/                  # output build
```

---

## Sintassi

### `.biagio` (consigliata)

`pages/index.page.biagio` → route `/`. Il nome file è la route.

```html
<page title="Home" description="…" sitemapPriority="1.0" />

<component id="hero" seo="1" conversion="0.8">
  <template><section><h1>Benvenuto</h1></section></template>
</component>

<component id="cta" conversion="1" interaction="0.85">
  <template><button id="buy">Compra — €129</button></template>
  <script hydrate>
    el.querySelector('#buy').addEventListener('click', () => { /* … */ });
  </script>
</component>

<component id="theme" client="/islands/theme.js" hydrate="inline">
  <template><button>🌙</button></template>
</component>

<style>body { margin: 0; font-family: system-ui; }</style>
```

- Ordine nel file = ordine **visivo**; ordine di **rendering** = scheduler.
- `hydrate="inline|eager|visible|idle|never"` override esplicito dello scheduler.
- `hydrate="inline"` → modulo embedded come data-URI ESM, zero richieste di rete.

### `.page.js` / `.page.ts`

Per `getStaticPaths`, `prerender = false`, `revalidate`, logica custom:

```js
import { PerfNode, PerformanceGraph } from 'biagiojs/graph';
import { html, raw } from 'biagiojs/html';

export function getStaticPaths({ getCollection }) {
  return getCollection('content/blog').map(post => ({
    params: { slug: post.slug },
    props: { post },
  }));
}

export default function ({ props: { post } }) {
  const g = new PerformanceGraph().add(new PerfNode('article', {
    seoWeight: 1, conversionWeight: 0.4,
    render: () => html`<article>${raw(post.html)}</article>`.toString(),
  }));
  g.get('article').domOrder = 0;
  return { graph: g, page: { title: post.data.title, description: '…' } };
}
```

| Export | Effetto |
|--------|---------|
| *(default)* | SSG — pagina in `dist/` |
| `revalidate = N` | ISR — rigenera ogni N secondi |
| `prerender = false` | SSR on-demand (adapter Node o Vercel) |

---

## Funzionalità

### SEO, immagini, rete

- **SEO automatica**: meta, canonical, Open Graph, Twitter, JSON-LD, breadcrumb, `sitemap.xml`, `robots.txt`, favicon, hreflang (multilingua).
- **Immagini**: `smartImage()` con profili (`hero`, `content`, `thumb`, `full`), `bySlug`, validazione post-build. → **[IMAGE-OPTIMIZATION.md](./IMAGE-OPTIMIZATION.md)**
- **Rete**: preload/prefetch ordinati per valore/KB con budget (default 200 KB).

### Build e performance (v0.8.x)

- **Zero JS** su pagine senza isole interattive.
- **PurgeCSS + minify** integrati; `lightningcss` opzionale per CSS reale.
- **Wrapper `<div>` opzionale** su nodi statici (meno byte strutturali).
- **Runtime compatto**: piano `{e,l}`, IIFE unico, signals condizionali.
- **Benchmark demo**: HTML prodotto ~**14 KB** (−33% vs baseline naive).

### Consent GDPR

Banner native (0 KB critical path) o vendor ottimizzato (Cookiebot/Iubenda). Gating dichiarativo su isole, script e iframe. Consent Mode v2 default-denied.

```js
site: { consent: { mode: 'native', categories: ['analytics', 'marketing'], policyUrl: '/privacy/' } }
```

### i18n, esperimenti, optimizer

- **i18n**: `site.locales` → route `/en/…`, hreflang, sitemap alternate, report per mercato.
- **A/B test**: assegnazione server-side deterministica, zero CLS.
- **Optimizer**: `reports/` (CrUX, analytics, heatmap) ricalibrano pesi a ogni build.

### Dev

- Overlay Core Web Vitals live + metriche business (solo dev).
- Metriche CFP, FAR, RFI, SCRT, CDI in-page (evento `cvw:metrics`).

---

## Deploy

| Scenario | Soluzione |
|----------|-----------|
| Sito statico | `dist/` su Cloudflare Pages, Netlify, Vercel, qualsiasi CDN |
| ISR / SSR | `biagiojs/adapters/node` o `biagiojs/adapters/vercel` |

**Cloudflare Pages (SSG):** build `npm run build`, output `dist/`, Node ≥ 18. Cache asset con `site.cache` → **[DEPLOY-CACHE.md](./DEPLOY-CACHE.md)**.

---

## Documentazione

| Documento | Contenuto |
|-----------|-----------|
| **[AI-GUIDE.md](./AI-GUIDE.md)** | Riferimento operativo per agenti AI e sviluppatori (pesi, idratazione, config) |
| **[IMAGE-OPTIMIZATION.md](./IMAGE-OPTIMIZATION.md)** | Pipeline immagini, profili, `bySlug`, `smartImage()` |
| **[DEPLOY-CACHE.md](./DEPLOY-CACHE.md)** | `_headers`, `! Cache-Control`, Cloudflare / Netlify |
| **[CHANGELOG.md](./CHANGELOG.md)** | Storico versioni e note di rilascio |

### Feedback loop

```
deploy → utenti reali → pull-vitals + analytics → reports/ → build → pesi ricalibrati → deploy
```

---

## Licenza

MIT © [Danilo Sprovieri](https://github.com/Dani2097)
