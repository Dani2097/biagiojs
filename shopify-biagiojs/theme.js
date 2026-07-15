/**
 * Shared design system + layout chrome (header / footer / product cards).
 * Pure server-side render helpers  no client JS lives here.
 * Visual language: elegant jewellery-store look  editorial serif display,
 * Raleway body, rose/red/cream palette, marquee topbar + countdown promo bar.
 */
import { money, priceRange, esc } from './lib/format.js';

export const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Raleway:wght@400;500;600;700&display=swap');
:root{
  --bg:#ffffff; --surface:#ffffff; --ink:#1a1a1c; --soft-ink:#4d4d4f; --muted:#8a8a8e;
  --line:#e6e0dc; --line-soft:#f1ece8;
  --accent:#bf002b; --accent-dark:#9d0f2c; --accent-soft:#faf8f4; --accent-ink:#bf002b;
  --rose:#e98e98; --rose-soft:#f7e6e9; --cream:#faf8f4;
  --ok:#1a1a1c; --sale:#bf002b;
  --radius:0px;
  --shadow:0 2px 8px rgba(26,26,28,.06),0 18px 44px rgba(26,26,28,.08);
  --max:1360px;
  --font:"Raleway",-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;
  --serif:"Cormorant Garamond",Georgia,"Times New Roman",serif;
}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--soft-ink);font-family:var(--font);line-height:1.6;
  font-size:15px;letter-spacing:.03em;
  font-feature-settings:"kern","liga";-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}
img{max-width:100%;display:block}
::selection{background:var(--rose-soft)}
.wrap{width:100%;max-width:var(--max);margin:0 auto;padding:0 26px}
h1,h2,h3{font-family:var(--serif);font-weight:500;letter-spacing:.01em;line-height:1.08;margin:0;color:var(--ink)}
.muted{color:var(--muted)}

/* Marquee topbar */
.topbar{background:var(--rose-soft);color:var(--soft-ink);overflow:hidden;white-space:nowrap;
  font-size:11.5px;letter-spacing:.14em;text-transform:uppercase;padding:8px 0}
.topbar .track{display:inline-flex;gap:64px;padding-right:64px;animation:marquee 22s linear infinite;will-change:transform}
.topbar b{color:var(--accent);font-weight:700}
@keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}

/* Countdown promo bar */
.promobar{background:var(--accent);color:#fff;font-size:12px;letter-spacing:.1em;text-transform:uppercase}
.promobar .row{display:flex;align-items:center;justify-content:center;gap:26px;min-height:40px;
  padding:6px 0;flex-wrap:wrap}
.promobar b{font-weight:700}
.countdown{display:inline-flex;gap:18px}
.countdown span{display:inline-grid;justify-items:center;line-height:1.15}
.countdown span b{font-size:14px;font-variant-numeric:tabular-nums}
.countdown span i{font-style:normal;font-size:9px;letter-spacing:.18em;opacity:.85}

/* Header */
.hdr{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.96);
  backdrop-filter:saturate(160%) blur(12px);border-bottom:1px solid var(--line-soft)}
.hdr .row{display:flex;align-items:center;gap:30px;height:76px}
.brand{font-family:var(--serif);font-weight:500;letter-spacing:.3em;font-size:27px;
  text-transform:uppercase;color:var(--ink);flex-shrink:0}
.brand .dot{display:none}
.search{flex:1;display:flex;justify-content:center}
.search input{width:min(420px,100%);font:inherit;font-size:13px;letter-spacing:.04em;color:var(--ink);
  background:var(--cream);border:1px solid var(--line);border-radius:999px;padding:10px 20px;
  transition:border-color .15s,background .15s}
.search input:focus{outline:none;border-color:var(--soft-ink);background:#fff}
.hdr .spacer{flex:0}
.iconbtn{display:inline-flex;align-items:center;gap:7px;font-size:11px;font-weight:600;color:var(--ink);
  letter-spacing:.14em;text-transform:uppercase;padding:8px 0;border-bottom:1px solid transparent;
  transition:color .15s,border-color .15s}
.iconbtn:hover{color:var(--accent)}
.cartbtn{position:relative}
.badge{min-width:17px;height:17px;padding:0 4px;border-radius:999px;background:var(--accent);color:#fff;
  font-size:10px;font-weight:700;display:inline-flex;align-items:center;justify-content:center}
.badge[hidden]{display:none}

/* Nav (below header, centered, mega-menu style) */
.navbar{background:#fff;border-bottom:1px solid var(--line-soft);position:relative;z-index:49}
.nav{display:flex;justify-content:center;gap:38px;flex-wrap:wrap}
.nav a{display:block;color:var(--soft-ink);font-size:11.5px;font-weight:600;letter-spacing:.16em;
  text-transform:uppercase;padding:14px 0 12px;border-bottom:2px solid transparent;
  transition:color .15s,border-color .15s}
.nav a:hover{color:var(--accent);border-color:var(--accent)}
.nav a[aria-current]{color:var(--accent);border-color:var(--accent);font-weight:700}

/* Buttons */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:1px solid var(--accent);
  background:var(--accent);color:#fff;font:inherit;font-weight:600;font-size:12px;
  letter-spacing:.18em;text-transform:uppercase;
  padding:15px 34px;border-radius:var(--radius);cursor:pointer;width:auto;
  transition:background .2s,border-color .2s,color .2s,transform .06s,box-shadow .2s}
.btn:hover{background:#fff;color:var(--accent);box-shadow:none}
.btn:active{transform:translateY(1px)}
.btn[disabled]{opacity:.45;cursor:not-allowed;box-shadow:none}
.btn[disabled]:hover{background:var(--accent);border-color:var(--accent);color:#fff}
.btn.ghost{background:transparent;color:var(--ink);border-color:var(--ink);box-shadow:none}
.btn.ghost:hover{background:var(--ink);color:var(--bg)}
.btn.block{width:100%}

/* Product grid */
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:34px 18px}
.card{display:block;background:#fff;border:1px solid var(--line-soft);
  transition:box-shadow .25s,transform .25s}
.card:hover{box-shadow:var(--shadow)}
.card .ph{aspect-ratio:3/4;background:var(--cream);overflow:hidden;position:relative}
.card .ph img{width:100%;height:100%;object-fit:cover;
  transition:transform .6s cubic-bezier(.2,.6,.2,1),opacity .3s}
.card:hover .ph img{transform:scale(1.05)}
.card .flag{position:absolute;top:12px;left:12px;display:flex;gap:8px}
.card .flag span{background:#fff;color:var(--sale);font-size:9.5px;font-weight:700;
  letter-spacing:.14em;text-transform:uppercase;padding:4px 9px;box-shadow:0 1px 4px rgba(26,26,28,.12)}
.card .body{padding:16px 14px 20px;text-align:center}
.card .title{font-weight:500;font-size:12.5px;letter-spacing:.06em;color:var(--soft-ink);
  margin-bottom:7px;min-height:1em}
.card .price{color:var(--ink);font-family:var(--serif);font-size:17px;font-weight:600;
  font-variant-numeric:tabular-nums}
.card[data-sale="1"] .price{color:var(--sale)}

/* Layout helpers */
.section{padding:76px 0}
.eyebrow{display:inline-flex;align-items:center;gap:12px;color:var(--accent);font-weight:600;
  letter-spacing:.3em;font-size:10.5px;text-transform:uppercase}
.eyebrow::before,.eyebrow::after{content:"";width:28px;height:1px;background:var(--rose)}
.lead{color:var(--muted);font-size:17px;line-height:1.75;max-width:58ch;letter-spacing:.02em}
.pill{display:inline-flex;align-items:center;gap:6px;background:var(--rose-soft);border:0;
  border-radius:999px;padding:6px 16px;font-size:10.5px;font-weight:700;letter-spacing:.16em;
  text-transform:uppercase;color:var(--accent)}
.sale{color:var(--sale);font-weight:700}
s{color:var(--muted)}

/* Hero  full-bleed red banner, editorial serif */
.hero{position:relative;overflow:hidden;color:#fff;
  background:radial-gradient(120% 160% at 78% 10%,#d4103f 0%,var(--accent) 45%,#8f0022 100%)}
.hero::before{content:"S";position:absolute;right:-4%;top:50%;transform:translateY(-54%);
  font-family:var(--serif);font-style:italic;font-size:min(72vw,760px);line-height:1;
  color:rgba(255,255,255,.07);pointer-events:none;user-select:none}
.hero .inner{position:relative;padding:120px 0 104px;text-align:center;
  display:grid;justify-items:center}
.hero h1{font-size:clamp(52px,9vw,124px);font-weight:500;max-width:14ch;margin:26px 0 18px;color:#fff}
.hero h1 em{font-style:italic;color:var(--rose)}
.hero .eyebrow{color:#fff}.hero .eyebrow::before,.hero .eyebrow::after{background:rgba(255,255,255,.5)}
.hero .lead{color:#ffffffcc;margin:0 auto}
.hero .cta{display:flex;align-items:center;justify-content:center;gap:22px;margin-top:40px;flex-wrap:wrap}
.hero .cta .btn{background:#fff;color:var(--accent);border-color:#fff}
.hero .cta .btn:hover{background:transparent;color:#fff}
.hero .hint{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#ffffffa6}

/* Section headings  centered, serif */
.sechead{display:grid;justify-items:center;text-align:center;gap:12px;margin-bottom:44px}
.sechead h2{font-size:clamp(30px,3.6vw,44px);font-weight:500}
.sechead h2 em{font-style:italic;color:var(--accent)}
.sechead a{font-size:11px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;
  color:var(--ink);border-bottom:1px solid var(--ink);padding-bottom:3px;transition:color .15s,border-color .15s}
.sechead a:hover{color:var(--accent);border-color:var(--accent)}

/* Services strip */
.services{background:var(--cream);border-top:1px solid var(--line-soft);border-bottom:1px solid var(--line-soft)}
.services .cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:36px;padding:54px 0}
.services h4{font-family:var(--serif);font-size:20px;font-weight:600;color:var(--ink);margin:0 0 8px}
.services p{margin:0;font-size:13px;color:var(--muted);line-height:1.7}
.services svg{color:var(--accent);margin-bottom:14px}

/* Footer */
.ftr{margin-top:0;background:#fff;padding:64px 0 36px;color:var(--muted);font-size:13px}
.ftr .cols{display:flex;flex-wrap:wrap;gap:40px 64px;justify-content:space-between;margin-bottom:48px}
.ftr .about{max-width:36ch}
.ftr .about .brand{margin-bottom:14px;font-size:22px}
.ftr h4{font-family:var(--font);font-size:11px;font-weight:700;letter-spacing:.24em;
  text-transform:uppercase;color:var(--ink);margin:0 0 16px}
.ftr ul{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.ftr a{color:var(--muted);transition:color .15s}.ftr a:hover{color:var(--accent)}
.ftr .row{display:flex;flex-wrap:wrap;gap:16px;justify-content:space-between;align-items:center;
  border-top:1px solid var(--line-soft);padding-top:26px;font-size:12px;letter-spacing:.04em}

/* Catalog layout (grid + category sidebar) */
.catalog{display:grid;grid-template-columns:220px 1fr;gap:48px;align-items:start}
.catalog-main{display:grid;gap:20px;min-width:0}
.catalog-bar{display:flex;flex-wrap:wrap;align-items:center;gap:14px 24px;
  padding:14px 0;border-bottom:1px solid var(--line-soft);margin-bottom:4px}
.catalog-field{display:flex;align-items:center;gap:10px;font-size:10.5px;font-weight:700;
  letter-spacing:.18em;text-transform:uppercase;color:var(--muted)}
.catalog-field select{font:inherit;font-size:13px;font-weight:500;text-transform:none;letter-spacing:.02em;
  color:var(--ink);padding:9px 34px 9px 14px;border:1px solid var(--line);background:var(--surface);
  border-radius:999px;cursor:pointer;min-width:190px}
.catalog-check{display:inline-flex;align-items:center;gap:8px;font-size:13px;color:var(--muted);cursor:pointer;user-select:none}
.catalog-check input{width:16px;height:16px;margin:0;accent-color:var(--accent)}
.catalog-count{margin-left:auto;font-size:12px;letter-spacing:.08em;text-transform:uppercase}
.catalog-empty{padding:28px 0;text-align:center}
.side{position:sticky;top:150px}
.side h3{font-family:var(--font);font-size:11px;font-weight:700;letter-spacing:.24em;
  text-transform:uppercase;margin-bottom:18px;color:var(--accent)}
.side ul{list-style:none;margin:0;padding:0;display:grid;gap:2px}
.side a{display:block;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);
  padding:8px 0;border-bottom:1px solid transparent;transition:color .15s}
.side a:hover{color:var(--accent)}
.side a[aria-current]{color:var(--accent);font-weight:700}
@media(max-width:900px){
  .catalog{grid-template-columns:1fr;gap:26px}
  .side{position:static}
  .side ul{display:flex;flex-wrap:wrap;gap:6px 18px;overflow-x:auto;-webkit-overflow-scrolling:touch;
    padding-bottom:4px;scrollbar-width:none}
  .side ul::-webkit-scrollbar{display:none}
  .side h3{display:none}
  .catalog-count{width:100%;margin-left:0}
}

/* Forms */
.field{display:block;margin-bottom:16px}
.field span,.field label{display:block;font-size:10.5px;font-weight:700;letter-spacing:.18em;
  text-transform:uppercase;color:var(--muted);margin-bottom:8px}
.field input,.field select{width:100%;font:inherit;font-size:15px;padding:13px 16px;border:1px solid var(--line);
  border-radius:var(--radius);background:var(--surface);color:var(--ink);transition:border-color .15s,box-shadow .15s}
.field input:focus,.field select:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 1px var(--accent)}
.panel{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);
  padding:34px;box-shadow:var(--shadow)}
.formcard{max-width:430px;margin:64px auto}
.note{font-size:13px;color:var(--muted)}
.error{color:var(--sale);font-size:14px;min-height:20px}

@media(max-width:640px){
  .wrap{padding:0 16px}
  .navbar .nav{justify-content:flex-start;gap:22px;flex-wrap:nowrap;overflow-x:auto;
    -webkit-overflow-scrolling:touch;scrollbar-width:none}
  .navbar .nav::-webkit-scrollbar{display:none}
  .nav a{white-space:nowrap}
  .search{display:none}
  .hdr .row{height:62px;gap:18px}
  .brand{font-size:21px;letter-spacing:.22em}
  .section{padding:46px 0}
  .hero .inner{padding:64px 0 56px}
  .promobar .row{gap:14px;font-size:10.5px}
  .iconbtn span{display:none}
  .iconbtn{padding:9px 4px}
  .grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:16px 10px}
  .card .body{padding:12px 8px 14px}
  .card .title{font-size:11px;letter-spacing:.04em}
  .card .price{font-size:14px}
  .catalog-bar{gap:12px;padding:10px 0}
  .catalog-field{width:100%}
  .catalog-field select{flex:1;min-width:0}
  .account-grid{grid-template-columns:1fr!important}
  .account-welcome{flex-direction:column;align-items:flex-start!important}
  .account-welcome .btn{width:100%}
}
@media(prefers-reduced-motion:reduce){
  *{transition:none!important;animation:none!important}
  html{scroll-behavior:auto}
}
`;

/**
 * Responsive <img> for Shopify CDN images.
 * Shopify resizes on the fly via ?width= and serves WebP/AVIF automatically
 * based on the Accept header, so no local processing is needed.
 */
export function shopifyImg(img, { alt = '', widths = [360, 540, 720, 960], sizes = '(max-width:640px) 50vw, 25vw', eager = false, ratio = [600, 750] } = {}) {
  if (!img?.url) return '';
  const u = w => `${img.url}${img.url.includes('?') ? '&' : '?'}width=${w}`;
  const srcset = widths.map(w => `${u(w)} ${w}w`).join(', ');
  return `<img src="${esc(u(widths[widths.length - 1]))}" srcset="${esc(srcset)}" sizes="${esc(sizes)}"
    alt="${esc(alt || img.altText || '')}" width="${img.width || ratio[0]}" height="${img.height || ratio[1]}"
    ${eager ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"'}>`;
}

const cartIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7V6a6 6 0 0 1 12 0v1"/><path d="M4 7h16l-1.2 13a1.8 1.8 0 0 1-1.8 1.6H7a1.8 1.8 0 0 1-1.8-1.6L4 7z"/></svg>`;
const userIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0 1 16 0"/></svg>`;
const searchIcon = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.8-3.8"/></svg>`;

/**
 * Header with collection nav, account and live cart badge.
 * Structure: marquee topbar / countdown promo bar / logo + search + icons / centered nav.
 * @param {object} opts
 * @param {string} [opts.active] current path
 * @param {{handle:string,title:string}[]} [opts.collections]
 * @param {string} [opts.siteName]
 */
export function header({ active = '/', collections = [], siteName = 'biagio.shop' } = {}) {
  const links = [{ href: '/products/', title: 'Shop all' }]
    .concat(collections.slice(0, 6).map(c => ({ href: `/collections/${c.handle}/`, title: c.title })))
    .map(l => `<a href="${l.href}"${active === l.href ? ' aria-current="page"' : ''}>${esc(l.title)}</a>`)
    .join('');
  const marqueeItem = `<span>Free shipping over <b>&euro;50</b> &middot; Free returns &middot; Considered goods, delivered fast</span>`;
  return `<div class="topbar" aria-hidden="true"><div class="track">
      ${marqueeItem.repeat(6)}
    </div></div>
  <div class="promobar"><div class="wrap"><div class="row">
    <span><b>Today only:</b> free shipping on all orders</span>
    <span class="countdown" id="promo-countdown" hidden>
      <span><b data-cd="h">00</b><i>hrs</i></span>
      <span><b data-cd="m">00</b><i>min</i></span>
      <span><b data-cd="s">00</b><i>sec</i></span>
    </span>
  </div></div></div>
  <header class="hdr"><div class="wrap"><div class="row">
    <a class="brand" href="/"><span class="dot"></span>${esc(siteName)}</a>
    <form class="search" action="/products/" role="search">
      <input type="search" name="q" placeholder="Search a product&hellip;" aria-label="Search">
    </form>
    <a class="iconbtn" href="/account/">${userIcon}<span>Account</span></a>
    <a class="iconbtn cartbtn" href="/cart/" id="cart-link">${cartIcon}<span>Cart</span>
      <span class="badge" id="cart-count" hidden>0</span></a>
  </div></div></header>
  <nav class="navbar"><div class="wrap"><div class="nav">${links}</div></div></nav>`;
}

const serviceIcons = {
  truck: `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M1 8h13v9H1z"/><path d="M14 11h4l3 3v3h-7"/><circle cx="6" cy="19" r="1.6"/><circle cx="17.5" cy="19" r="1.6"/></svg>`,
  returns: `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9V4h5"/><path d="M3.5 9A9 9 0 1 1 3 15"/></svg>`,
  lock: `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="10" rx="1"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>`,
  chat: `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5z"/></svg>`,
};

/** 4-up services strip (Stroili-style reassurance band above the footer). */
export function servicesStrip() {
  const item = (icon, title, text) =>
    `<div>${serviceIcons[icon]}<h4>${title}</h4><p>${text}</p></div>`;
  return `<section class="services"><div class="wrap"><div class="cols">
    ${item('truck', 'Free shipping', 'Free shipping on every order over &euro;50, delivered fast to your door.')}
    ${item('returns', 'Free returns', 'Changed your mind? Returns are always simple and free.')}
    ${item('lock', 'Secure checkout', 'Every payment is processed securely through Shopify checkout.')}
    ${item('chat', 'Here to help', 'Questions about an order? Our team is one message away.')}
  </div></div></section>`;
}

export function footer({ siteName = 'biagio.shop', collections = [] } = {}) {
  const year = new Date().getFullYear();
  const shopLinks = (collections.length
    ? collections.slice(0, 5).map(c => `<li><a href="/collections/${esc(c.handle)}/">${esc(c.title)}</a></li>`)
    : ['<li><a href="/">All products</a></li>']
  ).join('');
  return `${servicesStrip()}
  <footer class="ftr"><div class="wrap">
    <div class="cols">
      <div class="about">
        <div class="brand"><span class="dot"></span>${esc(siteName)}</div>
        <p>Considered goods, delivered fast. A headless storefront that ships almost no JavaScript.</p>
      </div>
      <div><h4>Shop</h4><ul>${shopLinks}</ul></div>
      <div><h4>Account</h4><ul>
        <li><a href="/account/">My account</a></li>
        <li><a href="/account/login/">Sign in</a></li>
        <li><a href="/cart/">Cart</a></li>
      </ul></div>
      <div><h4>Legal</h4><ul>
        <li><a href="/privacy/">Privacy</a></li>
      </ul></div>
    </div>
    <div class="row">
      <div>&copy; ${year} ${esc(siteName)}</div>
      <div>Headless Shopify on <a href="https://biagio.danilosprovieri.com">biagiojs</a></div>
    </div>
  </div></footer>`;
}

/** A single product card (anchor to the product page). */
export function productCard(p, idx = 0) {
  const img = p.featuredImage;
  const ph = img ? shopifyImg(img, { alt: img.altText || p.title }) : '';
  const v = p.variants?.nodes?.[0];
  const price = +(p.priceRange?.minVariantPrice?.amount ?? v?.price?.amount ?? 0);
  const onSale = v?.compareAtPrice && +v.compareAtPrice.amount > +(v.price?.amount ?? price);
  const flags = onSale ? `<span class="flag"><span>Sale</span></span>` : '';
  return `<a class="card" href="/products/${esc(p.handle)}/"
    data-price="${price}" data-title="${esc(p.title)}" data-sale="${onSale ? '1' : '0'}" data-idx="${idx}">
    <div class="ph">${ph}${flags}</div>
    <div class="body">
      <div class="title">${esc(p.title)}</div>
      <div class="price">${priceRange(p.priceRange)}</div>
    </div>
  </a>`;
}

export function productGrid(products = []) {
  return `<div class="grid" data-catalog-grid>${products.map((p, i) => productCard(p, i)).join('')}</div>`;
}

export function catalogToolbar() {
  return `<div class="catalog-bar" role="toolbar" aria-label="Filter products">
    <label class="catalog-field">Sort
      <select data-catalog-sort>
        <option value="featured">Featured</option>
        <option value="price-asc">Price: low to high</option>
        <option value="price-desc">Price: high to low</option>
        <option value="name">Name A–Z</option>
      </select>
    </label>
    <label class="catalog-check"><input type="checkbox" data-catalog-sale> On sale only</label>
    <span class="catalog-count muted" data-catalog-count></span>
  </div>`;
}

/** Catalog section with sidebar, filters, and product grid. */
export function catalogSection({ sidebar, products, emptyMessage = 'No products yet.' }) {
  const hasProducts = products.length > 0;
  const main = hasProducts
    ? `${catalogToolbar()}
      ${productGrid(products)}
      <p class="catalog-empty note" data-catalog-empty hidden>No products match your filters.</p>`
    : `<p class="muted">${emptyMessage}</p>`;
  return `<section class="wrap catalog" style="padding-bottom:72px">
    ${sidebar}
    <div class="catalog-main">${main}</div>
  </section>`;
}

/** Category sidebar for catalog pages ("/products/" and collection pages). */
export function categorySidebar(collections = [], active = '') {
  const item = (href, title) =>
    `<li><a href="${href}"${active === href ? ' aria-current="page"' : ''}>${esc(title)}</a></li>`;
  return `<aside class="side"><h3>Categories</h3><ul>
    ${item('/products/', 'All products')}
    ${collections.map(c => item(`/collections/${esc(c.handle)}/`, c.title)).join('')}
  </ul></aside>`;
}

/**
 * Self-contained hydrate for the header chrome: cart badge + promo countdown.
 * Reads the count from localStorage (zero network) and keeps it in sync via the
 * `cart:change` event dispatched by the cart island. Must not close over module scope.
 */
export function cartBadge(el) {
  const b = el.querySelector('#cart-count');
  if (b) {
    const upd = () => {
      let n = 0;
      try { n = +(localStorage.getItem('cart:count') || 0); } catch {}
      b.textContent = String(n);
      b.hidden = n <= 0;
    };
    upd();
    addEventListener('storage', upd);
    addEventListener('cart:change', upd);
  }

  // Promo bar countdown: ticks down to local midnight ("today only").
  const cd = el.querySelector('#promo-countdown') || document.getElementById('promo-countdown');
  if (cd) {
    const h = cd.querySelector('[data-cd="h"]'), m = cd.querySelector('[data-cd="m"]'), s = cd.querySelector('[data-cd="s"]');
    const pad = n => String(n).padStart(2, '0');
    const tick = () => {
      const now = new Date();
      const end = new Date(now); end.setHours(24, 0, 0, 0);
      let left = Math.max(0, Math.floor((end - now) / 1000));
      h.textContent = pad(Math.floor(left / 3600));
      m.textContent = pad(Math.floor((left % 3600) / 60));
      s.textContent = pad(left % 60);
    };
    tick();
    cd.hidden = false;
    setInterval(tick, 1000);
  }

  // Floating cart drawer: loaded on demand, /cart/ stays as no-JS fallback.
  const openDrawer = () => import('/islands/cart-drawer.js').then(m => m.default());
  const link = el.querySelector('#cart-link');
  if (link) link.addEventListener('click', e => { e.preventDefault(); openDrawer(); });
  addEventListener('cart:open', openDrawer);
}

export { money, priceRange, esc };
