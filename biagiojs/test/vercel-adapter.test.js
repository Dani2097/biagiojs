import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveRequestUrl, stagedProjectDir, createVercelHandler } from '../src/adapters/vercel.js';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';

function req(url, headers = {}) {
  return { url, headers };
}

test('resolveRequestUrl: home da rewrite Vercel', () => {
  assert.equal(resolveRequestUrl(req('/api/ssr?__path=')), '/');
  assert.equal(resolveRequestUrl(req('/api/ssr')), '/');
});

test('resolveRequestUrl: path catturato da __path', () => {
  assert.equal(resolveRequestUrl(req('/api/ssr?__path=products/foo')), '/products/foo/');
  assert.equal(resolveRequestUrl(req('/api/ssr?__path=products/foo/')), '/products/foo/');
});

test('resolveRequestUrl: header x-biagio-path ha priorità', () => {
  assert.equal(resolveRequestUrl(req('/api/ssr?__path=ignored', { 'x-biagio-path': '/cart/' })), '/cart/');
});

test('resolveRequestUrl: pathname diretto', () => {
  assert.equal(resolveRequestUrl(req('/collections/anime')), '/collections/anime/');
});

test('stagedProjectDir: preferisce api/_runtime se presente', () => {
  const demo = join(process.cwd(), 'demo');
  const api = join(demo, 'api', 'ssr.js');
  if (!existsSync(join(demo, 'api', '_runtime', 'pages'))) {
    // skip when demo has not been built with deploy vercel
    return;
  }
  const root = stagedProjectDir(pathToFileURL(api).href);
  assert.ok(root.includes('_runtime'));
});
