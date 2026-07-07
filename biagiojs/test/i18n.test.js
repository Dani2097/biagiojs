import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeT, localePath, splitLocaleFromUrl, hreflangLinks } from '../src/core/i18n.js';
import { seoHead, sitemap } from '../src/core/seo.js';
import { compileCvw } from '../src/compiler.js';

const SITE = { name: 'S', baseUrl: 'https://s.com', locales: ['it', 'en', 'de'], defaultLocale: 'it' };

test('makeT: dot-path, interpolazione, fallback alla chiave', () => {
  const t = makeT({ hero: { title: 'Ciao {name}' } });
  assert.equal(t('hero.title', { name: 'Danilo' }), 'Ciao Danilo');
  assert.equal(t('manca.questa'), 'manca.questa');
});

test('localePath: default senza prefisso, altre lingue con prefisso', () => {
  assert.equal(localePath('/about/', 'it', 'it'), '/about/');
  assert.equal(localePath('/about/', 'en', 'it'), '/en/about/');
  assert.equal(localePath('/', 'de', 'it'), '/de/');
});

test('splitLocaleFromUrl: stacca il prefisso lingua', () => {
  assert.deepEqual(splitLocaleFromUrl('/en/about/', ['it', 'en'], 'it'), { locale: 'en', path: '/about/' });
  assert.deepEqual(splitLocaleFromUrl('/about/', ['it', 'en'], 'it'), { locale: 'it', path: '/about/' });
});

test('hreflangLinks: una per lingua + x-default', () => {
  const h = hreflangLinks(SITE, '/p/');
  assert.match(h, /hreflang="it" href="https:\/\/s\.com\/p\/"/);
  assert.match(h, /hreflang="en" href="https:\/\/s\.com\/en\/p\/"/);
  assert.match(h, /hreflang="x-default" href="https:\/\/s\.com\/p\/"/);
});

test('seoHead: emette hreflang e og:locale su sito multilingua', () => {
  const h = seoHead(SITE, { path: '/en/p/', basePath: '/p/', locale: 'en', title: 'T', description: 'D' });
  assert.match(h, /hreflang="de"/);
  assert.match(h, /og:locale" content="en"/);
  assert.match(h, /canonical" href="https:\/\/s\.com\/en\/p\/"/);
});

test('sitemap: xhtml:link alternates per lingua', () => {
  const xml = sitemap(SITE, [{ path: '/en/p/', basePath: '/p/' }]);
  assert.match(xml, /xmlns:xhtml/);
  assert.match(xml, /hreflang="de" href="https:\/\/s\.com\/de\/p\/"/);
});

test('compiler .biagio: {{t:...}} risolto con ctx.t, fallback senza t', () => {
  const src = `<page title="{{t:page.title}}" description="d" />
<component id="h" seo="1"><template><h1>{{t:hero.msg}}</h1></template></component>`;
  const t = makeT({ page: { title: 'Titolo IT' }, hero: { msg: 'Benvenuto' } });
  const def = compileCvw(src).default({ t });
  assert.equal(def.page.title, 'Titolo IT');
  assert.match(def.graph.get('h').render(), /Benvenuto/);
  // senza ctx.t i placeholder restano (build monolingua)
  const def2 = compileCvw(src).default();
  assert.match(def2.graph.get('h').render(), /\{\{t:hero.msg\}\}/);
});
