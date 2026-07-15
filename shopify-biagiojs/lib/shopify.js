/**
 * Server-side Shopify Storefront API client.
 *
 * Used at build time (SSG/ISR) and per-request (SSR account area).
 * Node 18+ provides a global `fetch`, so there are no runtime dependencies.
 */

function env() {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_STOREFRONT_TOKEN;
  const version = process.env.SHOPIFY_API_VERSION || '2026-07';
  if (!domain || !token) {
    throw new Error(
      '[shopify] Missing SHOPIFY_STORE_DOMAIN / SHOPIFY_STOREFRONT_TOKEN. ' +
      'Copy .env.example to .env and fill in your Storefront credentials.'
    );
  }
  return { domain, token, version };
}

export function isConfigured() {
  return !!(process.env.SHOPIFY_STORE_DOMAIN && process.env.SHOPIFY_STOREFRONT_TOKEN);
}

export function featuredCollectionHandle() {
  return process.env.SHOPIFY_FEATURED_COLLECTION || 'frontpage';
}

/**
 * Public config injected into the browser. The Storefront token is publishable,
 * so it is safe to expose. Rendered into a page's <head> via clientConfigScript().
 */
export function publicConfig() {
  const { domain, token, version } = env();
  return { domain, token, version };
}

export function clientConfigScript() {
  if (!isConfigured()) return '';
  return `<script>window.__SHOPIFY__=${JSON.stringify(publicConfig())};</script>`;
}

/**
 * Run a Storefront GraphQL query/mutation.
 */
export async function storefront(query, variables = {}) {
  const { domain, token, version } = env();
  const url = `https://${domain}/api/${version}/graphql.json`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`[shopify] HTTP ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  if (json.errors) {
    // Field-level "Access denied" (missing Storefront scope, e.g.
    // unauthenticated_read_product_inventory): Shopify still returns `data`
    // with the field set to null. Warn once and use the partial data instead
    // of failing the whole build.
    const onlyAccessDenied = json.errors.every(e => /access denied/i.test(e.message));
    if (onlyAccessDenied && json.data) {
      warnAccessDeniedOnce(json.errors);
      return json.data;
    }
    throw new Error('[shopify] GraphQL: ' + json.errors.map(e => e.message).join('; '));
  }
  return json.data;
}

const warnedScopes = new Set();
function warnAccessDeniedOnce(errors) {
  for (const e of errors) {
    const scope = e.message.match(/`([^`]+)` access scope/)?.[1] || e.message;
    if (warnedScopes.has(scope)) continue;
    warnedScopes.add(scope);
    console.warn(
      `[shopify] WARN missing Storefront scope "${scope}" — affected fields are null (treated as unavailable/0). ` +
      'Enable the scope in your app config to get real values.'
    );
  }
}
