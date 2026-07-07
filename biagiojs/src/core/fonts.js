/**
 * biagiojs — Google Fonts self-hosted a build time.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { isDomainAllowed, validateRemoteUrl } from './remote-images.js';

export const DEFAULT_FONT_DOMAINS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
const WOFF2_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export function fontSlug(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'font';
}

/** true → 'stylesheet'; false → false; 'inline' | 'async' | 'stylesheet'. */
export function parseFontInject(inject) {
  if (inject === false || inject == null) return false;
  if (inject === true) return 'stylesheet';
  if (['inline', 'async', 'stylesheet'].includes(inject)) return inject;
  return 'stylesheet';
}

export function buildGoogleFontsUrl({ family, weights = [400], display = 'swap', italic = false }) {
  if (!family) throw new Error('[biagio] site.fonts.google: family obbligatorio (o usa css: con URL completo)');
  const fam = family.trim().replace(/ /g, '+');
  if (italic) {
    const pairs = weights.flatMap(w => [`0,${w}`, `1,${w}`]);
    return `https://fonts.googleapis.com/css2?family=${fam}:ital,wght@${pairs.join(';')}&display=${display}`;
  }
  return `https://fonts.googleapis.com/css2?family=${fam}:wght@${weights.join(';')}&display=${display}`;
}

export function normalizeGoogleEntry(entry) {
  if (typeof entry === 'string') return { css: entry };
  if (entry?.css) return { css: entry.css, display: entry.display || 'swap', role: entry.role || 'body' };
  if (entry?.family) return { role: 'body', ...entry };
  throw new Error('[biagio] site.fonts.google: voce non valida — usa { family, weights } o { css }');
}

export function parseFontFaces(css) {
  const faces = [];
  for (const m of css.matchAll(/@font-face\s*\{([^}]+)\}/g)) {
    const block = m[1];
    const family = block.match(/font-family:\s*['"]?([^'";]+)/)?.[1]?.trim();
    const weight = block.match(/font-weight:\s*(\d+)/)?.[1] || '400';
    const style = block.match(/font-style:\s*(\w+)/)?.[1] || 'normal';
    const url = block.match(/url\(([^)]+)\)/)?.[1]?.replace(/['"]/g, '').trim();
    if (family && url) faces.push({ family, weight, style, url, raw: m[0] });
  }
  return faces;
}

function localFontName(face) {
  return `${fontSlug(face.family)}-${face.weight}-${face.style}.woff2`;
}

function validateFontAssetUrl(url, allowedDomains) {
  let parsed;
  try { parsed = new URL(url); }
  catch { throw new Error(`[biagio] URL font non valido nel CSS Google: ${url}`); }
  if (parsed.protocol !== 'https:') throw new Error(`[biagio] Solo HTTPS per font remote: ${url}`);
  if (!isDomainAllowed(parsed.hostname, allowedDomains)) {
    throw new Error(`[biagio] Dominio font non consentito: ${parsed.hostname}`);
  }
  return parsed;
}

/** Risolve quali woff2 preloadare. */
export function resolvePreloadFiles(files, { preload = 'critical', preloadCritical = [] } = {}) {
  if (preload === false) return [];
  if (preload === 'all') return files.map(f => f.path);

  if (preloadCritical.length) {
    const out = [];
    for (const crit of preloadCritical) {
      const match = files.find(f =>
        (!crit.family || f.family === crit.family) &&
        (!crit.weight || String(f.weight) === String(crit.weight)) &&
        (!crit.style || f.style === crit.style) &&
        (!crit.file || f.path === crit.file || f.path.endsWith(crit.file)),
      );
      if (match) out.push(match.path);
    }
    return [...new Set(out)];
  }

  const picks = [];
  const display = files.find(f => f.role === 'display');
  if (display) picks.push(display.path);
  const body400 = files.find(f => f.role === 'body' && f.weight === '400' && f.style === 'normal');
  if (body400 && !picks.includes(body400.path)) picks.push(body400.path);
  if (!picks.length && files[0]) picks.push(files[0].path);
  return picks.slice(0, 2);
}

export function writeFontManifest(fontsDir, { preloadFiles, files, inlineCss, cssPath }) {
  const manifest = {
    preloadFiles: preloadFiles || [],
    cssPath: cssPath || '/fonts/google.css',
    inlineCss: inlineCss || null,
    files: (files || []).map(f => ({
      path: f.path,
      bytes: f.bytes,
      family: f.family,
      weight: f.weight,
      style: f.style,
      role: f.role,
    })),
    updatedAt: new Date().toISOString(),
  };
  writeFileSync(join(fontsDir, '.biagio-manifest.json'), JSON.stringify(manifest, null, 2));
  return manifest;
}

/** Aggiorna bytes nel manifest dopo subset (preload invariati). */
export function refreshFontManifestSizes(fontsDir) {
  const manifestPath = join(fontsDir, '.biagio-manifest.json');
  if (!existsSync(manifestPath)) return null;
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  for (const f of manifest.files || []) {
    const name = f.path.split('/').pop();
    const p = join(fontsDir, name);
    if (existsSync(p)) f.bytes = statSync(p).size;
  }
  if (manifest.inlineCss == null && existsSync(join(fontsDir, 'google.css'))) {
    manifest.inlineCss = readFileSync(join(fontsDir, 'google.css'), 'utf8');
  }
  manifest.updatedAt = new Date().toISOString();
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  return manifest;
}

export function fontHead(site) {
  const mode = parseFontInject(site?.fonts?.inject);
  if (!mode) return '';

  const css = site.fonts.cssPath || '/fonts/google.css';
  const preloadMode = site.fonts.preload ?? 'critical';
  const files = site.fonts.files || [];
  const preloadPaths = site.fonts.preloadFiles?.length
    ? site.fonts.preloadFiles
    : resolvePreloadFiles(files, { preload: preloadMode, preloadCritical: site.fonts.preloadCritical });

  const preloads = preloadPaths.map(f =>
    `<link rel="preload" href="${f}" as="font" type="font/woff2" crossorigin>`,
  ).join('\n');

  let cssTag = '';
  if (mode === 'inline') {
    const inline = site.fonts.inlineCss || '';
    cssTag = inline ? `<style>${inline}</style>` : `<link rel="stylesheet" href="${css}">`;
  } else if (mode === 'async') {
    cssTag = `<link rel="stylesheet" href="${css}" media="print" onload="this.media='all'">
<noscript><link rel="stylesheet" href="${css}"></noscript>`;
  } else {
    cssTag = `<link rel="stylesheet" href="${css}">`;
  }

  return `${preloads}${preloads ? '\n' : ''}${cssTag}`;
}

export async function fetchGoogleFonts(entries, outDir, {
  allowedDomains = DEFAULT_FONT_DOMAINS,
  cssFilename = 'google.css',
  preload = 'critical',
  preloadCritical = [],
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!entries?.length) return { files: [], cssPath: null, preloadFiles: [], inlineCss: null, log: [] };
  if (!fetchImpl) throw new Error('[biagio] fetch non disponibile per Google Fonts (Node ≥ 18)');

  mkdirSync(outDir, { recursive: true });
  const log = [];
  const files = [];
  const usedNames = new Set();
  let combinedCss = '/* biagiojs — Google Fonts self-hosted */\n';
  const entryRoles = new Map();

  for (const raw of entries) {
    const entry = normalizeGoogleEntry(raw);
    const cssUrl = entry.css || buildGoogleFontsUrl(entry);
    validateRemoteUrl(cssUrl, { allowedDomains });

    const cssRes = await fetchImpl(cssUrl, { headers: { 'User-Agent': WOFF2_UA } });
    if (!cssRes.ok) throw new Error(`[biagio] Download CSS Google Fonts fallito (${cssRes.status}): ${cssUrl}`);
    const css = await cssRes.text();
    const faces = parseFontFaces(css);
    if (!faces.length) throw new Error(`[biagio] Nessun @font-face in ${cssUrl}`);

    for (const face of faces) {
      validateFontAssetUrl(face.url, allowedDomains);
      let filename = localFontName(face);
      if (usedNames.has(filename)) {
        const hash = createHash('sha256').update(face.url).digest('hex').slice(0, 6);
        filename = filename.replace('.woff2', `-${hash}.woff2`);
      }
      usedNames.add(filename);

      const res = await fetchImpl(face.url);
      if (!res.ok) throw new Error(`[biagio] Download font fallito (${res.status}): ${face.url}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (!buf.length) throw new Error(`[biagio] File font vuoto: ${face.url}`);

      writeFileSync(join(outDir, filename), buf);
      const path = `/fonts/${filename}`;
      const role = entry.role || 'body';
      files.push({
        filename, bytes: buf.length, family: face.family, weight: face.weight, style: face.style, path, role,
      });
      entryRoles.set(path, role);

      const localBlock = face.raw.replace(face.url, path);
      combinedCss += localBlock + '\n';
      log.push(`${face.family} ${face.weight} (${role}) → fonts/${filename} (${(buf.length / 1024).toFixed(1)} KB)`);
    }
  }

  writeFileSync(join(outDir, cssFilename), combinedCss);
  const cssPath = `/fonts/${cssFilename}`;
  const preloadFiles = resolvePreloadFiles(files, { preload, preloadCritical });
  log.push(`CSS aggregato → fonts/${cssFilename}`);
  log.push(`preload (${preload}): ${preloadFiles.join(', ') || 'nessuno'}`);

  return {
    files,
    cssPath,
    preloadFiles,
    inlineCss: combinedCss,
    log,
  };
}
