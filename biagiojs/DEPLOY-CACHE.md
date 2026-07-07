# Deploy e cache — Cloudflare Pages / Netlify

> Parte della documentazione [biagiojs](./README.md). Config immagini: [IMAGE-OPTIMIZATION.md](./IMAGE-OPTIMIZATION.md).

biagiojs può generare `dist/_headers` automaticamente con `site.cache` in `biagio.config.js`.

---

## Perché `! Cache-Control`

Su **Cloudflare Pages**, le regole in `_headers` **si cumulano**, non si sovrascrivono:

```
/*
  Cache-Control: public, max-age=3600

/img/*
  Cache-Control: public, max-age=31536000, immutable
```

`/img/hero-960w.avif` riceve **entrambe** le direttive. Il browser può applicare la meno restrittiva (`max-age=3600`) — asset statici con cache di 1 ora invece di 1 anno.

### Soluzione

Cloudflare e Netlify supportano il prefisso `!` per forzare un header:

```
/img/*
  ! Cache-Control: public, max-age=31536000, immutable
```

Il template `create-biagiojs` e `site.cache` usano questo pattern.

---

## Configurazione (`site.cache`)

```js
// biagio.config.js
export default {
  site: {
    cache: true,
    // oppure override:
    // cache: {
    //   immutable: ['/img/*', '/fonts/*', '/islands/*'],
    //   html: '/*.html',
    //   htmlControl: 'public, max-age=0, must-revalidate',
    //   assetControl: 'public, max-age=31536000, immutable',
    // },
  },
};
```

`biagio build` scrive `dist/_headers` **dopo** la copia di `public/`.

| Fase build | Effetto |
|------------|---------|
| 1. `public/` → `dist/` | Il tuo `_headers` manuale |
| 2. `site.cache` attivo | Rigenera `dist/_headers` con regole corrette |

Per regole custom miste: eccezioni in `public/_headers` e `site.cache: false`, oppure estendi `site.cache.immutable`.

---

## Cloudflare Pages

| Impostazione | Valore |
|--------------|--------|
| Build command | `npm run build` o `biagio build .` |
| Output directory | `dist` |
| Node version | ≥ 18 |

Siti 100% statici: nessun Worker necessario — carica solo `dist/`.

---

## Netlify

Stesso principio: `_headers` in `dist/` o `public/`. Usa `! Cache-Control` per asset immutabili.

---

## Checklist pre-deploy

- [ ] `/img/`, `/fonts/`, `/islands/` con `! Cache-Control: immutable`
- [ ] HTML con `max-age=0, must-revalidate`
- [ ] Nessuna regola `/*` con cache breve senza `!` sugli asset
- [ ] `biagio build --clean` per evitare file orfani in `dist/img/`
- [ ] Validazione immagini senza errori (vedi IMAGE-OPTIMIZATION.md)

---

## Riferimenti

- [Cloudflare Pages headers](https://developers.cloudflare.com/pages/configuration/headers/)
- [Netlify _headers](https://docs.netlify.com/routing/headers/)
