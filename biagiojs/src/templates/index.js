/**
 * Template pack per create-biagiojs --template.
 */

export const TEMPLATES = ['default', 'blog', 'landing', 'docs', 'shop'];

export function getTemplate(name) {
  return TEMPLATES.includes(name) ? name : 'default';
}

export function configSnippet(name, siteName) {
  const base = `import { defineConfig } from 'biagiojs/config';

export default defineConfig({
  site: {
    name: '${siteName}',
    baseUrl: 'https://example.com',
    description: 'Creato con biagiojs',
    images: { widths: [480, 960, 1440], quality: 75 },
    favicon: { source: 'images/logo.svg', generate: true, themeColor: '#111', targets: ['ico', 'svg', 'apple', 'pwa'] },
`;
  const extra = {
    blog: `    locales: ['it', 'en'],\n    defaultLocale: 'it',\n`,
    shop: `    consent: { mode: 'native', categories: ['analytics', 'marketing'], policyUrl: '/privacy/' },\n`,
    docs: `    locales: ['en', 'it'],\n    defaultLocale: 'en',\n`,
    landing: '',
    default: '',
  };
  return base + (extra[name] || '') + `  },
});
`;
}

export function extraFiles(name, siteName) {
  const files = {};
  if (name === 'blog' || name === 'default') {
    files['content/blog/hello.md'] = `---
title: Primo post
date: 2026-07-09
draft: false
---
# Ciao

Post di esempio dalla collection blog.
`;
    files['content.config.js'] = `import { defineCollection } from 'biagiojs/content';

export const collections = {
  blog: defineCollection({
    schema: {
      title: { type: 'string', required: true },
      date: { type: 'string' },
      draft: { type: 'boolean', default: false },
    },
  }),
};
`;
    files['pages/blog/[slug].page.js'] = `import { PerfNode, PerformanceGraph } from 'biagiojs/graph';
import { raw } from 'biagiojs/html';

export function getStaticPaths({ getCollection }) {
  return getCollection('content/blog').map(post => ({
    params: { slug: post.slug },
    props: { post },
  }));
}

export default function ({ props: { post } }) {
  const g = new PerformanceGraph().add(new PerfNode('article', {
    seoWeight: 1, conversionWeight: 0.4, cpuCost: 2,
    render: () => \`<article>\${raw(post.html)}</article>\`,
  }));
  g.get('article').domOrder = 0;
  return {
    graph: g,
    page: { title: post.data.title, description: post.data.title, sitemapPriority: 0.6 },
  };
}
`;
  }
  if (name === 'landing') {
    files['pages/index.page.biagio'] = `<page title="${siteName}" description="Landing ad alta conversione" sitemapPriority="1.0" />

<component id="hero" seo="1" conversion="0.9" cpu="2">
  <template>
    <section class="hero"><h1>Trasforma visitatori in clienti</h1><p class="lead">biagiojs ottimizza ciò che conta.</p></section>
  </template>
</component>

<component id="cta" conversion="1" interaction="0.85">
  <template><section class="cta"><button id="buy">Inizia ora</button></section></template>
  <script hydrate>
    el.querySelector('#buy').addEventListener('click', () => { el.querySelector('#buy').textContent = 'Grazie! ✓'; });
  </script>
</component>

<style>
  body{margin:0;font-family:system-ui;background:#0f0f14;color:#fff}
  .hero,.cta{max-width:720px;margin:0 auto;padding:80px 24px;text-align:center}
  .lead{color:#aaa;font-size:1.2rem}
  #buy{background:#ff4d5a;color:#fff;border:none;padding:18px 48px;font-size:18px;border-radius:999px;cursor:pointer}
</style>
`;
  }
  if (name === 'shop') {
    files['pages/index.page.js'] = `import { PerfNode, PerformanceGraph } from 'biagiojs/graph';

export default function () {
  const g = new PerformanceGraph()
    .add(new PerfNode('hero', { seoWeight: 1, conversionWeight: 0.8, render: () => '<section><h1>Shop</h1></section>' }))
    .add(new PerfNode('cta', {
      conversionWeight: 1, interactionProbability: 0.8,
      render: () => '<section><button id="buy">Acquista</button></section>',
      hydrate: el => el.querySelector('#buy').addEventListener('click', () => alert('Aggiunto!')),
    }));
  g.get('hero').domOrder = 0; g.get('cta').domOrder = 1;
  return { graph: g, page: { title: 'Shop — ${siteName}', description: 'Demo shop' } };
}
`;
  }
  if (name === 'docs') {
    files['pages/docs/index.page.biagio'] = `<page title="Docs" description="Documentazione" sitemapPriority="0.9" />
<component id="content" seo="1" conversion="0.3">
  <template><section><h1>Documentazione</h1><p>Inizia da qui.</p></section></template>
</component>
<style>body{margin:0;font-family:system-ui}section{max-width:800px;margin:0 auto;padding:48px 24px}</style>
`;
  }
  return files;
}
