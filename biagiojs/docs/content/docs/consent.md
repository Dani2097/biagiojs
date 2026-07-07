---
title: Consent & cookies
description: GDPR-native banner, Cookiebot/Iubenda vendors, Consent Mode v2 and island gating.
order: 10
priority: 0.85
lastmod: 2026-07-07
---

# Consent & cookies

Compliance is a first-class primitive: **no tracker runs before consent**. biagiojs ships Consent Mode v2 (default denied), gates islands and third-party scripts, and supports either a **native banner** (0 KB vendor JS) or **Cookiebot / Iubenda** with deferred loading.

## Native mode (recommended)

Zero third-party script on the critical path. SSR banner with accept/reject at equal weight.

```js
site: {
  consent: {
    mode: 'native',
    categories: ['analytics', 'marketing'],
    policyUrl: '/privacy/',
    text: {
      title: 'Cookies',
      body: 'We use essential cookies and, with your consent, analytics and marketing.',
      accept: 'Accept all',
      reject: 'Essential only',
      policy: 'Privacy policy',
    },
  },
}
```

What you get automatically:

- Google **Consent Mode v2** inline snippet (`default denied`)
- `window.cvwConsent` runtime (~1 KB): `has()`, `get()`, `set()`
- Cookie `cvw_consent` for 12 months (`SameSite=Lax`)
- Custom event `cvw:consent` when the user chooses
- Banner removed from DOM after a saved choice

## Vendor mode (Cookiebot / Iubenda)

Keep your existing CMP; biagiojs still gates islands and scripts until consent is granted.

```js
site: {
  consent: {
    mode: 'vendor',
    vendor: 'cookiebot',    // or 'iubenda'
    id: 'YOUR-ID',
    strategy: 'idle',         // 'idle' | 'defer' | 'interaction'
    iubendaConfig: { /* only for iubenda */ },
  },
}
```

| Strategy | When the vendor script loads |
|----------|------------------------------|
| `idle` | `requestIdleCallback` (default) |
| `defer` | Immediately after parse, non-blocking |
| `interaction` | First scroll/click/keydown, max 4s fallback |

Vendor scripts use **manual blocking** (`data-blockingmode` for Cookiebot) so trackers stay inert until the CMP activates them. Preconnect warms the vendor origin without executing JS.

## Gating islands

```html
<component id="chat" conversion="0.05" consent="marketing" client="/islands/chat.js">
  <template><div id="chat-root"></div></template>
</component>
```

The hydration runtime queues gated islands until `cvw:consent` fires with the right category.

## Gating scripts

```html
<script type="text/plain" data-cvw-consent="analytics" src="https://www.googletagmanager.com/gtag/js?id=G-XXX" async></script>
<script type="text/plain" data-cvw-consent="analytics">
  gtag('config', 'G-XXX');
</script>
```

`type="text/plain"` keeps the browser from executing the script. After consent, biagiojs clones it into a real `<script>`.

## Gating iframes & video

```html
<iframe data-cvw-consent="marketing" data-src="https://…" title="…"></iframe>
```

For YouTube, use the built-in facade (~2 KB vs ~800 KB embed):

```js
import { videoFacadeHtml } from 'biagiojs/consent';

// in render():
videoFacadeHtml({ id: 'dQw4w9WgXcQ', title: 'Demo', category: 'marketing' })
```

Click grants consent for the category and loads the iframe with autoplay (user gesture). If consent already exists at load, the runtime swaps facades without autoplay.

## biagio doctor

`biagio doctor` checks consent configuration and warns on misconfigured gating.

## Rules

1. Never load analytics/marketing tags without `data-cvw-consent` or island `consent=`
2. Reject must be as easy as accept (native mode does this)
3. Consent Mode v2 is always emitted — do not strip it for "performance"
