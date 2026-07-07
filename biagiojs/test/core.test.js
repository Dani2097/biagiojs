/** biagiojs — test suite (node:test, zero dipendenze). Run: node --test test/ */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PerfNode, PerformanceGraph } from '../src/core/graph.js';
import { renderOrder, hydrationPlan, networkSchedule, hydrationPriority } from '../src/core/scheduler.js';
import { html, raw, escapeHtml, safeUrl } from '../src/core/html.js';
import { ExperimentEngine } from '../src/core/experiments.js';
import { optimize } from '../src/core/optimizer.js';
import { seoHead, sitemap } from '../src/core/seo.js';
import { markdownToHtml } from '../src/core/content.js';
import { networkHead } from '../src/core/network.js';

const node = (id, opts = {}) => new PerfNode(id, { render: () => `<i>${id}</i>`, ...opts });

// ---------- scheduler ----------
test('renderOrder: valore business per costo, non ordine di inserimento', () => {
  const g = new PerformanceGraph()
    .add(node('footer', { conversionWeight: 0.05 }))
    .add(node('cta', { conversionWeight: 1, interactionProbability: 0.8 }))
    .add(node('hero', { seoWeight: 1, conversionWeight: 0.9, cpuCost: 2 }));
  const order = renderOrder(g).map(n => n.id);
  assert.equal(order[0], 'cta');
  assert.equal(order.at(-1), 'footer');
});

test('renderOrder rispetta le dependencies anche contro la priorità', () => {
  const g = new PerformanceGraph()
    .add(node('panel', { conversionWeight: 1, dependencies: ['tabs'] }))
    .add(node('tabs', { conversionWeight: 0.1 }));
  const order = renderOrder(g).map(n => n.id);
  assert.deepEqual(order, ['tabs', 'panel']);
});

test('renderOrder lancia su cicli', () => {
  const g = new PerformanceGraph()
    .add(node('a', { dependencies: ['b'] }))
    .add(node('b', { dependencies: ['a'] }));
  assert.throws(() => renderOrder(g), /Cycle/);
});

test('hydrationPlan: eager/lazy/static per soglie; senza hydrate sempre static', () => {
  const g = new PerformanceGraph()
    .add(node('cta', { conversionWeight: 1, interactionProbability: 0.9, hydrate: () => {} }))
    .add(node('nav', { conversionWeight: 0.2, interactionProbability: 0.4, hydrate: () => {} }))
    .add(node('chat', { conversionWeight: 0.05, interactionProbability: 0.03, hydrate: () => {} }))
    .add(node('hero', { conversionWeight: 0.9, interactionProbability: 0.9 })); // no hydrate
  const plan = hydrationPlan(g);
  assert.deepEqual(plan.eager.map(x => x.node.id), ['cta']);
  assert.deepEqual(plan.lazy.map(x => x.node.id), ['nav']);
  assert.ok(plan.static.map(x => x.node.id).includes('chat'));
  assert.ok(plan.static.map(x => x.node.id).includes('hero'));
});

test('hydrationPlan: soglie più alte declassano isole (CrUX lento)', () => {
  const g = new PerformanceGraph()
    .add(node('nav', { conversionWeight: 0.2, interactionProbability: 0.4, hydrate: () => {} }));
  const strict = hydrationPlan(g, { eagerThreshold: 0.45, lazyThreshold: 0.12 });
  assert.equal(strict.lazy.length + strict.eager.length, 0);
});

test('networkSchedule: ordina per valore/KB', () => {
  const out = networkSchedule([
    { url: 'chat.js', kb: 300, businessValue: 0.05 },
    { url: 'cta.js', kb: 10, businessValue: 1 },
    { url: 'font.woff2', kb: 30, businessValue: 0.5 },
  ]).map(a => a.url);
  assert.deepEqual(out, ['cta.js', 'font.woff2', 'chat.js']);
});

test('networkHead: rispetta il budget di preload', () => {
  const { html: h } = networkHead([
    { url: '/a.js', kb: 150, businessValue: 1 },
    { url: '/b.js', kb: 150, businessValue: 0.9 },
  ], { preloadBudgetKb: 200 });
  assert.match(h, /preload.*a\.js/);
  assert.match(h, /prefetch.*b\.js/); // fuori budget → downgrade a prefetch
});

// ---------- html / XSS ----------
test('html``: escapa le interpolazioni', () => {
  const evil = '<script>alert(1)</script>';
  assert.equal(html`<p>${evil}</p>`.toString(), '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
});

test('html``: raw() bypassa, array e nesting si compongono', () => {
  const items = ['a', '<b>'];
  const out = html`<ul>${items.map(i => html`<li>${i}</li>`)}</ul>`.toString();
  assert.equal(out, '<ul><li>a</li><li>&lt;b&gt;</li></ul>');
  assert.equal(html`<div>${raw('<i>ok</i>')}</div>`.toString(), '<div><i>ok</i></div>');
});

test('safeUrl blocca javascript: ma consente data:image', () => {
  assert.equal(safeUrl('javascript:alert(1)'), '#');
  assert.match(safeUrl('data:image/png;base64,xx'), /^data:image/);
  assert.equal(safeUrl('https://ok.com/a?b=1&c=2'), 'https://ok.com/a?b=1&amp;c=2');
});

// ---------- experiments ----------
test('ExperimentEngine: assegnazione deterministica e render della variante', () => {
  const a1 = new ExperimentEngine({ userId: 'u1' }).define('exp', ['a', 'b']);
  const a2 = new ExperimentEngine({ userId: 'u1' }).define('exp', ['a', 'b']);
  assert.equal(a1.assign('exp'), a2.assign('exp'));
  const out = a1.pick('exp', { a: () => 'A', b: () => 'B' });
  assert.match(out, /data-cvw-exp="exp"/);
});

test('ExperimentEngine: distribuzione ~50/50 su molti utenti', () => {
  let a = 0;
  for (let i = 0; i < 2000; i++) {
    const e = new ExperimentEngine({ userId: 'user' + i }).define('x', ['a', 'b']);
    if (e.assign('x') === 'a') a++;
  }
  assert.ok(a > 800 && a < 1200, `split ${a}/2000 fuori range`);
});

// ---------- optimizer ----------
test('optimize: analytics sovrascrive interactionProbability, CrUX alza le soglie', () => {
  const g = new PerformanceGraph().add(node('cta', { conversionWeight: 1, interactionProbability: 0.9, hydrate: () => {} }));
  const { thresholds, log } = optimize(g, {
    analytics: { componentClicks: { cta: 0.5 } },
    crux: { p75: { inp: 300, lcp: 3000 } },
  });
  assert.equal(g.get('cta').interactionProbability, 0.5);
  assert.equal(thresholds.eagerThreshold, 0.45);
  assert.ok(log.length >= 2);
});

// ---------- seo ----------
test('seoHead: canonical, OG, JSON-LD Product e breadcrumbs', () => {
  const h = seoHead({ name: 'S', baseUrl: 'https://s.com' }, {
    path: '/p/', title: 'T', description: 'D', type: 'product',
    product: { name: 'X', price: 10 }, breadcrumbs: [{ name: 'Home', path: '/' }],
  });
  assert.match(h, /rel="canonical" href="https:\/\/s\.com\/p\/"/);
  assert.match(h, /"@type":"Product"/);
  assert.match(h, /"@type":"BreadcrumbList"/);
});

test('seoHead: SoftwareApplication, WebSite, Organization, TechArticle', () => {
  const site = {
    name: 'biagiojs', baseUrl: 'https://s.com',
    organization: { name: 'biagiojs', logo: '/logo.svg', sameAs: ['https://github.com/x'] },
    website: { name: 'Docs' },
    locales: ['en', 'it'],
  };
  const home = seoHead(site, {
    path: '/', basePath: '/', title: 'Home', description: 'D', locale: 'en',
    software: { name: 'biagiojs', version: '1.0.0', downloadUrl: 'https://npmjs.com/x' },
  });
  assert.match(home, /"@type":"SoftwareApplication"/);
  assert.match(home, /"@type":"WebSite"/);
  assert.match(home, /"@type":"Organization"/);
  assert.match(home, /og:locale:alternate/);

  const doc = seoHead(site, {
    path: '/docs/start/', basePath: '/docs/start/', title: 'Start', description: 'D',
    type: 'article', locale: 'en',
    article: { datePublished: '2026-01-01', author: 'Dev', section: 'Guides' },
  });
  assert.match(doc, /"@type":"TechArticle"/);
  assert.match(doc, /property="og:type" content="article"/);
  assert.match(doc, /article:published_time/);
});

test('sitemap: hreflang x-default', () => {
  const xml = sitemap(
    { baseUrl: 'https://s.com', locales: ['en', 'it'], defaultLocale: 'en' },
    [{ path: '/en/p/', basePath: '/p/' }],
  );
  assert.match(xml, /hreflang="x-default"/);
});

test('sitemap esclude noindex', () => {
  const xml = sitemap({ baseUrl: 'https://s.com' }, [{ path: '/a/' }, { path: '/b/', noindex: true }]);
  assert.match(xml, /\/a\//);
  assert.doesNotMatch(xml, /\/b\//);
});

// ---------- markdown ----------
test('markdownToHtml: struttura + escaping del contenuto', () => {
  const out = markdownToHtml('# Titolo\n\n- uno\n- **due**\n\n<script>x</script>');
  assert.match(out, /<h1>Titolo<\/h1>/);
  assert.match(out, /<li><strong>due<\/strong><\/li>/);
  assert.doesNotMatch(out, /<script>/);
});

test('markdownToHtml: blocchi codice e tabelle', () => {
  const out = markdownToHtml('```js\nconst x = 1;\n```\n\n| A | B |\n|---|---|\n| 1 | 2 |');
  assert.match(out, /<pre><code class="lang-js">const x = 1;<\/code><\/pre>/);
  assert.match(out, /<table><thead>/);
  assert.match(out, /<td>2<\/td>/);
});
