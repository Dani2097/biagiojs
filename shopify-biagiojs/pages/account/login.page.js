/** Sign in  static form, hydrated by the auth-login island. */
import { PerfNode, PerformanceGraph } from 'biagiojs/graph';
import { headerNode, footerNode, head } from '../../lib/shell.js';
import { collectionsNav } from '../../lib/queries.js';
import { isConfigured } from '../../lib/shopify.js';

export default async function () {
  const g = new PerformanceGraph();
  const collections = isConfigured() ? await collectionsNav() : [];
  g.add(headerNode(PerfNode, { active: '/account/', collections }));

  g.add(new PerfNode('login', {
    seoWeight: 0.2, conversionWeight: 0.7, interactionProbability: 0.9,
    clientModule: '/islands/auth-login.js',
    render: () => `<section class="wrap"><div class="formcard">
      <h1 style="font-size:28px;text-align:center;margin-bottom:6px">Welcome back</h1>
      <p class="note" style="text-align:center;margin-bottom:24px">Sign in to your account</p>
      <div class="panel">
        <form novalidate>
          <label class="field"><span>Email</span>
            <input name="email" type="email" autocomplete="email" required></label>
          <label class="field"><span>Password</span>
            <input name="password" type="password" autocomplete="current-password" required></label>
          <p class="error" data-error></p>
          <button class="btn block" type="submit">Sign in</button>
        </form>
      </div>
      <p class="note" style="text-align:center;margin-top:18px">
        No account? <a href="/account/register/" style="color:var(--accent-ink);font-weight:600">Create one</a></p>
    </div></section>`,
  }));

  g.add(footerNode(PerfNode, { collections }));
  const order = { header: 0, login: 1, footer: 2 };
  for (const [id, o] of Object.entries(order)) g.get(id).domOrder = o;

  return { graph: g, head: head(), page: { title: 'Sign in | biagio.shop', description: 'Sign in to your account.', noindex: true } };
}
