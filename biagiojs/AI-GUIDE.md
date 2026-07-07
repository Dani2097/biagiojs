# biagiojs — Guida per agenti AI (v0.7.x)

> Documento canonico per LLM/agenti che costruiscono siti con biagiojs. Contiene il workflow completo, l'API esatta, le regole decisionali e gli errori da evitare. Il [README](./README.md) è la panoramica per umani; questa guida è il riferimento operativo.

## Modello mentale (leggi prima di tutto)

biagiojs è SSG-first + islands, business-aware. Ogni componente dichiara **pesi business** (`conversion`, `seo`, `interaction`, 0–1) e **costi** (`cpu`, `memory`, `network` in KB). Il framework decide da solo: ordine di rendering nel sorgente HTML (ciò che converte arriva prima sul wire), quali isole idratare e quando (eager/lazy/mai), preload per valore/KB, SEO completa, consent GDPR, i18n.

Regola d'oro: **statico è il default desiderabile**. In produzione una pagina senza isole spedisce ZERO JavaScript. Ogni `hydrate`/`client` che aggiungi deve giustificarsi con un'interazione reale dell'utente.

## Workflow

1. Scaffolding: `npx create-biagiojs <dir>` (o replica la struttura sotto). `cd <dir> && npm install`.
2. Configura `biagio.config.js` (baseUrl VERO: alimenta canonical/sitemap/OG/hreflang).
3. Una pagina per file in `pages/`. Preferisci `.page.biagio`; usa `.page.js`/`.page.ts` solo per `getStaticPaths`, `prerender=false`, `revalidate` o logica.
4. Assegna i pesi dalla tabella (non inventare valori).
5. Verifica: `npx biagio build .` — leggi il log: render order e piano eager/lazy/static devono riflettere le priorità business. Poi `npx biagio dev .` e controlla l'overlay CWV.

## Struttura progetto

```
mio-sito/
  biagio.config.js          # site: { name, baseUrl, description, ...opzioni sotto }
  pages/                 # index.page.biagio → /, about.page.biagio → /about/
    blog/[slug].page.js  # route dinamiche via getStaticPaths
  islands/               # moduli client ESM: export default (el, props) => void
  content/blog/*.md      # collections Markdown+frontmatter (per lingua: content/blog/en/)
  images/                # sorgenti → AVIF/WebP/JPEG (richiede `sharp` in devDependencies se non vuota)
  public/                # copiato in dist/ così com'è (favicon, font, _headers)
  locales/it.json        # traduzioni (solo se site.locales)
  reports/               # field data per l'optimizer (facoltativi; per lingua: reports/en/)
  dist/                  # output build (non toccare a mano)
```

## Sintassi `.biagio` (preferita)

```html
<page title="..." description="..." sitemapPriority="1.0"
      type="product" image="/img/x.jpg" lastmod="2026-07-06" noindex="false" overlay="false" />

<component id="hero" seo="1" conversion="0.9" cpu="2">
  <template><section><h1>Titolo</h1></section></template>
</component>

<component id="cta" conversion="1" interaction="0.85">
  <template><button id="buy">Compra</button></template>
  <script hydrate>
    /* riceve `el` = DOM del componente. Self-contained: niente import qui. */
    el.querySelector('#buy').addEventListener('click', () => { /* ... */ });
  </script>
</component>

<component id="stock" conversion="0.9" interaction="0.6"
           client="/islands/stock.js" props='{"initial": 5}'>
  <template><div data-react-root>caricamento…</div></template>
</component>

<component id="theme" client="/islands/theme.js" hydrate="inline">
  <template><button id="th">🌙</button></template>
</component>

<style>/* CSS della pagina: verrà purgato e minificato in build */</style>
```

Attributi `<component>`: `id` (obbligatorio), `seo` `conversion` `interaction` (0–1), `cpu` `memory` `network` (costi), `deps="a,b"` (dipendenze di rendering), `client` (modulo isola), `props` (JSON), `hydrate="inline|eager|visible|idle|never"`, `consent="marketing|analytics"`.

Regole: ordine nel file = ordine VISIVO; l'ordine di RENDERING lo decide lo scheduler. `{{t:chiave}}` nei template/title/description se il sito è multilingua.

## Sintassi JS (`.page.js` / `.page.ts`)

```js
import { PerfNode, PerformanceGraph } from 'biagiojs/graph';
import { html, raw } from 'biagiojs/html';

export const prerender = false;   // SSR on-demand (ctx.request disponibile)
// oppure: export const revalidate = 300;   // ISR: rigenera ogni 5 min

export function getStaticPaths({ getCollection }) {   // solo per route [param]
  return getCollection('content/blog').map(p => ({ params: { slug: p.slug }, props: { post: p } }));
}

export default function (ctx) {
  // ctx: { site, params, props, request, locale, defaultLocale, t, getCollection, ExperimentEngine, userId, reports }
  const g = new PerformanceGraph()
    .add(new PerfNode('article', {
      seoWeight: 1, conversionWeight: 0.4, cpuCost: 2,
      render: () => html`<article>${raw(ctx.props.post.html)}</article>`.toString(),
      // hydrate: (el) => {...}      → serializzata con .toString(): SELF-CONTAINED
      // clientModule: '/islands/x.js', clientProps: {...}, hydrateMode: 'inline', consent: 'marketing'
    }));
  g.get('article').domOrder = 0;   // OBBLIGATORIO nei .page.js (nei .biagio è automatico)
  return {
    graph: g,
    head: '<style>...</style>',
    page: { title, description, type, image, breadcrumbs: [{name,path}], sitemapPriority, lastmod, noindex },
    assets: [{ url: '/fonts/x.woff2', kb: 30, businessValue: 0.5 }],   // preload per valore/KB
    experiments: ab,               // §11, vedi sotto
  };
}
```

## Tabella pesi (usa questi range, non inventare)

| Componente | conversion | seo | interaction |
|---|---|---|---|
| CTA primario (buy/signup/form contatti) | 0.9–1.0 | 0–0.2 | 0.7–0.9 |
| Prezzo / offerta | 0.8–0.9 | 0.7–0.9 | ~0.1 |
| Hero / H1 | 0.7–0.9 | 1.0 | ~0.2 |
| Recensioni / social proof | 0.4–0.6 | 0.7–0.9 | ~0.3 |
| Navigazione | 0.2 | 0.3 | 0.3–0.5 |
| Carousel correlati | 0.1–0.3 | 0–0.2 | 0.1–0.2 |
| Chat/cookie/widget terzi | ≤0.05 | 0 | ≤0.05 |
| Footer | ≤0.05 | 0.1 | ≤0.05 |

Vincoli del sistema: `businessValue = 0.6·conversion + 0.25·seo + 0.15·interaction` (calcolato). Priorità idratazione = `interaction × businessValue`; soglie default eager ≥0.3, lazy ≥0.05 (l'optimizer le adatta ai field data). `conversion ≥ 0.7` + interattività ⇒ revenue island (conta per FAR/RFI).

## Decidere il regime di ogni pagina

| Caso | Cosa fare |
|---|---|
| Contenuto fisso (vetrina, blog) | niente: SSG default |
| Dati che cambiano ogni tanto (listino, stock aggregato) | `export const revalidate = N` (ISR) |
| Per-utente / query string / real-time | `export const prerender = false` (SSR; serve adapter Node o Vercel) |

## Decidere l'idratazione di ogni componente

| Caso | Cosa fare |
|---|---|
| Nessuna interazione | niente `hydrate`/`client` (statico) |
| Interazione critica immediata (tema, lingua, nav) | `client="..."` + `hydrate="inline"` (data-URI: zero rete, fuori dal critical path LCP) |
| Interazione probabile (CTA principale) | pesi alti e lascia decidere lo scheduler (eager) |
| Interazione sotto la piega | pesi reali → lazy (visibilità/idle) automatico |
| Widget che non deve mai spedire JS | `hydrate="never"` |
| Tracker/pixel/chat marketing | `consent="marketing"` (non si idrata senza consenso GDPR) |

## Consent GDPR

```js
// biagio.config.js — native (0 KB critical path) o vendor ottimizzato
site: { consent: { mode: 'native', categories: ['analytics','marketing'], policyUrl: '/privacy/' } }
site: { consent: { mode: 'vendor', vendor: 'cookiebot'|'iubenda', id: '...', strategy: 'idle' } }
```

Blocco pre-consenso (architetturale, entrambe le modalità):
- isole: `consent="marketing"` sul component;
- script nel markup: `<script type="text/plain" data-cvw-consent="marketing" src="...">`;
- iframe QUALSIASI provider (Maps, Spotify, Calendly…): `<iframe data-cvw-consent="marketing" data-src="...">`;
- video: `videoFacadeHtml({ id, title })` da `biagiojs/consent` (~2 KB vs ~800 KB embed; click = consenso + autoplay; consenso già dato = iframe automatico senza click).

Consent Mode v2 default-denied è sempre emesso. Non aggirare MAI il gating "per far funzionare" un tracker.

## i18n

```js
site: { locales: ['it','en'], defaultLocale: 'it' }
```
Route: default a `/`, altre a `/en/...` — generate da ogni pagina automaticamente. Traduzioni in `locales/<lang>.json`; `{{t:chiave}}` nei `.biagio`, `ctx.t('chiave', {vars})` nei `.page.js`. hreflang + sitemap alternates + `og:locale` + `<html lang>` automatici. Collections per lingua in `content/blog/<lang>/`. Report optimizer per mercato in `reports/<lang>/`.

## SEO / OG / favicon (tutto automatico, solo dichiarazioni)

- `page.title/description` → meta, OG, twitter per pagina; canonical dall'URL.
- `page.image` (stringa o `{src,width,height,alt}`) → og:image completa; fallback `site.ogImage`.
- `type="product"` + `page.product {name,price,currency,rating,reviewCount}` → JSON-LD Product.
- `breadcrumbs` → BreadcrumbList + breadcrumb visibile.
- `site.favicon = '/favicon.svg'` o `{svg,ico,apple,themeColor}` (file in `public/`).
- sitemap.xml e robots.txt in ogni build.

## Esperimenti A/B (server-side, zero CLS)

```js
const ab = new ctx.ExperimentEngine({ userId: ctx.userId });
ab.define('checkout_v2', ['control', 'variant_b']);
// nel render: ab.pick('checkout_v2', { control: () => html, variant_b: () => html })
// nel return: experiments: ab
```
Assegnazione deterministica per utente (hash). Le pagine con esperimenti dovrebbero essere SSR (`prerender=false`) se l'assegnazione deve variare per visitatore.

## Feedback loop (dopo il deploy)

```bash
npx biagio pull-vitals https://sito.it .   # CrUX/Lighthouse reali → reports/crux.json
npx biagio build .                          # pesi e soglie ricalibrati sui dati veri
```
Più `reports/analytics.json` `{componentClicks:{id:ctr}}` e `reports/heatmap.json` `{attentionShare:{id:0..1}}` se disponibili.

## Errori tipici degli agenti (checklist finale)

1. **Idratare tutto** — se non c'è interazione reale, statico. È il vantaggio competitivo del framework.
2. **Pesare tutto alto** — se tutto è critico niente lo è; lo scheduler degenera nell'ordine DOM.
3. **Isole critiche come file esterni** — tema/lingua/nav vanno `hydrate="inline"`.
4. **`render()` che ritorna DOM** — deve ritornare una stringa.
5. **Closure su variabili di build dentro `hydrate`** — viene serializzata con `.toString()`: self-contained; per passare dati usa `clientModule` + `clientProps`.
6. **Dimenticare `domOrder`** nei `.page.js` (nei `.biagio` è automatico).
7. **Interpolare input non fidato senza `html\`\`}`** — XSS. `raw()` SOLO su output del framework (es. `post.html` dal parser Markdown).
8. **Tracker/embed non gated** — ogni script/iframe di terze parti che scrive cookie DEVE avere `data-cvw-consent` o `consent=`.
9. **`baseUrl` finto in config** — rompe canonical, sitemap, hreflang, OG.
10. **Toccare `dist/` a mano** — è output di build.

## Config avanzata (biagio.config.js)

```js
export default {
  site: {
    name: '…', baseUrl: 'https://…', description: '…',
    images: {
      widths: [480, 960, 1440], quality: 75, allowSmallerSources: true,
      // bySlug: { hero: [480, 960, 1440, 1920] },
      // profiles: { hero: { widths: [480, 960, 1920], sizes: '100vw' } },
      remote: {
        allowedDomains: ['supabase.co', 'cdn.miosito.com'],
        allowLocalhost: false,
        sources: [
          { url: 'https://xxx.supabase.co/storage/v1/object/public/bucket/hero.jpg', slug: 'hero' },
        ],
      },
    },
    fonts: {
      inject: 'inline',       // 'async' | 'stylesheet' | false
      preload: 'critical',    // 'all' | false
      preloadCritical: [{ family: 'Inter', weight: 400 }],
      google: [
        { family: 'Inter', weights: [400, 600], role: 'body' },
        { family: 'Playfair Display', weights: [400], role: 'display' },
      ],
    },
    cache: true,              // genera dist/_headers (vedi DEPLOY-CACHE.md)
    sitemap: 'sitemap.xml',   // path in robots.txt
      allowedDomains: ['fonts.googleapis.com', 'fonts.gstatic.com'],
      // subset: false,  // default: disabilitato
      // subset: 'latin', // opt-in: preset latin + scan HTML/sorgenti
      // subset: { preset: 'latin', scan: true, extra: '€', minSaving: 0.05 },
    },
    optimize: { purge: true, minify: true, scripts: true },
  },
  hooks: {
    beforeFonts({ fontsDir, fonts }) { /* opzionale */ },
    afterFonts({ fontsDir, fonts, result, subset }) { /* post-download / post-subset */ },
    head({ page, locale, site, ctx }) { return '<meta ...>'; },
    beforeImages({ srcDir, images }) { /* opzionale */ },
    afterImages({ srcDir, outDir, result }) { /* opzionale */ },
  },
};
```

- **Immagini locali**: profili (`profile: 'hero'|'content'|'thumb'|'full'`), `bySlug` per bucket per file, validazione post-build srcset. Guida: **[IMAGE-OPTIMIZATION.md](./IMAGE-OPTIMIZATION.md)**. Helper `imgSlug()` da `biagiojs/images`.
- **Immagini remote (pre-build)**: `site.images.remote` scarica URL in `images/` prima di sharp. **Allowlist obbligatoria** (`allowedDomains`); accetta sottodomini (`supabase.co` → `*.supabase.co`). Solo HTTPS (tranne `localhost` con `allowLocalhost: true`). Dominio non in lista → build fallisce.
- **Google Fonts self-hosted**: `site.fonts.google` scarica woff2 da Google a build time in `fonts/` → `dist/fonts/`. Zero richieste a Google in produzione. Con `inject: true` aggiunge `<link>` + preload automatici.
- **Subset font (opt-in, default off)**: `site.fonts.subset: 'latin'` riduce i woff2 dopo il render HTML. Richiede `npm i -D subset-font` se abilitato. Non va nel bundle browser.
- **PurgeCSS**: non purga `<style>` dentro `<template>`. Per altri casi: `<style data-cvw-no-purge>`.
- **Env in build**: `biagio build` carica `.env` / `.env.production`. Prefissi `PUBLIC_*` o `VITE_PUBLIC_*`. `requireEnv()` da `biagiojs/env`.
- **`biagio dev`**: merge automatico di `vite.config.js` se presente.

## Comandi

```bash
npx biagio dev .                  # dev (Vite se installato: HMR/TS; overlay CWV live)
npx biagio build .                # → dist/ ottimizzato (minify, purge, zero-JS statico)
npm run preview                # adapter Node: statico + ISR + SSR on-demand
npx biagio pull-vitals <url> .    # field data reali
npm test                       # se modifichi il framework (61 test)
```

Deploy: statico → Vercel/Cloudflare Pages (`dist/`, nessun Worker per SSG puro); SSR/ISR → adapter Node o Vercel.
