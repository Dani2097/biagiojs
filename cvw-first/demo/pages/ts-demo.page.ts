/** Demo TypeScript: .page.ts compilata da Vite in dev E in build. */
import { PerfNode, PerformanceGraph } from '../../src/core/graph.js';

interface Model { name: string; price: number }
const models: Model[] = [{ name: 'AeroFoam X-1', price: 129 }];

export default function () {
  const g = new PerformanceGraph()
    .add(new PerfNode('list', {
      seoWeight: 0.8, conversionWeight: 0.6,
      render: (): string => `<section style="font-family:system-ui;max-width:720px;margin:0 auto;padding:48px 24px"><h1>Pagina TypeScript</h1>${models.map(m => `<p>${m.name} — €${m.price}</p>`).join('')}</section>`,
    }));
  g.get('list').domOrder = 0;
  return { graph: g, page: { title: 'TS Demo — VELOCE', description: 'Pagina scritta in TypeScript.', sitemapPriority: 0.3 } };
}
