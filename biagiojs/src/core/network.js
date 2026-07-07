/**
 * biagiojs §10 — Network Scheduler.
 * Emits <link rel=preload|prefetch> ordered by businessValue / transferredKB,
 * not by import order. Critical conversion assets always win.
 */
import { networkSchedule } from './scheduler.js';
import { imagePreload } from './images.js';

const AS_TYPES = { js: 'script', css: 'style', woff2: 'font', avif: 'image', webp: 'image', jpg: 'image' };

/**
 * assets: [{url, kb, businessValue, kind?: 'preload'|'prefetch'|'image', ...imageOpts}]
 * preloadBudgetKb: hard cap so preloads never crowd out the critical path.
 */
export function networkHead(assets, { preloadBudgetKb = 200 } = {}) {
  const ordered = networkSchedule(assets);
  const tags = [];
  let budget = preloadBudgetKb;
  const log = [];

  for (const a of ordered) {
    const score = (a.businessValue / Math.max(a.kb, 0.01)).toFixed(3);
    if (a.kind === 'image') {
      if (budget >= a.kb) { tags.push(imagePreload(a)); budget -= a.kb; log.push(`preload image ${a.url} (v/KB=${score})`); }
      else log.push(`skip ${a.url}: over preload budget`);
      continue;
    }
    const as = AS_TYPES[a.url.split('.').pop()] || 'fetch';
    if (a.kind !== 'prefetch' && budget >= a.kb) {
      tags.push(`<link rel="preload" href="${a.url}" as="${as}"${as === 'font' ? ' crossorigin' : ''} fetchpriority="high">`);
      budget -= a.kb;
      log.push(`preload ${a.url} (v/KB=${score})`);
    } else {
      tags.push(`<link rel="prefetch" href="${a.url}">`);
      log.push(`prefetch ${a.url} (v/KB=${score}${a.kind === 'prefetch' ? '' : ', over budget'})`);
    }
  }
  return { html: tags.join('\n'), log };
}
