/**
 * biagiojs — validazione post-build srcset con messaggi espliciti.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { mergeProfiles, slugFromSrc } from './image-profiles.js';
import { slugConfigFor } from './image-slug-config.js';

const IMG_REF = /\/img\/([\w-]+)-(\d+)w\.(avif|webp|jpe?g)/gi;

export function collectImageRefs(html) {
  const stripped = html.replace(/<pre[^>]*>[\s\S]*?<\/pre>/gi, '');
  const refs = new Set();
  for (const m of stripped.matchAll(IMG_REF)) {
    const ext = m[3] === 'jpeg' ? 'jpg' : m[3];
    refs.add(`${m[1]}-${m[2]}w.${ext}`);
  }
  return [...refs];
}

function hintForMissing(slug, width, images = {}) {
  const cfg = slugConfigFor(slug, images);
  const widths = cfg.widths.map(Number);
  if (!widths.includes(Number(width))) {
    return `slug "${slug}": ${width}w non è in bySlug/widths [${widths.join(', ')}] — aggiungilo in biagio.config.js`;
  }
  const profiles = mergeProfiles(images.profiles);
  for (const [name, p] of Object.entries(profiles)) {
    if (p.widths?.includes(Number(width)) && !widths.includes(Number(width))) {
      return `profile "${name}" richiede ${width}w ma bySlug.${slug} non lo include — allinea config e smartImage()`;
    }
  }
  return `file ${slug}-${width}w assente in dist/img/ — rigenera con biagio build --clean`;
}

export function validateImageRefs(htmlFiles, imgDir, images = {}) {
  const missing = [];
  const checked = new Set();
  for (const [page, html] of htmlFiles) {
    for (const ref of collectImageRefs(html)) {
      const key = `${page}::${ref}`;
      if (checked.has(key)) continue;
      checked.add(key);
      const path = join(imgDir, ref);
      if (!existsSync(path)) {
        const m = ref.match(/^([\w-]+)-(\d+)w\./);
        const slug = m?.[1];
        const width = m?.[2];
        missing.push({
          page,
          ref,
          path,
          hint: slug ? hintForMissing(slug, width, images) : 'file mancante in dist/img/',
        });
      }
    }
  }
  return { missing, checked: checked.size };
}

/** Confronta bucket referenziati nel markup vs pianificati in build. */
export function diffImagePlan(htmlFiles, plan = [], images = {}) {
  const referenced = new Set();
  for (const [, html] of htmlFiles) {
    for (const ref of collectImageRefs(html)) referenced.add(ref);
  }
  const planned = new Set(plan.map(p => `${p.slug}-${p.width}w.${p.ext}`));
  const unreferenced = [...planned].filter(r => !referenced.has(r));
  const missingFromBuild = [...referenced].filter(r => !planned.has(r));
  return { referenced: referenced.size, planned: planned.size, unreferenced, missingFromBuild };
}

export { slugFromSrc };
