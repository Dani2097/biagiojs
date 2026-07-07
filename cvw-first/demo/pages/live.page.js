/**
 * VELOCE — pagina SSR ON-DEMAND (prerender = false).
 * Renderizzata a ogni richiesta dall'adapter Node: prezzo e stock "live",
 * personalizzazione via query string. Include un'isola REACT (clientModule).
 */
import { PerfNode, PerformanceGraph } from '../../src/core/graph.js';
import { CSS } from '../theme.js';

export const prerender = false;

export default function ({ request = {}, ExperimentEngine, userId }) {
  // dati "live" calcolati a ogni richiesta (in produzione: DB / API prezzi)
  const now = new Date();
  const flashDiscount = now.getMinutes() % 2 === 0 ? 30 : 24;
  const price = Math.round(169 * (1 - flashDiscount / 100));
  const visitorName = request.query?.name;

  const g = new PerformanceGraph()
    .add(new PerfNode('nav', {
      seoWeight: 0.3, conversionWeight: 0.2, interactionProbability: 0.3,
      render: () => `<nav class="main"><span class="logo">VELO<span>CE</span></span><a href="/">AeroFoam X-1</a><a href="/collection/">Collezione</a><a href="/live/">Offerta live</a></nav>`,
    }))
    .add(new PerfNode('flash', {
      seoWeight: 0.4, conversionWeight: 0.95, interactionProbability: 0.1,
      render: () => `<section style="text-align:center;padding-top:64px">
        <div style="color:var(--accent);font-weight:700;letter-spacing:.2em;font-size:12px;text-transform:uppercase">⚡ Offerta flash — renderizzata alle ${now.toLocaleTimeString('it-IT')}</div>
        <h1 style="font-size:clamp(32px,5vw,56px)">${visitorName ? `${String(visitorName).slice(0, 30).replace(/[<>&"]/g, '')}, il` : 'Il'} prezzo è vivo.</h1>
        <div class="price-tag">€${price} <s>€169</s> <span class="badge">-${flashDiscount}%</span></div>
        <p style="color:var(--muted)">Questa pagina è <b>SSR on-demand</b>: prezzo e stock cambiano a ogni richiesta. Prova ?name=Danilo nell'URL.</p>
      </section>`,
    }))
    .add(new PerfNode('stock', {
      cpuCost: 3, conversionWeight: 0.9, interactionProbability: 0.6,
      // ISOLA REACT: modulo client vero, niente funzione serializzata
      clientModule: '/islands/stock-react.js',
      clientProps: { initial: 3 + (now.getSeconds() % 5), product: 'AeroFoam X-1' },
      render: () => `<section style="text-align:center"><div data-react-root><span style="color:var(--muted)">caricamento stock live…</span></div></section>`,
    }))
    .add(new PerfNode('footer', {
      conversionWeight: 0.05,
      render: () => `<footer><div class="logo">VELO<span>CE</span></div><small>SSR on-demand · adapter Node · isola React</small></footer>`,
    }));
  const order = { nav: 0, flash: 1, stock: 2, footer: 3 };
  for (const [id, o] of Object.entries(order)) g.get(id).domOrder = o;

  return {
    graph: g,
    head: `<style>${CSS}</style>`,
    page: {
      title: `Offerta flash -${flashDiscount}% — VELOCE`,
      description: 'Offerta a tempo con prezzo e stock in tempo reale.',
      noindex: true,   // pagina personalizzata: fuori da sitemap
    },
  };
}
