/** Test PurgeCSS / optimizeHtml — produzione hardening */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { optimizeHtml, purgeCss } from '../src/core/minify.js';

test('purgeCss elimina classi assenti dal DOM visibile', () => {
  const css = '.hero{color:red}.ghost{color:blue}';
  const html = '<div class="hero"></div>';
  const out = purgeCss(css, html);
  assert.match(out, /\.hero/);
  assert.doesNotMatch(out, /\.ghost/);
});

test('optimizeHtml preserva CSS in <template> (widget JS client-side)', async () => {
  const input = `<!doctype html><body>
<template hidden><style>.regiondo-btn{background:red}</style><div class="regiondo-btn"></div></template>
<style>.hero{color:blue}</style>
<div class="hero"></div>
</body>`;
  const { html } = await optimizeHtml(input);
  assert.match(html, /\.regiondo-btn\{background:red\}/);
  assert.match(html, /\.hero\{color:(blue|#00f)\}/);
});

test('optimizeHtml rispetta data-cvw-no-purge su style esterni', async () => {
  const input = `<style data-cvw-no-purge>.widget-x{display:flex}</style><div></div>`;
  const { html } = await optimizeHtml(input);
  assert.match(html, /\.widget-x\{display:flex\}/);
});

test('optimizeHtml con purge:false non tocca il CSS', async () => {
  const input = `<style>.unused{color:red}</style><div></div>`;
  const { html } = await optimizeHtml(input, { purge: false, minify: false, scripts: false });
  assert.match(html, /\.unused\{color:red\}/);
});
