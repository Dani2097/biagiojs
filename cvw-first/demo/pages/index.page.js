/**
 * VELOCE — pagina prodotto. Usa tutte le feature del paper:
 * §3 pesi business · §4 graph · §5 adaptive hydration · §6 rendering conversion-driven
 * §7 optimizer (reports/) · §8 SEO auto · §10 network scheduler · §11 experiments · §12 metriche
 */
import { PerfNode, PerformanceGraph } from '../../src/core/graph.js';
import { CSS, shoeSvg } from '../theme.js';

export default function ({ ExperimentEngine, userId }) {
  const ab = new ExperimentEngine({ userId });
  ab.define('checkout_v2', ['control', 'variant_b']);

  const g = new PerformanceGraph();

  g.add(new PerfNode('hero', {
    cpuCost: 2, seoWeight: 1, conversionWeight: 0.9, interactionProbability: 0.2,
    render: () => `<div class="hero"><div class="grid">
      <div>
        <div class="kicker">Nuova collezione 2026</div>
        <h1>Corri più <em>leggero</em>.<br>Arriva più lontano.</h1>
        <p class="lead">AeroFoam X-1 pesa 168 grammi. Ritorno di energia dell'87%, tomaia in mesh riciclato, e la sensazione di non indossare niente.</p>
      </div>
      <div style="text-align:center">${shoeSvg({ size: 420 })}</div>
    </div></div>`,
  })).add(new PerfNode('price', {
    cpuCost: 1, seoWeight: 0.8, conversionWeight: 0.9, interactionProbability: 0.1,
    render: () => `<section style="text-align:center;padding-bottom:8px">
      <span class="badge">-24% · Spedizione e reso gratuiti</span>
      <div class="price-tag" style="margin-top:14px">€129 <s>€169</s></div>
    </section>`,
  })).add(new PerfNode('cta', {
    cpuCost: 1, conversionWeight: 1, interactionProbability: 0.85,
    render: () => `<section style="text-align:center;padding-top:8px"><div class="buybar">${ab.pick('checkout_v2', {
      control: () => '<button class="cta" id="buy">Aggiungi al carrello</button>',
      variant_b: () => '<button class="cta" id="buy">Compra ora · consegna domani</button>',
    })}</div><p id="cta-status" style="color:var(--muted);font-size:13px;margin-top:12px">in attesa di idratazione…</p></section>`,
    hydrate: (el) => {
      const { signal, effect } = window.cvw;
      const [count, setCount] = signal(0);
      const btn = el.querySelector('#buy'), st = el.querySelector('#cta-status');
      st.textContent = 'interattivo ✓ · isola idratata eager (signals attivi)'; st.style.color = '#1d7a46';
      const label = btn.textContent;
      btn.addEventListener('click', () => setCount(v => v + 1));
      effect(() => { btn.textContent = count() > 0 ? 'Nel carrello (' + count() + ') ✓' : label; });
    },
  })).add(new PerfNode('stats', {
    cpuCost: 1, seoWeight: 0.5, conversionWeight: 0.6, interactionProbability: 0.05,
    render: () => `<section><div class="stats">
      <div class="stat"><b>168 g</b><small>peso, taglia 42</small></div>
      <div class="stat"><b>87%</b><small>ritorno di energia</small></div>
      <div class="stat"><b>1.200 km</b><small>durata media suola</small></div>
    </div></section>`,
  })).add(new PerfNode('reviews', {
    cpuCost: 3, seoWeight: 0.8, conversionWeight: 0.5, interactionProbability: 0.3,
    render: () => `<section><h2>Chi le ha provate</h2>
      <div class="review"><span class="stars">★★★★★</span><b>"Il mio personal best è sceso di 2 minuti."</b><small>Marco R. — maratoneta, Verona</small></div>
      <div class="review"><span class="stars">★★★★★</span><b>"Leggerissime, sembra di correre scalzi ma con la molla."</b><small>Giulia T. — trail runner, Trento</small></div>
      <div class="review"><span class="stars">★★★★☆</span><b>"Ottime sul veloce, perfette in gara."</b><small>Alessandro B. — Milano</small></div>
    </section>`,
  })).add(new PerfNode('nav', {
    cpuCost: 1, seoWeight: 0.3, conversionWeight: 0.2, interactionProbability: 0.4,
    render: () => `<nav class="main"><span class="logo">VELO<span>CE</span></span><a href="/">AeroFoam X-1</a><a href="/collection/">Collezione</a><a href="#">Storie</a></nav>`,
    hydrate: (el) => { el.querySelectorAll('a[href^="/"]').forEach(a => a.addEventListener('mouseenter', () => {
      const l = document.createElement('link'); l.rel = 'prefetch'; l.href = a.href; document.head.appendChild(l);
    })); },
  })).add(new PerfNode('carousel', {
    cpuCost: 5, networkCost: 120, conversionWeight: 0.2, interactionProbability: 0.15,
    render: () => `<section><h2>Completa il look</h2><div class="carousel">${[
      ['Trail X-2', '€139', '#2b6b4f'], ['Road Master', '€119', '#31456e'],
      ['Gym Flex', '€99', '#7a4f9e'], ['Walk+', '€89', '#b3722c'],
    ].map(([n, p, c]) => `<a class="card" href="/collection/"><div class="swatch" style="background:${c}18">
      <svg width="120" viewBox="0 0 420 240"><path d="M30 170 C60 110 120 60 190 55 C230 52 245 75 285 95 C330 118 385 125 400 145 L400 175 C400 183 393 190 385 190 L45 190 C36 190 28 181 30 170Z" fill="${c}"/><path d="M28 178 L400 178 L400 196 C400 205 392 212 383 212 L52 212 C36 212 24 200 25 186Z" fill="#fff"/></svg>
    </div><b>${n}</b><div class="p">${p}</div></a>`).join('')}</div></section>`,
    hydrate: (el) => { el.querySelector('.carousel').style.scrollBehavior = 'smooth'; },
  })).add(new PerfNode('chat', {
    cpuCost: 8, networkCost: 300, conversionWeight: 0.05, interactionProbability: 0.03,
    render: () => `<section style="text-align:right;padding:12px 24px;color:#c5c5cf"><small>💬 assistenza — widget statico: 300 KB di JS mai spediti (priorità sotto soglia)</small></section>`,
    hydrate: () => {},
  })).add(new PerfNode('footer', {
    cpuCost: 1, seoWeight: 0.1, conversionWeight: 0.05, interactionProbability: 0.02,
    render: () => `<footer><div class="logo">VELO<span>CE</span></div><small>Sito generato da CVW-First — rendering conversion-driven, idratazione adattiva, SEO automatica.</small></footer>`,
  }));

  const domOrder = { nav: 0, hero: 1, price: 2, cta: 3, stats: 4, reviews: 5, carousel: 6, chat: 7, footer: 8 };
  for (const [id, o] of Object.entries(domOrder)) g.get(id).domOrder = o;

  return {
    graph: g,
    head: `<style>${CSS}</style>`,
    experiments: ab,
    page: {
      title: 'AeroFoam X-1 — 168 g di velocità | VELOCE',
      description: 'Scarpa da running ultraleggera: 168 grammi, 87% di ritorno di energia. €129 con spedizione gratuita.',
      type: 'product',
      image: '/img/aerofoam-960w.jpg',
      product: { name: 'AeroFoam X-1', price: 129, currency: 'EUR', rating: 4.7, reviewCount: 318 },
      breadcrumbs: [{ name: 'Home', path: '/' }, { name: 'Running', path: '/collection/' }],
      sitemapPriority: 1.0,
      lastmod: '2026-07-06',
    },
    assets: [
      { url: '/fonts/brand.woff2', kb: 30, businessValue: 0.5 },
      { url: '/js/analytics.js', kb: 45, businessValue: 0.2, kind: 'prefetch' },
      { url: '/js/chat-widget.js', kb: 300, businessValue: 0.05, kind: 'prefetch' },
    ],
  };
}
