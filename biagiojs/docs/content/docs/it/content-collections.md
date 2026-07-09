---
title: Content collections
description: Collection Markdown con frontmatter tipizzato, draft mode e getCollection.
order: 8
priority: 0.8
lastmod: 2026-07-09
---

# Content collections

File Markdown in `content/<nome>/` con frontmatter YAML. Usa `getCollection()` in `getStaticPaths()` per generare le route — stesso pattern delle content collection di Astro.

## Uso base

```md
---
title: Il mio articolo
date: 2026-07-09
slug: mio-articolo
---

# Ciao

Corpo in **Markdown**.
```

```js
export function getStaticPaths({ getCollection }) {
  return getCollection('content/blog').map(post => ({
    params: { slug: post.slug },
    props: { post },
  }));
}

export default function ({ props: { post } }) {
  // post.data.title, post.html, post.slug
}
```

Genera lo scheletro con:

```bash
biagio new collection blog
```

## Schema tipizzato (`content.config.js`)

Valida il frontmatter a build e documenta i campi attesi:

```js
import { defineCollection } from 'biagiojs/content';

export const collections = {
  blog: defineCollection({
    schema: {
      title: { type: 'string', required: true },
      date: { type: 'string' },
      draft: { type: 'boolean', default: false },
      order: { type: 'number' },
    },
  }),
};
```

Tipi supportati: `string`, `number`, `boolean`, `date`. Usa `required: true` e `default` dove serve. Errori di validazione indicano il file.

## Draft mode

```md
---
title: Bozza in lavorazione
draft: true
---
```

| Ambiente | Comportamento |
|----------|---------------|
| **Sviluppo** | I post draft sono inclusi in `getCollection()` |
| **Produzione** (`NODE_ENV=production`) | I draft sono **esclusi** dalle route |

Utile per workflow editoriali senza CMS separato.

## Contenuti per lingua

Con `site.locales`, metti le traduzioni in `content/blog/it/` (fallback su `content/blog/` se assente).

## Scaffold

```bash
biagio new collection posts    # → content/posts/hello.md + snippet content.config.js
biagio new page blog/[slug]    # → pages/blog/[slug].page.js con getStaticPaths
```
