/**
 * CVW-First — Reattività client (signals, stile Solid, ~40 righe).
 * Iniettato in pagina: dentro `hydrate(el)` usa `window.cvw`:
 *
 *   const { signal, computed, effect } = window.cvw;
 *   const [count, setCount] = signal(0);
 *   effect(() => { el.querySelector('#n').textContent = count(); });
 *   btn.onclick = () => setCount(count() + 1);
 *
 * `bind(el, sig)` è una scorciatoia: aggiorna textContent quando il signal cambia.
 */
export const SIGNALS_RUNTIME = `
(function () {
  let active = null;
  function signal(value) {
    const subs = new Set();
    const read = () => { if (active) subs.add(active); return value; };
    const write = (next) => {
      const v = typeof next === 'function' ? next(value) : next;
      if (v === value) return;
      value = v;
      for (const fn of [...subs]) fn();
    };
    return [read, write];
  }
  function effect(fn) {
    const run = () => { const prev = active; active = run; try { fn(); } finally { active = prev; } };
    run();
    return run;
  }
  function computed(fn) {
    const [get, set] = signal(undefined);
    effect(() => set(fn()));
    return get;
  }
  function bind(el, get) { effect(() => { el.textContent = get(); }); }
  window.cvw = Object.assign(window.cvw || {}, { signal, effect, computed, bind });
})();
`;
