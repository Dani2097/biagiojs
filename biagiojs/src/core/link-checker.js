/**
 * Controllo link interni e asset referenziati (build / doctor).
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { walkPageFiles } from './incremental.js';

const HREF_RE = /href\s*=\s*["']([^"']+)["']/gi;
const SRC_RE = /(?:src|srcset)\s*=\s*["']([^"']+)["']/gi;

function collectRoutes(root) {
  const routes = new Set(['/']);
  for (const file of walkPageFiles(join(root, 'pages'))) {
    let route = file.replace(/\.page\.(js|ts|biagio)$/, '').replace(/\/index$/, '');
    if (route === 'index') routes.add('/');
    else {
      routes.add(`/${route}/`);
      routes.add(`/${route}`);
    }
    const segs = route.split('/');
    for (let i = 0; i < segs.length; i++) {
      if (segs[i].startsWith('[')) {
        // route dinamica: non verifichiamo match esatto
        break;
      }
    }
  }
  return routes;
}

function isInternal(href) {
  return href.startsWith('/') && !href.startsWith('//');
}

function normalizeRoute(href) {
  if (!href || href === '#') return null;
  const path = href.split('?')[0].split('#')[0];
  if (!path.startsWith('/')) return null;
  if (path.endsWith('/') && path.length > 1) return path;
  if (!path.includes('.') && !path.endsWith('/')) return path + '/';
  return path;
}

/** Estrae ref immagine da srcset (primo token di ogni candidato). */
function refsFromSrcset(srcset) {
  return srcset.split(',').map(s => s.trim().split(/\s+/)[0]).filter(Boolean);
}

/**
 * Matcha una route interna contro le route note. Supporta i segmenti dinamici
 * `[slug]` (→ un segmento qualsiasi) e i prefissi annidati, MA la root `/` matcha
 * solo esattamente `/` (altrimenti ogni path passerebbe).
 */
function matchesRoute(routes, norm) {
  for (const r of routes) {
    if (r === norm) return true;
    if (r.length > 1 && !r.includes('[') && norm.startsWith(r)) return true;
    if (r.includes('[')) {
      const pattern = r
        .replace(/[.*+?^${}()|\\]/g, '\\$&')   // escapa i meta-char regex (non [ ])
        .replace(/\[[^\]]+\]/g, '[^/]+')       // [slug] → un segmento
        .replace(/\/$/, '/?');                 // slash finale opzionale
      if (new RegExp('^' + pattern + '$').test(norm)) return true;
    }
  }
  return false;
}

/**
 * @param {string} root
 * @param {Array<[string, string]>} htmlChunks — [pagePath, html]
 * @param {{ dist?: string }} [opts]
 */
export function checkLinksAndAssets(root, htmlChunks, { dist } = {}) {
  root = resolve(root);
  dist = dist || join(root, 'dist');
  const routes = collectRoutes(root);
  const issues = [];

  const imgFiles = new Set();
  const imgDir = join(dist, 'img');
  if (existsSync(imgDir)) {
    for (const f of readdirSync(imgDir)) imgFiles.add(`/img/${f}`);
  }

  for (const [page, html] of htmlChunks) {
    for (const re of [HREF_RE, SRC_RE]) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(html))) {
        const raw = m[1];
        if (!raw || raw.startsWith('http') || raw.startsWith('data:') || raw.startsWith('mailto:')) continue;

        // srcset: valida ogni candidato, non l'intera stringa
        if (raw.includes('/img/') && (raw.includes(',') || /\d+w/.test(raw))) {
          for (const ref of refsFromSrcset(raw)) {
            if (!ref.startsWith('/img/')) continue;
            if (imgFiles.has(ref) || existsSync(join(dist, ref.slice(1)))) continue;
            const base = ref.replace(/-\d+w\.(avif|webp|jpe?g|png)$/i, '');
            const found = [...imgFiles].some(f => f.startsWith(base + '-') || f === ref);
            if (!found) issues.push({ type: 'asset', page, ref, hint: 'variante immagine assente in dist/img/' });
          }
          continue;
        }

        if (isInternal(raw)) {
          const norm = normalizeRoute(raw);
          if (!norm) continue;
          if (norm.startsWith('/img/')) {
            if (imgFiles.has(norm) || existsSync(join(dist, norm.slice(1)))) continue;
            const base = norm.replace(/-\d+w\.(avif|webp|jpe?g|png)$/i, '');
            const found = [...imgFiles].some(f => f.startsWith(base + '-'));
            if (!found) issues.push({ type: 'asset', page, ref: raw, hint: 'immagine non trovata in dist/img/' });
            continue;
          }
          if (norm.includes('.')) continue;
          const ok = matchesRoute(routes, norm);
          if (!ok && !/\[/.test(norm)) {
            issues.push({ type: 'link', page, ref: raw, hint: 'nessuna route corrispondente in pages/' });
          }
        }
      }
    }
  }

  return issues;
}

export function formatLinkReport(issues) {
  if (!issues.length) return '✔ link & asset check: nessun problema';
  const lines = [`✖ ${issues.length} problema/i link/asset:`];
  for (const i of issues.slice(0, 20)) {
    lines.push(`  ${i.type.toUpperCase()}  ${i.page}: ${i.ref}`);
    lines.push(`         → ${i.hint}`);
  }
  if (issues.length > 20) lines.push(`  … +${issues.length - 20} altri`);
  return lines.join('\n');
}

/** Scansiona sorgenti pagine per href interni (doctor pre-build). */
export function checkPageSources(root) {
  const issues = [];
  const routes = collectRoutes(root);
  const pagesDir = join(root, 'pages');
  for (const file of walkPageFiles(pagesDir)) {
    const src = readFileSync(join(pagesDir, file), 'utf8');
    HREF_RE.lastIndex = 0;
    let m;
    while ((m = HREF_RE.exec(src))) {
      const href = m[1];
      if (!isInternal(href)) continue;
      const norm = normalizeRoute(href);
      if (!norm || norm.includes('.')) continue;
      const ok = matchesRoute(routes, norm);
      if (!ok && !/\[/.test(norm)) issues.push({ type: 'link', page: `pages/${file}`, ref: href, hint: 'route non trovata' });
    }
  }
  return issues;
}
