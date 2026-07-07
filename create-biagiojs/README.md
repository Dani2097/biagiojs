# create-biagiojs

Scaffolding ufficiale per progetti **[biagiojs](https://github.com/Dani2097/biagiojs)**.

```bash
npx create-biagiojs mio-sito
cd mio-sito && npm install && npm run dev
```

## Cosa genera

```
mio-sito/
├── biagio.config.js
├── package.json          # dipende da biagiojs
├── pages/index.page.biagio
├── public/_headers       # cache Cloudflare / Netlify
├── images/
└── …
```

## Script npm generati

| Script | Comando |
|--------|---------|
| `dev` | `biagio dev .` |
| `build` | `biagio build .` |
| `preview` | adapter Node su porta 3000 |

## Documentazione

Tutta la documentazione del framework è nel pacchetto principale:

- [biagiojs README](https://github.com/Dani2097/biagiojs/blob/main/biagiojs/README.md)
- [Guida agenti AI](https://github.com/Dani2097/biagiojs/blob/main/biagiojs/AI-GUIDE.md)

## Pubblicazione

```bash
npm publish
```

Pacchetto standalone: non include il framework, solo il template di scaffolding.

## Licenza

MIT © Danilo Sprovieri
