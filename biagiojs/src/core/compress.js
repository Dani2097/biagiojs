/**
 * biagiojs — compressione gzip/brotli per adapter Node.
 */
import { gzipSync, brotliCompressSync, constants as zc } from 'node:zlib';

const COMPRESSIBLE = /^text\/|application\/(javascript|json|xml)|image\/svg\+xml/;

export function negotiateEncoding(accept = '') {
  if (/\bbr\b/i.test(accept)) return 'br';
  if (/\bgzip\b/i.test(accept)) return 'gzip';
  return null;
}

export function compressBody(body, encoding) {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(body);
  if (encoding === 'br') {
    return brotliCompressSync(buf, {
      params: { [zc.BROTLI_PARAM_QUALITY]: 4 },
    });
  }
  if (encoding === 'gzip') return gzipSync(buf, { level: 6 });
  return buf;
}

export function maybeCompress(res, body, req, contentType) {
  if (!COMPRESSIBLE.test(contentType || '')) return { body, encoding: null };
  const enc = negotiateEncoding(req.headers['accept-encoding'] || '');
  if (!enc || Buffer.byteLength(body) < 1024) return { body, encoding: null };
  const compressed = compressBody(body, enc);
  if (compressed.length >= Buffer.byteLength(body)) return { body, encoding: null };
  return { body: compressed, encoding: enc };
}
