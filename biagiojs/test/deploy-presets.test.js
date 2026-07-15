import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { generateDeployPreset, parseDeploy } from '../src/core/deploy-presets.js';

test('parseDeploy: stringa e oggetto', () => {
  assert.equal(parseDeploy({ deploy: 'cloudflare' }), 'cloudflare');
  assert.equal(parseDeploy({ deploy: { platform: 'vercel' } }), 'vercel');
  assert.equal(parseDeploy({}), null);
});

test('generateDeployPreset: cloudflare crea wrangler e function', () => {
  const dir = mkdtempSync(join(tmpdir(), 'biagio-deploy-'));
  const created = generateDeployPreset(dir, 'cloudflare');
  assert.ok(created.includes('wrangler.toml'));
  assert.ok(created.includes('functions/[[path]].js'));
  assert.match(readFileSync(join(dir, 'functions', '[[path]].js'), 'utf8'), /biagiojs\/adapters\/cloudflare/);
});

test('generateDeployPreset: vercel crea vercel.json e api/ssr', () => {
  const dir = mkdtempSync(join(tmpdir(), 'biagio-deploy-'));
  const created = generateDeployPreset(dir, 'vercel');
  assert.ok(created.includes('vercel.json'));
  assert.ok(created.includes('api/ssr.js'));
  const vercel = JSON.parse(readFileSync(join(dir, 'vercel.json'), 'utf8'));
  assert.equal(vercel.trailingSlash, true);
  assert.equal(vercel.rewrites[0].destination, '/api/ssr?__path=');
  assert.equal(vercel.functions['api/ssr.js'].includeFiles, 'api/_runtime/**');
  assert.match(readFileSync(join(dir, 'api', 'ssr.js'), 'utf8'), /biagiojs\/adapters\/vercel/);
});

test('generateDeployPreset: non sovrascrive file esistenti', () => {
  const dir = mkdtempSync(join(tmpdir(), 'biagio-deploy-'));
  writeFileSync(join(dir, 'vercel.json'), '{}');
  const created = generateDeployPreset(dir, 'vercel');
  assert.equal(created.includes('vercel.json'), false);
  assert.ok(existsSync(join(dir, 'api', 'ssr.js')));
});
