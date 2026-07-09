---
title: Agenti AI
description: llms.txt, AI-GUIDE e convenzioni per LLM che costruiscono siti con biagiojs.
order: 10
priority: 0.7
lastmod: 2026-07-09
---

# Agenti AI

biagiojs include materiale first-class per LLM e agenti di coding: indice curato, guida operativa completa nel pacchetto npm e documentazione strutturata per il retrieval.

## Link rapidi

| Risorsa | URL |
|---------|-----|
| **llms.txt** (indice sito) | [/llms.txt](https://biagio.danilosprovieri.com/llms.txt) |
| **AI-GUIDE.md** (riferimento completo) | [GitHub](https://github.com/Dani2097/biagiojs/blob/main/biagiojs/AI-GUIDE.md) |
| **Documentazione** | [/it/docs/](https://biagio.danilosprovieri.com/it/docs/) |
| **Estensione VS Code** | `biagiojs/extensions/vscode-biagio/` nel repo |

Punta il tuo agente a `https://biagio.danilosprovieri.com/llms.txt`.

## Modello mentale

biagiojs è **SSG-first + islands, business-aware**. I componenti dichiarano **pesi business** (`conversion`, `seo`, `interaction`, 0–1) e **costi** (`cpu`, `network`). La build decide piano idratazione, preload, SEO, consent e i18n.

**Regola d'oro:** statico è il default. Pagine senza isole → **zero JavaScript** in produzione.

## Workflow agente

```bash
npx create-biagiojs mio-sito --template blog
cd mio-sito && npm install
```

1. Imposta `site.baseUrl` con l'URL di produzione reale.
2. Usa `defineConfig` da `biagiojs/config` in `biagio.config.js`.
3. Preferisci `pages/*.page.biagio` o `biagio new page …`.
4. Usa le tabelle in [Pesi business](/it/docs/business-weights/) — non inventare numeri.
5. Esegui `biagio explain pages/index.page.biagio` per feedback immediato.
6. Esegui `biagio build .` e leggi render order + hydration log.
7. Esegui `biagio doctor .` prima del deploy.

## Comandi DX per agenti

| Comando | Quando usarlo |
|---------|---------------|
| `biagio new page blog/[slug]` | Nuova route con boilerplate `getStaticPaths` |
| `biagio new island counter` | Scaffold modulo client |
| `biagio new collection blog` | Collection Markdown + `content.config.js` |
| `biagio explain <page>` | Verifica eager/lazy/static senza build completo |
| `biagio doctor .` | Validazione pre-deploy inclusi link rotti |

## Riferimento pesi (non indovinare)

| Tipo componente | conversion | seo | interaction |
|-----------------|------------|-----|-------------|
| Hero / CTA principale | 0.8–1.0 | 0.7–1.0 | 0.5–0.9 |
| Scheda prodotto | 0.6–0.9 | 0.5–0.8 | 0.3–0.6 |
| Navigazione | 0.1–0.3 | 0.2–0.5 | 0.4–0.7 |
| Footer / legal | 0.05–0.1 | 0.3–0.5 | 0.01–0.05 |
| Widget chat | 0.03–0.1 | 0.1 | 0.1–0.3 |

## File da leggere per primi

1. [Per cominciare](/it/docs/getting-started/)
2. [Sintassi .biagio](/it/docs/syntax-biagio/)
3. [Content collections](/it/docs/content-collections/)
4. [CLI](/it/docs/cli/)
5. [SEO automatica](/it/docs/seo/)
6. [Consent](/it/docs/consent/)
7. [AI-GUIDE.md](https://github.com/Dani2097/biagiojs/blob/main/biagiojs/AI-GUIDE.md)

## Errori comuni

- Idratare tutto — usa i pesi e `biagio explain`.
- Saltare `baseUrl` — rompe canonical e sitemap.
- Tracker senza `data-cvw-consent` o `consent=` sull'isola.
- Google Fonts in produzione invece di `site.fonts` self-hosted.
- Pubblicare bozze — usa `draft: true` (escluso in build produzione).
