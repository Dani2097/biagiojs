/** Tema condiviso del sito demo VELOCE — design system minimale. */
export const CSS = `
  :root{
    --ink:#14141f; --paper:#faf8f4; --accent:#ff4d5a; --accent-dark:#e03442;
    --gold:#f5c518; --muted:#8a8a96; --card:#ffffff; --line:#ececec;
  }
  *{box-sizing:border-box}
  body{margin:0;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;color:var(--ink);background:var(--paper);-webkit-font-smoothing:antialiased}
  h1,h2,h3{font-weight:800;letter-spacing:-0.02em;margin:0 0 12px}
  section{padding:56px 24px;max-width:1080px;margin:0 auto;width:100%}
  .wrap{max-width:1080px;margin:0 auto}

  nav.main{position:sticky;top:0;z-index:100;background:rgba(250,248,244,.85);backdrop-filter:blur(12px);border-bottom:1px solid var(--line);padding:14px 24px;display:flex;align-items:center;gap:28px}
  nav.main .logo{font-weight:900;font-size:20px;letter-spacing:.08em}
  nav.main .logo span{color:var(--accent)}
  nav.main a{color:var(--ink);text-decoration:none;font-size:14px;font-weight:600;opacity:.75}
  nav.main a:hover{opacity:1;color:var(--accent)}

  .hero{background:radial-gradient(1200px 600px at 70% -10%,#2b2b45 0%,#14141f 55%);color:#fff;padding:80px 24px 72px;overflow:hidden}
  .hero .grid{display:grid;grid-template-columns:1.1fr .9fr;gap:40px;align-items:center;max-width:1080px;margin:0 auto}
  .hero .kicker{color:var(--gold);font-weight:700;letter-spacing:.2em;font-size:12px;text-transform:uppercase}
  .hero h1{font-size:clamp(36px,6vw,64px);line-height:1.03;margin:14px 0 18px}
  .hero h1 em{font-style:normal;color:var(--accent)}
  .hero p.lead{color:#b9b9c9;font-size:18px;line-height:1.6;max-width:46ch}
  .hero .shoe{filter:drop-shadow(0 30px 40px rgba(255,77,90,.25));animation:float 5s ease-in-out infinite}
  @keyframes float{0%,100%{transform:translateY(0) rotate(-8deg)}50%{transform:translateY(-16px) rotate(-6deg)}}
  @media(max-width:760px){.hero .grid{grid-template-columns:1fr}.hero .shoe{max-width:320px;margin:0 auto}}

  .buybar{display:flex;gap:20px;align-items:center;justify-content:center;flex-wrap:wrap}
  .cta{background:linear-gradient(135deg,var(--accent),var(--accent-dark));color:#fff;border:none;padding:18px 44px;font-size:17px;font-weight:700;border-radius:999px;cursor:pointer;box-shadow:0 12px 30px rgba(255,77,90,.35);transition:transform .15s}
  .cta:hover{transform:translateY(-2px)}
  .price-tag{font-size:40px;font-weight:900}
  .price-tag s{color:var(--muted);font-size:22px;font-weight:500;margin-left:10px}
  .badge{background:#e8f7ee;color:#1d7a46;font-size:12px;font-weight:700;padding:6px 12px;border-radius:999px}

  .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;text-align:center}
  .stat{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:26px 12px}
  .stat b{display:block;font-size:32px;letter-spacing:-.02em}
  .stat small{color:var(--muted)}

  .review{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:22px;margin:10px 0;box-shadow:0 2px 10px rgba(20,20,31,.04)}
  .review .stars{color:var(--gold);letter-spacing:2px}
  .review b{display:block;margin-top:8px}
  .review small{color:var(--muted)}

  .carousel{display:flex;gap:16px;overflow-x:auto;padding-bottom:8px;scroll-snap-type:x mandatory}
  .card{min-width:220px;scroll-snap-align:start;background:var(--card);border:1px solid var(--line);border-radius:18px;padding:20px;transition:transform .2s,box-shadow .2s;text-decoration:none;color:inherit;display:block}
  .card:hover{transform:translateY(-4px);box-shadow:0 16px 32px rgba(20,20,31,.10)}
  .card .swatch{height:110px;border-radius:12px;margin-bottom:14px;display:flex;align-items:center;justify-content:center}
  .card b{font-size:16px}
  .card .p{color:var(--accent);font-weight:800;margin-top:4px}

  footer{background:var(--ink);color:#9a9aa8;padding:48px 24px;text-align:center;margin-top:56px}
  footer .logo{color:#fff;font-weight:900;letter-spacing:.08em;font-size:18px}
  footer .logo span{color:var(--accent)}
  footer small{display:block;margin-top:10px}
`;

/** Scarpa — illustrazione SVG inline (niente asset esterni, zero richieste). */
export function shoeSvg({ size = 420, main = '#ff4d5a', dark = '#c92a3a', sole = '#ffffff' } = {}) {
  return `<svg class="shoe" width="${size}" viewBox="0 0 420 240" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Scarpa da running">
    <path d="M30 170 C60 110 120 60 190 55 C230 52 245 75 285 95 C330 118 385 125 400 145 L400 175 C400 183 393 190 385 190 L45 190 C36 190 28 181 30 170Z" fill="${main}"/>
    <path d="M30 170 C60 110 120 60 190 55 C210 53 222 60 240 72 C200 80 140 110 100 170 L30 170Z" fill="${dark}" opacity=".55"/>
    <path d="M195 62 L215 100 M225 70 L245 108 M255 82 L272 115" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".85"/>
    <path d="M28 178 L400 178 L400 196 C400 205 392 212 383 212 L52 212 C36 212 24 200 25 186 Z" fill="${sole}"/>
    <path d="M40 212 C120 200 300 200 396 212" stroke="#dcdce4" stroke-width="4"/>
    <circle cx="330" cy="150" r="6" fill="#fff" opacity=".9"/>
  </svg>`;
}
