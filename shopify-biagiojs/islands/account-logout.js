/** Logout button: clears the customer token cookie and returns home. */
import { logout } from '/islands/shopify-client.js';

export default function (el) {
  const btn = el.querySelector('[data-logout]');
  if (!btn) return;
  btn.addEventListener('click', () => {
    logout();
    location.href = '/';
  });
}
