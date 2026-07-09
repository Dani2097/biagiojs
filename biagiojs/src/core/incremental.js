/**
 * Rebuild incrementale in dev — quali pagine rigenerare al cambio file.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

export function walkPageFiles(pagesDir, base = pagesDir) {
  const out = [];
  if (!existsSync(pagesDir)) return out;
  for (const e of readdirSync(pagesDir, { withFileTypes: true })) {
    const p = join(pagesDir, e.name);
    if (e.isDirectory()) out.push(...walkPageFiles(p, base));
    else if (/\.page\.(js|ts|biagio)$/.test(e.name)) {
      out.push(relative(base, p).split(/[\\/]/).join('/'));
    }
  }
  return out;
}

/** Scansiona pages/ per riferimenti getCollection('content/foo'). */
export function findPagesUsingCollection(root, collectionName) {
  const pagesDir = join(root, 'pages');
  const needle = `content/${collectionName}`;
  const hits = [];
  for (const file of walkPageFiles(pagesDir)) {
    const src = readFileSync(join(pagesDir, file), 'utf8');
    if (src.includes(needle) || src.includes(`'${collectionName}'`) || src.includes(`"${collectionName}"`)) {
      hits.push(file);
    }
  }
  return hits.length ? hits : walkPageFiles(pagesDir);
}

/**
 * Dato un path cambiato, ritorna:
 * - null → full rebuild
 * - string[] → solo quelle pagine
 */
export function pagesAffectedByChange(root, changedPath) {
  const rel = relative(root, changedPath).split(/[\\/]/).join('/');
  if (!rel || rel.startsWith('dist/')) return [];

  if (
    rel === 'biagio.config.js' || rel === 'biagio.config.ts'
    || rel.startsWith('images/') || rel.startsWith('fonts/')
    || rel.startsWith('public/') || rel.startsWith('reports/')
    || rel.startsWith('locales/')
  ) return null;

  if (rel.startsWith('islands/')) return null;

  if (rel.startsWith('content/')) {
    const parts = rel.split('/');
    const collection = parts[1] || parts[0]?.replace('content', '') || 'blog';
    if (parts[0] === 'content' && parts[1]) {
      return findPagesUsingCollection(root, parts[1]);
    }
    return null;
  }

  if (rel.startsWith('pages/')) {
    const file = rel.slice('pages/'.length);
    if (/\.page\.(js|ts|biagio)$/.test(file)) return [file];
    return null;
  }

  return null;
}

export function isFullRebuild(paths) {
  return paths === null;
}
