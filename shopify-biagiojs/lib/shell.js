/**
 * Page chrome helpers: build the header + footer PerfNodes and the shared <head>.
 * Keeps every page consistent without repeating boilerplate.
 */
import { header, footer, cartBadge, CSS } from '../theme.js';
import { clientConfigScript } from './shopify.js';

/** Shared <head>: injects the publishable Shopify config + design system CSS. */
export function head() {
  return `${clientConfigScript()}<style>${CSS}</style>`;
}

/** Header PerfNode (nav + live cart badge). Badge hydrates inline  zero network. */
export function headerNode(PerfNode, { active = '/', collections = [], siteName } = {}) {
  return new PerfNode('header', {
    seoWeight: 0.3, conversionWeight: 0.35, interactionProbability: 0.5,
    render: () => header({ active, collections, siteName }),
    hydrate: cartBadge,
    hydrateMode: 'idle',
  });
}

/** Footer PerfNode (static, no JS). */
export function footerNode(PerfNode, { siteName, collections = [] } = {}) {
  return new PerfNode('footer', {
    seoWeight: 0.1, conversionWeight: 0.05,
    render: () => footer({ siteName, collections }),
  });
}
