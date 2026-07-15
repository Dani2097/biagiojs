/**
 * Private customer area  SSR on demand (prerender=false).
 *
 * Reads the `customer_token` cookie, fetches the customer from the Storefront API
 * server-side, and renders orders / profile / addresses. If there's no valid
 * session it renders a sign-in prompt. Deployed, this needs an adapter
 * (site.deploy: 'node' | 'vercel' | 'cloudflare'); locally `biagio preview .` works.
 */
import { PerfNode, PerformanceGraph } from 'biagiojs/graph';
import { headerNode, footerNode, head } from '../../lib/shell.js';
import { money, esc } from '../../theme.js';
import { collectionsNav, customerByToken } from '../../lib/queries.js';

export const prerender = false;

function readCookie(request, name) {
  const raw = request?.headers?.cookie || '';
  const hit = raw.split('; ').find(c => c.startsWith(name + '='));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : null;
}

const badgeColor = (s) => ({ PAID: 'var(--ok)', PENDING: '#b3722c', REFUNDED: 'var(--muted)' }[s] || 'var(--muted)');

function signedOut(g) {
  g.add(new PerfNode('gate', {
    conversionWeight: 0.6,
    render: () => `<section class="wrap"><div class="formcard" style="text-align:center">
      <h1 style="font-size:26px;margin-bottom:8px">Your account</h1>
      <p class="note" style="margin-bottom:22px">Please sign in to view your orders and details.</p>
      <a class="btn block" href="/account/login/">Sign in</a>
      <p class="note" style="margin-top:14px">New here?
        <a href="/account/register/" style="color:var(--accent-ink);font-weight:600">Create an account</a></p>
    </div></section>`,
  }));
  g.get('gate').domOrder = 1;
}

export default async function ({ request }) {
  const g = new PerformanceGraph();
  const collections = await collectionsNav().catch(() => []);
  g.add(headerNode(PerfNode, { active: '/account/', collections }));
  g.add(footerNode(PerfNode, { collections }));
  g.get('header').domOrder = 0;

  const token = readCookie(request, 'customer_token');
  let customer = null;
  if (token) { try { customer = await customerByToken(token); } catch {} }

  if (!customer) {
    signedOut(g);
    g.get('footer').domOrder = 2;
    return { graph: g, head: head(), page: { title: 'Account | biagio.shop', description: 'Your account.', noindex: true } };
  }

  const addr = customer.defaultAddress;
  const orders = customer.orders?.nodes || [];

  g.add(new PerfNode('welcome', {
    conversionWeight: 0.4,
    clientModule: '/islands/account-logout.js',
    hydrateMode: 'eager',
    render: () => `<section class="wrap section account-welcome" style="padding-bottom:12px;display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap">
      <div>
        <span class="eyebrow">Your account</span>
        <h1 style="font-size:clamp(24px,3.4vw,36px);margin-top:8px">Hi ${esc(customer.firstName || 'there')}</h1>
      </div>
      <button class="btn ghost" data-logout>Sign out</button>
    </section>`,
  }));

  g.add(new PerfNode('details', {
    seoWeight: 0,
    render: () => `<section class="wrap" style="padding-bottom:16px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px" class="account-grid">
        <div class="panel">
          <h3 style="font-size:16px;margin-bottom:10px">Profile</h3>
          <div class="muted" style="line-height:1.9">
            ${esc([customer.firstName, customer.lastName].filter(Boolean).join(' ')) || ''}<br>
            ${esc(customer.email || '')}${customer.phone ? '<br>' + esc(customer.phone) : ''}
          </div>
        </div>
        <div class="panel">
          <h3 style="font-size:16px;margin-bottom:10px">Default address</h3>
          <div class="muted" style="line-height:1.9">${addr
            ? [addr.address1, addr.address2, `${addr.zip || ''} ${addr.city || ''}`.trim(), addr.province, addr.country]
                .filter(Boolean).map(esc).join('<br>')
            : 'No address saved yet.'}</div>
        </div>
      </div>
    </section>`,
  }));

  g.add(new PerfNode('orders', {
    conversionWeight: 0.3, cpuCost: 2,
    render: () => `<section class="wrap section" style="padding-top:20px">
      <h2 style="font-size:20px;margin-bottom:16px">Order history</h2>
      ${orders.length ? `<div class="panel" style="padding:0">
        ${orders.map((o, i) => `<div style="display:flex;justify-content:space-between;align-items:center;gap:16px;padding:16px 22px;${i ? 'border-top:1px solid var(--line)' : ''}">
          <div>
            <div style="font-weight:600">Order #${o.orderNumber}</div>
            <div class="note">${new Date(o.processedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
               ${o.lineItems.nodes.reduce((n, l) => n + l.quantity, 0)} item(s)</div>
          </div>
          <div style="text-align:right">
            <div style="font-weight:700">${money(o.currentTotalPrice.amount, o.currentTotalPrice.currencyCode)}</div>
            <span class="note" style="color:${badgeColor(o.financialStatus)};font-weight:600">${esc((o.financialStatus || '').toLowerCase())}</span>
          </div>
        </div>`).join('')}
      </div>` : `<div class="panel"><p class="muted">No orders yet. <a href="/" style="color:var(--accent-ink);font-weight:600">Start shopping</a></p></div>`}
    </section>`,
  }));

  const order = { header: 0, welcome: 1, details: 2, orders: 3, footer: 4 };
  for (const [id, o] of Object.entries(order)) g.get(id).domOrder = o;

  return {
    graph: g,
    head: head(),
    page: { title: 'My account | biagio.shop', description: 'Your orders and details.', noindex: true },
  };
}
