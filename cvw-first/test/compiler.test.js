import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileCvw } from '../src/compiler.js';
import { renderOrder, hydrationPlan } from '../src/core/scheduler.js';

const SRC = `
<page title="T" description="D" sitemapPriority="0.7" />
<component id="hero" seo="1" conversion="0.8" cpu="2">
  <template><h1>Ciao</h1></template>
</component>
<component id="cta" conversion="1" interaction="0.9">
  <template><button id="b">Vai</button></template>
  <script hydrate>
    el.querySelector('#b').addEventListener('click', () => el.dataset.done = '1');
  </script>
</component>
<component id="stock" conversion="0.9" interaction="0.6" client="/islands/x.js" props='{"n":5}'>
  <template><div>…</div></template>
</component>
<style>body{margin:0}</style>
`;

test('compileCvw: page, componenti, pesi e domOrder', () => {
  const def = compileCvw(SRC).default();
  assert.equal(def.page.title, 'T');
  assert.equal(def.page.sitemapPriority, 0.7);
  assert.match(def.head, /<style>body\{margin:0\}<\/style>/);
  const hero = def.graph.get('hero');
  assert.equal(hero.seoWeight, 1);
  assert.equal(hero.cpuCost, 2);
  assert.equal(hero.domOrder, 0);
  assert.equal(def.graph.get('cta').domOrder, 1);
});

test('compileCvw: script hydrate diventa funzione, client diventa modulo', () => {
  const def = compileCvw(SRC).default();
  assert.equal(typeof def.graph.get('cta').hydrate, 'function');
  assert.equal(def.graph.get('stock').clientModule, '/islands/x.js');
  assert.deepEqual(def.graph.get('stock').clientProps, { n: 5 });
  // scheduler li tratta come isole
  const plan = hydrationPlan(def.graph);
  const interactive = [...plan.eager, ...plan.lazy].map(x => x.node.id);
  assert.ok(interactive.includes('cta'));
  assert.ok(interactive.includes('stock'));
});

test('compileCvw: il rendering segue il valore business, non il file', () => {
  const def = compileCvw(SRC).default();
  assert.equal(renderOrder(def.graph)[0].id, 'cta');
});

test('compileCvw: errori chiari', () => {
  assert.throws(() => compileCvw('<component id="x"><template>y</template></component>'), /manca il tag <page/);
  assert.throws(() => compileCvw('<page title="t" /><component id="x">no template</component>'), /senza <template>/);
});
