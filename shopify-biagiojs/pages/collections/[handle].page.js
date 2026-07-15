/**
 * Collection listing  one static page per collection (SSG + ISR).
 * Pure static HTML: zero JavaScript beyond the header cart badge.
 */
import { PerfNode, PerformanceGraph } from 'biagiojs/graph';
import { headerNode, footerNode, head } from '../../lib/shell.js';
import { catalogSection, categorySidebar, esc } from '../../theme.js';
import { isConfigured } from '../../lib/shopify.js';
import { allCollectionHandles, collectionByHandle, collectionsNav } from '../../lib/queries.js';

export const revalidate = 600;

export async function getStaticPaths() {
  if (!isConfigured()) return [];
  const handles = await allCollectionHandles();
  return handles.map(handle => ({ params: { handle } }));
}

export default async function ({ params }) {
  const col = await collectionByHandle(params.handle);
  if (!col) return null;

  const g = new PerformanceGraph();
  const collections = await collectionsNav();
  const active = `/collections/${params.handle}/`;
  g.add(headerNode(PerfNode, { active, collections }));

  g.add(new PerfNode('head', {
    seoWeight: 1, conversionWeight: 0.5,
    render: () => `<section class="wrap section" style="padding-bottom:18px">
      <span class="eyebrow">Collection</span>
      <h1 style="font-size:clamp(28px,4.4vw,48px);margin:12px 0 8px">${esc(col.title)}</h1>
      ${col.description ? `<p class="lead">${esc(col.description)}</p>` : ''}
    </section>`,
  }));

  const products = col.products.nodes;
  g.add(new PerfNode('grid', {
    seoWeight: 0.8, conversionWeight: 0.7, cpuCost: 2,
    clientModule: products.length ? '/islands/catalog-filter.js' : undefined,
    hydrateMode: products.length ? 'eager' : undefined,
    render: () => catalogSection({
      sidebar: categorySidebar(collections, active),
      products,
      emptyMessage: 'No products in this collection yet.',
    }),
  }));

  g.add(footerNode(PerfNode, { collections }));
  const order = { header: 0, head: 1, grid: 2, footer: 3 };
  for (const [id, o] of Object.entries(order)) g.get(id).domOrder = o;

  return {
    graph: g,
    head: head(),
    page: {
      title: `${col.title} | biagio.shop`,
      description: col.description || `Shop the ${col.title} collection.`,
      image: col.image?.url,
      breadcrumbs: [{ name: 'Home', path: '/' }],
      hideBreadcrumb: true,
      sitemapPriority: 0.8,
    },
  };
}
