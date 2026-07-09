/**
 * Generatori `biagio new page|island|collection`.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

function ensureDir(path) {
  mkdirSync(dirname(path), { recursive: true });
}

function assertNew(path) {
  if (existsSync(path)) throw new Error(`File già esistente: ${path}`);
}

/** `blog/[slug]` → pages/blog/[slug].page.js */
export function resolvePagePath(root, route, ext = 'js') {
  const clean = route.replace(/^\/+|\/+$/g, '');
  const base = clean || 'index';
  return join(root, 'pages', `${base}.page.${ext}`);
}

const PAGE_STATIC_BIAGIO = (title, id) => `<page title="${title}" description="" sitemapPriority="0.8" />

<component id="${id}" seo="1" conversion="0.8" cpu="2">
  <template>
    <section><h1>${title}</h1></section>
  </template>
</component>

<component id="footer" conversion="0.05">
  <template><footer></footer></template>
</component>

<style>
  body { margin: 0; font-family: system-ui, sans-serif; }
  section { max-width: 920px; margin: 0 auto; padding: 48px 24px; }
</style>
`;

const PAGE_DYNAMIC_JS = (collection) => `import { PerfNode, PerformanceGraph } from 'biagiojs/graph';
import { raw } from 'biagiojs/html';

export function getStaticPaths({ getCollection }) {
  return getCollection('content/${collection}').map(post => ({
    params: { slug: post.slug },
    props: { post },
  }));
}

export default function ({ props: { post } }) {
  const g = new PerformanceGraph().add(new PerfNode('article', {
    seoWeight: 1,
    conversionWeight: 0.4,
    cpuCost: 2,
    render: () => \`<article>\${raw(post.html)}</article>\`,
  }));
  g.get('article').domOrder = 0;
  return {
    graph: g,
    page: {
      title: post.data.title,
      description: post.data.title,
      sitemapPriority: 0.6,
    },
  };
}
`;

const ISLAND_TEMPLATE = (name) => `/**
 * Isola client: ${name}
 * @param {HTMLElement} el
 * @param {Record<string, unknown>} props
 */
export default function (el, props = {}) {
  const btn = el.querySelector('button');
  if (!btn) return;
  let n = Number(props.initial) || 0;
  btn.textContent = String(n);
  btn.addEventListener('click', () => {
    n += 1;
    btn.textContent = String(n);
  });
}
`;

const COLLECTION_SAMPLE = (name) => `---
title: Primo articolo
date: 2026-07-09
draft: false
---
# Benvenuto

Primo post nella collection **${name}**.
`;

const CONTENT_CONFIG_SNIPPET = (name) => `import { defineCollection } from 'biagiojs/content';

export const collections = {
  ${name}: defineCollection({
    schema: {
      title: { type: 'string', required: true },
      date: { type: 'string' },
      draft: { type: 'boolean', default: false },
    },
  }),
};
`;

export function scaffoldPage(root, route, { format = 'auto' } = {}) {
  const dynamic = /\[.+\]/.test(route);
  const useBiagio = format === 'biagio' || (format === 'auto' && !dynamic);
  const ext = useBiagio ? 'biagio' : 'js';
  const path = resolvePagePath(root, route, ext);
  assertNew(path);
  ensureDir(path);

  const title = route.replace(/\[(\w+)\]/g, ':$1').replace(/\//g, ' / ') || 'Nuova pagina';
  const id = route.split('/').pop()?.replace(/\[|\]/g, '') || 'hero';

  if (useBiagio) {
    writeFileSync(path, PAGE_STATIC_BIAGIO(title, id));
  } else {
    const collection = route.split('/')[0] || 'blog';
    writeFileSync(path, PAGE_DYNAMIC_JS(collection));
  }
  return path;
}

export function scaffoldIsland(root, name) {
  const file = name.endsWith('.js') ? name : `${name}.js`;
  const path = join(root, 'islands', file);
  assertNew(path);
  ensureDir(path);
  writeFileSync(path, ISLAND_TEMPLATE(file.replace(/\.js$/, '')));
  return path;
}

export function scaffoldCollection(root, name) {
  const dir = join(root, 'content', name);
  const sample = join(dir, 'hello.md');
  const configPath = join(root, 'content.config.js');
  assertNew(sample);
  mkdirSync(dir, { recursive: true });
  writeFileSync(sample, COLLECTION_SAMPLE(name));
  if (!existsSync(configPath)) {
    writeFileSync(configPath, CONTENT_CONFIG_SNIPPET(name));
  }
  return { dir, sample, configPath: existsSync(configPath) ? configPath : null };
}
