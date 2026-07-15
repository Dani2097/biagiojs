import { defineConfig } from 'biagiojs/config';

/**
 * biagiojs configuration for a headless Shopify storefront.
 *
 * The catalog uses ISR (`export const revalidate` in page files) via the Vercel adapter.
 * Shopify webhooks trigger on-demand CDN purge — see README § Deploy.
 */
export default defineConfig({
  site: {
    name: 'biagio.shop',
    baseUrl: process.env.SITE_URL || 'https://example.com',
    description: 'A fast, headless Shopify storefront built with biagiojs.',

    // On-demand SSR (private account area) needs an adapter when deployed.
    // Local `biagio preview .` uses the Node adapter automatically.
    deploy: process.env.DEPLOY_TARGET || 'vercel',

    images: { widths: [480, 960, 1440], quality: 74 },

    favicon: {
      source: 'images/logo.svg',
      generate: true,
      themeColor: '#111114',
      targets: ['ico', 'svg', 'apple', 'pwa'],
    },

    // Storefront checkout redirects to Shopify's hosted checkout, so first-party
    // consent only needs to cover analytics/marketing you add yourself.
    consent: {
      mode: 'native',
      categories: ['analytics', 'marketing'],
      policyUrl: '/privacy/',
    },

    optimize: { purge: true, minify: true, bundleClasses: true, bundleMinRepeat: 3 },
  },
});
