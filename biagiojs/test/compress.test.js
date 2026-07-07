import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { negotiateEncoding, maybeCompress } from '../src/core/compress.js';

test('negotiateEncoding: preferisce br', () => {
  assert.equal(negotiateEncoding('gzip, deflate, br'), 'br');
  assert.equal(negotiateEncoding('gzip'), 'gzip');
  assert.equal(negotiateEncoding(''), null);
});

test('maybeCompress: comprime HTML grandi', () => {
  const body = Buffer.from('x'.repeat(2000));
  const req = { headers: { 'accept-encoding': 'gzip' } };
  const res = {};
  const { body: out, encoding } = maybeCompress(res, body, req, 'text/html');
  assert.equal(encoding, 'gzip');
  assert.ok(out.length < body.length);
});

test('maybeCompress: salta payload piccoli', () => {
  const body = Buffer.from('ok');
  const req = { headers: { 'accept-encoding': 'gzip' } };
  const { encoding } = maybeCompress({}, body, req, 'text/html');
  assert.equal(encoding, null);
});
