/** Test pipeline immagini, profili e slug */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { imgSlug, processImages } from '../src/core/image-pipeline.js';
import { collectImageRefs, validateImageRefs } from '../src/core/validate-images.js';
import { smartImage, resolveImageOptions, slugFromSrc, widthsForSlug } from '../src/core/images.js';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

test('imgSlug normalizza maiuscole e caratteri speciali', () => {
  assert.equal(imgSlug('imgFood.png'), 'imgfood');
  assert.equal(imgSlug('Foto Prodotto (1).jpg'), 'foto-prodotto-1');
});

test('slugFromSrc estrae slug da path immagine', () => {
  assert.equal(slugFromSrc('/img/hero'), 'hero');
  assert.equal(slugFromSrc('/img/hero-960w.jpg'), 'hero');
  assert.equal(slugFromSrc('/img/foto-prodotto-1-480w.avif'), 'foto-prodotto-1');
});

test('resolveImageOptions: profile hero', () => {
  const r = resolveImageOptions({ src: '/img/x', profile: 'hero' });
  assert.deepEqual(r.widths, [480, 960, 1440, 1920]);
  assert.equal(r.sizes, '100vw');
});

test('resolveImageOptions: bySlug ha priorità su widths globali', () => {
  const images = { widths: [480, 960], bySlug: { hero: [480, 1920] } };
  const r = resolveImageOptions({ src: '/img/hero', images });
  assert.deepEqual(r.widths, [480, 1920]);
});

test('resolveImageOptions: widths espliciti vincono su tutto', () => {
  const r = resolveImageOptions({
    src: '/img/hero',
    profile: 'hero',
    widths: [320, 640],
    images: { bySlug: { hero: [480, 1920] } },
  });
  assert.deepEqual(r.widths, [320, 640]);
});

test('smartImage con profile genera srcset hero e fallback webp medio', () => {
  const node = { businessValue: 0.9 };
  const { html } = smartImage(node, {
    src: '/img/hero',
    alt: 'Hero',
    width: 1920,
    height: 1080,
    profile: 'hero',
    aboveFold: true,
  });
  assert.match(html, /hero-1920w\.avif 1920w/);
  assert.match(html, /src="\/img\/hero-960w\.webp"/);
  assert.match(html, /sizes="100vw"/);
  assert.match(html, /fetchpriority="high"/);
});

test('widthsForSlug usa bySlug o fallback', () => {
  const images = { widths: [480, 960], bySlug: { thumb: [480, 640] } };
  assert.deepEqual(widthsForSlug('thumb', images), [480, 640]);
  assert.deepEqual(widthsForSlug('other', images), [480, 960]);
});

test('processImages rispetta bySlug per file', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cvw-byslug-'));
  const src = join(dir, 'images');
  const out = join(dir, 'out');
  mkdirSync(src);
  writeFileSync(join(src, 'hero.png'), TINY_PNG);
  writeFileSync(join(src, 'thumb.png'), TINY_PNG);
  const r = await processImages(src, out, {
    widths: [480, 960],
    bySlug: { hero: [480, 1920], thumb: [480, 640] },
    strict: true,
    respectSourceMax: false,
  });
  assert.ok(r.processed >= 12);
  assert.ok(existsSync(join(out, 'hero-1920w.avif')));
  assert.ok(!existsSync(join(out, 'hero-960w.avif')));
  assert.ok(existsSync(join(out, 'thumb-640w.webp')));
  assert.ok(!existsSync(join(out, 'thumb-960w.webp')));
  rmSync(dir, { recursive: true });
});

test('collectImageRefs estrae riferimenti da srcset', () => {
  const html = '<img srcset="/img/hero-480w.avif 480w, /img/hero-960w.webp 960w">';
  const refs = collectImageRefs(html);
  assert.ok(refs.includes('hero-480w.avif'));
  assert.ok(refs.includes('hero-960w.webp'));
});

test('validateImageRefs segnala file mancanti', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cvw-img-'));
  mkdirSync(join(dir, 'img'), { recursive: true });
  writeFileSync(join(dir, 'img', 'ok-480w.jpg'), 'x');
  const { missing } = validateImageRefs([['/test', '<img src="/img/missing-480w.jpg">']], join(dir, 'img'));
  assert.equal(missing.length, 1);
  assert.equal(missing[0].ref, 'missing-480w.jpg');
  rmSync(dir, { recursive: true });
});
