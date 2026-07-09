/**
 * biagiojs — bundle client runtime: piano compatto, signals condizionale, IIFE unico.
 */
import { HYDRATION_RUNTIME } from './hydration.js';
import { SIGNALS_RUNTIME } from './signals.js';
import { METRICS_RUNTIME } from './metrics.js';

const SIGNALS_RE = /\b(signal|effect|computed|bind)\s*\(|window\.cvw\b|cvw\.(signal|effect|computed)/;

/** Piano minimo: { e: eager ids, l: lazy ids } — il client non usa static né priority. */
export function compactPlan(plan) {
  return JSON.stringify({
    e: plan.eager.map(({ node }) => node.id),
    l: plan.lazy.map(({ node }) => node.id),
  });
}

/** Legge piano compatto o legacy (overlay dev). */
export function planCounts(plan) {
  const eager = plan?.e?.length ?? plan?.eager?.length ?? 0;
  const lazy = plan?.l?.length ?? plan?.lazy?.length ?? 0;
  const stat = plan?.static?.length ?? 0;
  return { eager, lazy, static: stat };
}

export function needsSignalsRuntime(interactiveNodes, islandSources = {}) {
  for (const n of interactiveNodes) {
    if (n.hydrateSource && SIGNALS_RE.test(n.hydrateSource)) return true;
    if (n.hydrate && SIGNALS_RE.test(n.hydrate.toString())) return true;
  }
  for (const code of Object.values(islandSources)) {
    if (SIGNALS_RE.test(code)) return true;
  }
  return false;
}

/** data-URI inline: encodeURIComponent se più piccolo di base64. */
export function inlineIslandUri(code) {
  const uriEnc = `data:text/javascript,${encodeURIComponent(code)}`;
  const uriB64 = `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
  return uriEnc.length <= uriB64.length ? uriEnc : uriB64;
}

function unwrapIife(src) {
  const t = src.trim();
  const m = t.match(/^\(function\s*\(\)\s*\{([\s\S]*)\}\)\(\);?$/);
  return m ? m[1].trim() : t;
}

/**
 * Attributi wrapper nodo: `data-cvw-id` solo se interattivo; `order` solo se ≠ 0.
 * I marker metrici `data-cvw-conversion/seo` li leggono solo overlay/metriche (dev),
 * che in produzione non vengono spediti → si emettono solo con `overlay` attivo.
 */
export function nodeWrapperAttrs(node, { interactive, overlay = false, emitVisualOrder = false }) {
  const parts = [];
  if (interactive) {
    parts.push(`data-cvw-id="${node.id}"`);
    if (overlay && node.conversionWeight >= 0.7) parts.push('data-cvw-revenue="true"');
  }
  if (overlay && node.conversionWeight >= 0.7) parts.push('data-cvw-conversion="high"');
  if (overlay && node.seoWeight >= 0.7) parts.push('data-cvw-seo="high"');
  // `style:order` serve SOLO quando il DOM è in ordine di priorità (contentOrder:'priority')
  // e va ripristinato l'ordine visivo. In modalità accessibile (default) il DOM è già
  // in ordine di lettura → nessun flex order (che comunque non sistema tab/screen reader).
  if (emitVisualOrder) {
    const o = node.domOrder ?? 0;
    if (o !== 0) parts.push(`style="order:${o}"`);
  }
  return parts.length ? ' ' + parts.join(' ') : '';
}

/**
 * Neutralizza sequenze `</script` in contenuto iniettato inline in un tag <script>,
 * evitando il break-out del tag (island hydrate, props JSON, piani, ecc.).
 */
export function safeScript(js) {
  return String(js).replace(/<\/(script)/gi, '<\\/$1');
}

/**
 * Assembla un unico IIFE: PLAN + PROPS + ISLANDS + (signals?) + (metrics?) + hydration.
 *
 * I runtime statici (signals/metrics/hydration) girano in blocchi `{}` separati:
 * comunicano solo via `window`, quindi i loro `const`/`let` top-level restano
 * isolati e non collidono tra loro (né con eventuali collisioni future).
 */
export function assembleClientRuntime({
  planJson,
  islandProps,
  islandsCode,
  includeSignals = false,
  includeMetrics = false,
}) {
  const block = src => `{${unwrapIife(src)}}`;
  const chunks = [
    `window.__CVW_PLAN__=${planJson};`,
    Object.keys(islandProps).length ? `window.__CVW_PROPS__=${JSON.stringify(islandProps)};` : '',
    `window.__CVW_ISLANDS__={${islandsCode}};`,
    includeSignals ? block(SIGNALS_RUNTIME) : '',
    includeMetrics ? block(METRICS_RUNTIME) : '',
    block(HYDRATION_RUNTIME),
  ].filter(Boolean);
  return `(function(){${chunks.join('')}})();`;
}

// Cache dei bundle minificati: SSR/ISR ri-renderizzano spesso pagine identiche,
// quindi lo stesso bundle si ripresenta → si evita di ri-invocare esbuild.
const _minifyCache = new Map();
const _MINIFY_CACHE_MAX = 256;

/** Minifica il bundle runtime con esbuild (mangling cross-scope), con cache. */
export async function minifyClientRuntime(code) {
  const hit = _minifyCache.get(code);
  if (hit !== undefined) return hit;
  let out = code;
  try {
    const esbuild = await import('esbuild');
    ({ code: out } = await esbuild.transform(code, { minify: true }));
  } catch { /* esbuild assente: bundle non minificato */ }
  if (_minifyCache.size >= _MINIFY_CACHE_MAX) _minifyCache.delete(_minifyCache.keys().next().value);
  _minifyCache.set(code, out);
  return out;
}
