/**
 * Scheduler playground. Reproduces biagiojs' real hydration math client-side:
 *   businessValue = 0.6·conversion + 0.15·interaction   (seo = 0 here)
 *   hydration     = interaction · businessValue          → eager ≥ .3 · lazy ≥ .05
 *   render        = businessValue ÷ (cpu + 0.5·mem)
 * i18n strings arrive via data-* on the .panel; no runtime-only CSS classes.
 */
export default function (el) {
  const panel = el.querySelector('.panel') || el;
  const conv = el.querySelector('#w-conv');
  const inter = el.querySelector('#w-inter');
  const cpu = el.querySelector('#w-cpu');
  const out = el.querySelector('#w-out');
  const marker = el.querySelector('#w-marker');
  const vConv = el.querySelector('#v-conv');
  const vInter = el.querySelector('#v-inter');
  const vCpu = el.querySelector('#v-cpu');
  if (!conv || !inter || !cpu || !out) return;

  const d = panel.dataset;
  const i18n = {
    static: d.i18nStatic || 'static',
    eager: d.i18nEager || 'eager',
    lazy: d.i18nLazy || 'lazy',
    hyd: d.i18nHyd || 'hydration',
    render: d.i18nRender || 'render',
  };

  const AXIS = 0.6; // marker axis maps 0 → AXIS across the zone meter
  const clampPct = x => Math.max(0, Math.min(100, x));

  function update() {
    const c = +conv.value / 100, i = +inter.value / 100, cost = +cpu.value;
    const businessValue = 0.6 * c + 0.15 * i;
    const hydration = i * businessValue;
    const renderPri = businessValue / (cost + 0.5);

    let plan = 'static';
    if (hydration >= 0.3) plan = 'eager';
    else if (hydration >= 0.05) plan = 'lazy';

    if (vConv) vConv.textContent = c.toFixed(2);
    if (vInter) vInter.textContent = i.toFixed(2);
    if (vCpu) vCpu.textContent = String(cost);

    panel.dataset.plan = plan;
    if (marker) marker.style.left = clampPct((hydration / AXIS) * 100) + '%';

    out.innerHTML =
      `${i18n.hyd} <b>${hydration.toFixed(3)}</b> → <span class="tag">${i18n[plan]}</span><br>` +
      `${i18n.render} <b>${renderPri.toFixed(2)}</b>`;
  }

  for (const inp of [conv, inter, cpu]) inp.addEventListener('input', update);
  update();
}
