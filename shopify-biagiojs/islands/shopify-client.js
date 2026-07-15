/**
 * Browser-side Shopify Storefront client + cart & auth stores.
 * Imported by the other islands via the absolute path "/islands/shopify-client.js".
 *
 * Config comes from window.__SHOPIFY__ (injected in each page <head> from env).
 * The Storefront token is publishable  safe to expose here.
 */

const CFG = () => (typeof window !== 'undefined' && window.__SHOPIFY__) || {};
const CART_ID = 'cart:id';
const CART_COUNT = 'cart:count';
const CUST_TOKEN = 'customer_token';

export async function sf(query, variables = {}) {
  const { domain, token, version } = CFG();
  const res = await fetch(`https://${domain}/api/${version}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': token },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors.map(e => e.message).join('; '));
  return json.data;
}

/*  Cart  */

const CART_FIELDS = `
  id
  checkoutUrl
  totalQuantity
  cost { subtotalAmount { amount currencyCode } totalAmount { amount currencyCode } }
  lines(first:100){ nodes {
    id quantity
    cost { totalAmount { amount currencyCode } }
    merchandise { ... on ProductVariant {
      id title
      image { url altText }
      price { amount currencyCode }
      product { title handle }
    } }
  } }`;

function setCount(n) {
  try { localStorage.setItem(CART_COUNT, String(n || 0)); } catch {}
  dispatchEvent(new CustomEvent('cart:change', { detail: { count: n || 0 } }));
}

export function cartCount() {
  try { return +(localStorage.getItem(CART_COUNT) || 0); } catch { return 0; }
}

function remember(cart) {
  if (cart?.id) { try { localStorage.setItem(CART_ID, cart.id); } catch {} }
  setCount(cart?.totalQuantity || 0);
  return cart;
}

export async function getCart() {
  let id;
  try { id = localStorage.getItem(CART_ID); } catch {}
  if (!id) return null;
  const data = await sf(`query($id:ID!){ cart(id:$id){ ${CART_FIELDS} } }`, { id });
  if (!data.cart) { try { localStorage.removeItem(CART_ID); } catch {} setCount(0); return null; }
  return remember(data.cart);
}

export async function addLine(variantId, quantity = 1) {
  let id;
  try { id = localStorage.getItem(CART_ID); } catch {}
  if (!id) {
    const data = await sf(
      `mutation($lines:[CartLineInput!]!){ cartCreate(input:{lines:$lines}){ cart{ ${CART_FIELDS} } userErrors{ message } } }`,
      { lines: [{ merchandiseId: variantId, quantity }] }
    );
    const { cart, userErrors } = data.cartCreate;
    if (userErrors?.length) throw new Error(userErrors[0].message);
    return remember(cart);
  }
  const data = await sf(
    `mutation($id:ID!,$lines:[CartLineInput!]!){ cartLinesAdd(cartId:$id, lines:$lines){ cart{ ${CART_FIELDS} } userErrors{ message } } }`,
    { id, lines: [{ merchandiseId: variantId, quantity }] }
  );
  const { cart, userErrors } = data.cartLinesAdd;
  if (userErrors?.length) throw new Error(userErrors[0].message);
  return remember(cart);
}

export async function updateLine(lineId, quantity) {
  const id = localStorage.getItem(CART_ID);
  const data = await sf(
    `mutation($id:ID!,$lines:[CartLineUpdateInput!]!){ cartLinesUpdate(cartId:$id, lines:$lines){ cart{ ${CART_FIELDS} } userErrors{ message } } }`,
    { id, lines: [{ id: lineId, quantity }] }
  );
  return remember(data.cartLinesUpdate.cart);
}

export async function removeLine(lineId) {
  const id = localStorage.getItem(CART_ID);
  const data = await sf(
    `mutation($id:ID!,$ids:[ID!]!){ cartLinesRemove(cartId:$id, lineIds:$ids){ cart{ ${CART_FIELDS} } userErrors{ message } } }`,
    { id, ids: [lineId] }
  );
  return remember(data.cartLinesRemove.cart);
}

/*  Customer auth  */

export function isLoggedIn() {
  return document.cookie.split('; ').some(c => c.startsWith(CUST_TOKEN + '='));
}

function cookieAttrs(expires) {
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
  const exp = expires ? `; expires=${expires}` : '';
  return `path=/; SameSite=Lax${secure}${exp}`;
}

function saveToken(token, expiresAt) {
  const days = 7;
  const exp = expiresAt ? new Date(expiresAt) : new Date(Date.now() + days * 864e5);
  document.cookie = `${CUST_TOKEN}=${encodeURIComponent(token)}; ${cookieAttrs(exp.toUTCString())}`;
}

export async function login(email, password) {
  const data = await sf(
    `mutation($input:CustomerAccessTokenCreateInput!){
      customerAccessTokenCreate(input:$input){
        customerAccessToken{ accessToken expiresAt }
        customerUserErrors{ message }
      }
    }`,
    { input: { email, password } }
  );
  const r = data.customerAccessTokenCreate;
  if (r.customerUserErrors?.length) throw new Error(r.customerUserErrors[0].message);
  if (!r.customerAccessToken) throw new Error('Invalid email or password.');
  saveToken(r.customerAccessToken.accessToken, r.customerAccessToken.expiresAt);
  return true;
}

export async function register(input) {
  const data = await sf(
    `mutation($input:CustomerCreateInput!){
      customerCreate(input:$input){ customer{ id } customerUserErrors{ message } }
    }`,
    { input }
  );
  const r = data.customerCreate;
  if (r.customerUserErrors?.length) throw new Error(r.customerUserErrors[0].message);
  // Auto-login after successful registration.
  return login(input.email, input.password);
}

export function logout() {
  document.cookie = `${CUST_TOKEN}=; ${cookieAttrs('Thu, 01 Jan 1970 00:00:00 GMT')}`;
}
