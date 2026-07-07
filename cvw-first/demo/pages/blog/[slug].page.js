/** Blog VELOCE — route dinamica + content collection Markdown. */
import { PerfNode, PerformanceGraph } from '../../../src/core/graph.js';
import { raw, html } from '../../../src/core/html.js';
import { CSS } from '../../theme.js';

export function getStaticPaths({ getCollection }) {
  return getCollection('content/blog').map(post => ({ params: { slug: post.slug }, props: { post } }));
}

export default function ({ props: { post } }) {
  const g = new PerformanceGraph()
    .add(new PerfNode('nav', {
      seoWeight: 0.3, conversionWeight: 0.2, interactionProbability: 0.4,
      render: () => `<nav class="main"><span class="logo">VELO<span>CE</span></span><a href="/">AeroFoam X-1</a><a href="/collection/">Collezione</a></nav>`,
    }))
    .add(new PerfNode('article', {
      cpuCost: 2, seoWeight: 1, conversionWeight: 0.4,
      // post.html è output del parser Markdown del framework (già escapato) → raw() è legittimo
      render: () => html`<section style="max-width:720px"><article class="post"><small style="color:var(--muted)">${post.data.date} · ${post.data.author}</small>${raw(post.html)}</article></section>`.toString(),
    }))
    .add(new PerfNode('cta', {
      conversionWeight: 0.8, interactionProbability: 0.3,
      render: () => `<section style="text-align:center"><a class="cta" href="/" style="text-decoration:none;display:inline-block">Scopri la AeroFoam X-1 →</a></section>`,
    }))
    .add(new PerfNode('footer', {
      conversionWeight: 0.05,
      render: () => `<footer><div class="logo">VELO<span>CE</span></div><small>Generato da CVW-First.</small></footer>`,
    }));
  const order = { nav: 0, article: 1, cta: 2, footer: 3 };
  for (const [id, o] of Object.entries(order)) g.get(id).domOrder = o;

  return {
    graph: g,
    head: `<style>${CSS} .post h1{font-size:36px} .post p{line-height:1.7;color:#3a3a48}</style>`,
    page: {
      title: `${post.data.title} — Blog VELOCE`,
      description: post.raw.split('\n').find(l => l.trim() && !l.startsWith('#'))?.slice(0, 150) || post.data.title,
      breadcrumbs: [{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog/' }],
      sitemapPriority: 0.6,
      lastmod: String(post.data.date),
    },
  };
}
