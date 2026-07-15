/** Login form  customerAccessTokenCreate, stores token cookie, redirects to /account/. */
import { login } from '/islands/shopify-client.js';

export default function (el) {
  const form = el.querySelector('form');
  const err = el.querySelector('[data-error]');
  const btn = form.querySelector('button[type=submit]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.textContent = '';
    btn.disabled = true;
    const label = btn.textContent;
    btn.textContent = 'Signing in...';
    try {
      await login(form.email.value.trim(), form.password.value);
      location.href = '/account/';
    } catch (ex) {
      err.textContent = ex.message || 'Sign in failed.';
      btn.disabled = false;
      btn.textContent = label;
    }
  });
}
