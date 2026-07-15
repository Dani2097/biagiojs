import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { stageVercelRuntime } from '../src/core/stage-vercel-runtime.js';

test('stageVercelRuntime: copia pages in api/_runtime', () => {
  const dir = mkdtempSync(join(tmpdir(), 'biagio-stage-'));
  mkdirSync(join(dir, 'pages'), { recursive: true });
  writeFileSync(join(dir, 'pages', 'index.page.js'), 'export default () => ({})');
  writeFileSync(join(dir, 'biagio.config.js'), 'export default {}');

  const dest = stageVercelRuntime(dir);
  assert.equal(dest, join(dir, 'api', '_runtime'));
  assert.ok(existsSync(join(dest, 'pages', 'index.page.js')));
  assert.ok(existsSync(join(dest, 'biagio.config.js')));
});

test('stageVercelRuntime: fallisce senza pages/', () => {
  const dir = mkdtempSync(join(tmpdir(), 'biagio-stage-'));
  assert.throws(() => stageVercelRuntime(dir), /pages/);
});
