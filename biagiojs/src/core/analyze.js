import { parseBundleMarker } from './bundle-classes.js';
import { existsSync, readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function walkHtml(dir, base = dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walkHtml(p, base, out);
    else if (e.name === 'index.html') out.push({ path: '/' + p.slice(base.length).replace(/\\/g, '/').replace(/\/index\.html$/, '/') || '/', file: p });
  }
  return out;
}

function dirSize(dir) {
  if (!existsSync(dir)) return 0;
  let n = 0;
  for (const f of walkFiles(dir)) {
    try { n += statSync(f).size; } catch { /* */ }
  }
  return n;
}

function walkFiles(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walkFiles(p, out);
    else out.push(p);
  }
  return out;
}

/** @returns {{ pages: object[], totals: object, reportPath: string }} */
export function analyzeDist(root) {
  const dist = join(root, 'dist');
  if (!existsSync(dist)) throw new Error('dist/ non trovato — esegui prima biagio build');

  const pages = walkHtml(dist).map(({ path, file }) => {
    const html = readFileSync(file, 'utf8');
    const scripts = (html.match(/<script\b/gi) || []).length;
    const islands = (html.match(/data-cvw-id=/g) || []).length;
    const plan = html.match(/__CVW_PLAN__=({[^<]+})/);
    let eager = 0, lazy = 0;
    if (plan) {
      try {
        const p = JSON.parse(plan[1].replace(/'/g, '"'));
        eager = (p.e || p.eager || []).length;
        lazy = (p.l || p.lazy || []).length;
      } catch { /* */ }
    }
    const bundle = parseBundleMarker(html);
    return {
      path: path === '/' ? '/' : path.replace(/\/$/, '') + '/',
      htmlKb: +(Buffer.byteLength(html) / 1024).toFixed(1),
      scripts,
      islands,
      hydration: `${eager}+${lazy}`,
      bundleAliases: bundle?.aliases ?? 0,
      bundleSavedKb: bundle ? +(bundle.savedBytes / 1024).toFixed(2) : 0,
    };
  });

  const totals = {
    pages: pages.length,
    htmlKb: +pages.reduce((s, p) => s + p.htmlKb, 0).toFixed(1),
    bundleSavedKb: +pages.reduce((s, p) => s + (p.bundleSavedKb || 0), 0).toFixed(2),
    imgKb: +(dirSize(join(dist, 'img')) / 1024).toFixed(1),
    islandsKb: +(dirSize(join(dist, 'islands')) / 1024).toFixed(1),
    fontsKb: +(dirSize(join(dist, 'fonts')) / 1024).toFixed(1),
  };

  const report = { generatedAt: new Date().toISOString(), pages, totals };
  const reportPath = join(root, 'dist', '.biagio-analyze.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  return { pages, totals, reportPath };
}

export function formatAnalyzeReport({ pages, totals }) {
  const lines = [
    `# biagio analyze — ${totals.pages} pagine`,
    '',
    '| Route | HTML (KB) | Isole DOM | Idratazione e+l | Class bundle |',
    '|-------|-----------|-----------|-----------------|--------------|',
  ];
  for (const p of pages.sort((a, b) => b.htmlKb - a.htmlKb)) {
    const bundle = p.bundleAliases
      ? `${p.bundleAliases} alias (−${p.bundleSavedKb} KB raw)`
      : '—';
    lines.push(`| ${p.path} | ${p.htmlKb} | ${p.islands} | ${p.hydration} | ${bundle} |`);
  }
  lines.push('', `**Totale HTML:** ${totals.htmlKb} KB · **class bundle (raw):** −${totals.bundleSavedKb} KB · **img/** ${totals.imgKb} KB · **islands/** ${totals.islandsKb} KB · **fonts/** ${totals.fontsKb} KB`);
  return lines.join('\n');
}
