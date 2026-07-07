/** Docs index — bilingual. */
import { PerfNode, PerformanceGraph } from '../../../src/core/graph.js';
import { buildNav, docsShell } from '../../layout.js';
import { topbar, siteFooter, CSS, THEME_SCRIPT } from '../../theme.js';
import { lp, langSwitcher } from '../../i18n-ui.js';

export default function ({ site, t, locale, defaultLocale, page }) {
  const path = p => lp(p, locale, defaultLocale);
  const nav = buildNav(t, path);
  const lang = langSwitcher(site, { basePath: '/docs/' }, locale, defaultLocale);
  const cards = nav.flatMap(sec => sec.items.map(i => `
    <a class="docs-index-card" href="${i.href}">
      <h3>${i.label}</h3><p>${i.desc}</p>
    </a>`)).join('');

  const breadcrumb = `<a href="${path('/')}">${t('nav.home')}</a> / ${t('docsIndex.breadcrumb')}`;
  const body = docsShell({
    nav,
    activeSlug: '',
    breadcrumb,
    content: `<h1>${t('docsIndex.title')}</h1><p>${t('docsIndex.intro')}</p><div class="docs-index-grid">${cards}</div>`,
  });

  const g = new PerformanceGraph()
    .add(new PerfNode('shell', {
      seoWeight: 1, conversionWeight: 0.5,
      render: () => topbar({ t, lp: path, active: 'docs', langHtml: lang }) + body + siteFooter({ t }),
    }));

  return {
    graph: g,
    head: `<style>${CSS}</style>${THEME_SCRIPT}`,
    page: {
      title: t('meta.docsTitle'),
      description: t('meta.docsDesc'),
      basePath: '/docs/',
      breadcrumbs: [
        { name: t('nav.home'), path: path('/') },
        { name: t('docsIndex.breadcrumb'), path: path('/docs/') },
      ],
      hideBreadcrumb: true,
      sitemapPriority: 0.9,
      lastmod: '2026-07-07',
    },
  };
}
