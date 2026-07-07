/**
 * biagiojs §9 — Smart Image Engine.
 */
import { resolveImageOptions, IMAGE_PROFILES, slugFromSrc, widthsForSlug, mergeProfiles } from './image-profiles.js';
import { pickFallbackWidth } from './image-slug-config.js';
export { imgSlug } from './image-pipeline.js';
export { IMAGE_PROFILES, resolveImageOptions, slugFromSrc, widthsForSlug, mergeProfiles, pickFallbackWidth };

export function imagePriority(node, { aboveFold = false } = {}) {
  return node.businessValue * (aboveFold ? 1 : 0.3);
}

export function smartImage(node, {
  src, alt, width, height, aboveFold = false,
  profile,
  widths,
  sizes,
  images,
  jpegXl = false,
} = {}) {
  const resolved = resolveImageOptions({ src, profile, widths, sizes, images });
  const { widths: w, sizes: sz, fallbackWidth: fb } = resolved;

  const p = imagePriority(node, { aboveFold });
  const eager = p >= 0.4;
  src = encodeURI(src);
  const set = ext => w.map(b => `${src}-${b}w.${ext} ${b}w`).join(', ');

  const sources = [
    `<source type="image/avif" srcset="${set('avif')}" sizes="${sz}">`,
    `<source type="image/webp" srcset="${set('webp')}" sizes="${sz}">`,
    ...(jpegXl ? [`<source type="image/jxl" srcset="${set('jxl')}" sizes="${sz}">`] : []),
  ].join('\n    ');

  const img = `<img src="${src}-${fb}w.webp" srcset="${set('webp')}" sizes="${sz}"
      alt="${alt}" width="${width}" height="${height}"
      loading="${eager ? 'eager' : 'lazy'}"
      fetchpriority="${eager ? 'high' : 'auto'}"
      decoding="${eager ? 'sync' : 'async'}"
      style="max-width:100%;height:auto">`;

  return { html: `<picture>\n    ${sources}\n    ${img}\n  </picture>`, priority: p, eager };
}

export function imagePreload({
  src,
  profile,
  widths,
  sizes,
  images,
} = {}) {
  const { widths: w, sizes: sz } = resolveImageOptions({ src, profile, widths, sizes, images });
  const set = ext => w.map(b => `${src}-${b}w.${ext} ${b}w`).join(', ');
  return `<link rel="preload" as="image" type="image/avif" imagesrcset="${set('avif')}" imagesizes="${sz}" fetchpriority="high">`;
}
