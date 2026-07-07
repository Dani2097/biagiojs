import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { analyzeDist, formatAnalyzeReport } from '../src/core/analyze.js';

test('analyzeDist: report pagine e JSON', () => {
  const dir = mkdtempSync(join(tmpdir(), 'biagio-an-'));
  const dist = join(dir, 'dist');
  mkdirSync(join(dist, 'about'), { recursive: true });
  const html = '<!doctype html><html><body><div data-cvw-id="cta"></div><script>__CVW_PLAN__={"e":["cta"],"l":[]}</script></body></html>';
  writeFileSync(join(dist, 'index.html'), html);
  writeFileSync(join(dist, 'about', 'index.html'), html);

  const r = analyzeDist(dir);
  assert.equal(r.totals.pages, 2);
  assert.ok(r.pages.every(p => p.htmlKb > 0));
  assert.ok(existsSync(join(dist, '.biagio-analyze.json')));
  assert.match(formatAnalyzeReport(r), /biagio analyze/);
});

test('analyzeDist: senza dist → errore', () => {
  const dir = mkdtempSync(join(tmpdir(), 'biagio-an-'));
  assert.throws(() => analyzeDist(dir), /dist\/ non trovato/);
});
