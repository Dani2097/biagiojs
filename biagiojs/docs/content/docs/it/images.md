---
title: Immagini
description: Pipeline sharp, profili smartImage, bySlug e validazione post-build.
order: 8
priority: 0.8
lastmod: 2026-07-07
---

# Immagini

```
images/hero.jpg  →  biagio build  →  dist/img/hero-480w.avif
                                      hero-960w.webp
                                      hero-1440w.jpg
```

## Setup

```bash
npm i -D sharp
```

Metti i sorgenti in `images/`. La build genera varianti **AVIF + WebP + JPEG** per ogni bucket di larghezza.

## Profili

| Profilo | Bucket | sizes | Uso |
|---------|--------|-------|-----|
| `content` | 480, 960, 1440 | `(max-width: 920px) 100vw, 920px` | Layout standard |
| `hero` | 480, 960, 1440, 1920 | `100vw` | Hero full-bleed, LCP |
| `thumb` | 480, 640 | `(max-width: 200px) 120px, 200px` | Card, carousel |
| `full` | 640, 1024, 1536, 1920 | `100vw` | Gallerie wide |

```js
import { smartImage } from 'biagiojs/images';

smartImage(node, {
  src: '/img/hero',
  alt: 'Collezione 2026',
  width: 1920,
  height: 1080,
  profile: 'hero',
  aboveFold: true,
  images: site.images,
});
```

## Config

```js
export default {
  site: {
    images: {
      widths: [480, 960, 1440],
      quality: 75,
      bySlug: { hero: [480, 960, 1440, 1920] },
      profiles: { hero: { widths: [480, 960, 1920], sizes: '100vw' } },
    },
  },
};
```

## Remote images

Scarica immagini da CDN prima della pipeline:

```js
remote: {
  allowedDomains: ['cdn.example.com'],
  sources: [
    { url: 'https://cdn.example.com/hero.jpg', slug: 'hero' },
  ],
},
```

## Validazione

Post-build, ogni `srcset` referenziato nell'HTML deve esistere in `dist/img/`. Se manca un file, la build fallisce con errore esplicito (pagina, ref, hint).

## Dry run

```bash
biagio build . --dryRun
```

Pianifica i bucket senza scrivere file — utile per verificare la config.
