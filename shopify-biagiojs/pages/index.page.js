/**
 * Home — ISR via Vercel adapter, refreshed every 10 min.
 * Zero JavaScript except the inline cart-badge in the header.
 */
import { PerfNode, PerformanceGraph } from 'biagiojs/graph';
import { headerNode, footerNode, head } from '../lib/shell.js';
import { productGrid, esc } from '../theme.js';
import { isConfigured, featuredCollectionHandle } from '../lib/shopify.js';
import { featuredProducts, collectionsNav } from '../lib/queries.js';

export const revalidate = 600; // ISR: catalog freshness without a rebuild

function setupNotice(g) {
  g.add(new PerfNode('setup', {
    seoWeight: 1, conversionWeight: 0.5,
    render: () => `<section class="wrap section">
      <span class="eyebrow">Almost there</span>
      <h1 style="font-size:clamp(30px,5vw,52px);margin:12px 0">Connect your Shopify store</h1>
      <p class="lead">Copy <code>.env.example</code> to <code>.env</code> and add your <b>Storefront API</b>
      domain and token. Then run <code>npm run dev</code> again and this page will fill with your products.</p>
    </section>`,
  }));
  g.get('setup').domOrder = 1;
}

export default async function () {
  const g = new PerformanceGraph();
  const collections = isConfigured() ? await collectionsNav() : [];
  g.add(headerNode(PerfNode, { active: '/', collections }));

  if (!isConfigured()) {
    setupNotice(g);
    g.add(footerNode(PerfNode, { collections })); g.get('header').domOrder = 0; g.get('footer').domOrder = 2;
    return { graph: g, head: head(), page: { title: 'Setup | biagio.shop', description: 'Connect your Shopify store.', noindex: true } };
  }

  const { title, description, products } = await featuredProducts(featuredCollectionHandle());

  g.add(new PerfNode('hero', {
    seoWeight: 1, conversionWeight: 0.85, cpuCost: 1,
    render: () => `<section class="hero"><div class="wrap"><div class="inner">
      <span class="eyebrow">Fall / Winter 2026</span>
      <h1>Wear the <em>new</em> season</h1>
      <p class="lead">${esc(description || 'Essential pieces, cut to last. The new collection is here.')}</p>
      <div class="cta">
        <a class="btn" href="#featured">Shop now</a>
        <span class="hint">Free shipping over &euro;50 &middot; Free returns</span>
      </div>
    </div></div></section>`,
  }));

  g.add(new PerfNode('featured', {
    seoWeight: 0.8, conversionWeight: 0.8, cpuCost: 2,
    render: () => `<section class="wrap section" id="featured">
      <div class="sechead">
        <span class="eyebrow">${esc(title || 'Featured')}</span>
        <h2>The <em>edit</em></h2>
        ${collections[0] ? `<a href="/collections/${esc(collections[0].handle)}/">View all</a>` : ''}
      </div>
      ${productGrid(products)}
    </section>`,
  }));

  g.add(footerNode(PerfNode, { collections }));
  const order = { header: 0, hero: 1, featured: 2, footer: 3 };
  for (const [id, o] of Object.entries(order)) g.get(id).domOrder = o;

  return {
    graph: g,
    head: head(),
    page: {
      title: 'biagio.shop - headless Shopify storefront',
      description: 'A fast, near-zero-JS storefront powered by Shopify Storefront API and biagiojs.',
      sitemapPriority: 1.0,
    },
  };
}
