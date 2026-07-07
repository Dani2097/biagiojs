/**
 * CVW-First — Adaptive Hydration client runtime (inlined in page).
 *
 * Isole in due forme nel registry __CVW_ISLANDS__:
 *   "id": function (el) {...}        → funzione inline serializzata (legacy)
 *   "id": {"m": "/islands/x.js"}     → MODULO CLIENT: import() dinamico, bundlabile
 *                                      da Vite, può usare React/Preact/qualsiasi ESM.
 *                                      Il modulo esporta default (el, props) => void.
 *
 * Piano: eager (post-paint, yield tra isole) / lazy (visibilità o idle) / static (mai).
 */
export const HYDRATION_RUNTIME = `
(function () {
  const registry = window.__CVW_ISLANDS__ || {};
  const plan = window.__CVW_PLAN__ || { eager: [], lazy: [] };
  const props = window.__CVW_PROPS__ || {};

  // gating GDPR: isole con categoria di consenso restano inerti finché
  // l'utente non acconsente (evento 'cvw:consent' → retry)
  const pendingConsent = [];
  document.addEventListener('cvw:consent', () => {
    const retry = pendingConsent.splice(0);
    for (const id of retry) hydrate(id);
  });
  const consentOk = c => !c || (window.cvwConsent && window.cvwConsent.has(c));

  async function hydrate(id) {
    const el = document.querySelector('[data-cvw-id="' + id + '"]');
    const entry = registry[id];
    if (!el || !entry || el.__cvwDone) return;
    if (entry.c && !consentOk(entry.c)) { pendingConsent.push(id); return; }
    el.__cvwDone = true;
    try {
      if (typeof entry === 'function') entry(el);
      else if (entry.f) entry.f(el);
      else if (entry && entry.m) {
        const mod = await import(entry.m);
        await (mod.default || mod.hydrate)(el, props[id] || {});
      }
    } catch (e) { console.error('[cvw] hydrate ' + id, e); }
    el.setAttribute('data-cvw-hydrated', '');
    if (window.__cvwHydrated) window.__cvwHydrated(id, el.dataset.cvwRevenue === 'true');
  }

  requestAnimationFrame(() => {
    const queue = [...plan.eager];
    (function next() {
      if (!queue.length) return;
      hydrate(queue.shift().id);
      setTimeout(next, 0);
    })();
  });

  const io = new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting) { hydrate(e.target.dataset.cvwId); io.unobserve(e.target); }
  }, { rootMargin: '200px' });
  for (const { id } of plan.lazy) {
    const el = document.querySelector('[data-cvw-id="' + id + '"]');
    if (el) io.observe(el);
  }
  (window.requestIdleCallback || (cb => setTimeout(cb, 2000)))(() => {
    for (const { id } of plan.lazy) hydrate(id);
  });
})();
`;
