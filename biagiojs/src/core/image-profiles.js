/**
 * biagiojs — profili immagine e risoluzione larghezze per componente/slug.
 */
import { DEFAULT_IMAGE_WIDTHS } from './config.js';
import { slugConfigFor, pickFallbackWidth } from './image-slug-config.js';

export const IMAGE_PROFILES = {
  content: {
    widths: [480, 960, 1440],
    sizes: '(max-width: 920px) 100vw, 920px',
  },
  hero: {
    widths: [480, 960, 1440, 1920],
    sizes: '100vw',
    quality: 50,
  },
  thumb: {
    widths: [480, 640],
    sizes: '(max-width: 200px) 120px, 200px',
    quality: 65,
  },
  full: {
    widths: [640, 1024, 1536, 1920],
    sizes: '100vw',
  },
  experience: {
    widths: [400, 600, 800],
    sizes: '(max-width: 600px) 100vw, 600px',
    quality: 44,
    crop: { aspectRatio: '4/3', fit: 'cover' },
  },
};

export function slugFromSrc(src) {
  const clean = String(src || '').split('?')[0];
  const m = clean.match(/\/img\/([\w-]+?)(?:-\d+w)?(?:\.[a-z]+)?$/i);
  return m ? m[1] : null;
}

export function mergeProfiles(configProfiles = {}) {
  const merged = { ...IMAGE_PROFILES };
  for (const [key, val] of Object.entries(configProfiles)) {
    merged[key] = { ...merged[key], ...val };
  }
  return merged;
}

export function widthsForSlug(slug, images = {}) {
  return [...slugConfigFor(slug, images).widths].sort((a, b) => a - b);
}

export function resolveImageOptions({
  src,
  profile,
  widths,
  sizes,
  images = {},
} = {}) {
  const profiles = mergeProfiles(images.profiles);
  const slug = slugFromSrc(src);
  const fallback = profiles.content;

  if (widths?.length) {
    return {
      widths: [...widths].sort((a, b) => a - b),
      sizes: sizes ?? fallback.sizes,
      fallbackWidth: pickFallbackWidth(widths),
      profile: profile || null,
      slug,
    };
  }

  if (profile) {
    const p = profiles[profile];
    if (!p) throw new Error(`[biagio] profile immagine sconosciuto: "${profile}". Usa: ${Object.keys(profiles).join(', ')}`);
    const w = [...p.widths].sort((a, b) => a - b);
    return {
      widths: w,
      sizes: sizes ?? p.sizes,
      fallbackWidth: pickFallbackWidth(w),
      profile,
      slug,
      profileDef: p,
    };
  }

  if (slug && images.bySlug?.[slug] != null) {
    const w = widthsForSlug(slug, images);
    return {
      widths: w,
      sizes: sizes ?? fallback.sizes,
      fallbackWidth: pickFallbackWidth(w),
      slug,
    };
  }

  const w = widthsForSlug(null, images);
  return {
    widths: w,
    sizes: sizes ?? fallback.sizes,
    fallbackWidth: pickFallbackWidth(w),
    slug,
  };
}
