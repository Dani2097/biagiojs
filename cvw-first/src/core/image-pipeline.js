/**
 * CVW-First §9 — Image pipeline reale (build time).
 * Converte le immagini sorgente in AVIF + WebP + JPEG nelle larghezze richieste
 * usando `sharp` (dipendenza opzionale: senza, la build continua con un warning
 * e il markup <picture> resta valido appena le varianti verranno generate).
 *
 *   await processImages(srcDir, outDir, { widths: [480, 960, 1440], quality: 75 })
 */
import { readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join, parse } from 'node:path';

export async function processImages(srcDir, outDir, { widths = [480, 960, 1440], quality = 75 } = {}) {
  if (!existsSync(srcDir)) return { processed: 0, skipped: true, log: [`no image dir ${srcDir}`] };

  let sharp;
  try { sharp = (await import('sharp')).default; }
  catch {
    return { processed: 0, skipped: true, log: ['sharp non installato: `npm i sharp` per generare AVIF/WebP. Markup <picture> comunque emesso.'] };
  }

  mkdirSync(outDir, { recursive: true });
  const sources = readdirSync(srcDir).filter(f => /\.(jpe?g|png|webp|tiff?)$/i.test(f));
  const log = [];
  let processed = 0;

  for (const file of sources) {
    // slug del nome: "Foto Prodotto (1).jpg" → "foto-prodotto-1"
    // (spazi negli URL rompono il parsing di srcset; meglio normalizzare alla fonte)
    const rawName = parse(file).name;
    const name = rawName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'img';
    if (name !== rawName) log.push(`"${rawName}" → "${name}" (nome normalizzato: usa src="/img/${name}")`);
    const input = sharp(join(srcDir, file));   // legge il file originale (spazi ok su disco)
    const meta = await input.metadata();
    for (const w of widths) {
      if (meta.width && w > meta.width) { log.push(`skip ${name}-${w}w (source ${meta.width}px)`); continue; }
      const base = input.clone().resize({ width: w });
      await base.clone().avif({ quality }).toFile(join(outDir, `${name}-${w}w.avif`));
      await base.clone().webp({ quality }).toFile(join(outDir, `${name}-${w}w.webp`));
      await base.clone().jpeg({ quality: quality + 5, mozjpeg: true }).toFile(join(outDir, `${name}-${w}w.jpg`));
      processed += 3;
    }
    log.push(`${file} → ${widths.length}×(avif+webp+jpg)`);
  }
  return { processed, skipped: false, log };
}
