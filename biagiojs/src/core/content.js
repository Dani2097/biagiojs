/**
 * biagiojs — Content collections (Markdown + frontmatter), stile Astro.
 * Schema opzionale in content.config.js con defineCollection().
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, parse, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { escapeHtml, safeUrl } from './html.js';

const FIELD_TYPES = new Set(['string', 'number', 'boolean', 'date']);

/** @typedef {{ type?: string, required?: boolean, default?: unknown }} FieldSchema */

let _schemas = null;
let _schemasRoot = null;

/**
 * Definisce una collection con schema frontmatter.
 * @param {{ schema?: Record<string, FieldSchema> }} def
 */
export function defineCollection(def = {}) {
  return { schema: def.schema || {} };
}

async function loadSchemas(root) {
  if (_schemas && _schemasRoot === root) return _schemas;
  _schemasRoot = root;
  _schemas = {};
  const cfgPath = join(root, 'content.config.js');
  if (!existsSync(cfgPath)) return _schemas;
  try {
    const mod = await import(pathToFileURL(cfgPath).href + '?t=' + Date.now());
    for (const [name, def] of Object.entries(mod.collections || {})) {
      _schemas[name] = def?.schema || {};
    }
  } catch { /* config opzionale */ }
  return _schemas;
}

/** Reset cache (test). */
export function _resetCollectionCache() {
  _schemas = null;
  _schemasRoot = null;
}

function coerceValue(raw, type) {
  if (type === 'boolean') {
    if (raw === true || raw === false) return raw;
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    return Boolean(raw);
  }
  if (type === 'number') {
    const n = Number(raw);
    return Number.isFinite(n) ? n : raw;
  }
  return raw;
}

function validateEntry(collectionName, data, schema, filePath) {
  if (!schema || !Object.keys(schema).length) return data;
  const out = { ...data };
  for (const [key, rule] of Object.entries(schema)) {
    const type = rule.type || 'string';
    if (!FIELD_TYPES.has(type)) continue;
    if (out[key] === undefined || out[key] === '') {
      if (rule.required) throw new Error(`[content] ${filePath}: campo obbligatorio "${key}" mancante`);
      if ('default' in rule) out[key] = rule.default;
      continue;
    }
    out[key] = coerceValue(out[key], type);
    if (type === 'number' && typeof out[key] !== 'number') {
      throw new Error(`[content] ${filePath}: "${key}" deve essere number`);
    }
    if (type === 'date' && Number.isNaN(new Date(out[key]).getTime())) {
      throw new Error(`[content] ${filePath}: "${key}" deve essere una data valida (ISO)`);
    }
  }
  return out;
}

function collectionNameFromDir(dir, root) {
  const rel = dir.replace(/\\/g, '/');
  const m = rel.match(/content\/([^/]+)/);
  return m?.[1] || null;
}

function parseFrontmatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { data: {}, body: src };
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim().replace(/^["']|["']$/g, '');
    if (v === 'true') v = true; else if (v === 'false') v = false;
    else if (/^-?\d+(\.\d+)?$/.test(v)) v = Number(v);
    data[kv[1]] = v;
  }
  return { data, body: src.slice(m[0].length) };
}

function inline(text) {
  let s = escapeHtml(text);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, u) => `<a href="${safeUrl(u)}">${t}</a>`);
  return s;
}

function isTableRow(line) { return /^\|.+\|$/.test(line.trim()); }
function isTableSep(line) { return /^\|[\s\-:|]+\|$/.test(line.trim()); }
function parseTableCells(line) { return line.trim().slice(1, -1).split('|').map(c => c.trim()); }

function extractFences(md) {
  const fences = [];
  const body = md.replace(/```(\w*)\r?\n([\s\S]*?)```/g, (_, lang, code) => {
    const id = fences.length;
    fences.push({ lang: lang || 'text', code: escapeHtml(code.replace(/\n$/, '')) });
    return `\n\x00FENCE${id}\x00\n`;
  });
  return { body, fences };
}

export function markdownToHtml(md) {
  const { body, fences } = extractFences(md);
  const lines = body.split(/\r?\n/);
  const out = [];
  let list = null, para = [];
  const flushPara = () => {
    if (!para.length) return;
    const text = para.join(' ');
    const fence = text.match(/^\x00FENCE(\d+)\x00$/);
    if (fence) {
      const f = fences[+fence[1]];
      const cls = f.lang ? ` class="lang-${f.lang}"` : '';
      out.push(`<pre><code${cls}>${f.code}</code></pre>`);
    } else out.push(`<p>${inline(text)}</p>`);
    para = [];
  };
  const flushList = () => { if (list) { out.push(`<${list.tag}>${list.items.map(i => `<li>${inline(i)}</li>`).join('')}</${list.tag}>`); list = null; } };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fenceOnly = line.match(/^\x00FENCE(\d+)\x00$/);
    if (fenceOnly) {
      flushPara(); flushList();
      const f = fences[+fenceOnly[1]];
      const cls = f.lang ? ` class="lang-${f.lang}"` : '';
      out.push(`<pre><code${cls}>${f.code}</code></pre>`);
      continue;
    }
    if (isTableRow(line) && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      flushPara(); flushList();
      const headers = parseTableCells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && isTableRow(lines[i]) && !isTableSep(lines[i])) {
        rows.push(parseTableCells(lines[i]));
        i++;
      }
      i--;
      let tbl = '<table><thead><tr>' + headers.map(h => `<th>${inline(h)}</th>`).join('') + '</tr></thead><tbody>';
      for (const row of rows) tbl += '<tr>' + row.map(c => `<td>${inline(c)}</td>`).join('') + '</tr>';
      out.push(tbl + '</tbody></table>');
      continue;
    }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    const ul = line.match(/^[-*]\s+(.*)$/);
    const ol = line.match(/^\d+\.\s+(.*)$/);
    const bq = line.match(/^>\s?(.*)$/);
    const hr = /^---+$/.test(line.trim());
    if (h) { flushPara(); flushList(); out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); }
    else if (ul) { flushPara(); if (!list || list.tag !== 'ul') { flushList(); list = { tag: 'ul', items: [] }; } list.items.push(ul[1]); }
    else if (ol) { flushPara(); if (!list || list.tag !== 'ol') { flushList(); list = { tag: 'ol', items: [] }; } list.items.push(ol[1]); }
    else if (bq) { flushPara(); flushList(); out.push(`<blockquote>${inline(bq[1])}</blockquote>`); }
    else if (hr) { flushPara(); flushList(); out.push('<hr>'); }
    else if (!line.trim()) { flushPara(); flushList(); }
    else para.push(line.trim());
  }
  flushPara(); flushList();
  return out.join('\n');
}

/**
 * Carica una collection di .md.
 * Con locale: usa dir/<locale>/ se esiste (fallback: dir).
 * @param {string} dir — es. content/blog
 * @param {string|null} locale
 * @param {{ includeDrafts?: boolean, root?: string }} [opts]
 */
export function getCollection(dir, locale, { includeDrafts, root } = {}) {
  const prod = process.env.NODE_ENV === 'production' && includeDrafts !== true;
  if (locale && existsSync(join(dir, locale))) dir = join(dir, locale);
  if (!existsSync(dir)) return [];

  const collectionRoot = root || (() => {
    let d = dir;
    while (d && !existsSync(join(d, 'content.config.js')) && dirname(d) !== d) d = dirname(d);
    return existsSync(join(d, 'content.config.js')) ? d : join(dir, '..', '..');
  })();

  const name = collectionNameFromDir(dir, collectionRoot);

  return readdirSync(dir).filter(f => f.endsWith('.md')).map(f => {
    const filePath = join(dir, f);
    const src = readFileSync(filePath, 'utf8');
    const { data, body } = parseFrontmatter(src);
    let validated = data;
    if (name && _schemas?.[name]) {
      validated = validateEntry(name, data, _schemas[name], filePath);
    }
    if (prod && validated.draft === true) return null;
    return {
      slug: validated.slug || parse(f).name,
      data: validated,
      html: markdownToHtml(body),
      raw: body,
      draft: validated.draft === true,
    };
  }).filter(Boolean).sort((a, b) => {
    if (a.data.order != null || b.data.order != null) return (a.data.order ?? 999) - (b.data.order ?? 999);
    return (b.data.date || '').localeCompare?.(a.data.date || '') || 0;
  });
}

/** Versione async con caricamento schema. */
export async function getCollectionAsync(dir, locale, opts = {}) {
  const collectionRoot = opts.root || resolveContentRoot(dir);
  await loadSchemas(collectionRoot);
  return getCollection(dir, locale, { ...opts, root: collectionRoot });
}

function resolveContentRoot(dir) {
  let d = dir;
  for (let i = 0; i < 5 && d; i++) {
    if (existsSync(join(d, 'content.config.js'))) return d;
    d = dirname(d);
  }
  return dirname(dirname(dir));
}

/** Precarica schema (chiamato dal build). */
export async function preloadContentSchemas(root) {
  return loadSchemas(root);
}
