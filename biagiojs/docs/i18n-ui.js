import { localePath } from '../src/core/i18n.js';

export function lp(path, locale, defaultLocale) {
  return localePath(path, locale, defaultLocale);
}

/** EN · IT language switcher for the top bar. */
export function langSwitcher(site, page, locale, defaultLocale) {
  if (!site.locales?.length) return '';
  const base = page?.basePath || '/';
  return site.locales.map(l => {
    const href = localePath(base, l, defaultLocale);
    const on = l === locale ? ' class="active"' : '';
    return `<a href="${href}" hreflang="${l}"${on}>${l.toUpperCase()}</a>`;
  }).join('<span class="lang-sep">·</span>');
}
