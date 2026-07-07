/**
 * biagiojs — Content collections (Markdown + frontmatter), stile Astro.
 *
 *   import { getCollection } from '../../src/core/content.js';
 *   const posts = getCollection(join(root, 'content/blog'));
 *   // → [{ slug, data: {title, date, ...}, html, raw }]
 *
 * Parser Markdown minimale interno (headings, bold, italic, code, link,
 * liste, blockquote, paragrafi) con output escapato: il contenuto dei .md
 * è testo, non HTML fidato.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, parse } from 'node:path';
import { escapeHtml, safeUrl } from './html.js';

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

export function markdownToHtml(md) {
  const lines = md.split(/\r?\n/);
  const out = [];
  let list = null, para = [];
  const flushPara = () => { if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; } };
  const flushList = () => { if (list) { out.push(`<${list.tag}>${list.items.map(i => `<li>${inline(i)}</li>`).join('')}</${list.tag}>`); list = null; } };

  for (const line of lines) {
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    const ul = line.match(/^[-*]\s+(.*)$/);
    const ol = line.match(/^\d+\.\s+(.*)$/);
    const bq = line.match(/^>\s?(.*)$/);
    if (h) { flushPara(); flushList(); out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); }
    else if (ul) { flushPara(); if (!list || list.tag !== 'ul') { flushList(); list = { tag: 'ul', items: [] }; } list.items.push(ul[1]); }
    else if (ol) { flushPara(); if (!list || list.tag !== 'ol') { flushList(); list = { tag: 'ol', items: [] }; } list.items.push(ol[1]); }
    else if (bq) { flushPara(); flushList(); out.push(`<blockquote>${inline(bq[1])}</blockquote>`); }
    else if (!line.trim()) { flushPara(); flushList(); }
    else para.push(line.trim());
  }
  flushPara(); flushList();
  return out.join('\n');
}

/** Carica una collection di .md. Con locale: usa dir/<locale>/ se esiste (fallback: dir). */
export function getCollection(dir, locale) {
  if (locale && existsSync(join(dir, locale))) dir = join(dir, locale);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => f.endsWith('.md')).map(f => {
    const src = readFileSync(join(dir, f), 'utf8');
    const { data, body } = parseFrontmatter(src);
    return { slug: data.slug || parse(f).name, data, html: markdownToHtml(body), raw: body };
  }).sort((a, b) => (b.data.date || '').localeCompare?.(a.data.date || '') || 0);
}
