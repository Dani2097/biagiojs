> Monorepo: [`cvw-first/`](./cvw-first) (il framework, [npm](https://www.npmjs.com/package/cvw-first)) · [`create-cvw/`](./create-cvw) (scaffolding `npx create-cvw`). Questo README è la copia di `cvw-first/README.md`.

# CVW-First

**Il framework web business-first.** Core Web Vitals come vincoli, conversione/SEO/engagement come cittadini di prima classe. SSR + adaptive islands + file-based routing, zero dipendenze obbligatorie.

Dove gli altri framework chiedono *"come renderizziamo più veloce?"*, CVW-First chiede *"cosa va renderizzato prima per massimizzare esperienza utente e risultati di business?"*.

```bash
npx create-cvw mio-sito
cd mio-sito && npm install && npm run dev   # → http://localhost:4321
```

## Novità 0.5.x — bundle minimo e critical path pulito

> Upgrade: `npm i cvw-first@latest` nel progetto del sito. Nessuna breaking change: tutto è retrocompatibile, le ottimizzazioni si attivano da sole alla prossima `cvw build`.

**1. Pagine statiche = zero JavaScript.** Se una pagina non ha isole, la build di produzione non spedisce nessun runtime (niente hydration, metriche, piano). Non devi fare nulla: è automatico.

**2. Micro-isole critiche inline** — per interazioni che devono partire subito (tema, lingua, nav) senza entrare nella catena critica LCP:

```html
<component id="nav" conversion="0.2" interaction="0.5"
           client="/islands/nav.js" hydrate="inline">
  <template>...</template>
</component>
```

Con `hydrate="inline"` il modulo viene embeddato nell'HTML come data-URI ESM: **zero richieste di rete**, import CDN funzionanti. In `.page.js`: `hydrateMode: 'inline'`.

**3. Override espliciti dell'idratazione** — `hydrate="inline|eager|visible|idle|never"` (in `.cvw`) o `hydrateMode` (in JS) vincono sempre sullo scheduler. `never` = il JS del componente non viene mai spedito.

**4. `modulepreload` automatico** per le isole eager esterne: il browser le scarica in parallelo all'HTML. Automatico.

**5. Minify + PurgeCSS integrati** — in produzione: CSS inline purgato (sicuro: l'HTML server-rendered è la verità completa) e minificato, HTML compattato, script inline e isole minificati con esbuild (se presente: `npm i -D esbuild`, o arriva già con Vite). Automatico; il log di build mostra i KB risparmiati.

**6. `public/` copiata in `dist/`** — favicon, font, `_headers`, file di verifica: metti tutto in `public/` e arriva nel deploy così com'è.

**7. Favicon automatica** — file in `public/`, una riga in config:

```js
site: { favicon: { svg: '/favicon.svg', ico: '/favicon.ico', apple: '/apple-touch-icon.png', themeColor: '#ff4d5a' } }
// o forma breve: favicon: '/favicon.svg'
```

I tag `<link rel="icon">`, `apple-touch-icon` e `theme-color` escono su ogni pagina.

**8. ISR** — pagine statiche che si rigenerano da sole:

```js
// pages/listino.page.js
export const revalidate = 300;   // secondi
export default function ({ request }) { /* prezzi aggiornati ogni 5 min */ }
```

Su Vercel usa la CDN (`s-maxage` + `stale-while-revalidate`); sull'adapter Node una micro-cache in-memory. Dettagli nella sezione "SSG e ISR".

## Come funziona

Ogni componente dichiara **pesi business** oltre ai costi tecnici. Il framework decide tutto il resto:

| Dichiari | Il framework decide |
|---|---|
| `conversion` (0–1) | ordine di rendering nel sorgente HTML (streaming: ciò che converte arriva prima) |
| `seo` (0–1) | contenuto marcato SEO-critical, misurato da SCRT |
| `interaction` (0–1) | quali isole idratare: **eager** / **lazy** (visibilità o idle) / **static** (JS mai spedito) |
| `cpu`, `network` (costi) | priorità = valore/costo; preload/prefetch ordinati per valore/KB con budget |

Un chat widget da 300 KB con conversione 0.05 resta HTML statico: il suo JavaScript non viene mai spedito. Il CTA di acquisto con conversione 1.0 si idrata per primo, subito dopo il paint.

## Sintassi `.cvw` (consigliata)

`pages/index.page.cvw` → route `/`. Il nome file è la route, come Astro.

```html
<page title="Home" description="..." sitemapPriority="1.0" />

<component id="hero" seo="1" conversion="0.8" cpu="2">
  <template><section><h1>Benvenuto</h1></section></template>
</component>

<component id="cta" conversion="1" interaction="0.85">
  <template><button id="buy">Compra — €129</button></template>
  <script hydrate>
    el.querySelector('#buy').addEventListener('click', () => { /* ... */ });
  </script>
</component>

<component id="stock" conversion="0.9" interaction="0.6"
           client="/islands/stock.js" props='{"initial": 5}'>
  <template><div data-react-root>caricamento…</div></template>
</component>

<component id="theme-toggle" client="/islands/theme.js" hydrate="inline">
  <template><button id="th">🌙</button></template>  <!-- inline: zero richieste -->
</component>

<style>body{margin:0;font-family:system-ui}</style>
```

Regole: l'ordine nel file è l'ordine **visivo**; l'ordine di **rendering** lo decide lo scheduler. `script hydrate` riceve `el` (il DOM del componente). `client` punta a un modulo in `islands/` — lì puoi usare React, Preact o qualsiasi ESM (export default `(el, props) => void`). Attributi `<page>`: `title`, `description`, `type="product"`, `image`, `sitemapPriority`, `lastmod`, `noindex`, `overlay`. Attributo `hydrate` sui component: `inline|eager|visible|idle|never` (override dello scheduler).

## Sintassi JS (per pagine dinamiche e controllo totale)

`pages/blog/[slug].page.js` — route dinamiche con `getStaticPaths`:

```js
import { PerfNode, PerformanceGraph } from 'cvw-first/graph';
import { html, raw } from 'cvw-first/html';   // html`` escapa (XSS-safe), raw() per HTML fidato

export function getStaticPaths({ getCollection }) {
  return getCollection('content/blog').map(post => ({ params: { slug: post.slug }, props: { post } }));
}

export default function ({ props: { post } }) {
  const g = new PerformanceGraph()
    .add(new PerfNode('article', {
      seoWeight: 1, conversionWeight: 0.4, cpuCost: 2,
      render: () => html`<article>${raw(post.html)}</article>`.toString(),
    }));
  g.get('article').domOrder = 0;
  return { graph: g, page: { title: post.data.title, description: '...', sitemapPriority: 0.6 } };
}
```

`export const prerender = false` rende la pagina **SSR on-demand** (prezzi live, stock, personalizzazione): esclusa dalla build statica, renderizzata a ogni richiesta dall'adapter Node con `ctx.request` (`url`, `query`, `headers`).

## Struttura progetto

```
mio-sito/
  cvw.config.js         # { site: { name, baseUrl, description } } — alimenta SEO/sitemap
  pages/                # routing: index.page.cvw → /, about.page.cvw → /about/
    blog/[slug].page.js #          route dinamiche via getStaticPaths
  islands/              # moduli client (React/Preact/vanilla) — bundlati da Vite in build
  content/blog/*.md     # content collections (frontmatter + Markdown, output escapato)
  images/               # sorgenti → AVIF/WebP/JPEG multi-larghezza (sharp, nomi slug-ificati)
  reports/*.json        # field data per l'optimizer (facoltativi)
  dist/                 # output build
```

## Comandi

```bash
npx cvw dev .                    # dev server: Vite se installato (HMR, TS), fallback integrato
npx cvw build .                  # → dist/ statico + sitemap.xml + robots.txt (+ immagini)
npm run preview                  # adapter Node: statico + SSR on-demand (prod)
npx cvw pull-vitals <url> .      # CrUX/Lighthouse reali → reports/crux.json
npx create-cvw <dir>             # scaffolding nuovo sito
```

## Cosa fa in automatico

- **SEO (§8)**: meta, canonical, Open Graph, Twitter card, JSON-LD (`Product` con rating, `BreadcrumbList`), breadcrumb visibile, `sitemap.xml`, `robots.txt`, **favicon**. Tutto da `cvw.config.js` + attributi `<page>`. Favicon: metti i file in `public/` e dichiara `site.favicon = '/favicon.svg'` oppure `{ svg, ico, apple, themeColor }` → i tag nel head escono da soli. Open Graph per pagina: `page.image` (stringa o `{ src, width, height, alt }` per og:image:width/height/alt) con **fallback di sito** `site.ogImage` per le pagine senza immagine; twitter:card/title/description/image inclusi.
- **Immagini (§9)**: `smartImage()` genera `<picture>` AVIF/WebP/JPEG responsive; `eager`/`fetchpriority`/`decoding` derivati dal priority score; varianti generate a build (e in dev all'avvio) con sharp. Nomi con spazi normalizzati in slug.
- **Rete (§10)**: `<link rel=preload/prefetch>` ordinati per businessValue/KB, con budget preload (default 200 KB) per non intasare il critical path.
- **Esperimenti (§11)**: `ab.define('exp', ['a','b'])` + `ab.pick(...)` — variante scelta server-side con hash deterministico per utente: zero flicker, zero CLS.
- **Optimizer (§7)**: a ogni build legge `reports/` e corregge i pesi dichiarati con i dati reali — `analytics.json` (CTR per componente → interactionProbability), `crux.json` (LCP/INP p75 → soglie di idratazione: dispositivi lenti ⇒ meno JS), `heatmap.json` (attenzione → conversionWeight ±0.2), `searchconsole.json` (→ seoWeight). Log decisionale nel build output.
- **Metriche (§12)**: CFP (Conversion First Paint), FAR (First Action Ready), RFI (Revenue First Interactive), SCRT (SEO Critical Render Time), CDI (Conversion Delay Index) — misurate in-page, evento `cvw:metrics`.
- **Overlay dev**: Core Web Vitals **live** (LCP/CLS/INP/FCP/TTFB con soglie Google colorate) + metriche CVW. Solo in dev; in produzione OFF di default (`<page overlay="true" />` per forzarlo).

## Bundle e critical path (produzione)

La build di produzione è aggressivamente minimale:

- **Pagine senza isole: zero JavaScript eseguibile** (resta solo il JSON-LD per la SEO). Nessun runtime di idratazione, metriche o piano se non serve.
- **`hydrate="inline|eager|visible|idle|never"`** su ogni componente (attributo `.cvw` o `hydrateMode` in JS): override esplicito dello scheduler. `inline` embedda il modulo isola come data-URI ESM — zero richieste di rete, niente catena critica LCP, import CDN funzionanti. Usalo per micro-interazioni critiche (tema, lingua, nav).
- **`modulepreload` automatico** per le isole eager esterne: il modulo si scarica in parallelo all'HTML invece di essere scoperto dopo.
- **Minificazione**: isole via esbuild, CSS inline, HTML whitespace, script inline. **PurgeCSS integrato** sicuro-per-costruzione: l'HTML è tutto server-rendered, quindi il purger vede la verità completa (niente classi "indovinate").
- **`public/`** copiata in `dist/` così com'è (favicon, font, `_headers`, file di verifica).
- Le metriche CFP/FAR/… e l'overlay esistono **solo in dev**.

## Consent GDPR (cookie banner) — compliance a 0 KB nel critical path

Il consenso è una primitiva del framework, non un tag da incollare. Due modalità in `cvw.config.js`:

```js
// A) NATIVE — banner del framework: server-rendered al primo paint, zero richieste
site: { consent: {
  mode: 'native',
  categories: ['analytics', 'marketing'],
  policyUrl: '/privacy/',
  text: { title, body, accept, reject },   // opzionale, default in italiano
}}

// B) VENDOR — Cookiebot/Iubenda classici, ottimizzati
site: { consent: {
  mode: 'vendor', vendor: 'cookiebot',      // o 'iubenda'
  id: 'xxx-xxx',
  strategy: 'idle',                          // 'defer' | 'idle' | 'interaction'
}}
```

Garanzie (entrambe le modalità): **nessun tracker prima del consenso** — architetturale, non uno script che blocca altri script; Consent Mode v2 inline default-denied (~200 byte); rifiutare facile quanto accettare; scelta persistita 12 mesi + evento `cvw:consent`.

Gating dichiarativo: `consent="marketing"` su un component (o `consent: 'marketing'` su un PerfNode) → l'isola non si idrata finché la categoria non è consentita. Per script terzi nel markup: `<script type="text/plain" data-cvw-consent="marketing" src="...">` → attivato solo post-consenso.

**Iframe ed embed (YouTube, Maps…)**: `<iframe data-cvw-consent="marketing" data-src="...">` resta inerte e si attiva da solo al consenso. Oppure la **facade video** inclusa:

```js
import { videoFacadeHtml } from 'cvw-first/consent';
render: () => videoFacadeHtml({ id: 'dQw4w9WgXcQ', title: 'Il nostro spot' })
```

Placeholder statico da ~2 KB (vs ~800 KB dell'embed YouTube) con thumbnail e bottone etichettato. Comportamento: **consenso già dato (banner o visita precedente) → l'iframe si carica automaticamente**, nessun secondo click; click diretto sulla facade → consenso per la categoria + video con **autoplay** (c'è il gesto utente). Usa `youtube-nocookie.com`.

In modalità vendor il framework aggiunge `preconnect` all'origine del CMP, carica lo script fuori dal critical path secondo la `strategy` (con fallback: mai oltre 4s senza banner), e usa il manual-blocking del vendor (il blocking lo fa CVW, deterministico). Trade-off: il banner del vendor appare ~0,5-1s dopo il paint; il native appare al primo paint.

> Nota: l'impianto è progettato per GDPR/ePrivacy ma va validato con il vostro consulente privacy, in particolare la registrazione della prova del consenso nel vostro mercato.

## SSG e ISR

CVW-First è **SSG-first**: `cvw build` produce HTML statico puro, deployabile su qualsiasi CDN. Tre regimi per pagina:

| Regime | Come | Dove gira |
|---|---|---|
| **SSG** (default) | niente da fare | CDN ovunque |
| **ISR** | `export const revalidate = 60` | Vercel (`s-maxage` + `stale-while-revalidate` sulla CDN) o adapter Node (micro-cache in-memory con TTL) |
| **SSR** | `export const prerender = false` | adapter Node o Vercel, mai in cache |

## i18n (multilingua)

Due righe in `cvw.config.js` e ogni pagina viene buildara in tutte le lingue:

```js
site: { ..., locales: ['it', 'en', 'de'], defaultLocale: 'it' }
```

- **Routing per prefisso**: lingua default a `/`, le altre a `/en/...`, `/de/...` — generato automaticamente da ogni pagina, statica o dinamica.
- **Traduzioni** in `locales/<lang>.json` (chiavi annidate, interpolazione `{var}`). Nei `.cvw`: `{{t:hero.title}}` in template, title e description. Nei `.page.js`: `ctx.t('hero.title', { name })` e `ctx.locale`.
- **SEO automatica**: `hreflang` alternate + `x-default` nell'head, `og:locale`, `<html lang>`, sitemap con `xhtml:link` alternates. Zero configurazione oltre a `locales`.
- **Content collections per lingua**: `content/blog/it/*.md`, `content/blog/en/*.md` — `getCollection` sceglie la cartella della lingua (fallback: quella comune).
- **Optimizer per mercato** (unico di CVW-First): `reports/en/crux.json` sovrascrive `reports/crux.json` per la build inglese — il CTR e i dispositivi del pubblico tedesco non sono quelli italiano, e i pesi si ricalibrano per lingua.

Scelta deliberata: niente redirect automatico dalla lingua del browser (danneggia SEO e cache CDN) — se serve, un banner di suggerimento in un'isola.

## Sicurezza e reattività

- `html\`\`` (tagged template): ogni interpolazione è escapata; `raw()` solo per HTML generato dal framework; `safeUrl()` blocca `javascript:`. Il Markdown delle collections esce già escapato.
- Signals client (`window.cvw.signal/effect/computed`) iniettati in pagina, usabili in ogni `script hydrate` — reattività senza dipendenze.

## Deploy

- **Statico** (sito vetrina, blog): `dist/` su Vercel, Cloudflare Pages, Netlify, qualsiasi CDN.
- **SSR on-demand** (e-commerce, personalizzazione): adapter Node (`cvw-first/adapters/node`) su VPS, oppure **adapter Vercel** (`cvw-first/adapters/vercel`): statico su CDN + function serverless solo per le pagine dinamiche (setup nel commento dell'adapter: `api/ssr.js` + rewrites in `vercel.json`).

Per il workflow completo e le regole operative (pesi, idratazione, consent, i18n): `AI-GUIDE.md` — scritta per gli agenti AI, ottima anche per umani.

## Il feedback loop (la differenza vera)

```
deploy → utenti reali → pull-vitals + analytics → reports/ → build → pesi ricalibrati → deploy
```

Nessun altro framework chiude questo cerchio: CVW-First adatta idratazione e priorità ai dispositivi e ai comportamenti *del tuo pubblico reale*, build dopo build.

---

## Guida per agenti AI

*Questa sezione è rivolta a LLM/agenti che generano siti con CVW-First. Umani benvenuti.*

**Workflow**: 1) scaffolding con `create-cvw` (o replica la struttura sopra); 2) una pagina per file in `pages/`, preferisci `.cvw` per pagine statiche e `.page.js` solo se servono `getStaticPaths`, `prerender=false` o logica; 3) assegna i pesi con la tabella sotto; 4) verifica con `npx cvw build .` leggendo il log (render order e piano eager/lazy/static devono riflettere le priorità di business).

**Tabella pesi** (non inventare valori — usa questi range):

| Componente | conversion | seo | interaction |
|---|---|---|---|
| CTA primario (buy/signup/form contatti) | 0.9–1.0 | 0–0.2 | 0.7–0.9 |
| Prezzo / offerta | 0.8–0.9 | 0.7–0.9 | ~0.1 |
| Hero / H1 | 0.7–0.9 | 1.0 | ~0.2 |
| Recensioni / social proof | 0.4–0.6 | 0.7–0.9 | ~0.3 |
| Navigazione | 0.2 | 0.3 | 0.3–0.5 |
| Carousel correlati | 0.1–0.3 | 0–0.2 | 0.1–0.2 |
| Chat/cookie/widget terzi | ≤0.05 | 0 | ≤0.05 |
