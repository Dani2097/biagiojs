/**
 * Floating cart drawer — slides in from the right over any page.
 * Loaded lazily (dynamic import) the first time the cart is opened, so
 * catalog pages pay zero JS for it until the visitor actually uses the cart.
 *
 * The /cart/ page keeps working as the no-JS fallback.
 */
import { getCart, updateLine, removeLine } from '/islands/shopify-client.js';

const CSS = `
.cd-overlay{position:fixed;inset:0;background:rgba(10,10,10,.45);z-index:90;opacity:0;transition:opacity .25s}
.cd-overlay.open{opacity:1}
.cd{position:fixed;top:0;right:0;bottom:0;width:min(430px,100vw);background:#fff;z-index:91;
  display:flex;flex-direction:column;border-left:1px solid var(--ink,#0a0a0a);
  transform:translateX(100%);transition:transform .3s cubic-bezier(.2,.6,.2,1)}
.cd.open{transform:none}
.cd-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;
  border-bottom:1px solid var(--line,#e4e4e4)}
.cd-head h2{font-size:15px;letter-spacing:.14em;text-transform:uppercase;margin:0}
.cd-close{background:none;border:none;font-size:22px;line-height:1;cursor:pointer;padding:4px 8px}
.cd-body{flex:1;overflow-y:auto;padding:6px 22px}
.cd-line{display:flex;gap:14px;padding:16px 0;border-bottom:1px solid var(--line,#e4e4e4)}
.cd-line img{width:64px;height:80px;object-fit:cover;background:#f4f4f4}
.cd-line .t{flex:1;min-width:0}
.cd-line .t a{font-size:12.5px;letter-spacing:.06em;text-transform:uppercase;font-weight:500}
.cd-line .t .v{font-size:12px;color:var(--muted,#757575);margin-top:2px}
.cd-line .p{font-size:13px;font-weight:600;white-space:nowrap}
.cd-qty{display:inline-flex;align-items:center;gap:10px;margin-top:10px;border:1px solid var(--line,#e4e4e4)}
.cd-qty button{width:26px;height:26px;background:none;border:none;cursor:pointer;font-size:14px}
.cd-qty span{min-width:16px;text-align:center;font-size:13px}
.cd-rm{background:none;border:none;cursor:pointer;font-size:11px;letter-spacing:.08em;
  text-transform:uppercase;color:var(--muted,#757575);padding:0;margin-top:10px;margin-left:14px;
  text-decoration:underline;text-underline-offset:2px}
.cd-foot{border-top:1px solid var(--ink,#0a0a0a);padding:18px 22px}
.cd-sub{display:flex;justify-content:space-between;font-size:14px;font-weight:600;margin-bottom:14px;
  letter-spacing:.06em;text-transform:uppercase}
.cd-empty{text-align:center;padding:70px 10px}
.cd-empty p{font-size:12.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted,#757575)}
`;

function money(a, c) {
  try { return new Intl.NumberFormat('en-IE', { style: 'currency', currency: c }).format(+a); }
  catch { return `${a} ${c}`; }
}

let root;

function ensureRoot() {
  if (root) return root;
  root = document.createElement('div');
  root.innerHTML = `<style>${CSS}</style>
    <div class="cd-overlay" hidden></div>
    <aside class="cd" role="dialog" aria-modal="true" aria-label="Cart" hidden>
      <div class="cd-head"><h2>Cart</h2>
        <button class="cd-close" aria-label="Close">&times;</button></div>
      <div class="cd-body"></div>
      <div class="cd-foot" hidden></div>
    </aside>`;
  document.body.appendChild(root);
  const overlay = root.querySelector('.cd-overlay');
  overlay.addEventListener('click', close);
  root.querySelector('.cd-close').addEventListener('click', close);
  addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  return root;
}

export function close() {
  if (!root) return;
  root.querySelector('.cd-overlay').classList.remove('open');
  root.querySelector('.cd').classList.remove('open');
  setTimeout(() => {
    root.querySelector('.cd-overlay').hidden = true;
    root.querySelector('.cd').hidden = true;
  }, 300);
  document.documentElement.style.overflow = '';
}

async function render() {
  const body = root.querySelector('.cd-body');
  const foot = root.querySelector('.cd-foot');
  let cart;
  try { cart = await getCart(); }
  catch (e) { body.innerHTML = `<p class="error">${e.message}</p>`; return; }

  if (!cart || !cart.lines.nodes.length) {
    foot.hidden = true;
    body.innerHTML = `<div class="cd-empty"><p>Your cart is empty</p>
      <a class="btn" href="/" style="margin-top:16px">Shop now</a></div>`;
    return;
  }

  body.innerHTML = cart.lines.nodes.map(l => {
    const m = l.merchandise;
    return `<div class="cd-line" data-line="${l.id}">
      ${m.image ? `<img src="${m.image.url}${m.image.url.includes('?') ? '&' : '?'}width=128" alt="" loading="lazy">` : ''}
      <div class="t">
        <a href="/products/${m.product.handle}/">${m.product.title}</a>
        <div class="v">${m.title !== 'Default Title' ? m.title : ''}</div>
        <span class="cd-qty">
          <button data-dec aria-label="Decrease">&minus;</button>
          <span data-qty>${l.quantity}</span>
          <button data-inc aria-label="Increase">+</button>
        </span><button class="cd-rm" data-rm>Remove</button>
      </div>
      <div class="p">${money(l.cost.totalAmount.amount, l.cost.totalAmount.currencyCode)}</div>
    </div>`;
  }).join('');

  foot.hidden = false;
  foot.innerHTML = `
    <div class="cd-sub"><span>Subtotal</span>
      <span>${money(cart.cost.subtotalAmount.amount, cart.cost.subtotalAmount.currencyCode)}</span></div>
    <a class="btn block" href="${cart.checkoutUrl}">Checkout</a>
    <p class="note" style="margin-top:10px;text-align:center">Taxes &amp; shipping calculated at checkout.</p>`;

  body.querySelectorAll('[data-line]').forEach(row => {
    const id = row.dataset.line;
    const qty = () => +row.querySelector('[data-qty]').textContent;
    const act = fn => fn().then(render).catch(e => { body.innerHTML = `<p class="error">${e.message}</p>`; });
    row.querySelector('[data-inc]').onclick = () => act(() => updateLine(id, qty() + 1));
    row.querySelector('[data-dec]').onclick = () => act(() => updateLine(id, Math.max(0, qty() - 1)));
    row.querySelector('[data-rm]').onclick = () => act(() => removeLine(id));
  });
}

export default function open() {
  ensureRoot();
  const overlay = root.querySelector('.cd-overlay');
  const panel = root.querySelector('.cd');
  overlay.hidden = false; panel.hidden = false;
  requestAnimationFrame(() => { overlay.classList.add('open'); panel.classList.add('open'); });
  document.documentElement.style.overflow = 'hidden';
  panel.querySelector('.cd-body').innerHTML = '<p class="note" style="padding:20px 0">Loading&hellip;</p>';
  render();
}
