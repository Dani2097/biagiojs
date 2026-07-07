/** VELOCE — pagina collezione. Multi-page routing + sitemap automatica. */
import { PerfNode, PerformanceGraph } from '../../src/core/graph.js';
import { CSS } from '../theme.js';

const MODELS = [
  ['AeroFoam X-1', '€129', '#ff4d5a', 'Gara · 168 g'],
  ['Trail X-2', '€139', '#2b6b4f', 'Trail · grip Vibram'],
  ['Road Master', '€119', '#31456e', 'Allenamento quotidiano'],
  ['Gym Flex', '€99', '#7a4f9e', 'Palestra · cross training'],
  ['Walk+', '€89', '#b3722c', 'Camminata · comfort'],
  ['Tempo Rush', '€149', '#0e7d8a', 'Tempo run · carbon plate'],
];

export default function () {
  const g = new PerformanceGraph()
    .add(new PerfNode('nav', {
      seoWeight: 0.3, conversionWeight: 0.2, interactionProbability: 0.4,
      render: () => `<nav class="main"><span class="logo">VELO<span>CE</span></span><a href="/">AeroFoam X-1</a><a href="/collection/">Collezione</a></nav>`,
      hydrate: (el) => el.querySelectorAll('a[href^="/"]').forEach(a => a.addEventListener('mouseenter', () => {
        const l = document.createElement('link'); l.rel = 'prefetch'; l.href = a.href; document.head.appendChild(l);
      })),
    }))
    .add(new PerfNode('heading', {
      seoWeight: 1, conversionWeight: 0.6,
      render: () => `<section style="padding-bottom:12px"><div class="kicker" style="color:var(--accent);font-weight:700;letter-spacing:.2em;font-size:12px;text-transform:uppercase">Collezione 2026</div><h1 style="font-size:clamp(30px,4.5vw,48px)">Sei modelli.<br>Nessun compromesso.</h1></section>`,
    }))
    .add(new PerfNode('grid', {
      cpuCost: 3, seoWeight: 0.6, conversionWeight: 0.7, interactionProbability: 0.5,
      render: () => `<section style="padding-top:12px"><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:18px">${
        MODELS.map(([n, p, c, d]) => `<a class="card" href="/"><div class="swatch" style="background:${c}14">
          <svg width="140" viewBox="0 0 420 240"><path d="M30 170 C60 110 120 60 190 55 C230 52 245 75 285 95 C330 118 385 125 400 145 L400 175 C400 183 393 190 385 190 L45 190 C36 190 28 181 30 170Z" fill="${c}"/><path d="M28 178 L400 178 L400 196 C400 205 392 212 383 212 L52 212 C36 212 24 200 25 186Z" fill="#fff"/></svg>
        </div><b>${n}</b><div style="color:var(--muted);font-size:13px">${d}</div><div class="p">${p}</div></a>`).join('')
      }</div></section>`,
      hydrate: (el) => el.querySelectorAll('a').forEach(a => a.addEventListener('mouseenter', () => {
        const l = document.createElement('link'); l.rel = 'prefetch'; l.href = a.href; document.head.appendChild(l);
      })),
    }))
    .add(new PerfNode('footer', {
      conversionWeight: 0.05,
      render: () => `<footer><div class="logo">VELO<span>CE</span></div><small>Generato da biagiojs.</small></footer>`,
    }));
  const order = { nav: 0, heading: 1, grid: 2, footer: 3 };
  for (const [id, o] of Object.entries(order)) g.get(id).domOrder = o;

  return {
    graph: g,
    head: `<style>${CSS}</style>`,
    page: {
      title: 'Collezione 2026 — VELOCE',
      description: 'Sei modelli da running, trail e palestra. Dal peso piuma AeroFoam X-1 alla Tempo Rush con piastra in carbonio.',
      breadcrumbs: [{ name: 'Home', path: '/' }],
      sitemapPriority: 0.8,
      lastmod: '2026-07-06',
    },
  };
}
