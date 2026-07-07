/** Test immagini remote pre-build */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isDomainAllowed,
  validateRemoteUrl,
  fetchRemoteImages,
  normalizeRemoteSource,
} from '../src/core/remote-images.js';
import { mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

test('isDomainAllowed: dominio esatto e sottodomini', () => {
  assert.equal(isDomainAllowed('cdn.example.com', ['cdn.example.com']), true);
  assert.equal(isDomainAllowed('abc.supabase.co', ['supabase.co']), true);
  assert.equal(isDomainAllowed('evil.com', ['supabase.co']), false);
  assert.equal(isDomainAllowed('notsupabase.co', ['supabase.co']), false);
});

test('validateRemoteUrl: rifiuta dominio non in allowlist', () => {
  assert.throws(
    () => validateRemoteUrl('https://evil.com/x.jpg', { allowedDomains: ['supabase.co'] }),
    /Dominio non consentito/,
  );
});

test('validateRemoteUrl: rifiuta HTTP esterno', () => {
  assert.throws(
    () => validateRemoteUrl('http://cdn.example.com/x.jpg', { allowedDomains: ['example.com'] }),
    /Solo HTTPS/,
  );
});

test('validateRemoteUrl: sources senza allowedDomains', () => {
  assert.throws(
    () => validateRemoteUrl('https://cdn.example.com/x.jpg', { allowedDomains: [] }),
    /allowedDomains è vuoto/,
  );
});

test('normalizeRemoteSource accetta stringa e oggetto', () => {
  assert.deepEqual(normalizeRemoteSource('https://a.com/x.jpg'), { url: 'https://a.com/x.jpg', slug: null });
  assert.deepEqual(normalizeRemoteSource({ url: 'https://a.com/x.jpg', slug: 'hero' }), { url: 'https://a.com/x.jpg', slug: 'hero' });
});

test('fetchRemoteImages scarica in images/ con mock fetch', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cvw-remote-'));
  const mockFetch = async (url) => ({
    ok: true,
    status: 200,
    headers: { get: () => 'image/png' },
    arrayBuffer: async () => PNG.buffer.slice(PNG.byteOffset, PNG.byteOffset + PNG.byteLength),
  });

  const r = await fetchRemoteImages(
    [{ url: 'https://abc.supabase.co/storage/hero.png', slug: 'hero' }],
    dir,
    { allowedDomains: ['supabase.co'], fetchImpl: mockFetch },
  );

  assert.equal(r.downloaded, 1);
  assert.ok(existsSync(join(dir, 'hero.png')));
  assert.equal(readFileSync(join(dir, 'hero.png')).length, PNG.length);
  rmSync(dir, { recursive: true });
});

test('fetchRemoteImages fallisce su status non-OK', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cvw-remote-'));
  const mockFetch = async () => ({ ok: false, status: 404, headers: { get: () => '' }, arrayBuffer: async () => new ArrayBuffer(0) });
  await assert.rejects(
    () => fetchRemoteImages(['https://abc.supabase.co/missing.jpg'], dir, {
      allowedDomains: ['supabase.co'],
      fetchImpl: mockFetch,
    }),
    /404/,
  );
  rmSync(dir, { recursive: true });
});
