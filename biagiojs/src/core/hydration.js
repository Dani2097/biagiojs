/**
 * biagiojs — Adaptive Hydration client runtime (inlined in page).
 */
export const HYDRATION_RUNTIME = `
(function () {
  const registry = window.__CVW_ISLANDS__ || {};
  const raw = window.__CVW_PLAN__ || {};
  const eager = raw.e || (raw.eager || []).map(x => x.id || x);
  const lazy = raw.l || (raw.lazy || []).map(x => x.id || x);
  const props = window.__CVW_PROPS__ || {};

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
    } catch (e) { console.error('[biagio] hydrate ' + id, e); }
    el.setAttribute('data-cvw-hydrated', '');
    if (window.__cvwHydrated) window.__cvwHydrated(id, el.dataset.cvwRevenue === 'true');
  }

  requestAnimationFrame(() => {
    const queue = [...eager];
    (function next() {
      if (!queue.length) return;
      hydrate(queue.shift());
      setTimeout(next, 0);
    })();
  });

  const io = new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting) { hydrate(e.target.dataset.cvwId); io.unobserve(e.target); }
  }, { rootMargin: '200px' });
  for (const id of lazy) {
    const el = document.querySelector('[data-cvw-id="' + id + '"]');
    if (el) io.observe(el);
  }
  (window.requestIdleCallback || (cb => setTimeout(cb, 2000)))(() => {
    for (const id of lazy) hydrate(id);
  });
})();
`;
