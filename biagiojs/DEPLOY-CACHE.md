# Deploy and cache — Cloudflare Pages / Netlify

> Part of the [biagiojs](./README.md) documentation. Image config: [IMAGE-OPTIMIZATION.md](./IMAGE-OPTIMIZATION.md).

biagiojs can generate `dist/_headers` automatically from `site.cache` in `biagio.config.js`.

---

## Why `! Cache-Control`

On **Cloudflare Pages**, rules in `_headers` **accumulate** — they don't override:

```
/*
  Cache-Control: public, max-age=3600

/img/*
  Cache-Control: public, max-age=31536000, immutable
```

`/img/hero-960w.avif` receives **both** directives. The browser may apply the least restrictive one (`max-age=3600`) — static assets cached for 1 hour instead of 1 year.

### Solution

Cloudflare and Netlify support the `!` prefix to force a header:

```
/img/*
  ! Cache-Control: public, max-age=31536000, immutable
```

The `create-biagiojs` template and `site.cache` use this pattern.

---

## Configuration (`site.cache`)

```js
// biagio.config.js
export default {
  site: {
    cache: true,
    // or override:
    // cache: {
    //   immutable: ['/img/*', '/fonts/*', '/islands/*'],
    //   html: '/*.html',
    //   htmlControl: 'public, max-age=0, must-revalidate',
    //   assetControl: 'public, max-age=31536000, immutable',
    // },
  },
};
```

`biagio build` writes `dist/_headers` **after** copying `public/`.

| Build step | Effect |
|------------|--------|
| 1. `public/` → `dist/` | Your manual `_headers` |
| 2. `site.cache` enabled | Regenerates `dist/_headers` with correct rules |

For mixed custom rules: put exceptions in `public/_headers` and set `site.cache: false`, or extend `site.cache.immutable`.

---

## Cloudflare Pages

| Setting | Value |
|---------|-------|
| Build command | `npm run build` or `biagio build .` |
| Output directory | `dist` |
| Node version | ≥ 18 |

Fully static sites: no Worker needed — just upload `dist/`.

---

## Netlify

Same principle: `_headers` in `dist/` or `public/`. Use `! Cache-Control` for immutable assets.

---

## Pre-deploy checklist

- [ ] `/img/`, `/fonts/`, `/islands/` with `! Cache-Control: immutable`
- [ ] HTML with `max-age=0, must-revalidate`
- [ ] No `/*` rule with a short cache and no `!` on assets
- [ ] `biagio build --clean` to avoid orphan files in `dist/img/`
- [ ] Image validation passes with no errors (see IMAGE-OPTIMIZATION.md)

---

## References

- [Cloudflare Pages headers](https://developers.cloudflare.com/pages/configuration/headers/)
- [Netlify _headers](https://docs.netlify.com/routing/headers/)
