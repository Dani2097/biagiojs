# shopify-biagiojs

A **headless Shopify storefront** starter built on [biagiojs](https://biagio.danilosprovieri.com).
Catalog pages are statically generated and ship almost no JavaScript; cart, login and a
private customer area are handled by small, business-weighted islands.

> Why biagiojs for commerce? Its whole thesis — Core Web Vitals as constraints,
> conversion/SEO as first-class citizens, *static by default* — is exactly what a fast
> storefront needs. Product/price/CTA/reviews already live in the framework's weight tables.

## What's inside

| Area | How it's built |
|------|----------------|
| **Home / collections / product** | ISR via Vercel adapter + **on-demand webhook** purge. Catalog HTML is not frozen in `dist/`. |
| **Cart** | One island (`cart-view.js`) using the Storefront **Cart API** (`cartCreate` / `cartLinesAdd/Update/Remove`). Checkout redirects to Shopify's hosted checkout. |
| **Login / Register** | Islands calling `customerAccessTokenCreate` / `customerCreate`. Token stored in a cookie. |
| **Private account area** | **SSR on demand** (`prerender = false`): reads the cookie server-side, fetches the customer, renders orders / profile / addresses. |
| **Cart badge** | Inline hydrate reading `localStorage` — **zero network**, stays in sync via a `cart:change` event. |

## Quick start

```bash
npm install
cp .env.example .env      # add your Storefront domain + token
npm run dev               # http://localhost:4321
```

Until `.env` is filled in, the home page shows a setup notice (the build still succeeds).
### Getting Storefront credentials

Shopify admin → **Settings → Apps and sales channels → Develop apps** → create an app →
enable these **Storefront API** scopes, then copy the **Storefront API access token**:

```
unauthenticated_read_product_listings
unauthenticated_read_product_inventory
unauthenticated_write_checkouts   unauthenticated_read_checkouts
unauthenticated_write_customers   unauthenticated_read_customers
```

The Storefront token is **publishable** — safe to expose in the browser. Never put an Admin token here.

## Project structure

```
shopify-biagiojs/
├── biagio.config.js        # site, images, favicon, consent, deploy preset
├── .env.example            # Shopify credentials
├── theme.js                # design system (CSS) + header/footer/product-card render
├── lib/
│   ├── shopify.js          # server Storefront client (build + SSR)
│   ├── queries.js          # catalog + customer GraphQL
│   ├── format.js           # money / price-range / escape
│   └── shell.js            # shared <head> + header/footer PerfNodes
├── pages/
│   ├── index.page.js               # home (ISR)
│   ├── products/[handle].page.js    # product detail (getStaticPaths + ISR)
│   ├── collections/[handle].page.js # collection listing (ISR)
│   ├── cart.page.js                 # cart (island)
│   ├── account/{login,register}.page.js
│   ├── account/index.page.js        # private area (SSR, prerender=false)
│   └── privacy.page.biagio
└── islands/
    ├── shopify-client.js   # browser Storefront client + cart & auth stores
    ├── add-to-cart.js  cart-view.js
    ├── auth-login.js  auth-register.js  account-logout.js
```

## Commands

```bash
npm run dev        # dev server with CWV + weights overlay
npm run build      # static build → dist/
npm run preview    # Node server: static + ISR + SSR account area
npm run doctor     # project validation
npm run analyze    # post-build weight report
```

## Deploy

Set `site.deploy: 'vercel'` in `biagio.config.js` (default here). The build emits islands,
assets and sitemap to `dist/`; **catalog HTML is served via `api/ssr`** (ISR + Shopify
Storefront API) so prices and stock stay fresh without a full rebuild.

| Layer | What runs |
|-------|-----------|
| **Catalog** (home, collections, products) | `api/ssr` + CDN cache (`revalidate` 5–10 min) |
| **Cart / login / privacy** | Static HTML in `dist/` |
| **Account area** | `api/ssr` (`prerender = false`) |

### Vercel

```bash
npm run build          # biagio build (stages api/_runtime for Vercel SSR)
npx vercel --prod
```

Environment variables on Vercel: all `SHOPIFY_*` from `.env.example`, plus `SITE_URL`.

### On-demand revalidation (Shopify webhooks)

When a product or collection changes in Shopify, a webhook hits `/api/revalidate` and
purges the matching Vercel CDN tags — the next visitor gets fresh HTML in the background.

1. Set `SHOPIFY_REVALIDATION_SECRET` in `.env` / Vercel (long random string).
2. In Shopify admin → **Settings → Notifications → Webhooks** → **Create webhook**:
   - **URL:** `https://<your-domain>/api/revalidate`
   - **Format:** JSON
   - **API version:** same as `SHOPIFY_API_VERSION`
   - **Secret:** same as `SHOPIFY_REVALIDATION_SECRET`
3. Add one webhook per topic (or combine with a custom app):
   - `products/create`, `products/update`, `products/delete`
   - `collections/create`, `collections/update`, `collections/delete`
   - `inventory_levels/update` (optional — refreshes the whole catalog tag)

Locally, `npm run preview` uses the Node adapter (static + in-memory ISR + SSR).

`vercel.json` rewrites catalog URLs to `api/ssr` with split rules for `/` and dynamic paths.

## Security notes

- The Storefront token is publishable by design. **Do not** add an Admin API token.
- The customer session token is stored in a cookie readable by JS (needed for client-side
  Storefront calls). For production, consider proxying customer calls through a server route
  and issuing an `HttpOnly` cookie, and/or migrating to the Shopify **Customer Account API** (OAuth).
- All external strings are HTML-escaped (`lib/format.js » esc`) before rendering.

## Keeping it fresh

Shopify ships a new **stable Storefront API version every quarter** (Jan/Apr/Jul/Oct).
Bump `SHOPIFY_API_VERSION` in `.env` when you upgrade. The live-data surface is deliberately
small (catalog + cart + customer) to limit churn.

---

MIT. Built on biagiojs by Danilo Sprovieri.
