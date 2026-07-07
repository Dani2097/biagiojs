# biagiojs — monorepo

Repository ufficiale del framework **[biagiojs](https://github.com/Dani2097/biagiojs)**.

| Pacchetto | Cartella | npm | Descrizione |
|-----------|----------|-----|-------------|
| **biagiojs** | [`biagiojs/`](./biagiojs) | [`biagiojs`](https://www.npmjs.com/package/biagiojs) | Framework: CLI `biagio`, SSR/SSG, isole, optimizer |
| **create-biagiojs** | [`create-biagiojs/`](./create-biagiojs) | [`create-biagiojs`](https://www.npmjs.com/package/create-biagiojs) | Scaffolding: `npx create-biagiojs mio-sito` |

> Il README completo del framework è in **[biagiojs/README.md](./biagiojs/README.md)**.

---

## Quick start

```bash
npx create-biagiojs mio-sito
cd mio-sito && npm install && npm run dev
```

---

## Sviluppo nel monorepo

```bash
cd biagiojs
npm install
npm test          # 95 test
npm run build     # demo → biagiojs/demo/dist
npm run bench     # benchmark vs baseline naive
```

---

## Pubblicazione su npm

```bash
# 1. Framework
cd biagiojs
npm test && npm publish --dry-run && npm publish

# 2. Scaffolding
cd ../create-biagiojs
npm publish --dry-run && npm publish

# 3. Depreca il vecchio nome (una tantum)
npm deprecate cvw-first "Rinominato in biagiojs — usa: npm i biagiojs@latest"
```

Richiede `npm login` e, con 2FA, l'OTP al publish.

---

## Documentazione

- [README framework](./biagiojs/README.md)
- [Guida agenti AI](./biagiojs/AI-GUIDE.md)
- [Ottimizzazione immagini](./biagiojs/IMAGE-OPTIMIZATION.md)
- [Cache deploy](./biagiojs/DEPLOY-CACHE.md)
- [Changelog](./biagiojs/CHANGELOG.md)

---

## Migrazione da cvw-first

Vedi la sezione dedicata in [biagiojs/README.md#migrazione-da-cvw-first](./biagiojs/README.md#migrazione-da-cvw-first).

---

## Licenza

MIT © Danilo Sprovieri
