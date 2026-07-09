import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defineConfig } from '../src/core/define-config.js';
import { defineCollection, _resetCollectionCache } from '../src/core/content.js';
import { pagesAffectedByChange, isFullRebuild } from '../src/core/incremental.js';
import { formatErrorOverlay, BiagioError } from '../src/core/errors.js';
import { scaffoldPage, scaffoldIsland } from '../src/core/scaffold.js';
import { checkLinksAndAssets } from '../src/core/link-checker.js';
import { renderRequest } from '../src/server-render.js';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

test('defineConfig pass-through con tipi', () => {
  const cfg = defineConfig({ site: { name: 'Test', baseUrl: 'https://t.com' } });
  assert.equal(cfg.site.name, 'Test');
});

test('defineCollection schema', () => {
  const c = defineCollection({ schema: { title: { type: 'string', required: true } } });
  assert.ok(c.schema.title);
});

test('pagesAffectedByChange — pagina singola', () => {
  const root = mkdtempSync(join(tmpdir(), 'biagio-'));
  mkdirSync(join(root, 'pages'), { recursive: true });
  const p = join(root, 'pages', 'about.page.biagio');
  writeFileSync(p, '<page title="x"/><component id="a"><template></template></component>');
  const affected = pagesAffectedByChange(root, p);
  assert.deepEqual(affected, ['about.page.biagio']);
  assert.equal(isFullRebuild(pagesAffectedByChange(root, join(root, 'biagio.config.js'))), true);
  rmSync(root, { recursive: true });
});

test('BiagioError location e overlay', () => {
  const e = new BiagioError('syntax error', { file: 'pages/foo.biagio', line: 12 });
  assert.equal(e.location, 'pages/foo.biagio:12');
  const { html } = formatErrorOverlay(e);
  assert.match(html, /foo\.biagio:12/);
});

test('scaffold page e island', () => {
  const root = mkdtempSync(join(tmpdir(), 'biagio-'));
  const page = scaffoldPage(root, 'contact');
  assert.ok(existsSync(page));
  assert.match(readFileSync(page, 'utf8'), /<page/);
  const island = scaffoldIsland(root, 'counter');
  assert.ok(existsSync(island));
  rmSync(root, { recursive: true });
});

test('link-checker: rileva link rotti, ignora validi e route dinamiche', () => {
  const root = mkdtempSync(join(tmpdir(), 'biagio-'));
  mkdirSync(join(root, 'pages', 'blog'), { recursive: true });
  writeFileSync(join(root, 'pages', 'about.page.biagio'), '<page title="x"/><component id="a"><template></template></component>');
  writeFileSync(join(root, 'pages', 'blog', '[slug].page.js'), 'export default () => ({});');
  const dist = join(root, 'dist');
  mkdirSync(dist, { recursive: true });

  const html = '<a href="/about/">ok</a> <a href="/blog/mio-post/">dyn</a> <a href="/nope/">rotto</a>';
  const issues = checkLinksAndAssets(root, [['/', html]], { dist }).filter(i => i.type === 'link');

  assert.equal(issues.length, 1, 'solo /nope/ deve essere segnalato');
  assert.equal(issues[0].ref, '/nope/');
  rmSync(root, { recursive: true });
});

test('link-checker: espande route con prefisso i18n', () => {
  const root = mkdtempSync(join(tmpdir(), 'biagio-'));
  mkdirSync(join(root, 'pages', 'docs'), { recursive: true });
  writeFileSync(join(root, 'pages', 'index.page.js'), 'export default () => ({});');
  writeFileSync(join(root, 'pages', 'docs', 'index.page.js'), 'export default () => ({});');
  const dist = join(root, 'dist');
  mkdirSync(dist, { recursive: true });

  const html = '<a href="/it/">home it</a> <a href="/it/docs/">docs it</a> <a href="/docs/">docs en</a>';
  const issues = checkLinksAndAssets(root, [['/docs/', html]], {
    dist,
    locales: ['en', 'it'],
    defaultLocale: 'en',
  }).filter(i => i.type === 'link');

  assert.equal(issues.length, 0);
  rmSync(root, { recursive: true });
});

test('renderRequest: hooks.head da biagio.config.js in dev/SSR', async () => {
  const root = mkdtempSync(join(tmpdir(), 'biagio-'));
  mkdirSync(join(root, 'pages'), { recursive: true });
  writeFileSync(join(root, 'biagio.config.js'), `export default {
  site: { name: 't', baseUrl: 'https://t.com' },
  hooks: {
    head() { return '<link rel="stylesheet" href="/theme.css">'; },
  },
};`);
  writeFileSync(join(root, 'pages', 'index.page.biagio'), `<page title="Home" />
<component id="main" seo="1" conversion="0.5">
  <template><main>ok</main></template>
</component>`);
  const html = await renderRequest(root, '/', { dev: true });
  assert.match(html, /href="\/theme\.css"/);
  rmSync(root, { recursive: true });
});
