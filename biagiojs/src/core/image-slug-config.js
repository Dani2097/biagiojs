/**
 * biagiojs — normalizza bySlug (array o oggetto con widths/quality/crop).
 */
import { DEFAULT_IMAGE_WIDTHS } from './config.js';

export function normalizeSlugEntry(entry, fallbackWidths = DEFAULT_IMAGE_WIDTHS) {
  if (Array.isArray(entry)) return { widths: entry };
  if (entry && typeof entry === 'object') {
    return {
      widths: entry.widths || fallbackWidths,
      quality: entry.quality,
      crop: entry.crop,
      avif: entry.avif,
    };
  }
  return { widths: fallbackWidths };
}

export function slugConfigFor(slug, images = {}) {
  const fallback = images.widths || DEFAULT_IMAGE_WIDTHS;
  if (slug && images.bySlug?.[slug] != null) {
    return normalizeSlugEntry(images.bySlug[slug], fallback);
  }
  return { widths: fallback };
}

export function qualityForSlug(slug, images = {}) {
  if (slug && images.qualityBySlug?.[slug] != null) return images.qualityBySlug[slug];
  const cfg = slugConfigFor(slug, images);
  if (cfg.quality != null) return cfg.quality;
  return images.quality ?? 75;
}

export function cropForSlug(slug, images = {}, profileCrop) {
  const cfg = slugConfigFor(slug, images);
  return cfg.crop || profileCrop || null;
}

export function avifOptsForSlug(slug, images = {}, profileAvif) {
  return { ...images.avif, ...profileAvif, ...slugConfigFor(slug, images).avif };
}

/** Filtra bucket oltre la larghezza sorgente; se tutti troppo grandi, usa il minimo. */
export function filterWidthsBySource(widths, metaWidth, { respectSourceMax = true } = {}) {
  const sorted = [...widths].sort((a, b) => a - b);
  if (!respectSourceMax || !metaWidth) return sorted;
  const filtered = sorted.filter(w => w <= metaWidth);
  return filtered.length ? filtered : [sorted[0]];
}

export function parseAspectRatio(ar) {
  if (typeof ar === 'number') return ar;
  const parts = String(ar).split('/').map(Number);
  if (parts.length === 2 && parts[0] && parts[1]) return parts[0] / parts[1];
  throw new Error(`[biagio] aspectRatio non valido: ${ar}`);
}

/** Bucket minimo sensato per fallback <img> (evita scaricare il max JPEG). */
export function pickFallbackWidth(widths) {
  const w = [...widths].sort((a, b) => a - b);
  if (w.length <= 2) return w[0];
  return w[Math.ceil(w.length / 2) - 1] ?? w[0];
}
