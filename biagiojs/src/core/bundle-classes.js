/**
 * biagiojs — deduplica stringhe class="..." ripetute post-SSR.
 *
 * Per ogni combinazione di classi che compare ≥ minRepeat volte nell'HTML visibile,
 * se ogni token ha una regola in un <style> della pagina, sostituisce con un alias
 * corto e inietta un blocco CSS consolidato. Così purge può eliminare le utility
 * singole non più referenziate nel DOM.
 */

const MARKER_RE = /<meta\s+name=["']biagio-bundle["']\s+content=["']saved=(\d+);aliases=(\d+)["']\s*\/?>/i;

export function parseBundleMarker(html) {
  const m = html.match(MARKER_RE);
  if (!m) return null;
  return { savedBytes: +m[1], aliases: +m[2] };
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Estrae .className { declarations } da CSS semplice (no @keyframes). */
export function parseClassRules(css, rules = new Map()) {
  const stripBlocks = css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/@(?:font-face|keyframes|import)[^{;]+;?/gi, '')
    .replace(/@(?:media|supports|layer)[^{]+\{([\s\S]*?)\}\s*/gi, '$1');
  for (const m of stripBlocks.matchAll(/\.(-?[\w][\w-]*)\s*\{([^}]*)\}/g)) {
    const body = m[2].trim().replace(/\s+/g, ' ');
    if (body) rules.set(m[1], body);
  }
  return rules;
}

function collectRulesFromHtml(html) {
  const rules = new Map();
  html.replace(/<style(\s[^>]*)?>([\s\S]*?)<\/style>/gi, (_, __, css) => {
    parseClassRules(css, rules);
    return '';
  });
  return rules;
}

function normalizeClassValue(val) {
  return val.trim().replace(/\s+/g, ' ');
}

function mergeDeclarations(declsList) {
  const props = new Map();
  for (const decls of declsList) {
    for (const chunk of decls.split(';')) {
      const bit = chunk.trim();
      if (!bit) continue;
      const colon = bit.indexOf(':');
      if (colon === -1) continue;
      props.set(bit.slice(0, colon).trim().toLowerCase(), bit.slice(colon + 1).trim());
    }
  }
  return [...props.values()].join(';');
}

function countClassAttributes(html) {
  const counts = new Map();
  html.replace(/\bclass\s*=\s*(["'])([^"']*)\1/gi, (_, __, val) => {
    const norm = normalizeClassValue(val);
    if (norm) counts.set(norm, (counts.get(norm) || 0) + 1);
    return '';
  });
  return counts;
}

function replaceClassValue(html, from, to) {
  const qFrom = escapeRegex(from);
  const re = new RegExp(
    `<([a-zA-Z][\\w:-]*)(\\s[^>]*)?\\sclass\\s*=\\s*(["'])${qFrom}\\3(\\s[^>]*)?>`,
    'gi',
  );
  return html.replace(re, (full, tag, before = '', q, after = '') => {
    const attrs = `${before}${after}`;
    if (/data-cvw-no-bundle/i.test(attrs)) return full;
    return `<${tag}${before} class=${q}${to}${q}${after}>`;
  });
}

/**
 * @param {string} html
 * @param {{ minRepeat?: number, minTokens?: number, prefix?: string }} opts
 * @returns {{ html: string, savedBytes: number, aliases: number }}
 */
export function bundleClassAttributes(html, { minRepeat = 3, minTokens = 2, prefix = 'u-' } = {}) {
  const rules = collectRulesFromHtml(html);
  if (!rules.size) return { html, savedBytes: 0, aliases: 0 };

  const templates = [];
  let work = html.replace(/<template\b[\s\S]*?<\/template>/gi, (m) => {
    templates.push(m);
    return `\x00T${templates.length - 1}\x00`;
  });

  const counts = countClassAttributes(work);
  const bundles = [];
  let aliasIdx = 0;

  for (const [classStr, count] of counts) {
    if (count < minRepeat) continue;
    const tokens = classStr.split(/\s+/).filter(Boolean);
    if (tokens.length < minTokens) continue;
    if (!tokens.every((t) => rules.has(t))) continue;
    const decls = mergeDeclarations(tokens.map((t) => rules.get(t)));
    if (!decls) continue;
    bundles.push({
      classStr,
      alias: `${prefix}${aliasIdx.toString(36)}`,
      decls,
      count,
    });
    aliasIdx++;
  }

  if (!bundles.length) {
    work = work.replace(/\x00T(\d+)\x00/g, (_, n) => templates[+n]);
    return { html: work, savedBytes: 0, aliases: 0 };
  }

  const beforeBytes = Buffer.byteLength(work);
  for (const b of bundles) work = replaceClassValue(work, b.classStr, b.alias);

  const bundleCss = bundles.map((b) => `.${b.alias}{${b.decls}}`).join('');
  const styleTag = `<style data-cvw-bundle>${bundleCss}</style>`;
  const savedBytes = Math.max(0, beforeBytes - Buffer.byteLength(work) - Buffer.byteLength(bundleCss));
  const marker = `<meta name="biagio-bundle" content="saved=${savedBytes};aliases=${bundles.length}">`;

  if (work.includes('</head>')) {
    work = work.replace('</head>', `${styleTag}${marker}</head>`);
  } else {
    work = styleTag + marker + work;
  }

  work = work.replace(/\x00T(\d+)\x00/g, (_, n) => templates[+n]);
  return { html: work, savedBytes, aliases: bundles.length };
}
