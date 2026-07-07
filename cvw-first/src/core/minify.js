/**
 * CVW-First — ottimizzazione output a build time (zero dipendenze).
 *
 * 1. purgeCss(css, html)  — elimina le regole i cui selettori non matchano
 *    l'HTML renderizzato. CVW-First renderizza tutto server-side, quindi
 *    l'HTML finale è la fonte di verità completa (a differenza dei purger
 *    generici che devono indovinare le classi generate dal JS).
 *    Conservativo: in dubbio, la regola resta.
 * 2. minifyCss(css)       — commenti e whitespace via.
 * 3. minifyHtml(html)     — whitespace tra i tag (salta pre/textarea/script/style).
 * 4. minifyInlineScripts  — esbuild (arriva con vite) sui <script> inline; no-op senza.
 */

// ---------- CSS ----------
export function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}

/** Estrae classi, id e tag usati nell'HTML. */
function usedTokens(html) {
  const classes = new Set(), ids = new Set(), tags = new Set();
  for (const m of html.matchAll(/class="([^"]*)"/g)) for (const c of m[1].split(/\s+/)) if (c) classes.add(c);
  for (const m of html.matchAll(/id="([^"]*)"/g)) if (m[1]) ids.add(m[1]);
  for (const m of html.matchAll(/<([a-zA-Z][\w-]*)/g)) tags.add(m[1].toLowerCase());
  return { classes, ids, tags };
}

/** Un selettore "sopravvive" se ogni sua classe/id/tag è presente nell'HTML. */
function selectorUsed(sel, used) {
  // pseudo-elementi/classi e attributi non decidono la presenza
  const clean = sel.replace(/::?[\w-]+(\([^)]*\))?/g, '').replace(/\[[^\]]*\]/g, '');
  if (/^\s*$/.test(clean)) return true;                       // es. ::selection, :root scomposti
  if (/[*]|:root|html|body/.test(clean)) return true;         // sempre vivi
  for (const m of clean.matchAll(/\.([\w-]+)/g)) if (!used.classes.has(m[1])) return false;
  for (const m of clean.matchAll(/#([\w-]+)/g)) if (!used.ids.has(m[1])) return false;
  const tagMatches = clean.matchAll(/(?:^|[\s>+~,(])([a-zA-Z][\w-]*)/g);
  for (const m of tagMatches) {
    const t = m[1].toLowerCase();
    if (['not', 'is', 'where', 'has'].includes(t)) continue;
    if (!used.tags.has(t)) return false;
  }
  return true;
}

export function purgeCss(css, html) {
  const used = usedTokens(html);
  let out = '';
  let i = 0;
  while (i < css.length) {
    const brace = css.indexOf('{', i);
    if (brace === -1) { out += css.slice(i); break; }
    const selector = css.slice(i, brace).trim();

    if (selector.startsWith('@')) {
      if (/^@(media|supports|layer)/.test(selector)) {
        // ricorsione dentro il blocco
        let depth = 1, j = brace + 1;
        while (j < css.length && depth > 0) { if (css[j] === '{') depth++; else if (css[j] === '}') depth--; j++; }
        const inner = purgeCss(css.slice(brace + 1, j - 1), html);
        if (inner.trim()) out += selector + '{' + inner + '}';
        i = j;
      } else {
        // @font-face, @keyframes, @import…: tieni intatto
        let depth = 1, j = brace + 1;
        while (j < css.length && depth > 0) { if (css[j] === '{') depth++; else if (css[j] === '}') depth--; j++; }
        out += css.slice(i, j);
        i = j;
      }
      continue;
    }

    const close = css.indexOf('}', brace);
    if (close === -1) { out += css.slice(i); break; }
    const body = css.slice(brace + 1, close);
    const kept = selector.split(',').map(s => s.trim()).filter(s => selectorUsed(s, used));
    if (kept.length) out += kept.join(',') + '{' + body + '}';
    i = close + 1;
  }
  return out;
}

// ---------- HTML ----------
export function minifyHtml(html) {
  const guards = [];
  // proteggi blocchi sensibili al whitespace
  html = html.replace(/<(pre|textarea|script|style)\b[\s\S]*?<\/\1>/gi, m => {
    guards.push(m); return `\x00G${guards.length - 1}\x00`;
  });
  html = html
    .replace(/<!--(?!\[)[\s\S]*?-->/g, '')   // commenti (non conditional)
    .replace(/>\s+</g, '><')                  // spazi tra tag
    .replace(/\s{2,}/g, ' ');
  return html.replace(/\x00G(\d+)\x00/g, (_, n) => guards[+n]);
}

// ---------- JS inline (esbuild, opzionale) ----------
export async function minifyInlineScripts(html) {
  let esbuild;
  try { esbuild = await import('esbuild'); }
  catch { return { html, minified: false }; }

  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  for (const m of scripts) {
    try {
      const { code } = await esbuild.transform(m[1], { minify: true });
      html = html.replace(m[0], '<script>' + code + '</script>');
    } catch { /* script non standard: lascia com'è */ }
  }
  return { html, minified: true };
}

/** Pipeline completa su una pagina renderizzata. Ritorna { html, saved } (byte risparmiati). */
export async function optimizeHtml(html, { purge = true, minify = true, scripts = true } = {}) {
  const before = Buffer.byteLength(html);
  if (purge || minify) {
    html = html.replace(/<style>([\s\S]*?)<\/style>/g, (_, css) => {
      let out = css;
      if (purge) out = purgeCss(out, html);
      if (minify) out = minifyCss(out);
      return out.trim() ? '<style>' + out + '</style>' : '';
    });
  }
  if (minify) html = minifyHtml(html);
  if (scripts) ({ html } = await minifyInlineScripts(html));
  return { html, saved: before - Buffer.byteLength(html) };
}
