/** Sort + sale filter for catalog grids (products + collections). Zero network. */
export default function (el) {
  const grid = el.querySelector('[data-catalog-grid]');
  const empty = el.querySelector('[data-catalog-empty]');
  const count = el.querySelector('[data-catalog-count]');
  const sort = el.querySelector('[data-catalog-sort]');
  const saleOnly = el.querySelector('[data-catalog-sale]');
  if (!grid) return;

  const cards = () => [...grid.querySelectorAll('.card')];

  function apply() {
    const mode = sort?.value || 'featured';
    const sale = saleOnly?.checked;
    let list = cards().filter((c) => !sale || c.dataset.sale === '1');

    list.sort((a, b) => {
      if (mode === 'price-asc') return +a.dataset.price - +b.dataset.price;
      if (mode === 'price-desc') return +b.dataset.price - +a.dataset.price;
      if (mode === 'name') return (a.dataset.title || '').localeCompare(b.dataset.title || '');
      return (+a.dataset.idx || 0) - (+b.dataset.idx || 0);
    });

    list.forEach((c) => grid.appendChild(c));
    const hidden = new Set(cards().filter((c) => !list.includes(c)));
    for (const c of cards()) c.hidden = hidden.has(c);

    if (count) count.textContent = `${list.length} product${list.length === 1 ? '' : 's'}`;
    if (empty) empty.hidden = list.length > 0;
  }

  sort?.addEventListener('change', apply);
  saleOnly?.addEventListener('change', apply);
  apply();
}
