/** Test Google Fonts self-hosted */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGoogleFontsUrl,
  parseFontFaces,
  fetchGoogleFonts,
  fontHead,
  fontSlug,
  resolvePreloadFiles,
} from '../src/core/fonts.js';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

test('buildGoogleFontsUrl genera URL css2 corretto', () => {
  const url = buildGoogleFontsUrl({ family: 'Inter', weights: [400, 700], display: 'swap' });
  assert.match(url, /fonts\.googleapis\.com\/css2\?family=Inter:wght@400;700/);
});

test('parseFontFaces estrae family, weight e url', () => {
  const css = `@font-face{font-family:'Inter';font-weight:400;font-style:normal;src:url(https://fonts.gstatic.com/s/inter/v1/x.woff2) format('woff2');}`;
  const faces = parseFontFaces(css);
  assert.equal(faces.length, 1);
  assert.equal(faces[0].family, 'Inter');
  assert.equal(faces[0].weight, '400');
  assert.match(faces[0].url, /fonts\.gstatic\.com/);
});

test('fontHead con inject stylesheet aggiunge preload e link', () => {
  const html = fontHead({
    fonts: {
      inject: 'stylesheet',
      cssPath: '/fonts/google.css',
      preloadFiles: ['/fonts/inter-400-normal.woff2'],
    },
  });
  assert.match(html, /rel="preload".*inter-400-normal\.woff2/);
  assert.match(html, /rel="stylesheet".*google\.css/);
});

test('fontHead inject inline embedda CSS senza link bloccante', () => {
  const html = fontHead({
    fonts: {
      inject: 'inline',
      inlineCss: '@font-face{font-family:Inter;src:url(/fonts/inter.woff2)}',
      preload: false,
    },
  });
  assert.match(html, /<style>@font-face/);
  assert.doesNotMatch(html, /rel="stylesheet"/);
});

test('resolvePreloadFiles critical preferisce display e body 400', () => {
  const files = [
    { path: '/fonts/inter-400-normal.woff2', family: 'Inter', weight: '400', style: 'normal', role: 'body' },
    { path: '/fonts/inter-700-normal.woff2', family: 'Inter', weight: '700', style: 'normal', role: 'body' },
    { path: '/fonts/play-400-normal.woff2', family: 'Playfair', weight: '400', style: 'normal', role: 'display' },
  ];
  const pre = resolvePreloadFiles(files, { preload: 'critical' });
  assert.ok(pre.includes('/fonts/play-400-normal.woff2'));
  assert.ok(pre.includes('/fonts/inter-400-normal.woff2'));
  assert.equal(pre.length, 2);
});

test('fetchGoogleFonts scarica woff2 e riscrive CSS', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cvw-fonts-'));
  const sampleCss = `@font-face{font-family:'Inter';font-style:normal;font-weight:400;font-display:swap;src:url(https://fonts.gstatic.com/s/inter/v1/a.woff2) format('woff2');}`;
  const woff2 = Buffer.from([0x77, 0x4f, 0x46, 0x32]); // header fittizio

  const mockFetch = async (url) => {
    if (url.includes('googleapis.com')) {
      return { ok: true, status: 200, text: async () => sampleCss };
    }
    if (url.includes('gstatic.com')) {
      return { ok: true, status: 200, arrayBuffer: async () => woff2.buffer.slice(woff2.byteOffset, woff2.byteOffset + woff2.byteLength) };
    }
    throw new Error('unexpected ' + url);
  };

  const r = await fetchGoogleFonts(
    [{ family: 'Inter', weights: [400] }],
    dir,
    { fetchImpl: mockFetch },
  );

  assert.equal(r.files.length, 1);
  assert.ok(existsSync(join(dir, 'inter-400-normal.woff2')));
  const outCss = readFileSync(join(dir, 'google.css'), 'utf8');
  assert.match(outCss, /url\(\/fonts\/inter-400-normal\.woff2\)/);
  assert.doesNotMatch(outCss, /fonts\.gstatic\.com/);
  rmSync(dir, { recursive: true });
});

test('fontSlug normalizza il nome famiglia', () => {
  assert.equal(fontSlug('DM Sans'), 'dm-sans');
});
