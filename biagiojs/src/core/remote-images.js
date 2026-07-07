/**
 * biagiojs — scaricamento immagini remote pre-build con allowlist domini.
 *
 * Config (biagio.config.js):
 *   site.images.remote = {
 *     allowedDomains: ['supabase.co', 'cdn.example.com'],
 *     allowLocalhost: false,
 *     sources: [
 *       { url: 'https://xxx.supabase.co/.../hero.jpg', slug: 'hero' },
 *       'https://cdn.example.com/photo.png',
 *     ],
 *   }
 */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, parse, extname } from 'node:path';
import { imgSlug } from './image-pipeline.js';

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff', '.avif']);
const MIME_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/tiff': '.tif',
  'image/avif': '.avif',
};

/** Normalizza voce sorgente: stringa URL o { url, slug? }. */
export function normalizeRemoteSource(entry) {
  if (typeof entry === 'string') return { url: entry, slug: null };
  if (entry?.url) return { url: String(entry.url), slug: entry.slug || null };
  throw new Error('[biagio] site.images.remote.sources: ogni voce deve essere un URL o { url, slug? }');
}

/**
 * Verifica che hostname sia nella allowlist.
 * 'supabase.co' accetta anche sottodomini (*.supabase.co).
 * Supporta anche '*.example.com' in config.
 */
export function isDomainAllowed(hostname, allowedDomains) {
  const host = hostname.toLowerCase();
  for (const raw of allowedDomains) {
    const domain = String(raw).toLowerCase().replace(/^\*\./, '');
    if (!domain) continue;
    if (host === domain || host.endsWith('.' + domain)) return true;
  }
  return false;
}

/** Valida URL remoto prima del fetch. */
export function validateRemoteUrl(url, { allowedDomains, allowLocalhost = false } = {}) {
  let parsed;
  try { parsed = new URL(url); }
  catch { throw new Error(`[biagio] URL immagine remota non valido: ${url}`); }

  const isLocal = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  if (isLocal) {
    if (!allowLocalhost) throw new Error(`[biagio] localhost non consentito per immagini remote (site.images.remote.allowLocalhost)`);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error(`[biagio] Protocollo non consentito: ${parsed.protocol}`);
    return parsed;
  }

  if (parsed.protocol !== 'https:') {
    throw new Error(`[biagio] Solo HTTPS consentito per immagini remote: ${url}`);
  }
  if (!allowedDomains?.length) {
    throw new Error('[biagio] site.images.remote.sources definito ma allowedDomains è vuoto — aggiungi i domini consentiti in biagio.config.js');
  }
  if (!isDomainAllowed(parsed.hostname, allowedDomains)) {
    throw new Error(`[biagio] Dominio non consentito per immagini remote: ${parsed.hostname} (allowedDomains: ${allowedDomains.join(', ')})`);
  }
  return parsed;
}

function extFromUrl(url) {
  const ext = extname(parse(url.pathname).base).toLowerCase();
  return IMAGE_EXT.has(ext) ? ext : null;
}

function extFromContentType(type) {
  if (!type) return null;
  const base = type.split(';')[0].trim().toLowerCase();
  return MIME_EXT[base] || null;
}

function slugFromUrl(url, explicitSlug) {
  if (explicitSlug) return imgSlug(explicitSlug.includes('.') ? explicitSlug : `${explicitSlug}.jpg`);
  const base = parse(url.pathname).base || 'remote';
  const name = base.includes('.') ? base : `${base}.jpg`;
  return imgSlug(name);
}

/**
 * Scarica le sorgenti remote in images/ (pre-build, prima di processImages).
 * Ritorna { downloaded, skipped, files, log }.
 */
export async function fetchRemoteImages(sources, outDir, {
  allowedDomains = [],
  allowLocalhost = false,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!sources?.length) return { downloaded: 0, skipped: 0, files: [], log: [] };

  if (!fetchImpl) throw new Error('[biagio] fetch non disponibile per immagini remote (Node ≥ 18)');

  mkdirSync(outDir, { recursive: true });
  const log = [];
  const files = [];
  const usedSlugs = new Set();
  let downloaded = 0;
  let skipped = 0;

  for (const entry of sources) {
    const { url, slug: explicitSlug } = normalizeRemoteSource(entry);
    const parsed = validateRemoteUrl(url, { allowedDomains, allowLocalhost });

    let slug = slugFromUrl(parsed, explicitSlug);
    if (usedSlugs.has(slug)) {
      const hash = createHash('sha256').update(url).digest('hex').slice(0, 6);
      slug = `${slug}-${hash}`;
    }
    usedSlugs.add(slug);

    const res = await fetchImpl(url);
    if (!res.ok) throw new Error(`[biagio] Download immagine fallito (${res.status}): ${url}`);

    const contentType = res.headers.get('content-type');
    const ext = extFromUrl(parsed) || extFromContentType(contentType) || '.jpg';
    if (!IMAGE_EXT.has(ext)) {
      throw new Error(`[biagio] Tipo immagine non supportato da ${url} (${contentType || 'unknown'})`);
    }

    const filename = `${slug}${ext}`;
    const dest = join(outDir, filename);
    const buf = Buffer.from(await res.arrayBuffer());

    if (buf.length === 0) throw new Error(`[biagio] Immagine remota vuota: ${url}`);

    writeFileSync(dest, buf);
    files.push({ url, filename, slug, bytes: buf.length });
    downloaded++;
    log.push(`${parsed.hostname} → images/${filename} (${(buf.length / 1024).toFixed(1)} KB)`);
  }

  return { downloaded, skipped, files, log };
}
