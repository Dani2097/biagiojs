/** Test class bundling post-SSR */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bundleClassAttributes, parseBundleMarker, parseClassRules } from '../src/core/bundle-classes.js';
import { optimizeHtml } from '../src/core/minify.js';

const UTIL_CSS = `
.flex{display:flex}
.items-center{align-items:center}
.gap-2{gap:0.5rem}
.px-4{padding-left:1rem;padding-right:1rem}
.py-2{padding-top:0.5rem;padding-bottom:0.5rem}
.rounded{border-radius:0.25rem}
.bg-blue{background:#3b82f6;color:#fff}
.text-sm{font-size:0.875rem}
`;

const BTN = 'flex items-center gap-2 px-4 py-2 rounded bg-blue text-sm';

function cardGrid(n = 12) {
  const buttons = Array.from({ length: n }, (_, i) =>
    `<button class="${BTN}">Item ${i + 1}</button>`,
  ).join('');
  return `<!doctype html><html><head><title>t</title></head><body>
<style>${UTIL_CSS}</style>
<section>${buttons}</section>
</body></html>`;
}

test('parseClassRules estrae regole semplici', () => {
  const rules = parseClassRules('.a{color:red}.b{margin:0}');
  assert.equal(rules.get('a'), 'color:red');
  assert.equal(rules.get('b'), 'margin:0');
});

test('bundleClassAttributes: alias su classi ripetute con regole note', () => {
  const input = cardGrid(12);
  const before = Buffer.byteLength(input);
  const { html, savedBytes, aliases } = bundleClassAttributes(input, { minRepeat: 3 });
  assert.equal(aliases, 1);
  assert.match(html, /class="u-0"/);
  assert.doesNotMatch(html, new RegExp(`class="${BTN}"`));
  assert.match(html, /<style data-cvw-bundle>\.u-0\{/);
  assert.ok(savedBytes > 0, 'dovrebbe risparmiare byte raw HTML');
  assert.ok(Buffer.byteLength(html) < before);
  const marker = parseBundleMarker(html);
  assert.equal(marker.aliases, 1);
  assert.equal(marker.savedBytes, savedBytes);
});

test('bundleClassAttributes: salta se minRepeat non raggiunto', () => {
  const input = cardGrid(2);
  const { aliases } = bundleClassAttributes(input, { minRepeat: 3 });
  assert.equal(aliases, 0);
});

test('bundleClassAttributes: salta token senza regola CSS', () => {
  const input = `<style>.known{color:red}</style><div class="known unknown unknown2"></div>`.repeat(5);
  const wrapped = `<!doctype html><html><head></head><body>${input}</body></html>`;
  const { aliases } = bundleClassAttributes(wrapped, { minRepeat: 3 });
  assert.equal(aliases, 0);
});

test('bundleClassAttributes: non tocca class dentro template', () => {
  const input = `<!doctype html><html><head></head><body>
<style>${UTIL_CSS}</style>
<template><button class="${BTN}">tpl</button></template>
${Array.from({ length: 6 }, () => `<button class="${BTN}">x</button>`).join('')}
</body></html>`;
  const { html, aliases } = bundleClassAttributes(input, { minRepeat: 3 });
  assert.equal(aliases, 1);
  assert.match(html, new RegExp(`<template>[\\s\\S]*class="${BTN}"`));
});

test('optimizeHtml: bundleClasses prima di purge', async () => {
  const input = cardGrid(10);
  const { html, bundle } = await optimizeHtml(input, {
    bundleClasses: true,
    bundleMinRepeat: 3,
    minify: false,
    scripts: false,
  });
  assert.equal(bundle.aliases, 1);
  assert.match(html, /class="u-0"/);
  assert.doesNotMatch(html, /\.flex\{/);
});

test('analyze marker: parseBundleMarker legge il meta tag build', () => {
  const { html } = bundleClassAttributes(cardGrid(8), { minRepeat: 3 });
  const m = parseBundleMarker(html);
  assert.ok(m.savedBytes > 0);
  assert.equal(m.aliases, 1);
});
