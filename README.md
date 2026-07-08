# biagiojs — monorepo

Official repository for the **[biagiojs](https://biagio.danilosprovieri.com)** framework.

**[Site](https://biagio.danilosprovieri.com)** · **[Documentation](https://biagio.danilosprovieri.com/docs)** · **[npm](https://www.npmjs.com/package/biagiojs)** · **[GitHub](https://github.com/Dani2097/biagiojs)**

| Package | Folder | npm | Description |
|---------|--------|-----|-------------|
| **biagiojs** | [`biagiojs/`](./biagiojs) | [`biagiojs`](https://www.npmjs.com/package/biagiojs) | Framework: `biagio` CLI, SSR/SSG, islands, optimizer |
| **create-biagiojs** | [`create-biagiojs/`](./create-biagiojs) | [`create-biagiojs`](https://www.npmjs.com/package/create-biagiojs) | Scaffolding: `npx create-biagiojs my-site` |

> Full framework README: **[biagiojs/README.md](./biagiojs/README.md)**

---

## Quick start

```bash
npx create-biagiojs my-site
cd my-site && npm install && npm run dev
```

---

## Monorepo development

```bash
cd biagiojs
npm install
npm test          # test suite
npm run build     # demo → biagiojs/demo/dist
npm run build:docs # docs → biagiojs/docs/dist
npm run dev:docs  # documentation dev server :4321
npm run bench     # benchmark vs naive baseline
```

---

## Documentation

- **[biagio.danilosprovieri.com](https://biagio.danilosprovieri.com/docs)** — documentation site (EN default, IT at `/it/`)
- [Framework README](./biagiojs/README.md)
- [AI agent guide](./biagiojs/AI-GUIDE.md)
- [Image optimization](./biagiojs/IMAGE-OPTIMIZATION.md)
- [Deploy cache](./biagiojs/DEPLOY-CACHE.md)
- [Changelog](./biagiojs/CHANGELOG.md)

---

## License

MIT © Danilo Sprovieri
