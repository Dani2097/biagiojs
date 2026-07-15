/** Formatting helpers shared by server-rendered pages. */

export function money(amount, currencyCode = 'EUR') {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  try {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    }).format(n);
  } catch {
    return `${n} ${currencyCode}`;
  }
}

export function priceRange(range) {
  if (!range) return '';
  const { minVariantPrice: min, maxVariantPrice: max } = range;
  const a = money(min.amount, min.currencyCode);
  if (!max || min.amount === max.amount) return a;
  return `${a} - ${money(max.amount, max.currencyCode)}`;
}

/** Escape untrusted strings before injecting into HTML. */
export function esc(s = '') {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
