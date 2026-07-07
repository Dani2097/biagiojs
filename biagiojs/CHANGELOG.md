# Changelog — biagiojs

## v0.8.3 — Verso il pavimento teorico (SSG)

Byte unici in meno, quelli che sopravvivono anche a gzip/Brotli.

- **Wrapper `<div>` opzionale**: i nodi statici "nudi" (niente `data-cvw-id`, niente `order`, niente marker) vengono renderizzati come contenuto diretto, figlio flex di `<main>`. Il `<div>` si emette solo quando serve davvero (nodo interattivo, `order` ≠ 0, o marker in dev). Meno byte strutturali per pagina, proporzionali al numero di nodi.
- **Minificatore CSS vero (lightningcss, opzionale)**: se installato, `optimizeHtml` collassa shorthand, deduplica selettori/regole e minifica i valori — riduzione reale, non solo whitespace. Assente → fallback su `minifyCss` (regex, zero dipendenze). Aggiunto a `optionalDependencies`.
- Nuovi test: nodo statico senza wrapper.

> Nota SSG: dopo purge del CSS morto + minify CSS reale + drop wrapper + Brotli sulla CDN si è entro pochi punti percentuali dall'entropia del contenuto — il pavimento pratico. Sotto non si scende: è teoria dell'informazione, non overhead del framework.

## v0.8.2 — Runtime: robustezza + latenza SSR

- **Chunk in blocchi isolati**: nell'IIFE unico, i runtime statici (signals/metrics/hydration) girano ognuno in un blocco `{}` proprio. Comunicano solo via `window`, quindi i loro `const`/`let` top-level non possono più collidere tra loro — niente `SyntaxError` da redeclaration se in futuro due runtime usano lo stesso nome.
- **Cache della minify runtime**: `minifyClientRuntime()` memoizza l'output (LRU, max 256). SSR/ISR ri-renderizzano spesso pagine identiche → lo stesso bundle non viene ri-passato a esbuild ad ogni richiesta. Meno lavoro per-richiesta, TTFB SSR più basso.
- **Marker metrici solo in dev**: `data-cvw-conversion` / `data-cvw-seo` / `data-cvw-revenue` vengono emessi solo con `overlay` attivo (li leggono solo overlay/metriche, che in produzione non sono spedite). In prod l'HTML dei nodi ad alto valore è più leggero.
- Nuovi test in `ssr-runtime.test.js` per il gating `overlay` dei marker metrici.

## v0.8.1 — Patch

- Allineamento versione `biagiojs` / `create-biagiojs` (`^0.8.1`).
- `renderPage()` documentato come async; 81 test in suite.

## v0.8.0 — Runtime dimagrito + pipeline DX

### Performance runtime (SSG + SSR)
- **HTML per-nodo**: `data-cvw-id` solo su nodi interattivi; `style="order:0"` omesso; metriche SEO/conversion su nodi qualificati.
- **`__CVW_PLAN__` compatto**: `{"e":["cta"],"l":["nav"]}` — niente `static` né `priority` nel payload client.
- **Signals condizionale**: `SIGNALS_RUNTIME` incluso solo se isole referenziano `window.cvw` / `signal` / `effect`.
- **IIFE unico**: PLAN + PROPS + ISLANDS + hydration (e opz. signals/metrics) in un solo `<script>` minificato con esbuild.
- **Isole inline**: `data:text/javascript,` + `encodeURIComponent` quando più piccolo di base64 (−33% tipico).
- **`renderPage()` async** — bundle runtime minificato a build/dev.

Benchmark demo (pagina prodotto): HTML **21.2 KB → 14.1 KB** (−33%).

### Immagini (v0.7.x carry-over + estensioni)
- Profili (`content`, `hero`, `thumb`, `full`, `experience`) e `bySlug` per larghezze/qualità/crop.
- `qualityBySlug`, `respectSourceMax`, opzioni AVIF sharp, fallback WebP medio in `smartImage`.
- `biagio build --clean`, `--dryRun`, report pesi `dist/img/`.
- Guida **[IMAGE-OPTIMIZATION.md](./IMAGE-OPTIMIZATION.md)**.

### Font
- `inject: 'inline' | 'async' | 'stylesheet' | false`
- `preload: 'critical' | 'all' | false` + `preloadCritical`
- `role: 'body' | 'display'` su voci Google Fonts
- `hooks.afterFonts`; manifest aggiornato post-subset

### Deploy / build
- `site.cache` genera `dist/_headers` con `! Cache-Control`
- Template `create-biagiojs` con `_headers` corretto
- `site.sitemap` per `robots.txt`
- `hooks.head({ page, locale, ctx })`
- **[DEPLOY-CACHE.md](./DEPLOY-CACHE.md)**

---

## v0.7.0 — Production hardening

PurgeCSS fix, pipeline immagini sharp, `.env` in build, `site.images` unificata, validazione srcset, remote images, Google Fonts self-hosted, font subset opt-in, `create-biagiojs` hardening.

---

## v0.6.0 — Consent GDPR

Modulo consent native + vendor, Consent Mode v2, gating isole/script/iframe.
