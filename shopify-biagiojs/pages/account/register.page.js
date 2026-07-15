/** Create account  static form, hydrated by the auth-register island. */
import { PerfNode, PerformanceGraph } from 'biagiojs/graph';
import { headerNode, footerNode, head } from '../../lib/shell.js';
import { collectionsNav } from '../../lib/queries.js';
import { isConfigured } from '../../lib/shopify.js';

export default async function () {
  const g = new PerformanceGraph();
  const collections = isConfigured() ? await collectionsNav() : [];
  g.add(headerNode(PerfNode, { active: '/account/', collections }));

  g.add(new PerfNode('register', {
    seoWeight: 0.2, conversionWeight: 0.7, interactionProbability: 0.9,
    clientModule: '/islands/auth-register.js',
    render: () => `<section class="wrap"><div class="formcard">
      <h1 style="font-size:28px;text-align:center;margin-bottom:6px">Create your account</h1>
      <p class="note" style="text-align:center;margin-bottom:24px">Faster checkout and order history</p>
      <div class="panel">
        <form novalidate>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <label class="field"><span>First name</span><input name="firstName" autocomplete="given-name"></label>
            <label class="field"><span>Last name</span><input name="lastName" autocomplete="family-name"></label>
          </div>
          <label class="field"><span>Email</span>
            <input name="email" type="email" autocomplete="email" required></label>
          <label class="field"><span>Password</span>
            <input name="password" type="password" autocomplete="new-password" minlength="5" required></label>
          <p class="error" data-error></p>
          <button class="btn block" type="submit">Create account</button>
        </form>
      </div>
      <p class="note" style="text-align:center;margin-top:18px">
        Already have an account? <a href="/account/login/" style="color:var(--accent-ink);font-weight:600">Sign in</a></p>
    </div></section>`,
  }));

  g.add(footerNode(PerfNode, { collections }));
  const order = { header: 0, register: 1, footer: 2 };
  for (const [id, o] of Object.entries(order)) g.get(id).domOrder = o;

  return { graph: g, head: head(), page: { title: 'Create account | biagio.shop', description: 'Create your account.', noindex: true } };
}
