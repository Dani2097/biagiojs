/**
 * Landing — the page runs biagiojs' own scheduler to draw its hero.
 * The "build output" panel is not a mockup: it's renderOrder() + hydrationPlan()
 * on a small illustrative graph, so the site literally explains itself.
 */
import { PerfNode, PerformanceGraph } from '../../src/core/graph.js';
import { renderOrder, hydrationPlan } from '../../src/core/scheduler.js';
import { smartImage } from '../../src/core/images.js';
import { CSS, THEME_SCRIPT, topbar, siteFooter } from '../theme.js';
import { lp, langSwitcher } from '../i18n-ui.js';

/** Build a tiny demo graph and render its real scheduler output as HTML. */
function schedulerVisual(t) {
  const demo = new PerformanceGraph()
    .add(new PerfNode('hero', { seoWeight: 1, conversionWeight: 0.9, cpuCost: 1 }))
    .add(new PerfNode('cta', { conversionWeight: 1, interactionProbability: 0.85, hydrate: () => {} }))
    .add(new PerfNode('price', { seoWeight: 0.8, conversionWeight: 0.85 }))
    .add(new PerfNode('nav', { seoWeight: 0.3, conversionWeight: 0.2, interactionProbability: 0.5, hydrate: () => {} }))
    .add(new PerfNode('chat', { conversionWeight: 0.05, interactionProbability: 0.1, networkCost: 300, hydrate: () => {} }));

  const order = renderOrder(demo);
  const plan = hydrationPlan(demo);
  const eager = new Set(plan.eager.map(x => x.node.id));
  const lazy = new Set(plan.lazy.map(x => x.node.id));

  const rows = order.map((n, i) => {
    const kind = eager.has(n.id) ? 'eager' : lazy.has(n.id) ? 'lazy' : 'static';
    const pct = Math.round(n.conversionWeight * 100);
    return `<div class="node">
      <span class="ord">${String(i + 1).padStart(2, '0')}</span>
      <div class="meta"><span class="id">${n.id}</span><div class="bar"><i style="width:${pct}%"></i></div></div>
      <span class="badge ${kind}">${kind}</span>
    </div>`;
  }).join('');

  return `<div class="sched" aria-hidden="true">
    <div class="sched-head"><span class="tl"><i></i><i></i><i></i></span>biagio build ▸ /index</div>
    <div class="sched-body">${rows}</div>
    <div class="sched-foot"><span>${t('hero.schedNote')}</span><span><b>${plan.eager.length} island</b> · chat 300KB static</span></div>
  </div>`;
}

const SNIPPET = `<span class="a">&lt;page</span> title=<span class="s">"Home"</span> description=<span class="s">"…"</span> <span class="a">/&gt;</span>

<span class="a">&lt;component</span> id=<span class="s">"hero"</span> seo=<span class="s">"1"</span> conversion=<span class="s">"0.9"</span><span class="a">&gt;</span>
  <span class="a">&lt;template&gt;</span>&lt;h1&gt;Benvenuto&lt;/h1&gt;<span class="a">&lt;/template&gt;</span>
<span class="a">&lt;/component&gt;</span>

<span class="c">// conversion 1 → hydrates first · zero JS elsewhere</span>
<span class="a">&lt;component</span> id=<span class="s">"cta"</span> conversion=<span class="s">"1"</span> interaction=<span class="s">"0.85"</span><span class="a">&gt;</span>
  <span class="a">&lt;template&gt;</span>&lt;button id="buy"&gt;Compra&lt;/button&gt;<span class="a">&lt;/template&gt;</span>
  <span class="a">&lt;script</span> <span class="k">hydrate</span><span class="a">&gt;</span>
    el.querySelector(<span class="s">'#buy'</span>).<span class="k">onclick</span> = () =&gt; buy();
  <span class="a">&lt;/script&gt;</span>
<span class="a">&lt;/component&gt;</span>`;

export default function ({ site, t, locale, defaultLocale, page }) {
  const p = path => lp(path, locale, defaultLocale);
  const lang = langSwitcher(site, page, locale, defaultLocale);
  const imgNode = { businessValue: 0.3 };

  const lighthouseFigure = (slug, w, h, labelKey) => {
    const pic = smartImage(imgNode, {
      src: `/img/${slug}`,
      alt: `${t(`scores.${labelKey}`)}: Lighthouse 100 performance, accessibility, best practices, SEO`,
      width: w,
      height: h,
      profile: 'screenshot',
      images: site.images,
    }).html;
    return `<figure class="score-card">${pic}
      <figcaption><span>${t(`scores.${labelKey}`)}</span><span>100 · 100 · 100 · 100</span></figcaption>
    </figure>`;
  };

  const specCard = (n, key) =>
    `<div class="spec-card"><span class="n">${n}</span><h3>${t(`spec.${key}.title`)}</h3><p>${t(`spec.${key}.text`)}</p></div>`;
  const principle = (n, key) =>
    `<div class="p"><span class="n">${n}</span><h3>${t(`why.${key}.title`)}</h3><p>${t(`why.${key}.text`)}</p></div>`;

  const g = new PerformanceGraph()
    .add(new PerfNode('nav', {
      seoWeight: 0.3, conversionWeight: 0.2, interactionProbability: 0.4,
      render: () => topbar({ t, lp: p, active: 'site', langHtml: lang }),
      hydrate: (el) => {
        el.querySelectorAll('a[href^="/"]').forEach(a => {
          if (a.href.startsWith('http')) return;
          a.addEventListener('mouseenter', () => {
            if (document.querySelector(`link[rel=prefetch][href="${a.href}"]`)) return;
            const l = document.createElement('link'); l.rel = 'prefetch'; l.href = a.href;
            document.head.appendChild(l);
          });
        });
      },
    }))
    .add(new PerfNode('hero', {
      seoWeight: 1, conversionWeight: 0.9, cpuCost: 2,
      render: () => `<div class="home"><section class="home-hero">
        <div>
          <span class="eyebrow"><b>v0.10.2</b> · ${t('hero.badge')}</span>
          <h1>${t('hero.title')}</h1>
          <p class="lead">${t('hero.lead')}</p>
          <div class="cmd"><code>${t('hero.cmd')}</code><span class="copy">npm</span></div>
          <div class="links">
            <a class="primary" href="${p('/docs/getting-started/')}">${t('hero.linkDocs')}</a>
            <a class="ghost" href="https://github.com/Dani2097/biagiojs">GitHub ↗</a>
          </div>
        </div>
        ${schedulerVisual(t)}
      </section>
      <div class="home-band">
        <b>${t('band.a')}</b><span class="sep">/</span>
        <b>${t('band.b')}</b><span class="sep">/</span>
        <b>${t('band.c')}</b><span class="sep">/</span>
        <b>${t('band.d')}</b>
      </div></div>`,
    }))
    .add(new PerfNode('scores', {
      seoWeight: 0.85, conversionWeight: 0.4, cpuCost: 1,
      render: () => `<div class="home"><section class="home-scores" aria-labelledby="scores-title">
        <div class="intro">
          <p class="sec-eyebrow">${t('scores.eyebrow')}</p>
          <h2 class="sec-title" id="scores-title">${t('scores.title')}</h2>
          <p class="sub">${t('scores.lead')}</p>
        </div>
        <div class="scores-grid">
          ${lighthouseFigure('lighthouse-mobile', 735, 656, 'mobile')}
          ${lighthouseFigure('lighthouse-desktop', 729, 653, 'desktop')}
        </div>
        <p class="fine">${t('scores.note')}</p>
      </section></div>`,
    }))
    .add(new PerfNode('spec', {
      seoWeight: 0.8, conversionWeight: 0.5, cpuCost: 1,
      render: () => `<div class="home"><section class="home-spec">
        <p class="sec-eyebrow">${t('spec.eyebrow')}</p>
        <h2 class="sec-title">${t('spec.heading')}</h2>
        <div class="spec-grid">
          ${specCard('01', 'scheduler')}
          ${specCard('02', 'islands')}
          ${specCard('03', 'seo')}
          ${specCard('04', 'images')}
          ${specCard('05', 'ssg')}
        </div>
      </section></div>`,
    }))
    .add(new PerfNode('play', {
      conversionWeight: 0.8, interactionProbability: 0.65,
      clientModule: '/islands/weights-demo.js',
      render: () => `<div class="home"><section class="home-play">
        <div class="lead-col">
          <p class="sec-eyebrow">${t('demo.eyebrow')}</p>
          <h2>${t('demo.title')}</h2>
          <p class="sub">${t('demo.lead')}</p>
          <div class="note">
            <p>${t('demo.goldenText')}</p>
            <p>${t('demo.goldenHint')}</p>
          </div>
        </div>
        <div class="panel" data-plan="eager"
          data-i18n-static="${t('demo.outStatic')}" data-i18n-eager="${t('demo.outEager')}"
          data-i18n-lazy="${t('demo.outLazy')}" data-i18n-hyd="${t('demo.outHydration')}"
          data-i18n-render="${t('demo.outRender')}">
          <label for="w-conv">${t('demo.conv')}<span class="v" id="v-conv">0.85</span></label>
          <input type="range" id="w-conv" min="0" max="100" value="85">
          <label for="w-inter">${t('demo.inter')}<span class="v" id="v-inter">0.60</span></label>
          <input type="range" id="w-inter" min="0" max="100" value="60">
          <label for="w-cpu">${t('demo.cpu')}<span class="v" id="v-cpu">3</span></label>
          <input type="range" id="w-cpu" min="1" max="10" value="3">
          <div class="zones" aria-hidden="true">
            <span class="zone zone-static">static</span>
            <span class="zone zone-lazy">lazy</span>
            <span class="zone zone-eager">eager</span>
            <span class="marker" id="w-marker"></span>
          </div>
          <div class="out" id="w-out" role="status" aria-live="polite">${t('demo.outHydration')} <b>0.360</b> → <span class="tag">${t('demo.outEager')}</span></div>
        </div>
      </section></div>`,
    }))
    .add(new PerfNode('code', {
      seoWeight: 0.6, conversionWeight: 0.3, cpuCost: 1,
      render: () => `<div class="home"><section class="home-code">
        <p class="sec-eyebrow">${t('code.eyebrow')}</p>
        <h2 class="sec-title">${t('code.title')}</h2>
        <div class="code-wrap">
          <div class="cap">pages/index.page.biagio</div>
          <pre><code>${SNIPPET}</code></pre>
        </div>
      </section></div>`,
    }))
    .add(new PerfNode('why', {
      seoWeight: 0.5, conversionWeight: 0.3,
      render: () => `<div class="home"><section class="home-why">
        <p class="sec-eyebrow">${t('why.eyebrow')}</p>
        <h2 class="sec-title">${t('why.title')}</h2>
        <div class="why-grid">
          ${principle('01', 'a')}
          ${principle('02', 'b')}
          ${principle('03', 'c')}
        </div>
      </section></div>`,
    }))
    .add(new PerfNode('cta', {
      conversionWeight: 0.9, interactionProbability: 0.2,
      render: () => `<div class="home"><section class="home-cta">
        <h2>${t('cta.title')}</h2>
        <p>${t('cta.text')}</p>
        <div class="row">
          <a class="primary" href="${p('/docs/getting-started/')}">${t('cta.start')}</a>
          <a class="ghost" href="${p('/docs/')}">${t('cta.docs')}</a>
        </div>
      </section></div>`,
    }))
    .add(new PerfNode('footer', {
      conversionWeight: 0.05, seoWeight: 0.1,
      render: () => siteFooter({ t }),
    }));

  const order = { nav: 0, hero: 1, scores: 2, spec: 3, play: 4, code: 5, why: 6, cta: 7, footer: 8 };
  for (const [id, o] of Object.entries(order)) g.get(id).domOrder = o;

  return {
    graph: g,
    head: `<style>${CSS}</style>${THEME_SCRIPT}`,
    page: {
      title: t('meta.homeTitle'),
      description: t('meta.homeDesc'),
      basePath: '/',
      sitemapPriority: 1.0,
      lastmod: '2026-07-09',
      software: {
        name: 'biagiojs',
        version: '0.10.2',
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Any',
        downloadUrl: 'https://www.npmjs.com/package/biagiojs',
        price: '0',
        currency: 'USD',
      },
    },
  };
}
