/**
 * Cart page: renders the live cart, quantity controls, remove, and checkout.
 * Renders entirely client-side (cart is per-visitor, no SEO value).
 */
import { getCart, updateLine, removeLine } from '/islands/shopify-client.js';

function money(a, c) {
  try { return new Intl.NumberFormat('en-IE', { style: 'currency', currency: c }).format(+a); }
  catch { return `${a} ${c}`; }
}

export default async function (el) {
  const mount = el.querySelector('[data-cart]') || el;

  async function render() {
    mount.innerHTML = '<p class="muted">Loading your cart...</p>';
    let cart;
    try { cart = await getCart(); }
    catch (e) { mount.innerHTML = `<p class="error">${e.message}</p>`; return; }

    if (!cart || !cart.lines.nodes.length) {
      mount.innerHTML = `<div class="panel" style="text-align:center;padding:56px">
        <h2 style="margin-bottom:8px">Your cart is empty</h2>
        <p class="muted" style="margin-bottom:22px">Nothing here yet  let's fix that.</p>
        <a class="btn" href="/">Browse the shop</a></div>`;
      return;
    }

    const rows = cart.lines.nodes.map(l => {
      const m = l.merchandise;
      const img = m.image ? `<img src="${m.image.url}" alt="" width="72" height="90" style="border-radius:10px;object-fit:cover">` : '';
      return `<div class="line" data-line="${l.id}" style="display:flex;gap:16px;align-items:center;padding:16px 0;border-bottom:1px solid var(--line)">
        ${img}
        <div style="flex:1">
          <a href="/products/${m.product.handle}/" style="font-weight:600">${m.product.title}</a>
          <div class="muted" style="font-size:13px">${m.title !== 'Default Title' ? m.title : ''}</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <button class="qbtn" data-dec aria-label="Decrease">-</button>
          <span data-qty style="min-width:22px;text-align:center">${l.quantity}</span>
          <button class="qbtn" data-inc aria-label="Increase">+</button>
        </div>
        <div style="min-width:88px;text-align:right;font-weight:600">${money(l.cost.totalAmount.amount, l.cost.totalAmount.currencyCode)}</div>
        <button class="rm muted" data-rm aria-label="Remove" style="background:none;border:none;cursor:pointer;font-size:20px;line-height:1;color:var(--muted)">x</button>
      </div>`;
    }).join('');

    mount.innerHTML = `
      <style>.qbtn{width:30px;height:30px;border:1px solid var(--line);background:#fff;border-radius:8px;cursor:pointer;font-size:16px}</style>
      <div class="panel">${rows}
        <div style="display:flex;justify-content:space-between;align-items:center;padding-top:22px">
          <div><div class="muted" style="font-size:13px">Subtotal</div>
            <div style="font-size:22px;font-weight:700">${money(cart.cost.subtotalAmount.amount, cart.cost.subtotalAmount.currencyCode)}</div></div>
          <a class="btn" href="${cart.checkoutUrl}">Checkout</a>
        </div>
        <p class="note" style="margin-top:12px">Taxes & shipping calculated at Shopify's secure checkout.</p>
      </div>`;

    mount.querySelectorAll('[data-line]').forEach(row => {
      const id = row.dataset.line;
      const qty = () => +row.querySelector('[data-qty]').textContent;
      row.querySelector('[data-inc]').onclick = () => act(() => updateLine(id, qty() + 1));
      row.querySelector('[data-dec]').onclick = () => act(() => updateLine(id, Math.max(0, qty() - 1)));
      row.querySelector('[data-rm]').onclick = () => act(() => removeLine(id));
    });
  }

  async function act(fn) {
    try { await fn(); await render(); }
    catch (e) { mount.innerHTML = `<p class="error">${e.message}</p>`; }
  }

  render();
}
