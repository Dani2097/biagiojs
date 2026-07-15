/**
 * Shop all — every product with the category sidebar. SSG + ISR.
 * Pure static HTML: zero JavaScript beyond the header cart badge.
 */
import { PerfNode, PerformanceGraph } from 'biagiojs/graph';
import { headerNode, footerNode, head } from '../../lib/shell.js';
import { catalogSection, categorySidebar } from '../../theme.js';
import { isConfigured } from '../../lib/shopify.js';
import { allProducts, collectionsNav } from '../../lib/queries.js';

export const revalidate = 600;

export default async function () {
  if (!isConfigured()) return null;

  const [products, collections] = await Promise.all([allProducts(), collectionsNav(20)]);
  const g = new PerformanceGraph();
  g.add(headerNode(PerfNode, { active: '/products/', collections }));

  g.add(new PerfNode('head', {
    seoWeight: 1, conversionWeight: 0.5,
    render: () => `<section class="wrap section" style="padding-bottom:26px">
      <span class="eyebrow">Catalog</span>
      <h1 style="font-size:clamp(34px,5vw,64px);margin-top:12px">All products</h1>
    </section>`,
  }));

  g.add(new PerfNode('catalog', {
    seoWeight: 0.8, conversionWeight: 0.8, cpuCost: 2,
    clientModule: '/islands/catalog-filter.js',
    hydrateMode: 'eager',
    render: () => catalogSection({
      sidebar: categorySidebar(collections, '/products/'),
      products,
    }),
  }));

  g.add(footerNode(PerfNode, { collections }));
  const order = { header: 0, head: 1, catalog: 2, footer: 3 };
  for (const [id, o] of Object.entries(order)) g.get(id).domOrder = o;

  return {
    graph: g,
    head: head(),
    page: {
      title: 'All products | biagio.shop',
      description: 'Browse the full catalog.',
      breadcrumbs: [{ name: 'Home', path: '/' }],
      hideBreadcrumb: true,
      sitemapPriority: 0.9,
    },
  };
}
