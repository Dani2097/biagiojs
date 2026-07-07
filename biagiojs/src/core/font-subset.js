/**
 * biagiojs — subsetting font opzionale (post-render, opt-in).
 * Richiede `subset-font` (optionalDependency): npm i -D subset-font
 *
 * site.fonts.subset:
 *   false          → disabilitato (default)
 *   'latin'        → preset + scan HTML sorgenti e output
 *   { preset: 'latin', scan: true, extra: '€', minSaving: 0.05 }
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

/** Glifi base per siti EU/IT (latin). Non copre cirillico, CJK, arabo. */
export const CHARSET_PRESETS = {
  latin:
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789' +
    ' .,;:!?\'"«»()-–—/@#%&*+=<>[]{}|\\^~`_' +
    '€£$¥¢©®™°±×÷·' +
    'ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕÖØÙÚÛÜÝàáâãäåæçèéêëìíîïñòóôõöøùúûüýÿ' +
    'ĀāĂăĄąĆćĈĉČčĎďĐđĒēĖėĘęĚěĜĝĞğĠġĢģĤĥĦħĨĩĪīĮįİıĲĳĴĵĶķĸĹĺĻļĽľĿŀŁł' +
    'ŃńŅņŇňŊŋŌōŎŏŐőŒœŔŕŖŗŘřŚśŜŝŞşŠšŢţŤťŦŧŨũŪūŬŭŮůŰűŲųŴŵŶŷŸŹźŻżŽž',
};

const SOURCE_EXTS = ['.biagio', '.cvw', '.js', '.ts', '.md', '.json', '.html', '.css'];

/** Normalizza site.fonts.subset in opzioni interne. null = disabilitato. */
export function parseSubsetConfig(subset) {
  if (subset === false || subset == null) return null;
  if (subset === true) return { preset: 'latin', scan: true, extra: '', minSaving: 0.05 };
  if (typeof subset === 'string') return { preset: subset, scan: true, extra: '', minSaving: 0.05 };
  return {
    preset: subset.preset ?? 'latin',
    scan: subset.scan !== false,
    extra: subset.extra || '',
    minSaving: typeof subset.minSaving === 'number' ? subset.minSaving : 0.05,
  };
}

function walkFiles(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walkFiles(p, out);
    else if (SOURCE_EXTS.includes(extname(e.name).toLowerCase())) out.push(p);
  }
  return out;
}

/** Rimuove tag/script/style — tiene il testo visibile per lo scan. */
export function stripHtmlForSubset(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');
}

/** Raccoglie testo da HTML buildato + sorgenti progetto. */
export function collectSubsetText(root, htmlChunks, { preset, scan, extra }) {
  const parts = [];
  if (preset) {
    if (!CHARSET_PRESETS[preset]) {
      throw new Error(`[biagio] site.fonts.subset preset sconosciuto: "${preset}" (disponibili: ${Object.keys(CHARSET_PRESETS).join(', ')})`);
    }
    parts.push(CHARSET_PRESETS[preset]);
  }
  if (scan) {
    for (const [, html] of htmlChunks) parts.push(stripHtmlForSubset(html));
    for (const sub of ['pages', 'content', 'locales', 'islands']) {
      for (const f of walkFiles(join(root, sub))) {
        try { parts.push(readFileSync(f, 'utf8')); } catch { /* binari */ }
      }
    }
  }
  if (extra) parts.push(extra);
  const text = parts.join('');
  if (!text.trim()) throw new Error('[biagio] subset font: nessun testo raccolto — abilita scan o extra');
  return text;
}

/**
 * Applica subset a tutti i .woff2 in fontsDir (dopo il render HTML).
 * Ritorna { processed, savedBytes, log }.
 */
export async function subsetFontFiles(fontsDir, text, {
  minSaving = 0.05,
  strict = true,
} = {}) {
  if (!existsSync(fontsDir)) return { processed: 0, savedBytes: 0, log: [] };

  let subsetFont;
  try {
    subsetFont = (await import('subset-font')).default;
  } catch {
    const msg = 'subset-font non installato: `npm i -D subset-font` per abilitare site.fonts.subset';
    if (strict) throw new Error(`[biagio] ${msg}`);
    return { processed: 0, savedBytes: 0, log: [msg] };
  }

  const log = [];
  let processed = 0;
  let savedBytes = 0;

  for (const name of readdirSync(fontsDir).filter(f => f.endsWith('.woff2'))) {
    const path = join(fontsDir, name);
    const before = readFileSync(path);
    const beforeLen = before.length;

    let out;
    try {
      out = await subsetFont(before, text, { targetFormat: 'woff2' });
    } catch (e) {
      throw new Error(`[biagio] Subset fallito per fonts/${name}: ${e.message}`);
    }

    const afterLen = out.length;
    const ratio = (beforeLen - afterLen) / beforeLen;
    if (ratio < minSaving) {
      log.push(`${name}: skip (−${(ratio * 100).toFixed(1)}% < soglia ${(minSaving * 100).toFixed(0)}%)`);
      continue;
    }

    writeFileSync(path, out);
    processed++;
    savedBytes += beforeLen - afterLen;
    log.push(`${name}: ${(beforeLen / 1024).toFixed(1)} KB → ${(afterLen / 1024).toFixed(1)} KB (−${(ratio * 100).toFixed(0)}%)`);
  }

  if (processed === 0 && readdirSync(fontsDir).some(f => f.endsWith('.woff2'))) {
    log.push('nessun file ridotto oltre la soglia minSaving');
  }

  return { processed, savedBytes, log };
}
