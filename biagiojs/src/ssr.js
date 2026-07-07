/**
 * biagiojs — SSR renderer.
 */
import { renderOrder, hydrationPlan } from './core/scheduler.js';
import { METRICS_RUNTIME } from './core/metrics.js';
import { seoHead, breadcrumbHtml } from './core/seo.js';
import { networkHead } from './core/network.js';
import { WEBVITALS_RUNTIME } from './core/webvitals.js';
import { consentBlocks } from './core/consent.js';
import { fontHead } from './core/fonts.js';
import {
  compactPlan,
  needsSignalsRuntime,
  inlineIslandUri,
  nodeWrapperAttrs,
  assembleClientRuntime,
  minifyClientRuntime,
} from './core/runtime-bundle.js';

const OVERLAY_RUNTIME = `
(function(){
  const box = document.createElement('div');
  box.style.cssText='position:fixed;bottom:12px;right:12px;background:#111c;backdrop-filter:blur(6px);color:#7CFC98;font:12px/1.6 ui-monospace,monospace;padding:10px 14px;border-radius:10px;z-index:9999;min-width:220px';
  document.body.appendChild(box);
  const fmt = v => v===null ? '-' : v+' ms';
  const TH = { LCP: [2500, 4000], CLS: [0.1, 0.25], INP: [200, 500], FCP: [1800, 3000], TTFB: [800, 1800] };
  const col = (k, v) => {
    if (v === null || v === undefined) return '#888';
    const [g, p] = TH[k];
    return v <= g ? '#7CFC98' : v <= p ? '#f5c518' : '#ff6b6b';
  };
  const vital = (k, v, unit) => '<span style="color:'+col(k,v)+'">'+k+' '+(v===null||v===undefined?'-':v+(unit||' ms'))+'</span>';
  let M = window.__CVW_METRICS__||{}, V = window.__CVW_VITALS__||{CLS:0};
  function draw(){
    const raw = window.__CVW_PLAN__||{};
    const eN = raw.e?raw.e.length:(raw.eager||[]).length;
    const lN = raw.l?raw.l.length:(raw.lazy||[]).length;
    const sN = raw.static?raw.static.length:0;
    box.innerHTML = '<b style="color:#fff">Core Web Vitals (live)</b><br>'
      + vital('LCP', V.LCP) + ' · ' + vital('CLS', V.CLS, '') + ' · ' + vital('INP', V.INP) + '<br>'
      + vital('FCP', V.FCP) + ' · ' + vital('TTFB', V.TTFB) + '<br>'
      + '<b style="color:#fff">biagiojs metrics</b><br>'
      + 'CFP&nbsp; (Conversion First Paint): '+fmt(M.CFP)+'<br>'
      + 'FAR&nbsp; (First Action Ready): '+fmt(M.FAR)+'<br>'
      + 'RFI&nbsp; (Revenue First Interactive): '+fmt(M.RFI)+'<br>'
      + 'SCRT (SEO Critical Render): '+fmt(M.SCRT)+'<br>'
      + 'CDI&nbsp; (Conversion Delay Index): '+fmt(M.CDI)+'<br>'
      + '<span style="color:#aaa">islands: '+eN+' eager / '+lN+' lazy / '+sN+' static</span>';
  }
  document.addEventListener('cvw:metrics', e => { M = e.detail; draw(); });
  document.addEventListener('cvw:vitals', e => { V = e.detail; draw(); });
  draw();
})();
`;

function isInteractive(node) {
  return (node.hydrate || node.clientModule) && node.hydrateMode !== 'never';
}

export async function renderPage(graph, {
  title = 'biagiojs Demo', head = '', overlay = true,
  site = null, page = null,
  assets = [],
  experiments = null,
  thresholds = {},
  islandSources = {},
  minifyRuntime = true,
} = {}) {
  const order = renderOrder(graph);
  const plan = hydrationPlan(graph, thresholds);
  const autoSeo = site && page ? seoHead(site, page) : '';
  const fonts = site ? fontHead(site) : '';
  const net = assets.length ? networkHead(assets) : { html: '', log: [] };
  const crumbs = page ? breadcrumbHtml(page) : '';
  const consent = consentBlocks(site?.consent);

  const body = order.map(node => {
    const interactive = isInteractive(node);
    const attrs = nodeWrapperAttrs(node, { interactive, overlay });
    const content = node.render();
    // Nodo statico "nudo" (niente id, order, marker): il wrapper <div> è puro
    // overhead → si emette il contenuto diretto come figlio flex di <main>.
    return attrs ? `<div${attrs}>${content}</div>` : content;
  }).join('\n');

  const interactiveNodes = [...graph.nodes.values()].filter(isInteractive);
  const islands = interactiveNodes
    .map(n => {
      if (!n.clientModule) {
        return n.consent
          ? `"${n.id}": {"c": ${JSON.stringify(n.consent)}, "f": ${n.hydrate.toString()}}`
          : `"${n.id}": ${n.hydrate.toString()}`;
      }
      const c = n.consent ? `"c": ${JSON.stringify(n.consent)}, ` : '';
      if (n.hydrateMode === 'inline' && islandSources[n.clientModule]) {
        const uri = inlineIslandUri(islandSources[n.clientModule]);
        return `"${n.id}": {${c}"m": ${JSON.stringify(uri)}}`;
      }
      return `"${n.id}": {${c}"m": ${JSON.stringify(n.clientModule)}}`;
    })
    .join(',\n  ');
  const hasIslands = interactiveNodes.length > 0;

  const preloads = [...new Set(plan.eager
    .map(({ node }) => node.clientModule)
    .filter(m => m && !(interactiveNodes.find(n => n.clientModule === m)?.hydrateMode === 'inline')))]
    .map(m => `<link rel="modulepreload" href="${m}">`).join('\n');

  const islandProps = Object.fromEntries([...graph.nodes.values()]
    .filter(n => n.clientProps).map(n => [n.id, n.clientProps]));

  const planJson = compactPlan(plan);
  const includeSignals = needsSignalsRuntime(interactiveNodes, islandSources);

  let runtimeScript = '';
  if (hasIslands) {
    let bundle = assembleClientRuntime({
      planJson,
      islandProps,
      islandsCode: islands,
      includeSignals,
      includeMetrics: overlay,
    });
    if (minifyRuntime) bundle = await minifyClientRuntime(bundle);
    runtimeScript = `<script>${bundle}<\/script>`;
  } else if (overlay) {
    runtimeScript = `<script>window.__CVW_PLAN__=${planJson};<\/script>`;
  }

  return `<!doctype html>
<html lang="${page?.locale || site?.lang || 'it'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
${consent.head}
${fonts}
${net.html}
${preloads}
${autoSeo}
${head}
</head>
<body>
${crumbs}
<main style="display:flex;flex-direction:column">
${body}
</main>
${consent.body}
${experiments ? experiments.beacon() : ''}
${runtimeScript}
${overlay ? `${hasIslands ? '' : `<script>${METRICS_RUNTIME}<\/script>`}<script>${WEBVITALS_RUNTIME}<\/script>
<script>${OVERLAY_RUNTIME}<\/script>` : ''}
</body>
</html>`;
}
