/** Registration form  customerCreate, then auto-login and redirect. */
import { register } from '/islands/shopify-client.js';

export default function (el) {
  const form = el.querySelector('form');
  const err = el.querySelector('[data-error]');
  const btn = form.querySelector('button[type=submit]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.textContent = '';
    btn.disabled = true;
    const label = btn.textContent;
    btn.textContent = 'Creating account...';
    try {
      await register({
        firstName: form.firstName.value.trim(),
        lastName: form.lastName.value.trim(),
        email: form.email.value.trim(),
        password: form.password.value,
      });
      location.href = '/account/';
    } catch (ex) {
      err.textContent = ex.message || 'Could not create account.';
      btn.disabled = false;
      btn.textContent = label;
    }
  });
}
