/**
 * Cart  the cart is per-visitor and has no SEO value, so it renders client-side.
 * A single island fetches the live cart from the Storefront API and handles
 * quantity / remove / checkout.
 */
import { PerfNode, PerformanceGraph } from 'biagiojs/graph';
import { headerNode, footerNode, head } from '../lib/shell.js';
import { collectionsNav } from '../lib/queries.js';
import { isConfigured } from '../lib/shopify.js';

export default async function () {
  const g = new PerformanceGraph();
  const collections = isConfigured() ? await collectionsNav() : [];
  g.add(headerNode(PerfNode, { active: '/cart/', collections }));

  g.add(new PerfNode('cart', {
    conversionWeight: 1, interactionProbability: 0.95, cpuCost: 2,
    clientModule: '/islands/cart-view.js',
    render: () => `<section class="wrap section">
      <h1 style="font-size:clamp(26px,3.6vw,40px);margin-bottom:22px">Your cart</h1>
      <div data-cart><p class="muted">Loading your cart...</p></div>
    </section>`,
  }));

  g.add(footerNode(PerfNode, { collections }));
  const order = { header: 0, cart: 1, footer: 2 };
  for (const [id, o] of Object.entries(order)) g.get(id).domOrder = o;

  return {
    graph: g,
    head: head(),
    page: { title: 'Cart | biagio.shop', description: 'Your shopping cart.', noindex: true },
  };
}
