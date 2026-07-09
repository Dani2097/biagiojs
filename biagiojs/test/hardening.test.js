/**
 * biagiojs — copertura per i 4 hardening: parser robusto (#4), emissione script
 * sicura (#3), ordine DOM accessibile (#2), pesi business de-magicizzati (#1).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileBiagio } from '../src/compiler.js';
import { PerfNode, PerformanceGraph, BUSINESS_WEIGHTS, normalizeBusinessWeights } from '../src/core/graph.js';
import { renderPage } from '../src/ssr.js';
import { safeScript } from '../src/core/runtime-bundle.js';

// ---------- #4 parser robusto ----------
test('#4 parser: `>` dentro un attributo non rompe il tag', () => {
  const src = `
    <page title="T" description="D" />
    <component id="a" conversion="0.5" props='{"q":"x > y","n":3}'>
      <template><div>ok</div></template>
    </component>`;
  const def = compileBiagio(src).default();
  assert.deepEqual(def.graph.get('a').clientProps, { q: 'x > y', n: 3 });
  assert.match(def.graph.get('a').render(), /ok/);
});

test('#4 parser: <template> annidati estratti per intero', () => {
  const src = `
    <page title="T" description="D" />
    <component id="a" seo="1">
      <template><section><template id="tpl"><p>inner</p></template></section></template>
    </component>`;
  const def = compileBiagio(src).default();
  const html = def.graph.get('a').render();
  assert.match(html, /<template id="tpl"><p>inner<\/p><\/template>/);
  assert.match(html, /<section>/);
});

test('#4 parser: component dentro commento HTML top-level è ignorato', () => {
  const src = `
    <page title="T" description="D" />
    <!-- <component id="ghost"><template>no</template></component> -->
    <component id="real"><template><b>si</b></template></component>`;
  const def = compileBiagio(src).default();
  assert.equal(def.graph.get('ghost'), undefined);
  assert.ok(def.graph.get('real'));
});

test('#4 parser: più blocchi <style> concatenati', () => {
  const src = `
    <page title="T" description="D" />
    <style>a{color:red}</style>
    <component id="c"><template>x</template></component>
    <style>b{color:blue}</style>`;
  const def = compileBiagio(src).default();
  assert.match(def.head, /a\{color:red\}/);
  assert.match(def.head, /b\{color:blue\}/);
});

// ---------- #3 emissione script sicura ----------
test('#3 safeScript: neutralizza </script> in qualsiasi case', () => {
  assert.equal(safeScript('a</script>b'), 'a<\\/script>b');
  assert.equal(safeScript('a</SCRIPT>b'), 'a<\\/SCRIPT>b');
});

test('#3 renderPage: hydrate con </script> non buca il tag', async () => {
  const g = new PerformanceGraph();
  g.add(new PerfNode('cta', {
    conversionWeight: 1, interactionProbability: 0.9,
    render: () => '<button>ok</button>',
    hydrateSource: 'el.dataset.s = "</script>";',
  }));
  const html = await renderPage(g, { title: 't', overlay: false, minifyRuntime: false });
  // nessuna chiusura </script> "reale" iniettata dal codice isola
  assert.match(html, /<\\\/script>/);           // presente ma neutralizzata
  assert.doesNotMatch(html, /"<\/script>"/);    // non c'è la stringa cruda che bucherebbe il tag
});

test('#3 renderPage: hydrateSource emesso diretto, senza round-trip toString', async () => {
  const g = new PerformanceGraph();
  g.add(new PerfNode('cta', {
    conversionWeight: 1, interactionProbability: 0.9,
    render: () => '<button>ok</button>',
    hydrateSource: 'el.className = "hydrated";',
  }));
  const html = await renderPage(g, { title: 't', overlay: false, minifyRuntime: false });
  assert.match(html, /function\(el\)\{el\.className = "hydrated";\}/);
});

// ---------- #2 ordine DOM accessibile ----------
const vnode = (id, o, opts = {}) => {
  const n = new PerfNode(id, { render: () => `<i>${id}</i>`, ...opts });
  n.domOrder = o;
  return n;
};

test('#2 default: DOM in ordine di lettura (domOrder), niente flex order', async () => {
  const g = new PerformanceGraph()
    .add(vnode('footer', 2, { conversionWeight: 0.05 }))
    .add(vnode('cta', 1, { conversionWeight: 1 }))
    .add(vnode('hero', 0, { seoWeight: 1 }));
  const html = await renderPage(g, { title: 't', overlay: false, minifyRuntime: false });
  // ordine sorgente = visivo = hero, cta, footer (a11y: tab/screen reader corretti)
  assert.ok(html.indexOf('<i>hero</i>') < html.indexOf('<i>cta</i>'));
  assert.ok(html.indexOf('<i>cta</i>') < html.indexOf('<i>footer</i>'));
  assert.doesNotMatch(html, /style="order:/);
});

test('#2 priority: DOM in ordine di valore business, con flex order per il visivo', async () => {
  const g = new PerformanceGraph()
    .add(vnode('footer', 2, { conversionWeight: 0.05 }))
    .add(vnode('cta', 1, { conversionWeight: 1 }))
    .add(vnode('hero', 0, { seoWeight: 1 }));
  const html = await renderPage(g, { title: 't', overlay: false, minifyRuntime: false, contentOrder: 'priority' });
  // cta (valore più alto) esce prima nel DOM
  assert.ok(html.indexOf('<i>cta</i>') < html.indexOf('<i>footer</i>'));
  assert.match(html, /style="order:/);
});

// ---------- #1 pesi business de-magicizzati ----------
test('#1 BUSINESS_WEIGHTS somma a 1 ed è la base del businessValue', () => {
  const s = BUSINESS_WEIGHTS.conversion + BUSINESS_WEIGHTS.seo + BUSINESS_WEIGHTS.interaction;
  assert.ok(Math.abs(s - 1) < 1e-9);
  const n = new PerfNode('x', { conversionWeight: 1 });
  assert.equal(n.businessValue, BUSINESS_WEIGHTS.conversion);
});

test('#1 normalizeBusinessWeights riscala a somma 1 e gestisce input degeneri', () => {
  const w = normalizeBusinessWeights({ conversion: 2, seo: 1, interaction: 1 });
  assert.ok(Math.abs(w.conversion + w.seo + w.interaction - 1) < 1e-9);
  assert.ok(Math.abs(w.conversion - 0.5) < 1e-9);
  assert.deepEqual(normalizeBusinessWeights({ conversion: 0, seo: 0, interaction: 0 }), { ...BUSINESS_WEIGHTS });
});

test('#1 override per-nodo cambia il businessValue', () => {
  const base = new PerfNode('a', { seoWeight: 1 });
  const seoFirst = new PerfNode('b', { seoWeight: 1, weights: normalizeBusinessWeights({ conversion: 0, seo: 1, interaction: 0 }) });
  assert.equal(base.businessValue, BUSINESS_WEIGHTS.seo);
  assert.equal(seoFirst.businessValue, 1);
});

test('#1 compileBiagio accetta pesi custom e li applica ai nodi', () => {
  const src = `<page title="T" description="D" /><component id="c" seo="1"><template>x</template></component>`;
  const def = compileBiagio(src, 'x.biagio', { weights: { conversion: 0, seo: 1, interaction: 0 } }).default();
  assert.equal(def.graph.get('c').businessValue, 1);
});
