#!/usr/bin/env node
/**
 * create-cvw — scaffolding per CVW-First.
 *   npx create-cvw mio-sito
 * Genera un sito completo con package.json, pagine (js + .cvw), contenuti.
 */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';

const dir = process.argv[2];
if (!dir) { console.log('Uso: npx create-cvw <nome-cartella>'); process.exit(1); }
const root = resolve(dir);
if (existsSync(join(root, 'package.json'))) { console.error(`✖ ${dir}/package.json esiste già`); process.exit(1); }

const name = basename(root).toLowerCase().replace(/[^a-z0-9-]/g, '-');
mkdirSync(join(root, 'pages'), { recursive: true });
mkdirSync(join(root, 'content', 'blog'), { recursive: true });
mkdirSync(join(root, 'images'), { recursive: true });
mkdirSync(join(root, 'reports'), { recursive: true });
mkdirSync(join(root, 'islands'), { recursive: true });

writeFileSync(join(root, 'package.json'), JSON.stringify({
  name,
  version: '0.1.0',
  private: true,
  type: 'module',
  scripts: {
    dev: 'cvw dev .',
    build: 'cvw build .',
    preview: 'node node_modules/cvw-first/src/adapters/node.js . 3000',
    'pull-vitals': 'cvw pull-vitals',
  },
  dependencies: { 'cvw-first': '^0.2.0' },
  devDependencies: { vite: '^6.0.0' },
}, null, 2) + '\n');

writeFileSync(join(root, 'cvw.config.js'),
`export default {
  site: {
    name: '${name}',
    baseUrl: 'https://example.com',        // ← il tuo dominio (canonical, sitemap, OG)
    description: 'Creato con CVW-First',
  },
};
`);

// Homepage in sintassi .cvw — zero JS da scrivere
writeFileSync(join(root, 'pages', 'index.page.cvw'),
`<page title="Home — ${name}" description="Benvenuto sul mio sito CVW-First." sitemapPriority="1.0" />

<component id="hero" seo="1" conversion="0.8" cpu="2">
  <template>
    <section class="hero">
      <h1>Benvenuto 👋</h1>
      <p>Questo sito è generato da CVW-First: il rendering segue il valore business, non l'ordine del DOM.</p>
    </section>
  </template>
</component>

<component id="cta" conversion="1" interaction="0.8">
  <template>
    <section style="text-align:center">
      <button class="cta" id="go">Contattami</button>
      <p id="status" class="muted"></p>
    </section>
  </template>
  <script hydrate>
    const b = el.querySelector('#go');
    el.querySelector('#status').textContent = 'isola idratata ✓';
    b.addEventListener('click', () => { b.textContent = 'Grazie! ✓'; });
  </script>
</component>

<component id="footer" conversion="0.05">
  <template><footer>Generato con CVW-First</footer></template>
</component>

<style>
  body{margin:0;font-family:system-ui,sans-serif;color:#14141f;background:#faf8f4}
  section{max-width:920px;margin:0 auto;padding:48px 24px}
  .hero{text-align:center;padding-top:96px}
  .hero h1{font-size:clamp(36px,6vw,60px);margin:0 0 12px}
  .cta{background:#ff4d5a;color:#fff;border:none;padding:16px 40px;font-size:17px;font-weight:700;border-radius:999px;cursor:pointer}
  .muted{color:#8a8a96;font-size:13px}
  footer{text-align:center;color:#8a8a96;padding:48px 24px}
</style>
`);

// Pagina blog dinamica (JS: serve getStaticPaths)
writeFileSync(join(root, 'pages', 'blog-slug.page.js.example'),
`// Rinomina questo file in  blog/[slug].page.js  per attivare il blog.
import { PerfNode, PerformanceGraph } from 'cvw-first/graph';
import { raw } from 'cvw-first/html';

export function getStaticPaths({ getCollection }) {
  return getCollection('content/blog').map(post => ({ params: { slug: post.slug }, props: { post } }));
}

export default function ({ props: { post } }) {
  const g = new PerformanceGraph()
    .add(new PerfNode('article', {
      seoWeight: 1, conversionWeight: 0.4, cpuCost: 2,
      render: () => \`<section><article>\${raw(post.html)}</article></section>\`,
    }));
  g.get('article').domOrder = 0;
  return {
    graph: g,
    head: '<style>body{margin:0;font-family:system-ui} section{max-width:720px;margin:0 auto;padding:48px 24px}</style>',
    page: { title: post.data.title, description: post.data.title, sitemapPriority: 0.6 },
  };
}
`);

writeFileSync(join(root, 'content', 'blog', 'hello.md'),
`---
title: Primo post
date: 2026-07-06
---
# Ciao

Questo post viene da una **content collection** Markdown.
`);

writeFileSync(join(root, '.gitignore'), 'node_modules\ndist\n');

console.log(`✔ Sito creato in ${dir}/

Prossimi passi:
  cd ${dir}
  npm install
  npm run dev        → http://localhost:4321

Poi:
  npm run build      → dist/ (deploy su Vercel/Cloudflare)
  npm run preview    → server Node con SSR on-demand`);
