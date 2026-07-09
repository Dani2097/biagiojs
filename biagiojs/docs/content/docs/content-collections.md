---
title: Content collections
description: Markdown collections with typed frontmatter, draft mode and getCollection.
order: 8
priority: 0.8
lastmod: 2026-07-09
---

# Content collections

Markdown files in `content/<name>/` with YAML frontmatter. Use `getCollection()` in `getStaticPaths()` to generate routes — same pattern as Astro content collections.

## Basic usage

```md
---
title: My article
date: 2026-07-09
slug: my-article
---

# Hello

Body in **Markdown**.
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

Generate a starter with:

```bash
biagio new collection blog
```

## Typed schema (`content.config.js`)

Validate frontmatter at build time and document expected fields:

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

Supported field types: `string`, `number`, `boolean`, `date`. Use `required: true` and `default` where needed. Invalid entries throw at build with the file path.

## Draft mode

```md
---
title: Work in progress
draft: true
---
```

| Environment | Behaviour |
|-------------|-----------|
| **Development** | Draft posts included in `getCollection()` |
| **Production** (`NODE_ENV=production`) | Draft posts **excluded** from routes |

Useful for content workflows without a separate CMS.

## Per-locale content

With `site.locales`, put translated posts in `content/blog/it/` (falls back to `content/blog/` if missing).

## Scaffold

```bash
biagio new collection posts    # → content/posts/hello.md + content.config.js snippet
biagio new page blog/[slug]    # → pages/blog/[slug].page.js with getStaticPaths
```
