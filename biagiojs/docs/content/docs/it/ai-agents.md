---
title: Agenti AI
description: llms.txt, AI-GUIDE e convenzioni per LLM che costruiscono siti con biagiojs.
order: 10
priority: 0.7
lastmod: 2026-07-08
---

# Agenti AI

biagiojs include materiale dedicato a LLM e agenti di coding: un indice curato, una guida operativa completa nel pacchetto npm e documentazione strutturata per il retrieval.

## Link rapidi

| Risorsa | URL |
|---------|-----|
| **llms.txt** (indice sito) | [/llms.txt](https://biagio.danilosprovieri.com/llms.txt) |
| **AI-GUIDE.md** (riferimento completo) | [GitHub](https://github.com/Dani2097/biagiojs/blob/main/biagiojs/AI-GUIDE.md) |
| **Documentazione** | [/it/docs/](https://biagio.danilosprovieri.com/it/docs/) |

Indica al tuo agente `https://biagio.danilosprovieri.com/llms.txt` per una mappa compatta di ogni guida. Per i dettagli implementativi, leggi **AI-GUIDE.md** nel pacchetto npm `biagiojs` (anche su GitHub).

## Modello mentale

biagiojs è **SSG-first + isole, business-aware**. I componenti dichiarano **pesi business** (`conversion`, `seo`, `interaction`, 0–1) e **costi** (`cpu`, `network`). La build decide:

- ordine nel sorgente HTML (cosa arriva prima sul wire)
- piano di idratazione (eager / lazy / static)
- preload per valore/KB
- SEO, consent, i18n

**Regola d'oro:** statico è il default desiderabile. Le pagine senza isole spediscono **zero JavaScript** in produzione.

## Workflow agente

```bash
npx create-biagiojs mio-sito
cd mio-sito && npm install
```

1. Imposta `site.baseUrl` sull'URL di produzione reale (canonical, sitemap, OG dipendono da questo).
2. Preferisci `pages/*.page.biagio` per pagine dichiarative.
3. Usa le tabelle pesi da [Pesi business](/it/docs/business-weights/) — non inventare numeri a caso.
4. Esegui `npx biagio build .` e leggi il log render order + idratazione.
5. Esegui `npx biagio doctor .` prima del deploy.

## Riferimento pesi (non indovinare)

| Tipo componente | conversion | seo | interaction |
|-----------------|------------|-----|-------------|
| Hero / CTA principale | 0.8–1.0 | 0.7–1.0 | 0.5–0.9 |
| Scheda prodotto | 0.6–0.9 | 0.5–0.8 | 0.3–0.6 |
| Navigazione | 0.1–0.3 | 0.2–0.5 | 0.4–0.7 |
| Footer / legal | 0.05–0.1 | 0.3–0.5 | 0.01–0.05 |
| Widget chat | 0.03–0.1 | 0.1 | 0.1–0.3 |

Bassa conversion + alto costo `network` → resta **static** (niente JS).

## File da leggere per primi

1. [Per cominciare](/it/docs/getting-started/) — config e prima pagina
2. [Sintassi (.biagio)](/it/docs/syntax-biagio/) — pesi e attributi idratazione
3. [SEO automatica](/it/docs/seo/) — meta `page`, sitemap, hreflang, `llms.txt`
4. [Consent](/it/docs/consent/) — mai caricare tracker senza gating
5. [AI-GUIDE.md](https://github.com/Dani2097/biagiojs/blob/main/biagiojs/AI-GUIDE.md) — riferimento esaustivo

## SEO per agenti

- `site.baseUrl` deve essere il dominio live.
- `page.hideBreadcrumb: true` se renderizzi il breadcrumb nel layout (il JSON-LD breadcrumb funziona comunque).
- `robots.txt` e `sitemap.xml` si generano alla build; invia `https://tuosito.com/sitemap.xml` in Google Search Console.
- Aggiungi `/llms.txt` alla root del sito per la scoperta LLM (copia il pattern da `public/llms.txt` di questo sito docs).

## Errori comuni

- Idratare tutto — vanifica il framework; usa i pesi.
- Saltare `baseUrl` — rompe canonical e sitemap.
- Caricare analytics senza `data-cvw-consent` o `consent=` sull'isola.
- Usare `fonts.googleapis.com` in produzione invece di `site.fonts` self-hosted.
