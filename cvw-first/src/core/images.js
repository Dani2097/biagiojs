/**
 * CVW-First §9 — Smart Image Engine.
 * Each image gets a priority score from the owning node's business weights;
 * the engine derives format stack (AVIF → WebP → JPEG/XL), preload, responsive
 * sizes, lazy loading and decoding strategy. No manual tuning.
 */

/** score = businessValue of owner × viewport prominence (aboveFold=1, else 0.3) */
export function imagePriority(node, { aboveFold = false } = {}) {
  return node.businessValue * (aboveFold ? 1 : 0.3);
}

/**
 * Render a smart <picture>.
 * src: base path without extension (variants assumed: .avif .webp .jxl .jpg)
 * widths: available intrinsic widths for srcset.
 */
export function smartImage(node, {
  src, alt, width, height, aboveFold = false,
  widths = [480, 960, 1440], sizes = '(max-width: 920px) 100vw, 920px',
  jpegXl = false,
} = {}) {
  const p = imagePriority(node, { aboveFold });
  const eager = p >= 0.4;                    // LCP-candidate images
  src = encodeURI(src);                      // spazi/caratteri speciali → %20 (srcset-safe)
  const set = ext => widths.map(w => `${src}-${w}w.${ext} ${w}w`).join(', ');

  const sources = [
    `<source type="image/avif" srcset="${set('avif')}" sizes="${sizes}">`,
    `<source type="image/webp" srcset="${set('webp')}" sizes="${sizes}">`,
    ...(jpegXl ? [`<source type="image/jxl" srcset="${set('jxl')}" sizes="${sizes}">`] : []),
  ].join('\n    ');

  const img = `<img src="${src}-${widths[widths.length - 1]}w.jpg" srcset="${set('jpg')}" sizes="${sizes}"
      alt="${alt}" width="${width}" height="${height}"
      loading="${eager ? 'eager' : 'lazy'}"
      fetchpriority="${eager ? 'high' : 'auto'}"
      decoding="${eager ? 'sync' : 'async'}"
      style="max-width:100%;height:auto">`;

  return { html: `<picture>\n    ${sources}\n    ${img}\n  </picture>`, priority: p, eager };
}

/** Preload link for LCP-candidate images (call from network scheduler). */
export function imagePreload({ src, widths = [480, 960, 1440], sizes = '(max-width: 920px) 100vw, 920px' }) {
  const set = ext => widths.map(w => `${src}-${w}w.${ext} ${w}w`).join(', ');
  return `<link rel="preload" as="image" type="image/avif" imagesrcset="${set('avif')}" imagesizes="${sizes}" fetchpriority="high">`;
}
