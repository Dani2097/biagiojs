/**
 * Shopify → Vercel on-demand revalidation.
 *
 * Register in Shopify Admin (Settings → Notifications → Webhooks) pointing to:
 *   https://<your-domain>/api/revalidate
 * Format: JSON · Secret: same value as SHOPIFY_REVALIDATION_SECRET
 *
 * Suggested topics:
 *   products/create · products/update · products/delete
 *   collections/create · collections/update · collections/delete
 *   inventory_levels/update (broad catalog refresh)
 */
import { invalidateByTag } from '@vercel/functions';
import { tagsForWebhook } from '../lib/revalidate-tags.js';
import { readRawBody, verifyShopifyWebhook } from '../lib/shopify-webhook.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end('Method Not Allowed');
  }

  const secret = process.env.SHOPIFY_REVALIDATION_SECRET;
  if (!secret) {
    res.statusCode = 500;
    return res.end('SHOPIFY_REVALIDATION_SECRET not configured');
  }

  let raw;
  try {
    raw = await readRawBody(req);
  } catch (e) {
    console.error('[revalidate] body read failed', e);
    res.statusCode = 400;
    return res.end('Bad body');
  }

  const hmac = req.headers['x-shopify-hmac-sha256'];
  if (!verifyShopifyWebhook(raw, hmac, secret)) {
    res.statusCode = 401;
    return res.end('Unauthorized');
  }

  const topic = req.headers['x-shopify-topic'] || '';
  let payload = {};
  try {
    payload = JSON.parse(raw.toString('utf8'));
  } catch {
    res.statusCode = 400;
    return res.end('Invalid JSON');
  }

  const tags = tagsForWebhook(topic, payload);
  if (tags.length) {
    try {
      await invalidateByTag(tags);
      console.log('[revalidate]', topic, '→', tags.join(', '));
    } catch (e) {
      console.error('[revalidate] invalidateByTag failed', e);
      res.statusCode = 500;
      return res.end('Purge failed');
    }
  }

  res.statusCode = 200;
  res.setHeader('content-type', 'text/plain');
  res.end('ok');
}
