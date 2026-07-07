/** Canonical, OG, sitemap — sempre il dominio ufficiale in produzione. */
const baseUrl = process.env.BIAGIO_SITE_URL ?? 'https://biagio.danilosprovieri.com';

export default {
  site: {
    name: 'biagiojs',
    baseUrl,
    description: 'biagiojs is a business-first web framework: SSG, adaptive islands, automatic SEO, and zero JavaScript by default.',
    locales: ['en', 'it'],
    defaultLocale: 'en',
    ogImage: {
      src: '/og.svg',
      width: 1200,
      height: 630,
      alt: 'biagiojs — business-first web framework for SSG and adaptive islands',
    },
    organization: {
      name: 'biagiojs',
      url: baseUrl,
      logo: '/favicon.svg',
      sameAs: [
        'https://github.com/Dani2097/biagiojs',
        'https://www.npmjs.com/package/biagiojs',
      ],
    },
    website: {
      name: 'biagiojs Documentation',
      url: baseUrl,
      description: 'Official documentation for the biagiojs framework.',
    },
    cache: {
      html: 'public, max-age=0, must-revalidate',
      assets: 'public, max-age=31536000, immutable',
    },
    favicon: { svg: '/favicon.svg', themeColor: '#ef2f47' },
    fonts: { inject: false },
    images: {
      bySlug: {
        'lighthouse-mobile': [320, 412, 640],
        'lighthouse-desktop': [320, 412, 640],
      },
      profiles: {
        screenshot: {
          widths: [320, 412, 640],
          sizes: '(max-width: 700px) 100vw, 50vw',
          quality: 88,
        },
      },
    },
    optimize: { purge: true, minify: true, scripts: true },
  },
};
