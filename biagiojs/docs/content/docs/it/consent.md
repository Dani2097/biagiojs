---
title: Consent & cookie
description: Banner nativo GDPR, vendor Cookiebot/Iubenda, Consent Mode v2 e gating delle isole.
order: 10
priority: 0.85
lastmod: 2026-07-07
---

# Consent & cookie

La compliance è una primitiva del framework: **nessun tracker parte prima del consenso**. biagiojs include Consent Mode v2 (default denied), blocca isole e script di terze parti, e supporta un **banner nativo** (0 KB vendor JS) oppure **Cookiebot / Iubenda** con caricamento differito.

## Modalità native (consigliata)

Zero script di terze parti sul critical path. Banner SSR con accetta/rifiuta a pari livello.

```js
site: {
  consent: {
    mode: 'native',
    categories: ['analytics', 'marketing'],
    policyUrl: '/privacy/',
    text: {
      title: 'Cookie',
      body: 'Usiamo cookie tecnici e, con il tuo consenso, cookie di analisi e marketing.',
      accept: 'Accetta tutto',
      reject: 'Solo necessari',
      policy: 'Informativa privacy',
    },
  },
}
```

Cosa ottieni automaticamente:

- Snippet inline **Consent Mode v2** Google (`default denied`)
- Runtime `window.cvwConsent` (~1 KB): `has()`, `get()`, `set()`
- Cookie `cvw_consent` per 12 mesi (`SameSite=Lax`)
- Evento custom `cvw:consent` alla scelta dell'utente
- Banner rimosso dal DOM se esiste già una scelta salvata

## Modalità vendor (Cookiebot / Iubenda)

Mantieni il CMP esistente; biagiojs continua a bloccare isole e script finché non c'è consenso.

```js
site: {
  consent: {
    mode: 'vendor',
    vendor: 'cookiebot',    // oppure 'iubenda'
    id: 'TUO-ID',
    strategy: 'idle',         // 'idle' | 'defer' | 'interaction'
    iubendaConfig: { /* solo iubenda */ },
  },
}
```

| Strategy | Quando carica lo script vendor |
|----------|--------------------------------|
| `idle` | `requestIdleCallback` (default) |
| `defer` | Subito dopo il parse, non bloccante |
| `interaction` | Al primo scroll/click/keydown, fallback max 4s |

Gli script vendor usano **blocking manuale** così i tracker restano inerti finché il CMP non li attiva. Il preconnect scalda la connessione senza eseguire JS.

## Gating isole

```html
<component id="chat" conversion="0.05" consent="marketing" client="/islands/chat.js">
  <template><div id="chat-root"></div></template>
</component>
```

Il runtime di idratazione mette in coda le isole gated finché non arriva `cvw:consent` con la categoria giusta.

## Gating script

```html
<script type="text/plain" data-cvw-consent="analytics" src="https://www.googletagmanager.com/gtag/js?id=G-XXX" async></script>
<script type="text/plain" data-cvw-consent="analytics">
  gtag('config', 'G-XXX');
</script>
```

`type="text/plain"` impedisce al browser di eseguire lo script. Dopo il consenso, biagiojs lo clona in un `<script>` reale.

## Gating iframe & video

```html
<iframe data-cvw-consent="marketing" data-src="https://…" title="…"></iframe>
```

Per YouTube, usa la facade integrata (~2 KB vs ~800 KB embed):

```js
import { videoFacadeHtml } from 'biagiojs/consent';

// nel render():
videoFacadeHtml({ id: 'dQw4w9WgXcQ', title: 'Demo', category: 'marketing' })
```

Il click concede il consenso per la categoria e carica l'iframe con autoplay (gesto utente). Se il consenso esiste già al load, il runtime sostituisce le facade senza autoplay.

## biagio doctor

`biagio doctor` controlla la config consent e segnala gating mal configurato.

## Regole

1. Mai caricare tag analytics/marketing senza `data-cvw-consent` o `consent=` sull'isola
2. Rifiutare deve essere facile quanto accettare (la modalità native lo fa)
3. Consent Mode v2 è sempre emesso — non rimuoverlo per "performance"
