/**
 * Product detail  one static page per product (SSG), refreshed via ISR.
 * The whole product section is server-rendered (full SEO); a single island
 * hydrates the variant picker + Add to cart in place.
 */
import { PerfNode, PerformanceGraph } from 'biagiojs/graph';
import { headerNode, footerNode, head } from '../../lib/shell.js';
import { money, esc, shopifyImg } from '../../theme.js';
import { isConfigured } from '../../lib/shopify.js';
import { allProductHandles, productByHandle, collectionsNav } from '../../lib/queries.js';

export const revalidate = 300; // price / availability freshness

export async function getStaticPaths() {
  if (!isConfigured()) return [];
  const handles = await allProductHandles();
  return handles.map(handle => ({ params: { handle } }));
}

function variantProps(product) {
  return product.variants.nodes.map(v => ({
    id: v.id,
    title: v.title,
    availableForSale: v.availableForSale,
    price: v.price,
    options: Object.fromEntries(v.selectedOptions.map(o => [o.name, o.value])),
  }));
}

export default async function ({ params }) {
  const product = await productByHandle(params.handle);
  if (!product) return null;

  const g = new PerformanceGraph();
  const collections = await collectionsNav();
  g.add(headerNode(PerfNode, { active: '/', collections }));

  const min = product.priceRange.minVariantPrice;
  const firstVariant = product.variants.nodes[0];
  const compareAt = firstVariant?.compareAtPrice;
  const gallery = (product.images?.nodes?.length ? product.images.nodes : [product.featuredImage]).filter(Boolean);
  const options = product.options.filter(o => !(o.values.length === 1 && o.values[0] === 'Default Title'));

  // Whole product section: gallery + buybox. Server-rendered (SEO), then hydrated.
  g.add(new PerfNode('product', {
    seoWeight: 1, conversionWeight: 1, interactionProbability: 0.9, cpuCost: 2,
    clientModule: '/islands/add-to-cart.js',
    clientProps: { variants: variantProps(product), options },
    render: () => `<section class="wrap section pdp">
      <div class="gallery">
        ${gallery.map((im, i) => shopifyImg(im, {
          alt: im.altText || product.title,
          widths: [480, 720, 1080, 1440],
          sizes: '(max-width:820px) 100vw, 55vw',
          eager: i === 0,
          ratio: [900, 1125],
        })).join('')}
      </div>
      <div class="buy">
        ${product.vendor ? `<div class="pill">${esc(product.vendor)}</div>` : ''}
        <h1>${esc(product.title)}</h1>
        <div class="pdp-price">
          <span data-price>${money(min.amount, min.currencyCode)}</span>
          ${compareAt ? `<s>${money(compareAt.amount, compareAt.currencyCode)}</s>` : ''}
        </div>
        ${options.map(o => `<label class="field"><span>${esc(o.name)}</span>
          <select data-option="${esc(o.name)}">${o.values.map(v => `<option>${esc(v)}</option>`).join('')}</select></label>`).join('')}
        <button class="btn block" data-add>Add to cart</button>
        <p class="note" data-status style="margin-top:10px"></p>
        <div class="rte">${product.descriptionHtml || ''}</div>
      </div>
    </section>
    <style>
      .pdp{display:grid;grid-template-columns:1.1fr 1fr;gap:56px;align-items:start}
      .pdp .gallery{display:grid;gap:18px}
      .pdp .gallery img{width:100%;border-radius:var(--radius);object-fit:cover;
        background:#f4f4f4}
      .pdp .buy{position:sticky;top:96px}
      .pdp h1{font-size:clamp(30px,3.8vw,46px);margin:14px 0 12px}
      .pdp-price{font-size:23px;font-weight:600;font-family:var(--serif);margin-bottom:24px;
        font-variant-numeric:tabular-nums}
      .pdp-price s{font-size:17px;font-weight:400;margin-left:10px}
      .pdp .rte{margin-top:32px;padding-top:26px;border-top:1px solid var(--line-soft);
        color:var(--muted);line-height:1.75;font-size:15px}
      .pdp .rte h2,.pdp .rte h3{color:var(--ink);font-size:17px;margin:20px 0 6px}
      .pdp .rte ul{padding-left:18px}
      @media(max-width:820px){.pdp{grid-template-columns:1fr;gap:32px}.pdp .buy{position:static}}
    </style>`,
  }));

  g.add(footerNode(PerfNode, { collections }));
  const order = { header: 0, product: 1, footer: 2 };
  for (const [id, o] of Object.entries(order)) g.get(id).domOrder = o;

  const seo = product.seo || {};
  return {
    graph: g,
    head: head(),
    page: {
      title: (seo.title || product.title) + ' | biagio.shop',
      description: seo.description || (product.descriptionHtml || '').replace(/<[^>]+>/g, '').slice(0, 155),
      type: 'product',
      image: product.featuredImage?.url,
      product: { name: product.title, price: parseFloat(min.amount), currency: min.currencyCode },
      breadcrumbs: [{ name: 'Home', path: '/' }],
      hideBreadcrumb: true,
      sitemapPriority: 0.9,
    },
  };
}
