/**
 * Isola REACT — biagiojs può idratare componenti di framework esterni.
 * Modulo client puro: caricato via import() solo se lo scheduler lo decide.
 * React via esm.sh (in un progetto Vite: `import React from 'react'` bundlato).
 * Export default: (el, props) => void
 */
import React from 'https://esm.sh/react@18';
import { createRoot } from 'https://esm.sh/react-dom@18/client';

function StockTicker({ initial = 7, product = 'AeroFoam X-1' }) {
  const [stock, setStock] = React.useState(initial);
  const [reserved, setReserved] = React.useState(false);
  React.useEffect(() => {
    const t = setInterval(() => setStock(s => Math.max(1, s + (Math.random() < 0.6 ? -1 : 1))), 4000);
    return () => clearInterval(t);
  }, []);
  return React.createElement('div', { style: { display: 'inline-flex', gap: 12, alignItems: 'center', background: '#fff', border: '1px solid #ececec', borderRadius: 12, padding: '12px 20px' } },
    React.createElement('span', { style: { width: 10, height: 10, borderRadius: '50%', background: stock <= 3 ? '#e03442' : '#1d7a46', display: 'inline-block' } }),
    React.createElement('b', null, stock <= 3 ? `Solo ${stock} rimaste!` : `${stock} disponibili`),
    React.createElement('button', {
      onClick: () => setReserved(true),
      disabled: reserved,
      style: { border: 'none', background: reserved ? '#1d7a46' : '#14141f', color: '#fff', padding: '8px 18px', borderRadius: 999, cursor: 'pointer' },
    }, reserved ? 'Riservata ✓' : `Riserva la tua ${product.split(' ')[0]}`),
    React.createElement('small', { style: { color: '#8a8a96' } }, '← isola React idratata da biagiojs')
  );
}

export default function hydrate(el, props) {
  const mount = el.querySelector('[data-react-root]') || el;
  createRoot(mount).render(React.createElement(StockTicker, props));
}
