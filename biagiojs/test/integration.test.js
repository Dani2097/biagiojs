/** Smoke test integrazione v0.7 — produzione hardening */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { optimizeHtml } from '../src/core/minify.js';
import { processImages } from '../src/core/image-pipeline.js';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

test('integrazione: sorgente 1px genera tutti i bucket width', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cvw-int-'));
  const src = join(dir, 'images');
  const out = join(dir, 'out');
  mkdirSync(src);
  writeFileSync(join(src, 'tiny.png'), TINY_PNG);
  const r = await processImages(src, out, { widths: [480, 960], strict: true, respectSourceMax: false });
  assert.ok(r.processed >= 6);
  for (const w of [480, 960]) {
    for (const ext of ['avif', 'webp', 'jpg']) {
      assert.ok(existsSync(join(out, `tiny-${w}w.${ext}`)), `manca tiny-${w}w.${ext}`);
    }
  }
  rmSync(dir, { recursive: true });
});

test('integrazione: strict fallisce senza sharp se images/ non vuota', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cvw-int2-'));
  mkdirSync(join(dir, 'images'));
  writeFileSync(join(dir, 'images', 'x.png'), TINY_PNG);
  let sharpAvailable = true;
  try { await import('sharp'); } catch { sharpAvailable = false; }
  if (sharpAvailable) return; // skip se sharp installato
  await assert.rejects(
    () => processImages(join(dir, 'images'), join(dir, 'out'), { strict: true }),
    /sharp/,
  );
  rmSync(dir, { recursive: true });
});

test('integrazione: optimizeHtml template + purge visibile insieme', async () => {
  const { html } = await optimizeHtml(
    '<template><style>.widget{color:red}</style></template><style>.page{color:blue}</style><div class="page"></div>',
  );
  assert.match(html, /\.widget\{color:red\}/);
  assert.match(html, /\.page\{color:(blue|#00f)\}/);
});
