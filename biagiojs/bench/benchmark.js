/**
 * biagiojs — Benchmark vs baseline "naive".
 */
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderPage } from '../src/ssr.js';
import { hydrationPlan, renderOrder } from '../src/core/scheduler.js';
import { optimize, loadReports } from '../src/core/optimizer.js';
import { ExperimentEngine } from '../src/core/experiments.js';
import buildProductPage from '../demo/pages/index.page.js';

const dir = dirname(fileURLToPath(import.meta.url));

const def = buildProductPage({ ExperimentEngine, userId: 'bench' });
const reports = loadReports(join(dir, '../demo/reports'));
const { thresholds } = optimize(def.graph, reports);
const cvwHtml = await renderPage(def.graph, { ...def, title: def.page.title, site: { name: 'VELOCE', baseUrl: 'https://v.com' }, thresholds, overlay: false });
const cvwPlan = hydrationPlan(def.graph, thresholds);

const naiveDef = buildProductPage({ ExperimentEngine, userId: 'bench' });
for (const n of naiveDef.graph.nodes.values()) {
  n.interactionProbability = 1; n.conversionWeight = Math.max(n.conversionWeight, 0.5);
  if (!n.hydrate) n.hydrate = () => {};
}
const naiveHtml = await renderPage(naiveDef.graph, { head: naiveDef.head, title: 'naive', overlay: false });
const naivePlan = hydrationPlan(naiveDef.graph);

const kb = s => (Buffer.byteLength(s) / 1024).toFixed(1);
const islandJs = (plan) => {
  let bytes = 0;
  for (const { node } of [...plan.eager, ...plan.lazy]) bytes += Buffer.byteLength(node.hydrate?.toString() || '');
  return bytes;
};

/** Prima isola ad alto valore conversion nel sorgente HTML (%) — usa data-cvw-id in prod. */
function firstHighConvOffset(html, graph, plan) {
  const hydrated = new Set([...plan.eager, ...plan.lazy].map(x => x.node.id));
  const top = renderOrder(graph).find(n => n.conversionWeight >= 0.7 && hydrated.has(n.id));
  if (!top) return '—';
  const i = html.indexOf(`data-cvw-id="${top.id}"`);
  if (i < 0) return '—';
  return (i / html.length * 100).toFixed(1);
}

const seoScore = html => ['application/ld+json', 'rel="canonical"', 'og:title', 'BreadcrumbList'].filter(k => html.includes(k)).length;

const rows = [
  ['Isole idratate (eager+lazy)', `${cvwPlan.eager.length}+${cvwPlan.lazy.length}`, `${naivePlan.eager.length}+${naivePlan.lazy.length}`],
  ['JS di isole spedito (byte)', islandJs(cvwPlan), islandJs(naivePlan)],
  ['Peso HTML (KB)', kb(cvwHtml), kb(naiveHtml)],
  ['Prima isola alto-valore nel sorgente (%)', firstHighConvOffset(cvwHtml, def.graph, cvwPlan) + '%', firstHighConvOffset(naiveHtml, naiveDef.graph, naivePlan) + '%'],
  ['Copertura SEO automatica (0-4)', seoScore(cvwHtml), seoScore(naiveHtml)],
];

const jsSaving = (1 - islandJs(cvwPlan) / Math.max(islandJs(naivePlan), 1)) * 100;

let md = `# Benchmark — biagiojs vs baseline naive\n\n| Metrica | biagiojs | Naive |\n|---|---|---|\n`;
for (const [m, a, b] of rows) md += `| ${m} | **${a}** | ${b} |\n`;
md += `\n**JS di idratazione risparmiato: ${jsSaving.toFixed(0)}%**\n`;
writeFileSync(join(dir, 'report.md'), md);
console.log(md);
