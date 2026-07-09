/**
 * `biagio explain <page>` — analisi render order, hydration e pesi senza build completo.
 */
import { existsSync, readFileSync, statSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadBiagioFile } from '../compiler.js';
import { loadReports, optimize } from './optimizer.js';
import { renderOrder, hydrationPlan } from './scheduler.js';
import { loadConfig } from './config.js';
import { getCollection } from './content.js';
import { ExperimentEngine } from './experiments.js';
import { loadLocale, makeT } from './i18n.js';

function estimateIslandKb(node, islandSizes = {}) {
  if (!node.hydrate && !node.hydrateSource && !node.clientModule) return 0;
  if (node.hydrateMode === 'never') return 0;
  if (node.clientModule && islandSizes[node.clientModule]) {
    return Math.round(islandSizes[node.clientModule] / 1024 * 10) / 10;
  }
  if (node.hydrateSource) return Math.max(0.3, Math.round((node.hydrateSource.length + 40) / 1024 * 10) / 10);
  if (node.hydrate) return Math.max(0.5, Math.round(node.hydrate.toString().length / 1024 * 10) / 10);
  return 0;
}

function loadIslandSizes(root) {
  const sizes = {};
  const dir = join(root, 'islands');
  if (!existsSync(dir)) return sizes;
  for (const f of readdirSync(dir).filter(x => x.endsWith('.js'))) {
    const p = `/islands/${f}`;
    sizes[p] = statSync(join(dir, f)).size;
  }
  return sizes;
}

async function loadPageMod(root, relPath) {
  const full = join(root, 'pages', relPath);
  if (!existsSync(full)) throw new Error(`Pagina non trovata: pages/${relPath}`);
  if (relPath.endsWith('.biagio')) return loadBiagioFile(full);
  if (relPath.endsWith('.ts')) {
    const esbuild = await import('esbuild').catch(() => null);
    if (!esbuild) throw new Error('Pagine .ts richiedono esbuild o vite');
    const { code } = await esbuild.transform(readFileSync(full, 'utf8'), { loader: 'ts', format: 'esm' });
    return await import(`data:application/javascript;base64,${Buffer.from(code).toString('base64')}`);
  }
  return await import(pathToFileURL(full).href + '?t=' + Date.now());
}

function normalizePageArg(arg, root) {
  let p = arg.replace(/\\/g, '/');
  if (p.startsWith('pages/')) p = p.slice(6);
  if (!/\.page\.(js|ts|biagio)$/.test(p)) {
    for (const ext of ['biagio', 'js', 'ts']) {
      const candidate = `${p}.page.${ext}`;
      if (existsSync(join(root, 'pages', candidate))) return candidate;
    }
    throw new Error(`Nessuna pagina corrispondente a "${arg}"`);
  }
  return p;
}

/**
 * @param {string} root
 * @param {string} pageArg
 * @param {{ withReports?: boolean, locale?: string }} [opts]
 */
export async function explainPage(root, pageArg, { withReports = true, locale = null } = {}) {
  root = resolve(root);
  const rel = normalizePageArg(pageArg, root);
  const config = await loadConfig(root);
  const { site } = config;
  const mod = await loadPageMod(root, rel);
  const reports = withReports ? loadReports(join(root, 'reports')) : {};
  const islandSizes = loadIslandSizes(root);
  const defaultLocale = site.defaultLocale || site.locales?.[0] || null;
  const loc = locale || defaultLocale;
  const ctx = {
    site,
    reports,
    ExperimentEngine,
    userId: 'explain',
    locale: loc,
    defaultLocale,
    t: makeT(loadLocale(root, loc)),
    getCollection: d => getCollection(join(root, d), loc),
    params: {},
    props: {},
  };

  let variants = [{ params: {}, props: {} }];
  const routeBase = rel.replace(/\.page\.(js|ts|biagio)$/, '').replace(/\/index$/, '');
  if (/\[.+\]/.test(routeBase)) {
    if (!mod.getStaticPaths) throw new Error(`pages/${rel} è dinamica ma non esporta getStaticPaths()`);
    variants = await mod.getStaticPaths(ctx);
    if (!variants.length) throw new Error('getStaticPaths() vuoto');
    variants = [variants[0]];
  }

  const def = await mod.default({ ...ctx, ...variants[0] });
  const { graph, page } = def;
  const { thresholds, log: optLog } = optimize(graph, reports);
  const order = renderOrder(graph);
  const plan = hydrationPlan(graph, thresholds);

  const nodes = [...graph.nodes.values()].map(n => ({
    id: n.id,
    businessValue: Math.round(n.businessValue * 1000) / 1000,
    conversion: n.conversionWeight,
    seo: n.seoWeight,
    interaction: n.interactionProbability,
    cpu: n.cpuCost,
    networkKb: n.networkCost,
    domOrder: n.domOrder,
    hydrateMode: n.hydrateMode || null,
    islandKb: estimateIslandKb(n, islandSizes),
    tier: plan.eager.some(x => x.node.id === n.id) ? 'eager'
      : plan.lazy.some(x => x.node.id === n.id) ? 'lazy' : 'static',
  }));

  const totalJsKb = nodes.reduce((s, n) => s + n.islandKb, 0);

  return {
    file: `pages/${rel}`,
    pageTitle: page?.title,
    renderOrder: order.map(n => n.id),
    hydration: {
      eager: plan.eager.map(x => x.node.id),
      lazy: plan.lazy.map(x => x.node.id),
      static: plan.static.map(x => x.node.id),
    },
    thresholds,
    optimizerLog: optLog,
    nodes,
    totalJsKb: Math.round(totalJsKb * 10) / 10,
  };
}

export function formatExplainReport(r) {
  const lines = [
    `\n▸ ${r.file}${r.pageTitle ? ` — "${r.pageTitle}"` : ''}`,
    '',
    'Render order (business priority):',
    '  ' + r.renderOrder.join(' → '),
    '',
    'Hydration plan:',
    `  eager  = [${r.hydration.eager.join(', ')}]`,
    `  lazy   = [${r.hydration.lazy.join(', ')}]`,
    `  static = [${r.hydration.static.join(', ')}]`,
    '',
    `Soglie: eager≥${r.thresholds.eagerThreshold} lazy≥${r.thresholds.lazyThreshold}`,
    `JS isole stimate: ~${r.totalJsKb} KB`,
    '',
    'Componenti:',
    '  id           bizVal  conv  seo   int   tier     ~KB',
  ];
  for (const n of r.nodes) {
    lines.push(
      `  ${n.id.padEnd(12)} ${String(n.businessValue).padStart(5)}  `
      + `${String(n.conversion).padStart(4)}  ${String(n.seo).padStart(4)}  ${String(n.interaction).padStart(4)}  `
      + `${n.tier.padEnd(8)} ${String(n.islandKb).padStart(4)}`,
    );
  }
  if (r.optimizerLog.length) {
    lines.push('', 'Optimizer:');
    for (const l of r.optimizerLog) lines.push('  ' + l);
  }
  return lines.join('\n');
}
