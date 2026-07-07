/**
 * CVW-First — SSR renderer.
 * Renders the Performance Graph to HTML in conversion-driven order,
 * embeds the hydration plan + island code, and emits the metrics runtime.
 */
import { renderOrder, hydrationPlan } from './core/scheduler.js';
import { HYDRATION_RUNTIME } from './core/hydration.js';
import { METRICS_RUNTIME } from './core/metrics.js';
import { seoHead, breadcrumbHtml } from './core/seo.js';
import { networkHead } from './core/network.js';
import { SIGNALS_RUNTIME } from './core/signals.js';
import { WEBVITALS_RUNTIME } from './core/webvitals.js';
import { consentBlocks } from './core/consent.js';

/** Live metrics overlay (dev tool). */
const OVERLAY_RUNTIME = `
(function(){
  const box = document.createElement('div');
  box.style.cssText='position:fixed;bottom:12px;right:12px;background:#111c;backdrop-filter:blur(6px);color:#7CFC98;font:12px/1.6 ui-monospace,monospace;padding:10px 14px;border-radius:10px;z-index:9999;min-width:220px';
  document.body.appendChild(box);
  const fmt = v => v===null ? '-' : v+' ms';
  // soglie Google: [good, poor]
  const TH = { LCP: [2500, 4000], CLS: [0.1, 0.25], INP: [200, 500], FCP: [1800, 3000], TTFB: [800, 1800] };
  const col = (k, v) => {
    if (v === null || v === undefined) return '#888';
    const [g, p] = TH[k];
    return v <= g ? '#7CFC98' : v <= p ? '#f5c518' : '#ff6b6b';
  };
  const vital = (k, v, unit) => '<span style="color:'+col(k,v)+'">'+k+' '+(v===null||v===undefined?'-':v+(unit||' ms'))+'</span>';
  let M = window.__CVW_METRICS__||{}, V = window.__CVW_VITALS__||{CLS:0};
  function draw(){
    const plan = window.__CVW_PLAN__||{};
    box.innerHTML = '<b style="color:#fff">Core Web Vitals (live)</b><br>'
      + vital('LCP', V.LCP) + ' · ' + vital('CLS', V.CLS, '') + ' · ' + vital('INP', V.INP) + '<br>'
      + vital('FCP', V.FCP) + ' · ' + vital('TTFB', V.TTFB) + '<br>'
      + '<b style="color:#fff">CVW-First metrics</b><br>'
      + 'CFP&nbsp; (Conversion First Paint): '+fmt(M.CFP)+'<br>'
      + 'FAR&nbsp; (First Action Ready): '+fmt(M.FAR)+'<br>'
      + 'RFI&nbsp; (Revenue First Interactive): '+fmt(M.RFI)+'<br>'
      + 'SCRT (SEO Critical Render): '+fmt(M.SCRT)+'<br>'
      + 'CDI&nbsp; (Conversion Delay Index): '+fmt(M.CDI)+'<br>'
      + '<span style="color:#aaa">islands: '+(plan.eager||[]).length+' eager / '+(plan.lazy||[]).length+' lazy / '+(plan.static||[]).length+' static</span>';
  }
  document.addEventListener('cvw:metrics', e => { M = e.detail; draw(); });
  document.addEventListener('cvw:vitals', e => { V = e.detail; draw(); });
  draw();
})();
`;

export function renderPage(graph, {
  title = 'CVW-First Demo', head = '', overlay = true,
  site = null, page = null,          // §8 automatic SEO (site+page config)
  assets = [],                       // §10 network scheduler
  experiments = null,                // §11 ExperimentEngine instance
  thresholds = {},                   // §7 optimizer-tuned hydration thresholds
  islandSources = {},                // { '/islands/x.js': codice } per isole inline (data-URI)
} = {}) {
  const order = renderOrder(graph);
  const plan = hydrationPlan(graph, thresholds);
  const autoSeo = site && page ? seoHead(site, page) : '';
  const net = assets.length ? networkHead(assets) : { html: '', log: [] };
  const crumbs = page ? breadcrumbHtml(page) : '';
  const consent = consentBlocks(site?.consent);

  const body = order.map(node => {
    const attrs = [
      `data-cvw-id="${node.id}"`,
      node.conversionWeight >= 0.7 ? 'data-cvw-conversion="high"' : '',
      node.seoWeight >= 0.7 ? 'data-cvw-seo="high"' : '',
      node.conversionWeight >= 0.7 && (node.hydrate || node.clientModule) ? 'data-cvw-revenue="true"' : '',
    ].filter(Boolean).join(' ');
    return `<div ${attrs} style="order:${node.domOrder ?? 0}">${node.render()}</div>`;
  }).join('\n');

  const interactiveNodes = [...graph.nodes.values()].filter(n => (n.hydrate || n.clientModule) && n.hydrateMode !== 'never');
  const islands = interactiveNodes
    .map(n => {
      // gating GDPR: {"c":"marketing", ...} → idratazione solo post-consenso
      if (!n.clientModule) {
        return n.consent
          ? `"${n.id}": {"c": ${JSON.stringify(n.consent)}, "f": ${n.hydrate.toString()}}`
          : `"${n.id}": ${n.hydrate.toString()}`;
      }
      // micro-isola critica INLINE: modulo embeddato come data-URI → zero richieste
      // di rete, niente catena LCP, semantica ESM intatta (import CDN inclusi)
      const c = n.consent ? `"c": ${JSON.stringify(n.consent)}, ` : '';
      if (n.hydrateMode === 'inline' && islandSources[n.clientModule]) {
        const uri = 'data:text/javascript;base64,' + Buffer.from(islandSources[n.clientModule]).toString('base64');
        return `"${n.id}": {${c}"m": ${JSON.stringify(uri)}}`;
      }
      return `"${n.id}": {${c}"m": ${JSON.stringify(n.clientModule)}}`;
    })
    .join(',\n  ');
  const hasIslands = interactiveNodes.length > 0;

  // modulepreload per le isole eager esterne: il browser scarica il modulo in
  // parallelo all'HTML invece di scoprirlo dopo (elimina la catena critica)
  const preloads = [...new Set(plan.eager
    .map(({ node }) => node.clientModule)
    .filter(m => m && !(interactiveNodes.find(n => n.clientModule === m)?.hydrateMode === 'inline')))]
    .map(m => `<link rel="modulepreload" href="${m}">`).join('\n');

  const islandProps = Object.fromEntries([...graph.nodes.values()]
    .filter(n => n.clientProps).map(n => [n.id, n.clientProps]));

  const planJson = JSON.stringify({
    eager: plan.eager.map(({ node, priority }) => ({ id: node.id, priority: +priority.toFixed(3) })),
    lazy: plan.lazy.map(({ node, priority }) => ({ id: node.id, priority: +priority.toFixed(3) })),
    static: plan.static.map(({ node, priority }) => ({ id: node.id, priority: +priority.toFixed(3) })),
  }, null, 0);

  return `<!doctype html>
<html lang="${page?.locale || site?.lang || 'it'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
${consent.head}
${net.html}
${preloads}
${autoSeo}
${head}
${hasIslands || overlay ? `<script>window.__CVW_PLAN__=${planJson};<\/script>` : ''}
</head>
<body>
${crumbs}
<main style="display:flex;flex-direction:column">
${body}
</main>
${consent.body}
${experiments ? experiments.beacon() : ''}
${hasIslands ? `<script>window.__CVW_PROPS__=${JSON.stringify(islandProps)};<\/script>
<script>window.__CVW_ISLANDS__={
  ${islands}
};<\/script>
<script>${SIGNALS_RUNTIME}<\/script>
${overlay ? `<script>${METRICS_RUNTIME}<\/script>` : ''}
<script>${HYDRATION_RUNTIME}<\/script>` : ''}
${overlay ? `${hasIslands ? '' : `<script>${METRICS_RUNTIME}<\/script>`}<script>${WEBVITALS_RUNTIME}<\/script>
<script>${OVERLAY_RUNTIME}<\/script>` : ''}
</body>
</html>`;
}
