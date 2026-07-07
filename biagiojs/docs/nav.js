/** Doc navigation structure — labels come from locales via buildNav(). */
export const DOC_SECTIONS = [
  { key: 'start', items: ['getting-started', 'project-structure'] },
  { key: 'syntax', items: ['syntax-biagio', 'syntax-javascript'] },
  { key: 'concepts', items: ['business-weights', 'hydration', 'seo'] },
  { key: 'guides', items: ['images', 'deploy', 'cli'] },
  { key: 'ref', items: ['changelog'] },
];

export const ALL_DOC_SLUGS = DOC_SECTIONS.flatMap(s => s.items);

/** @param {Function} t - ctx.t */
/** @param {Function} lp - path => localePath(path, locale, defaultLocale) */
export function buildNav(t, lp) {
  return DOC_SECTIONS.map(sec => ({
    key: sec.key,
    title: t(`nav.sections.${sec.key}`),
    items: sec.items.map(slug => ({
      slug,
      label: t(`nav.items.${slug}`),
      desc: t(`nav.desc.${slug}`),
      href: lp(`/docs/${slug}/`),
    })),
  }));
}

export function navLabel(slug, t) {
  const key = `nav.items.${slug}`;
  const v = t(key);
  return v === key ? slug : v;
}

/** Section title for a doc slug (JSON-LD articleSection). */
export function navSection(slug, t) {
  for (const sec of DOC_SECTIONS) {
    if (sec.items.includes(slug)) return t(`nav.sections.${sec.key}`);
  }
  return '';
}
