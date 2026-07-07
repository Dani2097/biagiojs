# Deploy e cache — Cloudflare Pages / Netlify

## Comportamento cumulativo (importante)

Su **Cloudflare Pages**, le regole in `_headers` **non si sovrascrivono**: si **cumulano**. Se hai:

```
/*
  Cache-Control: public, max-age=3600

/img/*
  Cache-Control: public, max-age=31536000, immutable
```

`/img/hero-960w.avif` riceve **entrambe** le direttive. Il browser può applicare la meno restrittiva (`max-age=3600`) — i tuoi asset statici finiscono con cache di 1 ora invece di 1 anno.

### Fix: `! Cache-Control`

Cloudflare (e Netlify) supportano il prefisso `!` per forzare un header:

```
/img/*
  ! Cache-Control: public, max-age=31536000, immutable
```

Il template `create-biagiojs` e `site.cache` in config usano questo pattern.

---

## Generazione automatica (`site.cache`)

In `biagio.config.js`:

```js
export default {
  site: {
    cache: true,  // genera dist/_headers a ogni build
    // oppure override:
    // cache: {
    //   immutable: ['/img/*', '/fonts/*', '/islands/*'],
    //   html: '/*.html',
    // },
  },
};
```

`biagio build` scrive `dist/_headers` **dopo** la copia di `public/`, quindi sovrascrive un `_headers` generico se `site.cache` è attivo.

Ordine build:
1. `public/` → `dist/` (il tuo `_headers` manuale)
2. Se `site.cache`: rigenera `dist/_headers` con regole corrette

Per progetti con regole custom miste, metti le eccezioni in `public/_headers` e disabilita `site.cache`, oppure estendi `site.cache.immutable`.

---

## Checklist deploy

- [ ] Asset statici (`/img/`, `/fonts/`, `/islands/`) con `! Cache-Control` immutable
- [ ] HTML con `max-age=0, must-revalidate`
- [ ] Evitare `/*` con cache breve senza `!` sugli asset
- [ ] `biagio build --clean` prima del deploy per evitare file orfani in `dist/img/`
