/**
 * CVW-First — Business Metrics (browser runtime, shipped as inline script)
 *
 * CFP  — Conversion First Paint: first conversion-critical element visible
 * FAR  — First Action Ready: first important interaction hydrated & usable
 * RFI  — Revenue First Interactive: ALL revenue-generating islands usable
 * SCRT — SEO Critical Render Time: all SEO-relevant content rendered
 * CDI  — Conversion Delay Index: gap between page visible and conversion ready
 */
export const METRICS_RUNTIME = `
(function () {
  const t0 = performance.timeOrigin ? 0 : 0; // times relative to navigation start
  const M = window.__CVW_METRICS__ = { CFP: null, FAR: null, RFI: null, SCRT: null, CDI: null };
  const now = () => Math.round(performance.now());

  // CFP + SCRT via element visibility
  const conv = [...document.querySelectorAll('[data-cvw-conversion="high"]')];
  const seo  = [...document.querySelectorAll('[data-cvw-seo="high"]')];
  let seoSeen = 0, firstPaintTs = null;

  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      if (M.CFP === null && e.target.dataset.cvwConversion === 'high') M.CFP = now();
      if (e.target.dataset.cvwSeo === 'high' && !e.target.__cvwSeen) {
        e.target.__cvwSeen = true; seoSeen++;
        if (seoSeen === seo.length) M.SCRT = now();
      }
      report();
    }
  }, { threshold: 0.1 });
  conv.concat(seo).forEach(el => io.observe(el));

  // first paint timestamp for CDI
  new PerformanceObserver(list => {
    for (const e of list.getEntries()) if (e.name === 'first-contentful-paint') firstPaintTs = e.startTime;
  }).observe({ type: 'paint', buffered: true });

  // FAR / RFI signalled by the hydration runtime
  const revenueIslands = new Set([...document.querySelectorAll('[data-cvw-revenue="true"]')].map(e => e.dataset.cvwId));
  const hydrated = new Set();
  window.__cvwHydrated = function (id, isRevenue) {
    hydrated.add(id);
    if (M.FAR === null && isRevenue) M.FAR = now();
    if (M.RFI === null && [...revenueIslands].every(r => hydrated.has(r))) {
      M.RFI = now();
      if (firstPaintTs !== null) M.CDI = Math.round(M.RFI - firstPaintTs);
    }
    report();
  };

  function report() {
    document.dispatchEvent(new CustomEvent('cvw:metrics', { detail: { ...M } }));
  }
  report();
})();
`;
