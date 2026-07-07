# Image Optimization — biagiojs

Guida alla pipeline immagini: build con **sharp**, markup responsive con **`smartImage()`**, e scelta delle dimensioni **per componente** senza rompere la validazione post-build.

## Panoramica

```
images/hero.jpg          biagio build              dist/img/hero-480w.avif
       │                 ─────────►                    hero-960w.webp
       │                 processImages()               hero-1920w.jpg
       │                      ▲                            …
       │                      │
pages/*.page.js ──► smartImage({ profile: 'hero' }) ──► HTML con srcset
```

1. Metti i sorgenti in `images/` (o scaricali da remoto con `site.images.remote`).
2. La build genera varianti **AVIF + WebP + JPEG** per ogni bucket di larghezza.
3. Nei componenti usi `smartImage()` con un **profilo** o larghezze esplicite.
4. Post-build: ogni file referenziato in `srcset` deve esistere in `dist/img/`.

**Dipendenza**: `sharp` (optionalDependency). Se `images/` non è vuota e `sharp` manca, la build fallisce.

```bash
npm i -D sharp
```

---

## Profili — il componente sceglie il contesto

Invece di ricordare array di pixel, il componente dichiara **come** viene mostrata l'immagine:

| Profilo | Bucket default | `sizes` default | Quando usarlo |
|---------|----------------|-----------------|---------------|
| `content` | 480, 960, 1440 | `(max-width: 920px) 100vw, 920px` | Immagini nel layout standard (~920px) |
| `hero` | 480, 960, 1440, **1920** | `100vw` | Hero full-bleed, LCP above-the-fold |
| `thumb` | 480, 640 | `(max-width: 200px) 120px, 200px` | Card, carousel, anteprime |
| `full` | 640, 1024, 1536, 1920 | `100vw` | Foto grandi, gallerie wide |

```js
import { PerfNode } from 'biagiojs/graph';
import { smartImage } from 'biagiojs/images';

g.add(new PerfNode('hero-img', {
  seoWeight: 0.9, conversionWeight: 0.7,
  render: () => smartImage(
    g.get('hero-img'),
    {
      src: '/img/hero',
      alt: 'Collezione 2026',
      width: 1920,
      height: 1080,
      profile: 'hero',
      aboveFold: true,
      images: site.images,   // da ctx in pages/*.page.js
    },
  ).html,
}));
```

Il profilo imposta **sia** i bucket di build (se allineato con config) **sia** `sizes` nel markup.

---

## Tre modi per definire le larghezze

### 1. Profilo (consigliato)

```js
smartImage(node, { src: '/img/hero', profile: 'hero', alt: '…', images: site.images })
```

### 2. Per slug in config (`bySlug`)

Genera solo i bucket necessari per ogni file — efficiente quando hero e thumbnail convivono nello stesso sito:

```js
// biagio.config.js
export default {
  site: {
    images: {
      widths: [480, 960, 1440],          // default per slug non elencati
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
// Il componente può omettere widths: risolve da bySlug + src
smartImage(node, { src: '/img/hero', alt: '…', images: site.images })
```

`images/hero.jpg` → slug `hero` → build genera 4 bucket × 3 formati.  
`images/thumb-card.png` → slug `thumb-card` (o override in `bySlug` con chiave esatta).

### 3. Larghezze esplicite (override puntuale)

```js
smartImage(node, {
  src: '/img/banner',
  widths: [640, 1200, 1600],
  sizes: '(min-width: 1200px) 80vw, 100vw',
  alt: '…',
})
```

**Importante**: le larghezze usate nel markup devono essere state generate a build. La validazione post-build segnala i mismatch.

### Priorità di risoluzione

```
widths espliciti  →  profile  →  bySlug[src]  →  site.images.widths
```

---

## Config completa

```js
export default {
  site: {
    images: {
      widths: [480, 960, 1440],
      quality: 75,
      allowSmallerSources: true,

      // Override per file (slug = nome normalizzato)
      bySlug: {
        hero: [480, 960, 1440, 1920],
      },

      // Override o nuovi profili
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

| Opzione | Default | Descrizione |
|---------|---------|-------------|
| `widths` | `[480, 960, 1440]` | Bucket per immagini senza entry in `bySlug` |
| `bySlug` | `{}` | Mappa slug → array larghezze (build per-file) |
| `profiles` | built-in | Override profili `content`, `hero`, `thumb`, `full` o nuovi nomi |
| `quality` | `75` | Qualità AVIF/WebP; JPEG = quality + 5 |
| `qualityBySlug` | `{}` | Qualità per slug: `{ hero: 50, sponsor: 55 }` |
| `respectSourceMax` | `true` | Non genera bucket più larghi della sorgente |
| `dryRun` | `false` | Solo pianificazione bucket (nessun file scritto) |
| `avif` | `{ effort: 4, chromaSubsampling: '4:2:0' }` | Opzioni sharp AVIF |
| `allowSmallerSources` | `true` | Sorgente piccola: genera bucket con `withoutEnlargement` |

---

## Slug dei file

I nomi in `images/` sono normalizzati:

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

Usa sempre lo slug nel codice: `src="/img/hero"`, non il nome file originale.

---

## `smartImage()` — comportamento automatico

Oltre a `srcset` responsive, deriva da **priority score** del nodo:

| Score | `loading` | `fetchpriority` | `decoding` |
|-------|-----------|-----------------|------------|
| Alto (LCP) | `eager` | `high` | `sync` |
| Basso | `lazy` | `auto` | `async` |

Format stack nel `<picture>`:

1. AVIF  
2. WebP  
3. JPEG (fallback `<img>`)

Preload LCP via network scheduler:

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

## Immagini remote (pre-build)

```js
remote: {
  allowedDomains: ['supabase.co'],
  allowLocalhost: false,
  sources: [
    { url: 'https://xxx.supabase.co/.../hero.jpg', slug: 'hero' },
  ],
}
```

Flusso: download → `images/hero.jpg` → `processImages` con `bySlug.hero` se definito.

Solo HTTPS; dominio deve essere in `allowedDomains` (accetta sottodomini).

---

## Validazione post-build

Dopo il render, biagiojs verifica che ogni `/img/*-Nw.{avif,webp,jpg}` referenziato nell'HTML esista in `dist/img/`.

Errori tipici:

| Errore | Causa | Fix |
|--------|-------|-----|
| `missing-1920w.avif` | Componente usa `profile: 'hero'` ma build senza 1920 | Aggiungi `bySlug` o allarga `widths` |
| Build fallisce senza sharp | `images/` non vuota | `npm i -D sharp` |
| 0 varianti generate | `allowSmallerSources: false` e sorgente troppo piccola | Abilita `allowSmallerSources` o abbassa i bucket |

---

## Scelta dei bucket — guida pratica

**Non alzare i default globali per tutti.** Usa profili o `bySlug`.

| Scenario | Strategia |
|----------|-----------|
| Blog / vetrina standard | `profile: 'content'` (default) |
| Hero full-bleed | `profile: 'hero'` + `bySlug.hero` con 1920 |
| Thumbnail carousel | `profile: 'thumb'` |
| Mix hero + thumb nello stesso sito | `bySlug` per ogni immagine |
| E-commerce prodotto zoom | Profilo custom `product` in config |

### Retina

Per contenuto max 920px:
- 1x → serve ~920px → bucket `960` ✅  
- 2x → serve ~1840px → bucket `1440` è al limite; per hero LCP considera `1920`

### Quanti bucket?

**3–5** è l'intervallo ottimale. Oltre 6 bucket il browser guadagna poco e la build/dist crescono linearmente (×3 formati per bucket).

### `bySlug` avanzato (qualità + crop)

Oltre agli array di larghezze, ogni slug può essere un oggetto:

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

Il profilo built-in `experience` include già crop 4:3 e quality 44.

### `qualityBySlug` (alternativa)

```js
qualityBySlug: { hero: 50, experience: 44 },
```

---

## `smartImage` — fallback migliorato

Il `<img>` fallback usa **WebP** con il bucket **medio** (non il massimo), riducendo il download su browser senza AVIF:

```html
<img src="/img/hero-960w.webp" srcset="...webp..." />
```

I `<source>` restano AVIF → WebP.

---

## Build CLI

```bash
npx biagio build . --clean      # cancella dist/img/ prima di rigenerare
npx biagio build . --dryRun     # elenca bucket pianificati, non scrive file
```

A fine build, il log mostra **report pesi** (top 10 file + totale KiB in `dist/img/`).

La validazione post-build include **hint espliciti**:

```
→ profile "experience" richiede 400w ma bySlug.cultural non lo include
```

---

## API export (`biagiojs/images`)

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

## Dev e Vite

- `biagio dev` e il plugin Vite rigenerano `dist/img/` all'avvio e al cambio file in `images/`.
- In dev `strict: false` su sharp: warning invece di exit se manca.

---

## Checklist

- [ ] `npm i -D sharp`
- [ ] File in `images/` con nomi chiari (diventano slug)
- [ ] `bySlug` o profili allineati a come usi le immagini nei componenti
- [ ] `images: site.images` passato a `smartImage()` quando usi `profile` o `bySlug`
- [ ] `sizes` coerente con il CSS del componente
- [ ] `npx biagio build .` senza errori di validazione srcset
- [ ] Hero LCP: `aboveFold: true` + preload in `assets` se critico
- [ ] `biagio build --clean` prima del deploy
- [ ] Cache asset: vedi **[DEPLOY-CACHE.md](./DEPLOY-CACHE.md)**
