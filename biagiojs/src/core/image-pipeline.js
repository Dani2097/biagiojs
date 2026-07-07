/**
 * biagiojs §9 — Image pipeline reale (build time).
 */
import { readdirSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join, parse } from 'node:path';
import { DEFAULT_IMAGE_WIDTHS } from './config.js';
import {
  slugConfigFor,
  qualityForSlug,
  cropForSlug,
  avifOptsForSlug,
  filterWidthsBySource,
  parseAspectRatio,
  normalizeSlugEntry,
} from './image-slug-config.js';

/** "imgFood.png" → "imgfood" */
export function imgSlug(filename) {
  const rawName = parse(filename).name;
  return rawName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'img';
}

function widthsForSlug(name, images) {
  return slugConfigFor(name, images).widths;
}

function applyCrop(pipeline, crop, meta) {
  if (!crop?.aspectRatio || !meta.width || !meta.height) return pipeline;
  const ratio = parseAspectRatio(crop.aspectRatio);
  const fit = crop.fit || 'cover';
  const srcRatio = meta.width / meta.height;
  let w = meta.width;
  let h = meta.height;
  if (srcRatio > ratio) w = Math.round(meta.height * ratio);
  else h = Math.round(meta.width / ratio);
  return pipeline.resize(w, h, { fit, position: crop.position || 'centre' });
}

/** Pianifica bucket senza scrivere file (dryRun). */
export function planImages(srcDir, images = {}) {
  if (!existsSync(srcDir)) return { slugs: [], plan: [], log: ['images/ assente'] };
  const sources = readdirSync(srcDir).filter(f => /\.(jpe?g|png|webp|tiff?)$/i.test(f));
  const plan = [];
  const log = [];
  for (const file of sources) {
    const name = imgSlug(file);
    const cfg = slugConfigFor(name, images);
    const widths = filterWidthsBySource(cfg.widths, null, images);
    const q = qualityForSlug(name, images);
    for (const w of widths) {
      for (const ext of ['avif', 'webp', 'jpg']) {
        plan.push({ slug: name, width: w, ext, quality: ext === 'jpg' ? q + 5 : q });
      }
    }
    log.push(`${file} → ${widths.join(', ')}w (q=${q})`);
  }
  return { slugs: sources.map(imgSlug), plan, log };
}

export async function processImages(srcDir, outDir, {
  widths = DEFAULT_IMAGE_WIDTHS,
  bySlug = {},
  quality = 75,
  qualityBySlug = {},
  allowSmallerSources = true,
  respectSourceMax = true,
  avif = {},
  dryRun = false,
  strict = true,
  images: imagesOpts,
} = {}) {
  const images = imagesOpts || { widths, bySlug, quality, qualityBySlug, allowSmallerSources, respectSourceMax, avif };

  if (!existsSync(srcDir)) {
    return { processed: 0, skipped: true, sources: 0, slugs: [], fileSizes: [], log: [`no image dir ${srcDir}`] };
  }

  const sources = readdirSync(srcDir).filter(f => /\.(jpe?g|png|webp|tiff?)$/i.test(f));
  if (!sources.length) {
    return { processed: 0, skipped: false, sources: 0, slugs: [], fileSizes: [], log: [] };
  }

  if (dryRun) {
    const planned = planImages(srcDir, images);
    return {
      processed: 0,
      skipped: false,
      dryRun: true,
      sources: sources.length,
      slugs: planned.slugs,
      plan: planned.plan,
      fileSizes: [],
      log: ['dryRun: nessun file scritto', ...planned.log],
    };
  }

  let sharp;
  try { sharp = (await import('sharp')).default; }
  catch {
    const msg = 'sharp non installato: `npm i -D sharp` per generare AVIF/WebP da images/.';
    if (strict) throw new Error(`[biagio] ${msg}`);
    return { processed: 0, skipped: true, sources: sources.length, slugs: [], fileSizes: [], log: [msg] };
  }

  mkdirSync(outDir, { recursive: true });
  const log = [];
  const slugs = [];
  const fileSizes = [];
  let processed = 0;

  for (const file of sources) {
    const rawName = parse(file).name;
    const name = imgSlug(file);
    if (name !== rawName) log.push(`"${rawName}" → "${name}" (usa src="/img/${name}" nel codice)`);
    slugs.push(name);

    const input = sharp(join(srcDir, file));
    const meta = await input.metadata();
    const cfg = slugConfigFor(name, images);
    const crop = cropForSlug(name, images);
    const fileQuality = qualityForSlug(name, images);
    const avifOpts = avifOptsForSlug(name, images);
    let fileWidths = filterWidthsBySource(cfg.widths, meta.width, images);

    if (!allowSmallerSources && meta.width) {
      fileWidths = fileWidths.filter(w => w <= meta.width);
    }
    if (!fileWidths.length) {
      throw new Error(`[biagio] images/${file}: nessun bucket valido (sorgente ${meta.width || '?'}px). Controlla site.images.bySlug o respectSourceMax.`);
    }

    let variantsForSource = 0;
    for (const w of fileWidths) {
      const targetW = meta.width ? Math.min(w, meta.width) : w;
      let base = input.clone();
      if (crop) base = applyCrop(base, crop, meta);
      base = base.resize({ width: targetW, withoutEnlargement: true });

      const avifPath = join(outDir, `${name}-${w}w.avif`);
      const webpPath = join(outDir, `${name}-${w}w.webp`);
      const jpgPath = join(outDir, `${name}-${w}w.jpg`);

      await base.clone().avif({ quality: fileQuality, effort: avifOpts.effort ?? 4, chromaSubsampling: avifOpts.chromaSubsampling ?? '4:2:0' }).toFile(avifPath);
      await base.clone().webp({ quality: fileQuality }).toFile(webpPath);
      await base.clone().jpeg({ quality: fileQuality + 5, mozjpeg: true }).toFile(jpgPath);

      for (const [p, ext] of [[avifPath, 'avif'], [webpPath, 'webp'], [jpgPath, 'jpg']]) {
        const bytes = statSync(p).size;
        fileSizes.push({ file: `${name}-${w}w.${ext}`, bytes, slug: name, width: w });
      }
      processed += 3;
      variantsForSource += 3;
    }

    const cropNote = crop ? `, crop ${crop.aspectRatio}` : '';
    log.push(`${file} → ${variantsForSource / 3} bucket×(avif+webp+jpg) q=${fileQuality}${cropNote} [slug: ${name}]`);
  }

  if (processed === 0) {
    throw new Error(`[biagio] images/ contiene ${sources.length} file ma nessuna variante è stata generata.`);
  }

  fileSizes.sort((a, b) => b.bytes - a.bytes);
  return { processed, skipped: false, sources: sources.length, slugs, fileSizes, log };
}

export { normalizeSlugEntry, widthsForSlug };
