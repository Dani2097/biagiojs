import { test } from 'node:test';
import assert from 'node:assert/strict';
import { consentBlocks, nativeBannerHtml, vendorLoaderScript, vendorPreconnect, CONSENT_MODE_SNIPPET } from '../src/core/consent.js';
import { compileCvw } from '../src/compiler.js';
import { renderPage } from '../src/ssr.js';

test('consent mode v2: default denied per tutte le categorie Google', () => {
  assert.match(CONSENT_MODE_SNIPPET, /ad_storage:'denied'/);
  assert.match(CONSENT_MODE_SNIPPET, /analytics_storage:'denied'/);
});

test('native: banner SSR con rifiuto pari livello e policy link', () => {
  const html = nativeBannerHtml({ policyUrl: '/privacy/' });
  assert.match(html, /cvw-consent-accept/);
  assert.match(html, /cvw-consent-reject/);
  assert.match(html, /href="\/privacy\/"/);
  // XSS: testi escapati
  const evil = nativeBannerHtml({ text: { title: '<script>x</script>' } });
  assert.doesNotMatch(evil, /<script>x<\/script>/);
});

test('vendor: preconnect + strategy + manual blocking (cookiebot)', () => {
  assert.match(vendorPreconnect('cookiebot'), /preconnect.*cookiebot/);
  const idle = vendorLoaderScript({ vendor: 'cookiebot', id: 'x', strategy: 'idle' });
  assert.match(idle, /requestIdleCallback/);
  assert.match(idle, /data-blockingmode.*manual/);
  const inter = vendorLoaderScript({ vendor: 'iubenda', id: 'x', strategy: 'interaction' });
  assert.match(inter, /pointerdown/);
  assert.match(inter, /setTimeout\(go,4000\)/);   // fallback compliance: banner entro 4s
});

test('consentBlocks: native ha banner, vendor no; entrambi denied-by-default', () => {
  const nat = consentBlocks({ mode: 'native' });
  assert.match(nat.head, /denied/);
  assert.match(nat.body, /cvw-consent-banner"/);
  const ven = consentBlocks({ mode: 'vendor', vendor: 'iubenda', id: 'x' });
  assert.match(ven.head, /denied/);
  assert.match(ven.head, /iubenda/);
  assert.doesNotMatch(ven.body, /id="cvw-consent-banner"/);
});

test('isole gated: consent="marketing" nel .cvw finisce nel registry con "c"', () => {
  const def = compileCvw(`<page title="t" description="d" />
<component id="px" interaction="0.9" conversion="0.5" consent="marketing">
<template><div>ads</div></template>
<script hydrate>el.dataset.x='1';</script>
</component>`).default();
  assert.equal(def.graph.get('px').consent, 'marketing');
  const html = renderPage(def.graph, { title: 't' });
  assert.match(html, /"c": "marketing"/);
});
