/**
 * biagiojs — Favicon generator (build-time, opt-in).
 *
 * Da un singolo sorgente (SVG ideale, o PNG ≥512) genera il set essenziale
 * moderno, non la lista legacy da 20 file:
 *
 *   favicon.ico            (16/32/48, per SERP e legacy)
 *   icon.svg               (scalabile, solo se il sorgente è SVG)
 *   apple-touch-icon.png   (180×180, iOS)
 *   icon-192.png + icon-512.png + manifest.webmanifest   (Android / PWA)
 *
 * sharp NON esporta .ico: usiamo un encoder ICO inline (PNG dentro il contenitore
 * ICO, accettato dai browser) per restare senza dipendenze aggiuntive.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

/** Target disponibili; default = set essenziale moderno. */
export const DEFAULT_FAVICON_TARGETS = ['ico', 'svg', 'apple', 'pwa'];

const ICO_SIZES = [16, 32, 48];
const FILES = {
  ico: 'favicon.ico',
  svg: 'icon.svg',
  apple: 'apple-touch-icon.png',
  png192: 'icon-192.png',
  png512: 'icon-512.png',
  manifest: 'manifest.webmanifest',
};

/**
 * Impacchetta PNG in un contenitore ICO (ICONDIR + ICONDIRENTRY + payload PNG).
 * @param {{size:number, buffer:Buffer}[]} images
 * @returns {Buffer}
 */
export function encodeIco(images) {
  if (!images.length) throw new Error('[biagio favicon] encodeIco: nessuna immagine');
  const count = images.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);      // reserved
  header.writeUInt16LE(1, 2);      // type: 1 = icon
  header.writeUInt16LE(count, 4);  // numero di immagini

  const entries = Buffer.alloc(16 * count);
  let offset = 6 + 16 * count;
  images.forEach((img, i) => {
    const e = entries.subarray(i * 16, i * 16 + 16);
    const dim = img.size >= 256 ? 0 : img.size; // 0 significa 256
    e.writeUInt8(dim, 0);              // width
    e.writeUInt8(dim, 1);              // height
    e.writeUInt8(0, 2);               // color count
    e.writeUInt8(0, 3);               // reserved
    e.writeUInt16LE(1, 4);            // color planes
    e.writeUInt16LE(32, 6);           // bits per pixel
    e.writeUInt32LE(img.buffer.length, 8);  // bytes della risorsa
    e.writeUInt32LE(offset, 12);      // offset dei dati
    offset += img.buffer.length;
  });

  return Buffer.concat([header, entries, ...images.map(i => i.buffer)]);
}

/** Descrittore tag (URL pubblici) coerente con `faviconTags` di seo.js. */
export function faviconDescriptor({ source, targets = DEFAULT_FAVICON_TARGETS, themeColor } = {}) {
  const isSvg = extname(source || '').toLowerCase() === '.svg';
  const d = {};
  if (targets.includes('svg') && isSvg) d.svg = '/' + FILES.svg;
  if (targets.includes('ico')) d.ico = '/' + FILES.ico;
  if (targets.includes('apple')) d.apple = '/' + FILES.apple;
  if (targets.includes('pwa')) d.manifest = '/' + FILES.manifest;
  if (themeColor) d.themeColor = themeColor;
  return d;
}

function webManifest({ name, shortName, themeColor, background }) {
  return {
    name: name || 'App',
    short_name: shortName || name || 'App',
    icons: [
      { src: '/' + FILES.png192, sizes: '192x192', type: 'image/png' },
      { src: '/' + FILES.png512, sizes: '512x512', type: 'image/png' },
    ],
    theme_color: themeColor || '#ffffff',
    background_color: background && background !== 'transparent' ? background : '#ffffff',
    display: 'standalone',
  };
}

/** true se tutti gli output attesi esistono e sono più recenti del sorgente. */
function outputsFresh(outDir, files, srcMtime) {
  return files.every(f => {
    const p = join(outDir, f);
    return existsSync(p) && statSync(p).mtimeMs >= srcMtime;
  });
}

/**
 * Genera le favicon in `outDir`.
 * @returns {Promise<{written:string[], skipped:boolean, log:string[], favicon:object}>}
 */
export async function generateFavicons({
  source,
  outDir,
  targets = DEFAULT_FAVICON_TARGETS,
  themeColor,
  background = '#ffffff',
  name,
  shortName,
  strict = true,
  force = false,
} = {}) {
  const log = [];
  const favicon = faviconDescriptor({ source, targets, themeColor });

  if (!source || !existsSync(source)) {
    const msg = `favicon: sorgente mancante (${source || 'site.favicon.source non impostato'})`;
    if (strict) throw new Error(`[biagio] ${msg}`);
    return { written: [], skipped: true, log: [msg], favicon };
  }

  const isSvg = extname(source).toLowerCase() === '.svg';
  const expected = [];
  if (targets.includes('svg') && isSvg) expected.push(FILES.svg);
  if (targets.includes('ico')) expected.push(FILES.ico);
  if (targets.includes('apple')) expected.push(FILES.apple);
  if (targets.includes('pwa')) expected.push(FILES.png192, FILES.png512, FILES.manifest);

  const srcMtime = statSync(source).mtimeMs;
  if (!force && outputsFresh(outDir, expected, srcMtime)) {
    return { written: [], skipped: true, log: ['favicon: output aggiornati, skip'], favicon };
  }

  mkdirSync(outDir, { recursive: true });
  const srcBuf = readFileSync(source);
  const written = [];

  // icon.svg: copia diretta (solo da sorgente SVG)
  if (targets.includes('svg')) {
    if (isSvg) { writeFileSync(join(outDir, FILES.svg), srcBuf); written.push(FILES.svg); }
    else log.push('favicon: target "svg" ignorato — il sorgente non è un SVG');
  }

  const needsRaster = targets.some(t => ['ico', 'apple', 'pwa'].includes(t));
  if (needsRaster) {
    let sharp;
    try { sharp = (await import('sharp')).default; }
    catch {
      const msg = 'favicon: sharp non installato (`npm i -D sharp`) — generati solo i target non-raster';
      if (strict) throw new Error(`[biagio] ${msg}`);
      log.push(msg);
      return { written, skipped: false, log, favicon };
    }

    const png = async (size) => {
      let p = sharp(srcBuf, isSvg ? { density: 512 } : {}).resize(size, size, { fit: 'cover', position: 'centre' });
      if (background && background !== 'transparent') p = p.flatten({ background });
      return p.png().toBuffer();
    };

    if (targets.includes('ico')) {
      const imgs = [];
      for (const size of ICO_SIZES) imgs.push({ size, buffer: await png(size) });
      writeFileSync(join(outDir, FILES.ico), encodeIco(imgs));
      written.push(FILES.ico);
    }
    if (targets.includes('apple')) {
      writeFileSync(join(outDir, FILES.apple), await png(180));
      written.push(FILES.apple);
    }
    if (targets.includes('pwa')) {
      writeFileSync(join(outDir, FILES.png192), await png(192));
      writeFileSync(join(outDir, FILES.png512), await png(512));
      const manifest = webManifest({ name, shortName, themeColor, background });
      writeFileSync(join(outDir, FILES.manifest), JSON.stringify(manifest, null, 2));
      written.push(FILES.png192, FILES.png512, FILES.manifest);
    }
  }

  log.push(`favicon: ${written.length} file → ${written.join(', ')}`);
  return { written, skipped: false, log, favicon };
}

/**
 * Normalizza `site.favicon`: stringa e oggetto manuale restano invariati
 * (retrocompatibili); un oggetto con `{ source, generate: true }` diventa la
 * configurazione del generatore, con i campi tag già risolti.
 */
export function parseFavicon(favicon, site = {}) {
  if (!favicon) return null;
  if (typeof favicon === 'string') return favicon;
  if (!(favicon.source && favicon.generate === true)) return favicon; // oggetto manuale
  const targets = Array.isArray(favicon.targets) && favicon.targets.length ? favicon.targets : DEFAULT_FAVICON_TARGETS;
  return {
    generate: true,
    source: favicon.source,
    targets,
    themeColor: favicon.themeColor,
    background: favicon.background || '#ffffff',
    name: favicon.name || site.name,
    shortName: favicon.shortName || favicon.name || site.name,
    ...faviconDescriptor({ source: favicon.source, targets, themeColor: favicon.themeColor }),
  };
}
