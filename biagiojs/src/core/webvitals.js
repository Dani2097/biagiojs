/**
 * biagiojs — Core Web Vitals live in dev (zero dipendenze).
 * Misura nella pagina reale: LCP, CLS, INP (approssimato via Event Timing),
 * FCP, TTFB. Emette 'cvw:vitals' → l'overlay dev li mostra con le soglie Google:
 *   LCP  good ≤2500ms  poor >4000ms
 *   CLS  good ≤0.10    poor >0.25
 *   INP  good ≤200ms   poor >500ms
 */
export const WEBVITALS_RUNTIME = `
(function () {
  const V = window.__CVW_VITALS__ = { LCP: null, CLS: 0, INP: null, FCP: null, TTFB: null };
  const emit = () => document.dispatchEvent(new CustomEvent('cvw:vitals', { detail: { ...V } }));

  try {
    // TTFB
    const nav = performance.getEntriesByType('navigation')[0];
    if (nav) V.TTFB = Math.round(nav.responseStart);

    // FCP
    new PerformanceObserver(l => {
      for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') { V.FCP = Math.round(e.startTime); emit(); }
    }).observe({ type: 'paint', buffered: true });

    // LCP (si aggiorna finché la pagina non riceve input)
    new PerformanceObserver(l => {
      const es = l.getEntries();
      if (es.length) { V.LCP = Math.round(es[es.length - 1].startTime); emit(); }
    }).observe({ type: 'largest-contentful-paint', buffered: true });

    // CLS (somma delle session windows semplificata: somma shift senza input recente)
    new PerformanceObserver(l => {
      for (const e of l.getEntries()) if (!e.hadRecentInput) { V.CLS = +(V.CLS + e.value).toFixed(4); }
      emit();
    }).observe({ type: 'layout-shift', buffered: true });

    // INP approssimato: peggior durata di interazione osservata
    new PerformanceObserver(l => {
      for (const e of l.getEntries()) {
        if (e.interactionId) { const d = Math.round(e.duration); if (V.INP === null || d > V.INP) V.INP = d; }
      }
      emit();
    }).observe({ type: 'event', buffered: true, durationThreshold: 16 });
  } catch (err) { /* browser senza qualche API: mostra solo il resto */ }

  emit();
})();
`;
