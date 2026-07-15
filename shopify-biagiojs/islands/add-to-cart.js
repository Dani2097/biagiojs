/**
 * Product page: variant picker + "Add to cart".
 * props: { variants: [{ id, title, availableForSale, options:{Name:Value}, price }], options:[{name,values}] }
 */
import { addLine } from '/islands/shopify-client.js';

export default function (el, props = {}) {
  const variants = props.variants || [];
  const selects = [...el.querySelectorAll('select[data-option]')];
  const btn = el.querySelector('[data-add]');
  const status = el.querySelector('[data-status]');
  const priceEl = el.querySelector('[data-price]');

  function currentVariant() {
    if (!selects.length) return variants[0];
    const chosen = {};
    selects.forEach(s => { chosen[s.dataset.option] = s.value; });
    return variants.find(v => Object.entries(chosen).every(([k, val]) => v.options[k] === val)) || null;
  }

  function money(a, c) {
    try { return new Intl.NumberFormat('en-IE', { style: 'currency', currency: c }).format(+a); }
    catch { return `${a} ${c}`; }
  }

  function refresh() {
    const v = currentVariant();
    if (!v) { btn.disabled = true; btn.textContent = 'Unavailable'; return; }
    if (priceEl && v.price) priceEl.textContent = money(v.price.amount, v.price.currencyCode);
    if (!v.availableForSale) { btn.disabled = true; btn.textContent = 'Sold out'; }
    else { btn.disabled = false; btn.textContent = 'Add to cart'; }
  }

  selects.forEach(s => s.addEventListener('change', refresh));
  refresh();

  btn.addEventListener('click', async () => {
    const v = currentVariant();
    if (!v) return;
    btn.disabled = true;
    const label = btn.textContent;
    btn.textContent = 'Adding...';
    if (status) { status.textContent = ''; status.className = 'note'; }
    try {
      await addLine(v.id, 1);
      btn.textContent = 'Added';
      if (status) { status.textContent = 'In your cart.'; status.className = 'note'; }
      dispatchEvent(new CustomEvent('cart:open'));
      setTimeout(() => { btn.textContent = label; btn.disabled = false; }, 1400);
    } catch (e) {
      btn.textContent = label; btn.disabled = false;
      if (status) { status.textContent = e.message || 'Something went wrong.'; status.className = 'error'; }
    }
  });
}
