/** Test runtime bundle e HTML dimagrito */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PerfNode, PerformanceGraph } from '../src/core/graph.js';
import { renderPage } from '../src/ssr.js';
import { hydrationPlan } from '../src/core/scheduler.js';
import {
  compactPlan,
  needsSignalsRuntime,
  inlineIslandUri,
  nodeWrapperAttrs,
  assembleClientRuntime,
} from '../src/core/runtime-bundle.js';

test('compactPlan emette solo eager e lazy ids', () => {
  const g = new PerformanceGraph();
  g.add(new PerfNode('a', { conversionWeight: 1, interactionProbability: 0.9, hydrate: () => {} }));
  g.add(new PerfNode('b', { conversionWeight: 0.2, interactionProbability: 0.5, hydrate: () => {} }));
  const plan = hydrationPlan(g);
  const json = compactPlan(plan);
  assert.match(json, /"e":\[/);
  assert.doesNotMatch(json, /priority/);
  assert.doesNotMatch(json, /static/);
});

test('nodeWrapperAttrs: statici senza data-cvw-id, order:0 omesso', () => {
  const n = new PerfNode('hero', { conversionWeight: 0.5, seoWeight: 0.5, render: () => '' });
  n.domOrder = 0;
  assert.doesNotMatch(nodeWrapperAttrs(n, { interactive: false }), /data-cvw-id/);
  assert.doesNotMatch(nodeWrapperAttrs(n, { interactive: false }), /style=/);
  n.domOrder = 3;
  assert.match(nodeWrapperAttrs(n, { interactive: false }), /style="order:3"/);
});

test('nodeWrapperAttrs: marker metrici conversion/seo solo con overlay', () => {
  const n = new PerfNode('cta', { conversionWeight: 1, seoWeight: 1, hydrate: () => {} });
  const prod = nodeWrapperAttrs(n, { interactive: true, overlay: false });
  assert.match(prod, /data-cvw-id="cta"/);
  assert.doesNotMatch(prod, /data-cvw-conversion/);
  assert.doesNotMatch(prod, /data-cvw-seo/);
  assert.doesNotMatch(prod, /data-cvw-revenue/);
  const dev = nodeWrapperAttrs(n, { interactive: true, overlay: true });
  assert.match(dev, /data-cvw-conversion="high"/);
  assert.match(dev, /data-cvw-seo="high"/);
  assert.match(dev, /data-cvw-revenue="true"/);
});

test('needsSignalsRuntime rileva window.cvw nelle isole', () => {
  const nodes = [{ hydrate: () => {}, clientModule: null }];
  assert.equal(needsSignalsRuntime(nodes, {}), false);
  const withSignals = [{ hydrate: (el) => { const { signal } = window.cvw; signal(0); }, clientModule: null }];
  assert.equal(needsSignalsRuntime(withSignals, {}), true);
});

test('inlineIslandUri preferisce encodeURIComponent per JS ASCII', () => {
  const code = 'export default (el)=>{el.textContent="hi"}';
  const uri = inlineIslandUri(code);
  assert.match(uri, /^data:text\/javascript,/);
  assert.ok(uri.length < `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`.length);
});

test('renderPage: piano compatto e nodo statico senza data-cvw-id', async () => {
  const g = new PerformanceGraph();
  g.add(new PerfNode('static', { conversionWeight: 0.1, render: () => '<p>x</p>' }));
  g.add(new PerfNode('cta', {
    conversionWeight: 1, interactionProbability: 0.9,
    render: () => '<button>ok</button>',
    hydrate: (el) => { el.querySelector('button').onclick = () => {}; },
  }));
  const html = await renderPage(g, { title: 't', overlay: false, minifyRuntime: false });
  assert.match(html, /__CVW_PLAN__=\{"e":\["cta"\],"l":\[\]\}/);
  assert.match(html, /data-cvw-id="cta"/);
  assert.doesNotMatch(html, /data-cvw-id="static"/);
  assert.equal((html.match(/<script>/g) || []).length, 1);
});

test('renderPage: nodo statico nudo senza wrapper <div>', async () => {
  const g = new PerformanceGraph();
  g.add(new PerfNode('plain', { conversionWeight: 0.1, seoWeight: 0.1, render: () => '<p>ciao</p>' }));
  const html = await renderPage(g, { title: 't', overlay: false, minifyRuntime: false });
  assert.match(html, /<p>ciao<\/p>/);
  assert.doesNotMatch(html, /<div>\s*<p>ciao<\/p>\s*<\/div>/);
});

test('assembleClientRuntime unisce tutto in un IIFE', () => {
  const code = assembleClientRuntime({
    planJson: '{"e":["a"],"l":[]}',
    islandProps: {},
    islandsCode: '"a":function(el){}',
    includeSignals: false,
    includeMetrics: false,
  });
  assert.match(code, /^\(function\(\)\{/);
  assert.match(code, /__CVW_PLAN__/);
  assert.match(code, /__CVW_ISLANDS__/);
});
