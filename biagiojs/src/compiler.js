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
 */
import { readFileSync } from 'node:fs';
import { PerfNode, PerformanceGraph } from './core/graph.js';

function parseAttrs(str) {
  const attrs = {};
  for (const m of str.matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    attrs[m[1]] = m[2] ?? m[3];
  }
  return attrs;
}

const num = (v, d) => v === undefined ? d : Number(v);

/** Compila il sorgente .biagio in una definizione di pagina { default } usabile dal CLI. */
export function compileBiagio(source, filename = 'anonymous.biagio') {
  // <page ... /> — metadati pagina
  const pageMatch = source.match(/<page\s+([\s\S]*?)\/>/);
  if (!pageMatch) throw new Error(`[biagio compiler] ${filename}: manca il tag <page ... />`);
  const pa = parseAttrs(pageMatch[1]);
  const page = {
    title: pa.title || 'Untitled',
    description: pa.description || '',
    ...(pa.type ? { type: pa.type } : {}),
    ...(pa.image ? { image: pa.image } : {}),
    ...(pa.sitemapPriority ? { sitemapPriority: Number(pa.sitemapPriority) } : {}),
    ...(pa.lastmod ? { lastmod: pa.lastmod } : {}),
    ...(pa.noindex === 'true' ? { noindex: true } : {}),
  };
  // <page overlay="true|false" /> forza l'overlay indipendentemente da build/dev
  const overlayAttr = pa.overlay === undefined ? undefined : pa.overlay === 'true';

  // <style> globale → head
  const styleMatch = source.match(/<style>([\s\S]*?)<\/style>(?![\s\S]*<\/component>)/);
  const css = styleMatch ? styleMatch[1] : '';

  // <component ...> ... </component>
  const components = [];
  for (const m of source.matchAll(/<component\s+([^>]*)>([\s\S]*?)<\/component>/g)) {
    const attrs = parseAttrs(m[1]);
    const body = m[2];
    if (!attrs.id) throw new Error(`[biagio compiler] ${filename}: component senza id`);

    const tpl = body.match(/<template>([\s\S]*?)<\/template>/);
    if (!tpl) throw new Error(`[biagio compiler] ${filename}: component "${attrs.id}" senza <template>`);
    const templateHtml = tpl[1].trim();

    const hyd = body.match(/<script\s+hydrate>([\s\S]*?)<\/script>/);
    let hydrate;
    if (hyd) {
      try { hydrate = new Function('el', hyd[1]); }
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
        render: () => templateHtml,
        ...(hydrate ? { hydrate } : {}),
        ...(attrs.client ? { clientModule: attrs.client } : {}),
        ...(attrs.props ? { clientProps: JSON.parse(attrs.props) } : {}),
        // hydrate="inline|eager|visible|idle|never": override esplicito dello scheduler
        ...(attrs.hydrate && ['inline', 'eager', 'visible', 'idle', 'never'].includes(attrs.hydrate) ? { hydrateMode: attrs.hydrate } : {}),
        // consent="marketing|analytics": l'isola non si idrata senza consenso GDPR
        ...(attrs.consent ? { consent: attrs.consent } : {}),
      },
    });
  }
  if (!components.length) throw new Error(`[biagio compiler] ${filename}: nessun <component>`);

  // definizione pagina equivalente a un .page.js
  return {
    default: function (ctx = {}) {
      // i18n: {{t:chiave}} risolto con ctx.t (se il sito è multilingua)
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
