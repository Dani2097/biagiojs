/** biagiojs — favicon generator (ICO encoder, generazione, parse). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  encodeIco, generateFavicons, parseFavicon, faviconDescriptor, DEFAULT_FAVICON_TARGETS,
} from '../src/core/favicon.js';
import { faviconTags } from '../src/core/seo.js';

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#f45"/><circle cx="32" cy="32" r="18" fill="#fff"/></svg>';
const isPng = b => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;

// ---------- ICO encoder ----------
test('encodeIco: header ICONDIR valido e offset coerenti', () => {
  const imgs = [{ size: 16, buffer: Buffer.from([1, 2, 3]) }, { size: 32, buffer: Buffer.from([4, 5]) }];
  const ico = encodeIco(imgs);
  assert.equal(ico.readUInt16LE(0), 0);   // reserved
  assert.equal(ico.readUInt16LE(2), 1);   // type icon
  assert.equal(ico.readUInt16LE(4), 2);   // count
  // prima entry: width 16, offset dopo header+entries
  assert.equal(ico.readUInt8(6), 16);
  assert.equal(ico.readUInt32LE(6 + 8), 3);            // bytesInRes
  assert.equal(ico.readUInt32LE(6 + 12), 6 + 32);      // offset primo payload
  assert.equal(ico.readUInt32LE(6 + 16 + 12), 6 + 32 + 3); // offset secondo payload
});

// ---------- generazione ----------
test('generateFavicons: da SVG genera il set essenziale', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'fav-'));
  const src = join(dir, 'logo.svg');
  writeFileSync(src, SVG);
  const out = join(dir, 'dist');
  const r = await generateFavicons({ source: src, outDir: out, name: 'Demo', themeColor: '#ff4455' });
  for (const f of ['favicon.ico', 'icon.svg', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'manifest.webmanifest']) {
    assert.ok(existsSync(join(out, f)), `manca ${f}`);
  }
  // ico inizia con header ICONDIR
  const ico = readFileSync(join(out, 'favicon.ico'));
  assert.equal(ico.readUInt16LE(2), 1);
  assert.ok(isPng(readFileSync(join(out, 'icon-512.png'))));
  const man = JSON.parse(readFileSync(join(out, 'manifest.webmanifest'), 'utf8'));
  assert.equal(man.name, 'Demo');
  assert.deepEqual(man.icons.map(i => i.sizes), ['192x192', '512x512']);
  assert.equal(man.theme_color, '#ff4455');
  rmSync(dir, { recursive: true });
});

test('generateFavicons: idempotente (skip se output aggiornati)', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'fav2-'));
  const src = join(dir, 'logo.svg');
  writeFileSync(src, SVG);
  const out = join(dir, 'dist');
  await generateFavicons({ source: src, outDir: out });
  const again = await generateFavicons({ source: src, outDir: out });
  assert.equal(again.skipped, true);
  assert.equal(again.written.length, 0);
  rmSync(dir, { recursive: true });
});

test('generateFavicons: target sottoinsieme (solo ico)', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'fav3-'));
  const src = join(dir, 'logo.svg');
  writeFileSync(src, SVG);
  const out = join(dir, 'dist');
  const r = await generateFavicons({ source: src, outDir: out, targets: ['ico'] });
  assert.ok(existsSync(join(out, 'favicon.ico')));
  assert.ok(!existsSync(join(out, 'manifest.webmanifest')));
  assert.ok(!existsSync(join(out, 'icon.svg')));
  assert.equal(r.favicon.manifest, undefined);
  assert.equal(r.favicon.ico, '/favicon.ico');
  rmSync(dir, { recursive: true });
});

test('generateFavicons: sorgente mancante → throw in strict', async () => {
  await assert.rejects(
    () => generateFavicons({ source: '/nope/none.svg', outDir: '/tmp/x', strict: true }),
    /sorgente mancante/,
  );
});

// ---------- parse / descriptor / tags ----------
test('parseFavicon: stringa e oggetto manuale invariati; generate risolto', () => {
  assert.equal(parseFavicon('/favicon.ico'), '/favicon.ico');
  const manual = { svg: '/a.svg', apple: '/a.png' };
  assert.deepEqual(parseFavicon(manual), manual);
  const gen = parseFavicon({ source: 'images/logo.svg', generate: true }, { name: 'Site' });
  assert.equal(gen.generate, true);
  assert.equal(gen.name, 'Site');
  assert.deepEqual(gen.targets, DEFAULT_FAVICON_TARGETS);
  assert.equal(gen.svg, '/icon.svg');
  assert.equal(gen.manifest, '/manifest.webmanifest');
});

test('faviconDescriptor: no svg se il sorgente non è SVG', () => {
  const d = faviconDescriptor({ source: 'logo.png' });
  assert.equal(d.svg, undefined);
  assert.equal(d.ico, '/favicon.ico');
});

test('faviconTags: emette il link al manifest', () => {
  const tags = faviconTags({ svg: '/icon.svg', ico: '/favicon.ico', apple: '/apple-touch-icon.png', manifest: '/manifest.webmanifest', themeColor: '#fff' }).join('\n');
  assert.match(tags, /rel="manifest" href="\/manifest.webmanifest"/);
  assert.match(tags, /rel="apple-touch-icon"/);
  assert.match(tags, /name="theme-color"/);
});
