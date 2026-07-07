/**
 * biagiojs demo — e-commerce product page.
 * Run: node demo/build.js  → demo/index.html
 *
 * HTML source order = business priority (streamed first = painted first).
 * Visual order is restored with flex `order`, so conversion-critical
 * content hits the wire before low-value widgets, regardless of layout.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PerfNode, PerformanceGraph } from '../src/core/graph.js';
import { renderPage } from '../src/ssr.js';
import { renderOrder, hydrationPlan } from '../src/core/scheduler.js';

const g = new PerformanceGraph();

const css = `
  body{margin:0;font-family:system-ui,sans-serif;color:#1a1a2e;background:#fafafa}
  section{padding:24px;max-width:920px;margin:0 auto;width:100%;box-sizing:border-box}
  .hero{background:linear-gradient(120deg,#1a1a2e,#16213e);color:#fff;text-align:center;padding:64px 24px}
  .cta{display:inline-block;background:#e94560;color:#fff;border:none;padding:14px 36px;font-size:18px;border-radius:8px;cursor:pointer}
  .price{font-size:32px;font-weight:700;color:#e94560}
  nav{background:#fff;border-bottom:1px solid #eee;padding:12px 24px;display:flex;gap:20px}
  footer{background:#1a1a2e;color:#aaa;padding:32px 24px;text-align:center}
  .review{background:#fff;border:1px solid #eee;border-radius:8px;padding:12px;margin:8px 0}
  .carousel{display:flex;gap:12px;overflow-x:auto}
  .card{min-width:180px;background:#fff;border:1px solid #eee;border-radius:8px;padding:12px}
`;

g.add(new PerfNode('hero', {
  cpuCost: 2, seoWeight: 1, conversionWeight: 0.9, interactionProbability: 0.2,
  render: () => `<div class="hero"><h1>UltraLight Running Shoe</h1><p>Il prodotto che converte. Renderizzato per primo, perché conta di più.</p></div>`,
})).add(new PerfNode('cta', {
  cpuCost: 1, conversionWeight: 1, interactionProbability: 0.85,
  render: () => `<section style="text-align:center"><button class="cta" id="buy">Aggiungi al carrello</button><p id="cta-status" style="color:#888">in attesa di idratazione…</p></section>`,
  hydrate: (el) => {
    const btn = el.querySelector('#buy'), st = el.querySelector('#cta-status');
    st.textContent = 'pronto ✓ (idratato eager)';
    st.style.color = '#2a9d5c';
    let n = 0;
    btn.addEventListener('click', () => { n++; btn.textContent = 'Nel carrello (' + n + ')'; });
  },
})).add(new PerfNode('price', {
  cpuCost: 1, seoWeight: 0.8, conversionWeight: 0.9, interactionProbability: 0.1,
  render: () => `<section><span class="price">€129,00</span> <s style="color:#999">€169,00</s> — spedizione gratuita</section>`,
})).add(new PerfNode('reviews', {
  cpuCost: 3, seoWeight: 0.8, conversionWeight: 0.5, interactionProbability: 0.3,
  render: () => `<section><h2>Recensioni</h2><div class="review">★★★★★ "Leggerissime." — Marco</div><div class="review">★★★★☆ "Ottimo acquisto." — Giulia</div></section>`,
})).add(new PerfNode('nav', {
  cpuCost: 1, seoWeight: 0.3, conversionWeight: 0.2, interactionProbability: 0.4,
  render: () => `<nav><b>ShoeShop</b><a href="#">Uomo</a><a href="#">Donna</a><a href="#">Offerte</a></nav>`,
  hydrate: (el) => { el.querySelectorAll('a').forEach(a => a.addEventListener('click', e => e.preventDefault())); },
})).add(new PerfNode('carousel', {
  cpuCost: 5, networkCost: 120, conversionWeight: 0.2, interactionProbability: 0.15,
  render: () => `<section><h2>Potrebbero piacerti</h2><div class="carousel">${['Trail X', 'Road 2', 'Gym Flex', 'Walk+'].map(p => `<div class="card">${p}<br><small>€99</small></div>`).join('')}</div></section>`,
  hydrate: (el) => { el.querySelector('.carousel').style.scrollBehavior = 'smooth'; },
})).add(new PerfNode('chat', {
  cpuCost: 8, networkCost: 300, conversionWeight: 0.05, interactionProbability: 0.03,
  render: () => `<section style="text-align:right;color:#bbb"><small>💬 chat widget — statico: JS mai spedito (priorità sotto soglia)</small></section>`,
  hydrate: () => { /* heavy widget: never hydrated because priority < lazyThreshold */ },
})).add(new PerfNode('footer', {
  cpuCost: 1, seoWeight: 0.1, conversionWeight: 0.05, interactionProbability: 0.02,
  render: () => `<footer>© 2026 ShoeShop — generato da biagiojs PoC</footer>`,
}));

// Visual layout order (flex `order`) — independent from streaming/render order
const domOrder = { nav: 0, hero: 1, price: 2, cta: 3, reviews: 4, carousel: 5, chat: 6, footer: 7 };
for (const [id, o] of Object.entries(domOrder)) g.get(id).domOrder = o;

// Log the scheduler's decisions
console.log('Render order (business priority):', renderOrder(g).map(n => n.id).join(' → '));
const plan = hydrationPlan(g);
for (const k of ['eager', 'lazy', 'static'])
  console.log(k.padEnd(6), plan[k].map(({ node, priority }) => `${node.id}(${priority.toFixed(2)})`).join(', '));

const html = await renderPage(g, {
  title: 'biagiojs Demo — UltraLight Running Shoe',
  head: `<style>${css}</style>
<script type="application/ld+json">${JSON.stringify({
  '@context': 'https://schema.org', '@type': 'Product',
  name: 'UltraLight Running Shoe',
  offers: { '@type': 'Offer', price: '129.00', priceCurrency: 'EUR' },
})}<\/script>`,
});

const out = join(dirname(fileURLToPath(import.meta.url)), 'index.html');
writeFileSync(out, html);
console.log('Written:', out, `(${html.length} bytes)`);
