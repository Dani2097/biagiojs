/**
 * biagiojs — Safe HTML templating.
 * Tagged template con auto-escape di ogni interpolazione:
 *
 *   import { html, raw } from './core/html.js';
 *   html`<h1>${userInput}</h1>`          → userInput escapato (XSS-safe)
 *   html`<div>${raw(trustedHtml)}</div>` → inserito così com'è (solo per HTML generato dal framework)
 *   html`<ul>${items.map(i => html`<li>${i}</li>`)}</ul>` → gli array e i nested html`` si compongono
 */

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ESC[c]);

class Raw {
  constructor(value) { this.value = String(value); }
  toString() { return this.value; }
}

/** Marca una stringa come HTML fidato (bypassa l'escaping). Usare SOLO su output del framework. */
export const raw = v => new Raw(v);

function stringify(v) {
  if (v === null || v === undefined || v === false) return '';
  if (v instanceof Raw) return v.value;
  if (Array.isArray(v)) return v.map(stringify).join('');
  return escapeHtml(v);
}

/** Tagged template: interpolazioni escapate, risultato è Raw (componibile). */
export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) out += stringify(values[i]) + strings[i + 1];
  return new Raw(out);
}

/** Escape per contesto attributo URL (blocca javascript: e data: non-image). */
export function safeUrl(url) {
  const u = String(url).trim();
  if (/^(javascript|vbscript|data):/i.test(u) && !/^data:image\//i.test(u)) return '#';
  return escapeHtml(u);
}
