/**
 * Cache tags for Vercel CDN — used by api/ssr (response) and api/revalidate (purge).
 * Tags must be alphanumeric + hyphen (Vercel limit); handles are normalized.
 */

export const TAG_CATALOG = 'shopify-catalog';
export const TAG_HOME = 'shopify-home';
export const TAG_PRODUCTS = 'shopify-products';

export function normalizeTagPart(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

/** Tags to attach to an HTML response for `url` (path only, no query). */
export function tagsForPath(url) {
  const tags = new Set([TAG_CATALOG]);
  const path = (url || '/').replace(/\/+$/, '') || '/';

  if (path === '/') {
    tags.add(TAG_HOME);
    return [...tags];
  }
  if (path === '/products') {
    tags.add(TAG_PRODUCTS);
    return [...tags];
  }
  const product = path.match(/^\/products\/([^/]+)$/);
  if (product) {
    tags.add(TAG_PRODUCTS);
    tags.add(`shopify-product-${normalizeTagPart(product[1])}`);
    return [...tags];
  }
  const collection = path.match(/^\/collections\/([^/]+)$/);
  if (collection) {
    tags.add(`shopify-collection-${normalizeTagPart(collection[1])}`);
  }
  return [...tags];
}

/** Tags to invalidate from a Shopify Admin webhook topic + JSON body. */
export function tagsForWebhook(topic, payload = {}) {
  const tags = new Set([TAG_CATALOG]);
  const handle = normalizeTagPart(payload.handle);

  if (/^products\//.test(topic)) {
    tags.add(TAG_HOME);
    tags.add(TAG_PRODUCTS);
    if (handle) tags.add(`shopify-product-${handle}`);
  }
  if (/^collections\//.test(topic)) {
    tags.add(TAG_HOME);
    if (handle) tags.add(`shopify-collection-${handle}`);
  }
  if (topic === 'inventory_levels/update') {
    tags.add(TAG_HOME);
    tags.add(TAG_PRODUCTS);
  }
  return [...tags];
}
