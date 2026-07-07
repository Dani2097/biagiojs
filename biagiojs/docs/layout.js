import { buildNav } from './nav.js';

export function sidebar(nav, activeSlug) {
  return nav.map(sec => `
    <div class="group">
      <div class="group-title">${sec.title}</div>
      ${sec.items.map(i => `<a href="${i.href}" class="${i.slug === activeSlug ? 'active' : ''}">${i.label}</a>`).join('')}
    </div>`).join('');
}

export function docsShell({ nav, activeSlug, breadcrumb, content }) {
  return `<div class="docs-shell">
    <aside class="docs-sidebar">${sidebar(nav, activeSlug)}</aside>
    <main class="docs-main">
      <nav class="breadcrumb" aria-label="Breadcrumb">${breadcrumb}</nav>
      <article class="prose">${content}</article>
    </main>
  </div>`;
}

export { buildNav };
