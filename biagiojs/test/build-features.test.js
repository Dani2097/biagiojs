/** Test cache headers e config avanzata */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateHeaders } from '../src/core/cache-headers.js';
import { robots } from '../src/core/seo.js';
import { filterWidthsBySource, qualityForSlug } from '../src/core/image-slug-config.js';
import { planImages } from '../src/core/image-pipeline.js';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

test('generateHeaders usa ! Cache-Control su asset statici', () => {
  const h = generateHeaders();
  assert.match(h, /\/img\/\*\n\s+! Cache-Control:/);
  assert.match(h, /\/fonts\/\*\n\s+! Cache-Control:/);
});

test('robots rispetta site.sitemap custom', () => {
  const txt = robots({ baseUrl: 'https://example.com', sitemap: 'sitemap-index.xml' });
  assert.match(txt, /sitemap-index\.xml/);
});

test('filterWidthsBySource esclude bucket oltre sorgente', () => {
  assert.deepEqual(filterWidthsBySource([400, 600, 800], 275, { respectSourceMax: true }), [400]);
  assert.deepEqual(filterWidthsBySource([400, 600], 500, { respectSourceMax: true }), [400]);
});

test('qualityForSlug legge qualityBySlug', () => {
  assert.equal(qualityForSlug('hero', { quality: 75, qualityBySlug: { hero: 50 } }), 50);
});

test('planImages dryRun elenca varianti', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cvw-plan-'));
  mkdirSync(join(dir, 'images'));
  writeFileSync(join(dir, 'images', 'x.png'), 'not-a-png');
  const r = planImages(join(dir, 'images'), {
    widths: [480, 960],
    bySlug: { x: [480] },
    quality: 70,
  });
  assert.ok(r.plan.some(p => p.slug === 'x' && p.width === 480));
  rmSync(dir, { recursive: true });
});
