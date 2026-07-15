export default {
  site: {
    name: 'ShoeShop',
    baseUrl: 'https://shoeshop.example.com',
    description: 'Scarpe da running ultraleggere — demo biagiojs',
    optimize: { purge: true, minify: true, bundleClasses: true, bundleMinRepeat: 3 },
    consent: {
      mode: 'native',
      categories: ['analytics', 'marketing'],
      policyUrl: '/privacy/',
      text: { bodyHtml: 'Usiamo cookie tecnici e, <b>con il tuo consenso</b>, cookie di analisi e marketing.' },
      css: '#cvw-consent-banner{border-radius:8px}',
    },
  },
};
