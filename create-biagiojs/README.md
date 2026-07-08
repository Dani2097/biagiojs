# create-biagiojs

Official scaffolding for **[biagiojs](https://biagio.danilosprovieri.com)** projects.

**[Site](https://biagio.danilosprovieri.com)** · **[Documentation](https://biagio.danilosprovieri.com/docs)** · **[npm](https://www.npmjs.com/package/create-biagiojs)**

```bash
npx create-biagiojs my-site
cd my-site && npm install && npm run dev
```

## What it generates

```
my-site/
├── biagio.config.js
├── package.json          # depends on biagiojs
├── pages/index.page.biagio
├── public/_headers       # Cloudflare / Netlify cache
├── images/
└── …
```

## Generated npm scripts

| Script | Command |
|--------|---------|
| `dev` | `biagio dev .` |
| `build` | `biagio build .` |
| `preview` | Node adapter on port 3000 |

## Documentation

Framework documentation:

- **[biagio.danilosprovieri.com](https://biagio.danilosprovieri.com/docs)**
- [biagiojs README](https://github.com/Dani2097/biagiojs/blob/main/biagiojs/README.md)
- [AI agent guide](https://github.com/Dani2097/biagiojs/blob/main/biagiojs/AI-GUIDE.md)

Standalone package: includes the scaffolding template only, not the framework itself.

## License

MIT © Danilo Sprovieri
