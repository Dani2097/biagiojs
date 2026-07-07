/** Test caricamento .env */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadEnv, requireEnv } from '../src/core/env.js';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

test('loadEnv carica PUBLIC_* e alias VITE_PUBLIC_*', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cvw-env-'));
  writeFileSync(join(dir, '.env'), 'VITE_PUBLIC_API_URL=https://api.test\n');
  const prev = process.env.PUBLIC_API_URL;
  delete process.env.PUBLIC_API_URL;
  await loadEnv(dir, 'production');
  assert.equal(process.env.PUBLIC_API_URL, 'https://api.test');
  if (prev !== undefined) process.env.PUBLIC_API_URL = prev;
  else delete process.env.PUBLIC_API_URL;
  rmSync(dir, { recursive: true });
});

test('requireEnv lancia errore esplicito se manca', () => {
  const key = 'CVW_TEST_MISSING_' + Date.now();
  delete process.env[key];
  assert.throws(() => requireEnv(key), /Variabile d'ambiente mancante/);
});
