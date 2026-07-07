/**
 * CVW-First — Benchmark vs baseline "naive".
 * Confronta la pagina prodotto demo con una versione equivalente costruita
 * come farebbe un framework tradizionale: tutto idratato, ordine DOM,
 * tutti gli asset preloadati in ordine di import, nessuna SEO automatica.
 *
 * Misura (statico, senza browser): KB di JS spedito/eseguito, numero di isole,
 * posizione nel sorgente HTML del primo elemento conversion-critical (proxy di CFP),
 * copertura SEO. Con Chrome disponibile, aggiungere Lighthouse CI.
 *
 * Run: node bench/benchmark.js
 */
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PerfNode, PerformanceGraph } from '../src/core/graph.js';
import { renderPage } from '../src/ssr.js';
import { hydrationPlan } from '../src/core/scheduler.js';
import { optimize } from '../src/core/optimizer.js';
import { loadReports } from '../src/core/optimizer.js';
import { ExperimentEngine } from '../src/core/experiments.js';
import buildProductPage from '../demo/pages/index.page.js';

const dir = dirname(fileURLToPath(import.meta.url));

// ---- CVW-First build (con optimizer sui report demo) ----
const def = buildProductPage({ ExperimentEngine, userId: 'bench' });
const reports = loadReports(join(dir, '../demo/reports'));
const { thresholds } = optimize(def.graph, reports);
const cvwHtml = renderPage(def.graph, { ...def, title: def.page.title, site: { name: 'VELOCE', baseUrl: 'https://v.com' }, thresholds });
const cvwPlan = hydrationPlan(def.graph, thresholds);

// ---- baseline naive: stessa pagina, tutto eager, ordine DOM, no SEO auto ----
const naiveDef = buildProductPage({ ExperimentEngine, userId: 'bench' });
for (const n of naiveDef.graph.nodes.values()) {
  n.interactionProbability = 1; n.conversionWeight = Math.max(n.conversionWeight, 0.5); // "tutto è importante"
  if (!n.hydrate) n.hydrate = () => {};   // il framework naive idrata tutto
}
const naiveHtml = renderPage(naiveDef.graph, { head: naiveDef.head, title: 'naive', overlay: false });
const naivePlan = hydrationPlan(naiveDef.graph);

// ---- metriche statiche ----
const kb = s => (Buffer.byteLength(s) / 1024).toFixed(1);
const islandJs = (plan) => {
  let bytes = 0;
  for (const { node } of [...plan.eager, ...plan.lazy]) bytes += Buffer.byteLength(node.hydrate?.toString() || '');
  return bytes;
};
// proxy CFP: offset % nel sorgente del primo data-cvw-conversion="high"
const convOffset = html => (html.indexOf('data-cvw-conversion="high"') / html.length * 100).toFixed(1);
const seoScore = html => ['application/ld+json', 'rel="canonical"', 'og:title', 'BreadcrumbList'].filter(k => html.includes(k)).length;

const rows = [
  ['Isole idratate (eager+lazy)', `${cvwPlan.eager.length}+${cvwPlan.lazy.length}`, `${naivePlan.eager.length}+${naivePlan.lazy.length}`],
  ['JS di isole spedito (byte)', islandJs(cvwPlan), islandJs(naivePlan)],
  ['Peso HTML (KB)', kb(cvwHtml), kb(naiveHtml)],
  ['Primo elemento conversion nel sorgente (%)', convOffset(cvwHtml) + '%', convOffset(naiveHtml) + '%'],
  ['Copertura SEO automatica (0-4)', seoScore(cvwHtml), seoScore(naiveHtml)],
];

const jsSaving = (1 - islandJs(cvwPlan) / Math.max(islandJs(naivePlan), 1)) * 100;

let md = `# Benchmark — CVW-First vs baseline naive\n\nStessa pagina prodotto, due strategie. Baseline = tutto idratato, nessuna prioritizzazione (comportamento di un framework tradizionale senza islands tuning).\n\n| Metrica | CVW-First | Naive |\n|---|---|---|\n`;
for (const [m, a, b] of rows) md += `| ${m} | **${a}** | ${b} |\n`;
md += `\n**JS di idratazione risparmiato: ${jsSaving.toFixed(0)}%** (il paper §13 ipotizza -70% di hydration work: ${jsSaving >= 60 ? 'compatibile' : 'sotto l\'ipotesi'} su questa pagina).\n\n`;
md += `Il "primo elemento conversion nel sorgente" è un proxy statico di CFP: più è basso, prima il contenuto che converte arriva sul wire in streaming.\n\n`;
md += `Limiti: misura statica senza browser. Per numeri di campo (LCP/INP reali) servire le due pagine e usare \`node src/cli.js pull-vitals <url>\` o Lighthouse CI.\n`;

writeFileSync(join(dir, 'report.md'), md);
console.log(md);
