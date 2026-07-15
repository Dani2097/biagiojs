/**
 * Shopify Admin webhook verification (HMAC-SHA256).
 * @see https://shopify.dev/docs/apps/build/webhooks/subscribe/https
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

export async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export function verifyShopifyWebhook(rawBody, hmacHeader, secret) {
  if (!secret || !hmacHeader || !rawBody?.length) return false;
  const digest = createHmac('sha256', secret).update(rawBody).digest('base64');
  try {
    const a = Buffer.from(hmacHeader, 'utf8');
    const b = Buffer.from(digest, 'utf8');
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
