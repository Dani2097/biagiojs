---
title: AI agents
description: llms.txt, AI-GUIDE and conventions for LLMs building sites with biagiojs.
order: 10
priority: 0.7
lastmod: 2026-07-09
---

# AI agents

biagiojs ships first-class material for LLMs and coding agents: a curated index, a full operational guide in the npm package, and documentation structured for retrieval.

## Quick links

| Resource | URL |
|----------|-----|
| **llms.txt** (site index) | [/llms.txt](https://biagio.danilosprovieri.com/llms.txt) |
| **AI-GUIDE.md** (full reference) | [GitHub](https://github.com/Dani2097/biagiojs/blob/main/biagiojs/AI-GUIDE.md) |
| **Documentation** | [/docs/](https://biagio.danilosprovieri.com/docs/) |
| **VS Code extension** | `biagiojs/extensions/vscode-biagio/` in the repo |

Point your agent at `https://biagio.danilosprovieri.com/llms.txt` for a compact map of every guide.

## Mental model

biagiojs is **SSG-first + islands, business-aware**. Components declare **business weights** (`conversion`, `seo`, `interaction`, 0–1) and **costs** (`cpu`, `network`). The build decides hydration plan, preload, SEO, consent and i18n.

**Golden rule:** static is the desired default. Pages without islands ship **zero JavaScript** in production.

## Agent workflow

```bash
npx create-biagiojs my-site --template blog
cd my-site && npm install
```

1. Set `site.baseUrl` to the real production URL.
2. Use `defineConfig` from `biagiojs/config` in `biagio.config.js`.
3. Prefer `pages/*.page.biagio` or scaffold with `biagio new page …`.
4. Use weight tables from [Business weights](/docs/business-weights/) — do not invent numbers.
5. Run `biagio explain pages/index.page.biagio` for instant feedback on hydration plan.
6. Run `biagio build .` and read the render order + hydration log.
7. Run `biagio doctor .` before deploy.

## DX commands for agents

| Command | When to use |
|---------|-------------|
| `biagio new page blog/[slug]` | New route with `getStaticPaths` boilerplate |
| `biagio new island counter` | Client module scaffold |
| `biagio new collection blog` | Markdown collection + `content.config.js` |
| `biagio explain <page>` | Check eager/lazy/static without full build |
| `biagio doctor .` | Pre-deploy validation incl. broken links |

## Weight reference (do not guess)

| Component type | conversion | seo | interaction |
|----------------|------------|-----|-------------|
| Hero / main CTA | 0.8–1.0 | 0.7–1.0 | 0.5–0.9 |
| Product card | 0.6–0.9 | 0.5–0.8 | 0.3–0.6 |
| Navigation | 0.1–0.3 | 0.2–0.5 | 0.4–0.7 |
| Footer / legal | 0.05–0.1 | 0.3–0.5 | 0.01–0.05 |
| Chat widget | 0.03–0.1 | 0.1 | 0.1–0.3 |

Low conversion + high `network` cost → stays **static** (no JS).

## Files agents should read first

1. [Getting started](/docs/getting-started/) — config and first page
2. [Syntax (.biagio)](/docs/syntax-biagio/) — weights and hydration attributes
3. [Content collections](/docs/content-collections/) — typed frontmatter, draft mode
4. [CLI](/docs/cli/) — `explain`, `new`, dev overlay tools
5. [Automatic SEO](/docs/seo/) — meta, sitemap, hreflang
6. [Consent](/docs/consent/) — never load trackers without gating
7. [AI-GUIDE.md](https://github.com/Dani2097/biagiojs/blob/main/biagiojs/AI-GUIDE.md) — exhaustive reference

## Common mistakes

- Hydrating everything — defeats the framework; use weights and `biagio explain`.
- Skipping `baseUrl` — breaks canonical and sitemap.
- Loading analytics without `data-cvw-consent` or island `consent=`.
- Using `fonts.googleapis.com` in production instead of `site.fonts` self-host.
- Publishing draft content — use `draft: true` in frontmatter (excluded in production builds).
