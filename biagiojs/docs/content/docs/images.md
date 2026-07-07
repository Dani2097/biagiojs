---
title: Images
description: sharp pipeline, smartImage profiles, bySlug and post-build validation.
order: 8
priority: 0.8
lastmod: 2026-07-07
---

# Images

```
images/hero.jpg  →  biagio build  →  dist/img/hero-480w.avif
                                      hero-960w.webp
                                      hero-1440w.jpg
```

## Setup

```bash
npm i -D sharp
```

Put sources in `images/`. The build generates **AVIF + WebP + JPEG** variants for each width bucket.

## Profiles

| Profile | Buckets | sizes | Use |
|---------|---------|-------|-----|
| `content` | 480, 960, 1440 | `(max-width: 920px) 100vw, 920px` | Standard layout |
| `hero` | 480, 960, 1440, 1920 | `100vw` | Full-bleed hero, LCP |
| `thumb` | 480, 640 | `(max-width: 200px) 120px, 200px` | Cards, carousel |
| `full` | 640, 1024, 1536, 1920 | `100vw` | Wide galleries |

```js
import { smartImage } from 'biagiojs/images';

smartImage(node, {
  src: '/img/hero',
  alt: 'Collection 2026',
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
    },
  },
};
```

## Remote images

Download from CDN before the pipeline:

```js
remote: {
  allowedDomains: ['cdn.example.com'],
  sources: [{ url: 'https://cdn.example.com/hero.jpg', slug: 'hero' }],
},
```

## Validation

Post-build, every `srcset` reference in HTML must exist in `dist/img/`. Missing files fail the build with page, ref and hint. Examples inside `<pre>` blocks are ignored.

## Dry run

```bash
biagio build . --dryRun
```

Plans buckets without writing files.
