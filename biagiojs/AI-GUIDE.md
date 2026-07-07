# biagiojs — Guida per agenti AI

> **Versione:** 0.9.0 · Documento canonico per LLM/agenti che costruiscono siti con biagiojs.
>
> Panoramica umana: [README](./README.md) · Immagini: [IMAGE-OPTIMIZATION.md](./IMAGE-OPTIMIZATION.md) · Cache: [DEPLOY-CACHE.md](./DEPLOY-CACHE.md)

---

## Modello mentale

biagiojs è **SSG-first + islands, business-aware**. Ogni componente dichiara **pesi business** (`conversion`, `seo`, `interaction`, 0–1) e **costi** (`cpu`, `memory`, `network` in KB). Il framework decide:

- ordine di rendering nel sorgente HTML;
- quali isole idratare e quando (eager / lazy / mai);
- preload per valore/KB;
- SEO, consent GDPR, i18n.

**Regola d'oro:** statico è il default desiderabile. In produzione una pagina senza isole spedisce **zero JavaScript**. Ogni `hydrate`/`client` deve giustificarsi con un'interazione reale.

---

## Workflow

1. `npx create-biagiojs <dir>` → `cd <dir> && npm install`
2. Configura `biagio.config.js` (`baseUrl` reale: alimenta canonical, sitemap, OG, hreflang)
3. Una pagina per file in `pages/` — preferisci `.page.biagio`
4. Assegna i pesi dalla tabella (non inventare valori)
5. `npx biagio build .` — verifica render order e piano eager/lazy/static nel log
6. `npx biagio dev .` — overlay CWV live

---

## Struttura progetto

```
mio-sito/
├── biagio.config.js
├── pages/                    # index.page.biagio → /
│   └── blog/[slug].page.js
├── islands/                  # export default (el, props) => void
├── content/blog/*.md
├── images/                   # richiede sharp se non vuota
├── public/                   # favicon, _headers, …
├── locales/it.json
├── reports/                  # optimizer (opzionale; per lingua: reports/en/)
└── dist/
```

---

## Sintassi `.biagio`

```html
<page title="…" description="…" sitemapPriority="1.0"
      type="product" image="/img/x.jpg" overlay="false" />

<component id="hero" seo="1" conversion="0.9" cpu="2">
  <template><section><h1>Titolo</h1></section></template>
</component>

<component id="cta" conversion="1" interaction="0.85">
  <template><button id="buy">Compra</button></template>
  <script hydrate>
    el.querySelector('#buy').addEventListener('click', () => { /* self-contained */ });
  </script>
</component>

<component id="stock" conversion="0.9" interaction="0.6"
           client="/islands/stock.js" props='{"initial": 5}'>
  <template><div data-react-root>…</div></template>
</component>

<component id="theme" client="/islands/theme.js" hydrate="inline">
  <template><button>🌙</button></template>
</component>

<style>/* purgato e minificato in build */</style>
```

**Attributi `<component>`:** `id`, `seo`, `conversion`, `interaction`, `cpu`, `memory`, `network`, `deps`, `client`, `props`, `hydrate`, `consent`.

**Attributi `<page>`:** `title`, `description`, `type`, `image`, `sitemapPriority`, `lastmod`, `noindex`, `overlay`.

---

## Sintassi JS (`.page.js` / `.page.ts`)

```js
import { PerfNode, PerformanceGraph } from 'biagiojs/graph';
import { html, raw } from 'biagiojs/html';

export const prerender = false;   // SSR on-demand
// export const revalidate = 300;  // ISR

export function getStaticPaths({ getCollection }) {
  return getCollection('content/blog').map(p => ({
    params: { slug: p.slug }, props: { post: p },
  }));
}

export default function (ctx) {
  const g = new PerformanceGraph().add(new PerfNode('article', {
    seoWeight: 1, conversionWeight: 0.4, cpuCost: 2,
    render: () => html`<article>${raw(ctx.props.post.html)}</article>`.toString(),
  }));
  g.get('article').domOrder = 0;   // obbligatorio nei .page.js
  return {
    graph: g,
    page: { title, description, sitemapPriority },
    assets: [{ url: '/fonts/x.woff2', kb: 30, businessValue: 0.5 }],
    experiments: ab,
  };
}
```

**`ctx`:** `{ site, params, props, request, locale, t, getCollection, ExperimentEngine, userId, reports }`.

---

## Tabella pesi

| Componente | conversion | seo | interaction |
|------------|------------|-----|-------------|
| CTA primario | 0.9–1.0 | 0–0.2 | 0.7–0.9 |
| Prezzo / offerta | 0.8–0.9 | 0.7–0.9 | ~0.1 |
| Hero / H1 | 0.7–0.9 | 1.0 | ~0.2 |
| Recensioni | 0.4–0.6 | 0.7–0.9 | ~0.3 |
| Navigazione | 0.2 | 0.3 | 0.3–0.5 |
| Carousel | 0.1–0.3 | 0–0.2 | 0.1–0.2 |
| Chat/widget terzi | ≤0.05 | 0 | ≤0.05 |
| Footer | ≤0.05 | 0.1 | ≤0.05 |

**Vincoli:** `businessValue = 0.6·conversion + 0.25·seo + 0.15·interaction`. Soglie default eager ≥0.3, lazy ≥0.05 (l'optimizer le adatta). `conversion ≥ 0.7` + interattività ⇒ revenue island (FAR/RFI).

---

## Regime pagina

| Caso | Azione |
|------|--------|
| Contenuto fisso | SSG (default) |
| Dati che cambiano periodicamente | `export const revalidate = N` |
| Per-utente / real-time | `export const prerender = false` |

---

## Idratazione

| Caso | Azione |
|------|--------|
| Nessuna interazione | niente `hydrate`/`client` |
| Tema, lingua, nav critica | `hydrate="inline"` |
| CTA principale | pesi alti → scheduler eager |
| Sotto la piega | pesi reali → lazy automatico |
| JS mai spedito | `hydrate="never"` |
| Tracker marketing | `consent="marketing"` |

---

## Consent GDPR

```js
site: { consent: { mode: 'native', categories: ['analytics','marketing'], policyUrl: '/privacy/' } }
site: { consent: { mode: 'vendor', vendor: 'cookiebot', id: '…', strategy: 'idle' } }
```

Gating:
- isole: `consent="marketing"`
- script: `<script type="text/plain" data-cvw-consent="marketing" src="…">`
- iframe: `<iframe data-cvw-consent="marketing" data-src="…">`
- video: `videoFacadeHtml({ id, title })` da `biagiojs/consent`

Consent Mode v2 default-denied sempre emesso. **Non aggirare** il gating per tracker.

---

## i18n

```js
site: { locales: ['it','en'], defaultLocale: 'it' }
```

- Route: `/` (default), `/en/…` (altre lingue)
- `{{t:chiave}}` nei `.biagio`; `ctx.t('chiave')` nei `.page.js`
- hreflang, sitemap alternate, `og:locale` automatici
- Report per mercato: `reports/en/crux.json`

---

## SEO / OG / favicon

Automatici da `page` + `site`:

- `page.image` → og:image (fallback `site.ogImage`)
- `type="product"` + `page.product` → JSON-LD Product
- `site.favicon` → tag icon (file in `public/`)
- `sitemap.xml`, `robots.txt` ogni build

---

## Esperimenti A/B

```js
const ab = new ctx.ExperimentEngine({ userId: ctx.userId });
ab.define('checkout_v2', ['control', 'variant_b']);
// ab.pick('checkout_v2', { control: () => html, variant_b: () => html })
```

Assegnazione deterministica per utente. Per visitatori unici: `prerender = false`.

---

## Feedback loop

```bash
npx biagio pull-vitals https://sito.it .
npx biagio build .
```

Opzionale: `reports/analytics.json`, `reports/heatmap.json`, `reports/searchconsole.json`.

---

## Config (`biagio.config.js`)

```js
export default {
  site: {
    name: '…', baseUrl: 'https://…', description: '…',
    images: {
      widths: [480, 960, 1440], quality: 75,
      bySlug: { hero: [480, 960, 1440, 1920] },
      remote: {
        allowedDomains: ['cdn.example.com'],
        sources: [{ url: 'https://…/hero.jpg', slug: 'hero' }],
      },
    },
    fonts: {
      inject: 'inline',       // 'async' | 'stylesheet' | false
      preload: 'critical',    // 'all' | false
      google: [
        { family: 'Inter', weights: [400, 600], role: 'body' },
      ],
      subset: false,          // 'latin' o { preset, scan, extra }
    },
    cache: true,
    consent: { mode: 'native', categories: ['analytics'], policyUrl: '/privacy/' },
    locales: ['it', 'en'], defaultLocale: 'it',
  },
  hooks: {
    head({ page, locale }) { return ''; },
    beforeImages({ srcDir }) {},
    afterImages({ outDir, result }) {},
    beforeFonts({ fontsDir }) {},
    afterFonts({ fontsDir, result }) {},
  },
};
```

Vedi [IMAGE-OPTIMIZATION.md](./IMAGE-OPTIMIZATION.md) per profili e `smartImage()`. Vedi [DEPLOY-CACHE.md](./DEPLOY-CACHE.md) per `site.cache`.

---

## Errori tipici (checklist)

1. Idratare tutto — statico è il vantaggio del framework
2. Pesare tutto alto — lo scheduler degenera
3. Isole critiche come file esterni — usa `hydrate="inline"`
4. `render()` che ritorna DOM — deve ritornare **stringa**
5. Closure in `hydrate` — serializzata con `.toString()`; usa `clientModule` + `clientProps`
6. Dimenticare `domOrder` nei `.page.js`
7. XSS — usa `html\`\``; `raw()` solo su output fidato del framework
8. Tracker non gated — `data-cvw-consent` o `consent=`
9. `baseUrl` finto — rompe canonical/sitemap/hreflang
10. Toccare `dist/` a mano

---

## Comandi

```bash
npx biagio dev .
npx biagio build .
npx biagio build . --clean --dryRun
npx biagio doctor .
npx biagio analyze .
npx biagio preview .
npx biagio pull-vitals <url> .
npm test    # nel repo framework
```

Deploy: statico → Cloudflare Pages / Netlify / Vercel (`dist/`). SSR/ISR → `biagiojs/adapters/node`, `biagiojs/adapters/vercel`, `biagiojs/adapters/cloudflare`. Preset: `site.deploy: 'cloudflare' | 'vercel' | 'netlify'`.

Sito docs: `npm run dev:docs` nel repo framework (`biagiojs/docs/`).

Config TypeScript: `biagio.config.ts` (serve esbuild o vite). Tipi: `import type { BiagioConfig } from 'biagiojs/types'`.
