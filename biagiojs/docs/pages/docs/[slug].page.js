/** Dynamic doc routes — content/docs/*.md (en) + content/docs/it/*.md */
import { PerfNode, PerformanceGraph } from '../../../src/core/graph.js';
import { raw, html } from '../../../src/core/html.js';
import { ALL_DOC_SLUGS, navLabel, navSection } from '../../nav.js';
import { buildNav, docsShell } from '../../layout.js';
import { topbar, siteFooter, CSS, THEME_SCRIPT } from '../../theme.js';
import { lp, langSwitcher } from '../../i18n-ui.js';

export function getStaticPaths({ getCollection }) {
  return getCollection('content/docs')
    .filter(p => ALL_DOC_SLUGS.includes(p.slug))
    .map(post => ({ params: { slug: post.slug }, props: { post } }));
}

export default function ({ props: { post }, site, t, locale, defaultLocale }) {
  const path = p => lp(p, locale, defaultLocale);
  const nav = buildNav(t, path);
  const label = navLabel(post.slug, t);
  const docPath = `/docs/${post.slug}/`;
  const breadcrumb = html`<a href="${path('/')}">${t('nav.home')}</a> / <a href="${path('/docs/')}">${t('breadcrumb.docs')}</a> / ${label}`.toString();
  const body = docsShell({
    nav,
    activeSlug: post.slug,
    breadcrumb,
    content: raw(post.html),
  });
  const lang = langSwitcher(site, { basePath: docPath }, locale, defaultLocale);

  const g = new PerformanceGraph()
    .add(new PerfNode('shell', {
      seoWeight: 1, conversionWeight: 0.3,
      render: () => topbar({ t, lp: path, active: 'docs', langHtml: lang }) + body + siteFooter({ t }),
    }));

  return {
    graph: g,
    head: `<style>${CSS}</style>${THEME_SCRIPT}`,
    page: {
      title: `${post.data.title || label} — biagiojs`,
      description: post.data.description || `${t('meta.docsDesc')}: ${label}`,
      type: 'article',
      basePath: docPath,
      article: {
        headline: post.data.title || label,
        datePublished: post.data.datePublished || post.data.lastmod || '2026-07-07',
        dateModified: post.data.lastmod || '2026-07-07',
        author: 'Danilo Sprovieri',
        section: navSection(post.slug, t),
      },
      breadcrumbs: [
        { name: t('nav.home'), path: path('/') },
        { name: t('breadcrumb.docs'), path: path('/docs/') },
        { name: label, path: path(docPath) },
      ],
      hideBreadcrumb: true,
      sitemapPriority: post.data.priority ?? 0.7,
      lastmod: post.data.lastmod || '2026-07-07',
    },
  };
}
