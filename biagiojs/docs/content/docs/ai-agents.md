---
title: AI agents
description: llms.txt, AI-GUIDE and conventions for LLMs building sites with biagiojs.
order: 10
priority: 0.7
lastmod: 2026-07-08
---

# AI agents

biagiojs ships first-class material for LLMs and coding agents: a curated index, a full operational guide in the npm package, and documentation structured for retrieval.

## Quick links

| Resource | URL |
|----------|-----|
| **llms.txt** (site index) | [/llms.txt](https://biagio.danilosprovieri.com/llms.txt) |
| **AI-GUIDE.md** (full reference) | [GitHub](https://github.com/Dani2097/biagiojs/blob/main/biagiojs/AI-GUIDE.md) |
| **Documentation** | [/docs/](https://biagio.danilosprovieri.com/docs/) |

Point your agent at `https://biagio.danilosprovieri.com/llms.txt` for a compact map of every guide. For implementation detail, read **AI-GUIDE.md** in the `biagiojs` npm package (also on GitHub).

## Mental model

biagiojs is **SSG-first + islands, business-aware**. Components declare **business weights** (`conversion`, `seo`, `interaction`, 0–1) and **costs** (`cpu`, `network`). The build decides:

- HTML source order (what hits the wire first)
- hydration plan (eager / lazy / static)
- preload by value/KB
- SEO, consent, i18n

**Golden rule:** static is the desired default. Pages without islands ship **zero JavaScript** in production.

## Agent workflow

```bash
npx create-biagiojs my-site
cd my-site && npm install
```

1. Set `site.baseUrl` to the real production URL (canonical, sitemap, OG depend on it).
2. Prefer `pages/*.page.biagio` for declarative pages.
3. Use weight tables from [Business weights](/docs/business-weights/) — do not invent random numbers.
4. Run `npx biagio build .` and read the render order + hydration log.
5. Run `npx biagio doctor .` before deploy.

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
3. [Automatic SEO](/docs/seo/) — `page` meta, sitemap, hreflang, `llms.txt`
4. [Consent](/docs/consent/) — never load trackers without gating
5. [AI-GUIDE.md](https://github.com/Dani2097/biagiojs/blob/main/biagiojs/AI-GUIDE.md) — exhaustive reference

## SEO for agents

- `site.baseUrl` must be the live domain.
- `page.hideBreadcrumb: true` when you render your own breadcrumb in the layout (JSON-LD breadcrumbs still work).
- `robots.txt` and `sitemap.xml` are generated at build; submit `https://yoursite.com/sitemap.xml` in Google Search Console.
- Add `/llms.txt` at the site root for LLM discovery (copy from this docs site's `public/llms.txt` pattern).

## Common mistakes

- Hydrating everything — defeats the framework; use weights.
- Skipping `baseUrl` — breaks canonical and sitemap.
- Loading analytics without `data-cvw-consent` or island `consent=`.
- Using `fonts.googleapis.com` in production instead of `site.fonts` self-host.
