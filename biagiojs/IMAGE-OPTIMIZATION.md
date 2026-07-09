# Image Optimization — biagiojs

> Guide to the image pipeline. Framework overview: [README](./README.md) · Deploy cache: [DEPLOY-CACHE.md](./DEPLOY-CACHE.md).

## Overview

```
images/hero.jpg          biagio build              dist/img/hero-480w.avif
       │                 ─────────►                    hero-960w.webp
       │                 processImages()               hero-1920w.jpg
       │                      ▲                            …
       │                      │
pages/*.page.js ──► smartImage({ profile: 'hero' }) ──► HTML with srcset
```

1. Put sources in `images/` (or download them remotely with `site.images.remote`).
2. The build generates **AVIF + WebP + JPEG** variants for every width bucket.
3. In components you use `smartImage()` with a **profile** or explicit widths.
4. Post-build: every file referenced in `srcset` must exist in `dist/img/`.

**Dependency**: `sharp` (optionalDependency). If `images/` is not empty and `sharp` is missing, the build fails.

```bash
npm i -D sharp
```

---

## Profiles — the component picks the context

Instead of remembering pixel arrays, the component declares **how** the image is displayed:

| Profile | Default buckets | Default `sizes` | When to use it |
|---------|-----------------|-----------------|----------------|
| `content` | 480, 960, 1440 | `(max-width: 920px) 100vw, 920px` | Images in the standard layout (~920px) |
| `hero` | 480, 960, 1440, **1920** | `100vw` | Full-bleed hero, above-the-fold LCP |
| `thumb` | 480, 640 | `(max-width: 200px) 120px, 200px` | Cards, carousels, thumbnails |
| `full` | 640, 1024, 1536, 1920 | `100vw` | Large photos, wide galleries |

```js
import { PerfNode } from 'biagiojs/graph';
import { smartImage } from 'biagiojs/images';

g.add(new PerfNode('hero-img', {
  seoWeight: 0.9, conversionWeight: 0.7,
  render: () => smartImage(
    g.get('hero-img'),
    {
      src: '/img/hero',
      alt: '2026 Collection',
      width: 1920,
      height: 1080,
      profile: 'hero',
      aboveFold: true,
      images: site.images,   // from ctx in pages/*.page.js
    },
  ).html,
}));
```

The profile sets **both** the build buckets (when aligned with config) **and** `sizes` in the markup.

---

## Three ways to define widths

### 1. Profile (recommended)

```js
smartImage(node, { src: '/img/hero', profile: 'hero', alt: '…', images: site.images })
```

### 2. Per slug in config (`bySlug`)

Generates only the buckets each file needs — efficient when heroes and thumbnails coexist on the same site:

```js
// biagio.config.js
export default {
  site: {
    images: {
      widths: [480, 960, 1440],          // default for slugs not listed
      bySlug: {
        hero: [480, 960, 1440, 1920],
        aerofoam: [480, 960, 1440],
        thumb: [480, 640],
      },
    },
  },
};
```

```js
// The component can omit widths: it resolves from bySlug + src
smartImage(node, { src: '/img/hero', alt: '…', images: site.images })
```

`images/hero.jpg` → slug `hero` → build generates 4 buckets × 3 formats.  
`images/thumb-card.png` → slug `thumb-card` (or override in `bySlug` with the exact key).

### 3. Explicit widths (one-off override)

```js
smartImage(node, {
  src: '/img/banner',
  widths: [640, 1200, 1600],
  sizes: '(min-width: 1200px) 80vw, 100vw',
  alt: '…',
})
```

**Important**: the widths used in the markup must have been generated at build. Post-build validation flags mismatches.

### Resolution priority

```
explicit widths  →  profile  →  bySlug[src]  →  site.images.widths
```

---

## Full config

```js
export default {
  site: {
    images: {
      widths: [480, 960, 1440],
      quality: 75,
      allowSmallerSources: true,

      // Per-file override (slug = normalized name)
      bySlug: {
        hero: [480, 960, 1440, 1920],
      },

      // Override or new profiles
      profiles: {
        hero: { widths: [480, 960, 1920], sizes: '100vw' },
        product: { widths: [480, 800, 1200], sizes: '(max-width: 600px) 100vw, 600px' },
      },

      remote: {
        allowedDomains: ['cdn.example.com'],
        sources: [
          { url: 'https://cdn.example.com/hero.jpg', slug: 'hero' },
        ],
      },
    },
  },
  hooks: {
    beforeImages({ srcDir, images }) { /* pre-processing */ },
    afterImages({ outDir, result }) { /* post-sharp */ },
  },
};
```

| Option | Default | Description |
|--------|---------|-------------|
| `widths` | `[480, 960, 1440]` | Buckets for images without a `bySlug` entry |
| `bySlug` | `{}` | Map slug → width array (per-file build) |
| `profiles` | built-in | Override the `content`, `hero`, `thumb`, `full` profiles or add new names |
| `quality` | `75` | AVIF/WebP quality; JPEG = quality + 5 |
| `qualityBySlug` | `{}` | Quality per slug: `{ hero: 50, sponsor: 55 }` |
| `respectSourceMax` | `true` | Don't generate buckets wider than the source |
| `dryRun` | `false` | Bucket planning only (no files written) |
| `avif` | `{ effort: 4, chromaSubsampling: '4:2:0' }` | sharp AVIF options |
| `allowSmallerSources` | `true` | Small source: generates buckets with `withoutEnlargement` |

---

## File slugs

Names in `images/` are normalized:

```
imgFood.png       →  imgfood
Foto Prodotto.jpg →  foto-prodotto
hero.jpg          →  hero
```

```js
import { imgSlug, slugFromSrc } from 'biagiojs/images';

imgSlug('Foto Prodotto.jpg');  // 'foto-prodotto'
slugFromSrc('/img/hero-960w.jpg'); // 'hero'
```

Always use the slug in code: `src="/img/hero"`, not the original file name.

---

## `smartImage()` — automatic behavior

Beyond a responsive `srcset`, it derives from the node's **priority score**:

| Score | `loading` | `fetchpriority` | `decoding` |
|-------|-----------|-----------------|------------|
| High (LCP) | `eager` | `high` | `sync` |
| Low | `lazy` | `auto` | `async` |

Format stack in `<picture>`:

1. AVIF  
2. WebP  
3. JPEG (fallback `<img>`)

LCP preload via the network scheduler:

```js
assets: [
  {
    url: '/img/hero',
    kb: 120,
    businessValue: 0.9,
    kind: 'image',
    profile: 'hero',
    images: site.images,
  },
]
```

---

## Remote images (pre-build)

```js
remote: {
  allowedDomains: ['supabase.co'],
  allowLocalhost: false,
  sources: [
    { url: 'https://xxx.supabase.co/.../hero.jpg', slug: 'hero' },
  ],
}
```

Flow: download → `images/hero.jpg` → `processImages` with `bySlug.hero` if defined.

HTTPS only; the domain must be in `allowedDomains` (subdomains accepted).

---

## Post-build validation

After render, biagiojs verifies that every `/img/*-Nw.{avif,webp,jpg}` referenced in the HTML exists in `dist/img/`.

Common errors:

| Error | Cause | Fix |
|-------|-------|-----|
| `missing-1920w.avif` | Component uses `profile: 'hero'` but the build has no 1920 | Add `bySlug` or widen `widths` |
| Build fails without sharp | `images/` not empty | `npm i -D sharp` |
| 0 variants generated | `allowSmallerSources: false` and the source is too small | Enable `allowSmallerSources` or lower the buckets |

---

## Choosing buckets — practical guide

**Don't raise the global defaults for everything.** Use profiles or `bySlug`.

| Scenario | Strategy |
|----------|----------|
| Standard blog / showcase | `profile: 'content'` (default) |
| Full-bleed hero | `profile: 'hero'` + `bySlug.hero` with 1920 |
| Carousel thumbnail | `profile: 'thumb'` |
| Hero + thumb mix on the same site | `bySlug` per image |
| Product zoom e-commerce | Custom `product` profile in config |

### Retina

For content up to 920px:
- 1x → needs ~920px → bucket `960` ✅  
- 2x → needs ~1840px → bucket `1440` is at the limit; for hero LCP consider `1920`

### How many buckets?

**3–5** is the sweet spot. Beyond 6 buckets the browser gains little and the build/dist grow linearly (×3 formats per bucket).

### Advanced `bySlug` (quality + crop)

Beyond width arrays, each slug can be an object:

```js
bySlug: {
  cultural: {
    widths: [400, 600],
    quality: 44,
    crop: { aspectRatio: '4/3', fit: 'cover' },
    avif: { effort: 5 },
  },
},
```

The built-in `experience` profile already includes a 4:3 crop and quality 44.

### `qualityBySlug` (alternative)

```js
qualityBySlug: { hero: 50, experience: 44 },
```

---

## `smartImage` — improved fallback

The `<img>` fallback uses **WebP** at the **middle** bucket (not the largest), reducing the download on browsers without AVIF:

```html
<img src="/img/hero-960w.webp" srcset="...webp..." />
```

The `<source>` tags stay AVIF → WebP.

---

## Build CLI

```bash
npx biagio build . --clean      # clears dist/img/ before regenerating
npx biagio build . --dryRun     # lists planned buckets, writes no files
```

At the end of the build, the log shows a **weight report** (top 10 files + total KiB in `dist/img/`).

Post-build validation includes **explicit hints**:

```
→ profile "experience" requires 400w but bySlug.cultural doesn't include it
```

---

## API exports (`biagiojs/images`)

```js
import {
  smartImage,
  imagePreload,
  imagePriority,
  imgSlug,
  slugFromSrc,
  widthsForSlug,
  resolveImageOptions,
  IMAGE_PROFILES,
} from 'biagiojs/images';
```

---

## Favicon generator (opt-in)

The same `sharp` pipeline powers a build-time favicon generator. Enable it with an object `site.favicon`:

```js
site: {
  favicon: {
    source: 'images/logo.svg',   // SVG ideal, or PNG ≥512
    generate: true,
    themeColor: '#111',
    background: '#ffffff',        // flatten background for raster icons
    // targets: ['ico', 'svg', 'apple', 'pwa'],
  },
}
```

It writes the modern essential set to `dist/`: `favicon.ico` (16/32/48, via an inline ICO encoder — sharp does not emit `.ico`), `icon.svg` (from an SVG source), `apple-touch-icon.png` (180), and the PWA `icon-192.png` + `icon-512.png` + `manifest.webmanifest`. The head tags (including `rel="manifest"` and `theme-color`) are injected automatically. Runs after `public/` copy (generated files win), is idempotent, and is validated by `biagio doctor`. Standalone API: `import { generateFavicons } from 'biagiojs/favicon'`.

## Dev and Vite

- `biagio dev` and the Vite plugin regenerate `dist/img/` on startup and when files in `images/` change.
- In dev, `strict: false` on sharp: a warning instead of an exit if it's missing.

---

## Checklist

- [ ] `npm i -D sharp`
- [ ] Files in `images/` with clear names (they become slugs)
- [ ] `bySlug` or profiles aligned with how you use images in components
- [ ] `images: site.images` passed to `smartImage()` when using `profile` or `bySlug`
- [ ] `sizes` consistent with the component's CSS
- [ ] `npx biagio build .` with no srcset validation errors
- [ ] Hero LCP: `aboveFold: true` + preload in `assets` if critical
- [ ] `biagio build --clean` before deploy
- [ ] Asset cache: see **[DEPLOY-CACHE.md](./DEPLOY-CACHE.md)**
