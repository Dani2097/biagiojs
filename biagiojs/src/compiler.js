/**
 * biagiojs — compiler per la sintassi single-file `.page.biagio` (paper §3).
 *
 * Formato dichiarativo, stile Astro/Vue SFC ma business-first:
 *
 *   <page title="Chi siamo" description="..." sitemapPriority="0.8" />
 *
 *   <component id="hero" seo="1" conversion="0.8" cpu="2">
 *     <template>
 *       <section><h1>Chi siamo</h1></section>
 *     </template>
 *   </component>
 *
 *   <component id="cta" conversion="1" interaction="0.8">
 *     <template><button id="go">Contattaci</button></template>
 *     <script hydrate>
 *       el.querySelector('#go').addEventListener('click', () => alert('ciao'));
 *     </script>
 *   </component>
 *
 *   <component id="stock" conversion="0.9" interaction="0.6"
 *              client="/islands/stock-react.js" props='{"initial": 5}'>
 *     <template><div data-react-root>caricamento…</div></template>
 *   </component>
 *
 *   <style> body { margin: 0 } </style>
 *
 * Attributi component: seo, conversion, interaction, cpu, memory, network,
 * deps="a,b", client (modulo isola), props (JSON). L'ordine visivo (domOrder)
 * è l'ordine di apparizione nel file; l'ordine di RENDERING lo decide lo scheduler.
 *
 * Il parsing è un tokenizer quote-aware (non una sequenza di regex fragili): gestisce
 * `>` dentro gli attributi, `<template>` annidati, commenti HTML a livello top,
 * più blocchi `<style>` e `</script>` nel corpo dei component.
 */
import { readFileSync } from 'node:fs';
import { PerfNode, PerformanceGraph, normalizeBusinessWeights } from './core/graph.js';

/** Indice → numero riga (1-based) nel sorgente. */
function lineAt(source, index) {
  return source.slice(0, index).split('\n').length;
}

function errAt(source, index, filename, message) {
  const line = lineAt(source, index);
  throw new Error(`[biagio compiler] ${filename}:${line}: ${message}`);
}

/** Estrae gli attributi da una stringa di apertura tag, rispettando le virgolette. */
function parseAttrs(str) {
  const attrs = {};
  for (const m of str.matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    attrs[m[1]] = m[2] ?? m[3];
  }
  return attrs;
}

const num = (v, d) => v === undefined ? d : Number(v);

/**
 * Indice del `>` che chiude il tag iniziato a `from`, ignorando i `>` dentro
 * valori tra virgolette. Ritorna -1 se non chiuso.
 */
function findTagEnd(src, from) {
  let quote = null;
  for (let i = from; i < src.length; i++) {
    const c = src[i];
    if (quote) { if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'") { quote = c; continue; }
    if (c === '>') return i;
  }
  return -1;
}

/** Contenuto del primo blocco `<template>…</template>` con conteggio dell'annidamento. */
function extractTemplate(body) {
  const open = /<template(?:\s[^>]*)?>/i.exec(body);
  if (!open) return null;
  let depth = 1;
  const tag = /<(\/?)template(?:\s[^>]*)?>/gi;
  tag.lastIndex = open.index + open[0].length;
  let m;
  while ((m = tag.exec(body))) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return body.slice(open.index + open[0].length, m.index);
  }
  return null; // template non chiuso
}

/** Corpo del blocco `<script hydrate>…</script>` (null se assente). */
function extractHydrateScript(body) {
  const m = body.match(/<script(?:\s[^>]*?)?\bhydrate\b(?:[^>]*)?>([\s\S]*?)<\/script>/i);
  return m ? m[1] : null;
}

/**
 * Tokenizza il sorgente `.biagio` in { page, css, components[] }.
 * Scanner a passo singolo su tag top-level: <page/>, <component>…</component>, <style>…</style>.
 * I commenti HTML top-level vengono ignorati (un component "commentato" non viene compilato).
 */
function tokenize(source, filename) {
  let page = null;
  let css = '';
  const components = [];
  let overlayAttr;

  let i = 0;
  const n = source.length;
  while (i < n) {
    const lt = source.indexOf('<', i);
    if (lt < 0) break;
    const rest = source.slice(lt);

    if (rest.startsWith('<!--')) {
      const end = source.indexOf('-->', lt + 4);
      i = end < 0 ? n : end + 3;
      continue;
    }

    if (/^<page[\s/>]/i.test(rest)) {
      const end = findTagEnd(source, lt + 5);
      if (end < 0) errAt(source, lt, filename, 'tag <page> non chiuso');
      const inner = source.slice(lt + 5, end).replace(/\/\s*$/, '');
      const pa = parseAttrs(inner);
      page = {
        title: pa.title || 'Untitled',
        description: pa.description || '',
        ...(pa.type ? { type: pa.type } : {}),
        ...(pa.image ? { image: pa.image } : {}),
        ...(pa.sitemapPriority ? { sitemapPriority: Number(pa.sitemapPriority) } : {}),
        ...(pa.lastmod ? { lastmod: pa.lastmod } : {}),
        ...(pa.noindex === 'true' ? { noindex: true } : {}),
      };
      overlayAttr = pa.overlay === undefined ? undefined : pa.overlay === 'true';
      i = end + 1;
      continue;
    }

    if (/^<component[\s>]/i.test(rest)) {
      const openEnd = findTagEnd(source, lt + 10);
      if (openEnd < 0) errAt(source, lt, filename, 'tag <component> non chiuso');
      const attrs = parseAttrs(source.slice(lt + 10, openEnd));
      const close = source.toLowerCase().indexOf('</component>', openEnd);
      if (close < 0) errAt(source, lt, filename, `component "${attrs.id || '?'}" senza </component>`);
      const body = source.slice(openEnd + 1, close);
      components.push({ attrs, body });
      i = close + '</component>'.length;
      continue;
    }

    if (/^<style[\s>]/i.test(rest)) {
      const openEnd = findTagEnd(source, lt + 6);
      const close = source.toLowerCase().indexOf('</style>', openEnd);
      if (openEnd < 0 || close < 0) { i = lt + 1; continue; }
      css += source.slice(openEnd + 1, close);
      i = close + '</style>'.length;
      continue;
    }

    i = lt + 1;
  }

  return { page, css, components, overlayAttr };
}

/** Compila il sorgente .biagio in una definizione di pagina { default } usabile dal CLI. */
export function compileBiagio(source, filename = 'anonymous.biagio', { weights } = {}) {
  const { page, css, components: rawComponents, overlayAttr } = tokenize(source, filename);
  if (!page) errAt(source, 0, filename, 'manca il tag <page ... />');

  const nodeWeights = weights ? normalizeBusinessWeights(weights) : undefined;

  const components = [];
  for (const { attrs, body } of rawComponents) {
    if (!attrs.id) throw new Error(`[biagio compiler] ${filename}: component senza id`);

    const templateHtml = extractTemplate(body);
    if (templateHtml === null) throw new Error(`[biagio compiler] ${filename}: component "${attrs.id}" senza <template>`);

    const hydrateSource = extractHydrateScript(body);
    if (hydrateSource != null) {
      // `new Function` qui è SOLO validazione di sintassi a build-time: non esegue nulla
      // (l'esecuzione avviene lato client). La sorgente grezza viene emessa diretta dal
      // renderer, senza round-trip via Function.prototype.toString.
      try { new Function('el', hydrateSource); }
      catch (e) { throw new Error(`[biagio compiler] ${filename}: script hydrate di "${attrs.id}" non valido: ${e.message}`); }
    }

    components.push({
      id: attrs.id,
      opts: {
        cpuCost: num(attrs.cpu, 1),
        memoryCost: num(attrs.memory, 1),
        networkCost: num(attrs.network, 0),
        seoWeight: num(attrs.seo, 0),
        conversionWeight: num(attrs.conversion, 0),
        interactionProbability: num(attrs.interaction, 0),
        dependencies: attrs.deps ? attrs.deps.split(',').map(s => s.trim()) : [],
        render: () => templateHtml.trim(),
        ...(hydrateSource != null ? { hydrateSource, hydrate: new Function('el', hydrateSource) } : {}),
        ...(attrs.client ? { clientModule: attrs.client } : {}),
        ...(attrs.props ? { clientProps: JSON.parse(attrs.props) } : {}),
        ...(attrs.hydrate && ['inline', 'eager', 'visible', 'idle', 'never'].includes(attrs.hydrate) ? { hydrateMode: attrs.hydrate } : {}),
        ...(attrs.consent ? { consent: attrs.consent } : {}),
        ...(nodeWeights ? { weights: nodeWeights } : {}),
      },
    });
  }
  if (!components.length) throw new Error(`[biagio compiler] ${filename}: nessun <component>`);

  return {
    default: function (ctx = {}) {
      const tr = s => typeof s === 'string' && ctx.t ? s.replace(/\{\{t:([\w.-]+)\}\}/g, (_, k) => ctx.t(k)) : s;
      const g = new PerformanceGraph();
      components.forEach(({ id, opts }, i) => {
        const render = opts.render;
        g.add(new PerfNode(id, { ...opts, render: () => tr(render()) }));
        g.get(id).domOrder = i;             // ordine visivo = ordine nel file
      });
      return {
        graph: g,
        head: css ? `<style>${css}</style>` : '',
        page: { ...page, title: tr(page.title), description: tr(page.description) },
        ...(overlayAttr !== undefined ? { overlay: overlayAttr } : {}),
      };
    },
  };
}

/** Carica e compila un file .biagio dal disco. */
export function loadBiagioFile(path) {
  return compileBiagio(readFileSync(path, 'utf8'), path);
}

/** @deprecated Usa compileBiagio */
export const compileCvw = compileBiagio;
/** @deprecated Usa loadBiagioFile */
export const loadCvwFile = loadBiagioFile;
