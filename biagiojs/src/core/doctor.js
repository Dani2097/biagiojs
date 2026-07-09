/**
 * biagiojs — validazione progetto pre-build / pre-deploy.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { loadConfig } from './config.js';
import { checkPageSources } from './link-checker.js';

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function hasDep(root, name) {
  for (const f of ['package.json']) {
    const p = join(root, f);
    if (!existsSync(p)) continue;
    try {
      const pkg = JSON.parse(readFileSync(p, 'utf8'));
      const all = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.optionalDependencies };
      if (all[name]) return true;
    } catch { /* ignore */ }
  }
  return false;
}

/** @returns {{ ok: boolean, errors: string[], warnings: string[] }} */
export async function runDoctor(root) {
  const errors = [];
  const warnings = [];

  const configPathJs = join(root, 'biagio.config.js');
  const configPathTs = join(root, 'biagio.config.ts');
  if (!existsSync(configPathJs) && !existsSync(configPathTs)) {
    errors.push('Manca biagio.config.js (o biagio.config.ts)');
  }

  let config;
  try {
    config = await loadConfig(root);
  } catch (e) {
    errors.push(`biagio.config non caricabile: ${e.message}`);
    return { ok: false, errors, warnings };
  }

  const baseUrl = config.site?.baseUrl || '';
  if (!baseUrl || baseUrl.includes('example.com')) {
    warnings.push('site.baseUrl è placeholder — canonical, sitemap e OG saranno errati');
  }

  const imagesDir = join(root, 'images');
  const imageFiles = existsSync(imagesDir)
    ? readdirSync(imagesDir).filter(f => !f.startsWith('.'))
    : [];
  if (imageFiles.length && !hasDep(root, 'sharp')) {
    errors.push(`images/ contiene ${imageFiles.length} file ma sharp non è in devDependencies`);
  }

  const pagesDir = join(root, 'pages');
  if (!existsSync(pagesDir)) {
    errors.push('Cartella pages/ mancante');
  } else {
    const pages = walk(pagesDir).filter(f => /\.page\.(js|ts|biagio)$/.test(f));
    if (!pages.length) errors.push('Nessuna pagina in pages/ (*.page.js|ts|biagio)');
    if (pages.some(f => f.endsWith('.page.ts')) && !hasDep(root, 'vite')) {
      warnings.push('Pagine .page.ts presenti: consigliato npm i -D vite per compilarle');
    }
  }

  const pkgPath = join(root, 'package.json');
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    if (!pkg.dependencies?.biagiojs && !existsSync(join(root, '..', 'biagiojs', 'package.json'))) {
      warnings.push('package.json senza dipendenza biagiojs');
    }
  }

  // Script/iframe di terze parti senza gating consent
  for (const f of walk(pagesDir).filter(p => /\.(biagio|js|ts)$/.test(p))) {
    const src = readFileSync(f, 'utf8');
    if (/<iframe[^>]+src=/.test(src) && !/data-cvw-consent|data-src=/.test(src)) {
      warnings.push(`${f.replace(root + '/', '')}: iframe con src diretto senza data-cvw-consent`);
    }
    if (/<script[^>]+src=/.test(src) && !/data-cvw-consent|type="module"|client=/.test(src)) {
      const rel = f.replace(root + '/', '');
      if (!rel.includes('hydrate')) warnings.push(`${rel}: script esterno senza gating consent`);
    }
  }

  if (config.site?.fonts?.subset && !hasDep(root, 'subset-font')) {
    warnings.push('site.fonts.subset attivo ma subset-font non installato');
  }

  // Favicon generator opt-in
  const fav = config.site?.favicon;
  if (fav && typeof fav === 'object' && fav.generate) {
    if (!fav.source) {
      errors.push('site.favicon.generate attivo ma manca site.favicon.source');
    } else if (!existsSync(join(root, fav.source))) {
      errors.push(`site.favicon.source non trovato: ${fav.source}`);
    } else {
      const isSvg = /\.svg$/i.test(fav.source);
      const needsRaster = (fav.targets || []).some(t => ['ico', 'apple', 'pwa'].includes(t));
      if (needsRaster && !hasDep(root, 'sharp')) {
        errors.push('site.favicon.generate richiede sharp per ico/apple/pwa (`npm i -D sharp`)');
      }
      if (!isSvg && (fav.targets || []).includes('svg')) {
        warnings.push('favicon: target "svg" richiede un sorgente SVG — sarà ignorato');
      }
      if (!isSvg) {
        try {
          const bytes = readFileSync(join(root, fav.source));
          if (bytes.length < 1024) warnings.push('site.favicon.source molto piccolo: usa un SVG o un PNG ≥512px');
        } catch { /* ignore */ }
      }
    }
  }

  const linkIssues = checkPageSources(root);
  for (const i of linkIssues) {
    warnings.push(`${i.page}: link interno rotto ${i.ref}`);
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function formatDoctorReport({ ok, errors, warnings }) {
  const lines = [ok ? '✔ biagio doctor: tutto ok' : '✖ biagio doctor: problemi trovati'];
  for (const e of errors) lines.push(`  ERROR  ${e}`);
  for (const w of warnings) lines.push(`  WARN   ${w}`);
  return lines.join('\n');
}
