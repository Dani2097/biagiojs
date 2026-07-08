/** biagiojs docs — design system. Dual-theme, system fonts, zero web-font requests. */

export const CSS = `
  :root{
    --bg:#f7f6f2;
    --bg-2:#efece5;
    --grid:rgba(22,21,27,.045);
    --surface:#fffefb;
    --surface-2:#f1eee7;
    --ink:#16151b;
    --ink-soft:#3a3942;
    --muted:#57565f;
    --accent-text:#b81d35;
    --line:#e6e2d8;
    --line-2:#d8d3c6;
    --accent:#ef2f47;
    --accent-2:#ff7a4d;
    --accent-soft:rgba(239,47,71,.10);
    --ok:#0c7d3e;
    --code-bg:#131219;
    --code-fg:#e9e7e1;
    --sidebar:250px;
    --radius:14px;
    --radius-lg:20px;
    --shadow:0 1px 2px rgba(20,18,30,.05),0 10px 34px rgba(20,18,30,.07);
    --shadow-lg:0 2px 6px rgba(20,18,30,.06),0 24px 60px rgba(20,18,30,.10);
    --mono:ui-monospace,'SF Mono','Cascadia Code','Liberation Mono',Consolas,monospace;
    --sans:system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
    color-scheme:light;
  }
  :root[data-theme="dark"]{
    --bg:#0b0b10;
    --bg-2:#101017;
    --grid:rgba(255,255,255,.04);
    --surface:#15151d;
    --surface-2:#1b1b25;
    --ink:#f1efe9;
    --ink-soft:#cfcdd6;
    --muted:#a8a7b6;
    --accent-text:#ff7a8c;
    --line:#262631;
    --line-2:#31313d;
    --accent:#ff4d63;
    --accent-2:#ff8a5c;
    --accent-soft:rgba(255,77,99,.16);
    --ok:#3ad07f;
    --code-bg:#08080c;
    --code-fg:#e9e7e1;
    --shadow:0 1px 2px rgba(0,0,0,.4),0 12px 40px rgba(0,0,0,.5);
    --shadow-lg:0 2px 8px rgba(0,0,0,.45),0 30px 70px rgba(0,0,0,.6);
    color-scheme:dark;
  }

  *,*::before,*::after{box-sizing:border-box}
  html{font-size:17px;scroll-behavior:smooth}
  body{
    margin:0;font-family:var(--sans);color:var(--ink);line-height:1.55;
    background:var(--bg);
    background-image:
      radial-gradient(var(--grid) 1px,transparent 1px);
    background-size:22px 22px;
    -webkit-font-smoothing:antialiased;
    transition:background-color .25s ease,color .25s ease;
  }
  h1,h2,h3,h4{font-weight:650;letter-spacing:-.021em;line-height:1.15;margin:0 0 .5em}
  a{color:var(--ink);text-underline-offset:3px}
  a:hover{color:var(--accent)}
  .grad{
    background:linear-gradient(103deg,var(--accent),var(--accent-2));
    -webkit-background-clip:text;background-clip:text;color:transparent;
  }

  /* Keyboard focus — visible ring on every interactive element */
  a:focus-visible,button:focus-visible,input:focus-visible,[tabindex]:focus-visible{
    outline:2px solid var(--accent);outline-offset:2px;
  }
  /* Respect users who ask for less motion */
  @media(prefers-reduced-motion:reduce){
    html{scroll-behavior:auto}
    *,*::before,*::after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important}
  }

  /* ── Header ── */
  .topbar{
    display:flex;align-items:center;flex-wrap:wrap;gap:10px 14px;
    padding:0 max(20px,4vw);min-height:58px;
    border-bottom:1px solid var(--line);
    background:color-mix(in srgb,var(--bg) 82%,transparent);
    backdrop-filter:saturate(140%) blur(10px);
    position:sticky;top:0;z-index:100;
  }
  .topbar .brand{
    display:inline-flex;align-items:center;gap:9px;
    font-family:var(--mono);font-size:16px;font-weight:650;
    text-decoration:none;color:var(--ink);letter-spacing:-.03em;
    flex-shrink:0;
  }
  .topbar .brand .dot{
    width:11px;height:11px;border-radius:3px;
    background:linear-gradient(135deg,var(--accent),var(--accent-2));
    box-shadow:0 0 0 3px var(--accent-soft);
  }
  .topbar .brand em{font-style:normal;color:var(--accent)}
  .topbar-end{
    display:flex;align-items:center;gap:6px;
    flex-shrink:0;
  }
  .topbar nav{display:flex;gap:6px;align-items:center;min-width:0;margin-left:auto}
  .topbar nav a{
    font-size:13px;color:var(--muted);text-decoration:none;
    font-family:var(--mono);padding:6px 10px;border-radius:8px;
    white-space:nowrap;
  }
  .topbar nav a:hover{color:var(--ink);background:var(--surface-2)}
  .topbar nav a.active{color:var(--ink);background:var(--accent-soft)}
  .topbar .lang{display:flex;align-items:center;font-family:var(--mono);font-size:12px}
  .topbar .lang a{color:var(--muted);text-decoration:none;padding:3px 6px;border-radius:6px}
  .topbar .lang a.active{color:var(--ink);font-weight:650;background:var(--surface-2)}
  .topbar .lang .lang-sep{color:var(--line-2);margin:0 1px}
  .theme-toggle{
    width:34px;height:34px;flex:none;
    border:1px solid var(--line);border-radius:9px;background:var(--surface);
    color:var(--ink);cursor:pointer;font-size:15px;line-height:1;
    display:inline-flex;align-items:center;justify-content:center;
  }
  .theme-toggle:hover{border-color:var(--line-2);color:var(--accent)}

  @media(max-width:640px){
    .topbar{
      gap:8px 10px;
      padding:10px 12px;
      align-content:center;
    }
    .topbar .brand{font-size:15px;gap:7px}
    .topbar .brand .dot{width:9px;height:9px}
    .topbar-end{gap:4px}
    .topbar-end{margin-left:auto}
    .topbar nav{
      order:3;flex:1 1 100%;margin-left:0;
      gap:4px;padding:2px 0 1px;
      overflow-x:auto;-webkit-overflow-scrolling:touch;
      scrollbar-width:none;
      mask-image:linear-gradient(90deg,#000 94%,transparent);
    }
    .topbar nav::-webkit-scrollbar{display:none}
    .topbar nav a{font-size:12px;padding:5px 8px}
    .topbar .lang{font-size:11px}
    .topbar .lang a{padding:2px 5px}
    .theme-toggle{width:32px;height:32px;font-size:14px}
  }
  .theme-toggle::before{content:'☾'}
  :root[data-theme="dark"] .theme-toggle::before{content:'☀'}

  /* ── Landing shell ── */
  .home{max-width:1120px;margin:0 auto;padding:0 max(20px,4vw)}

  /* Hero */
  .home-hero{
    position:relative;
    display:grid;grid-template-columns:1.05fr .95fr;
    gap:clamp(28px,5vw,64px);align-items:center;
    padding:clamp(52px,9vw,104px) 0 clamp(44px,6vw,72px);
  }
  .home-hero::before{
    content:'';position:absolute;inset:-10% -20% auto -10%;height:420px;z-index:-1;
    background:radial-gradient(60% 70% at 30% 20%,var(--accent-soft),transparent 70%);
    pointer-events:none;
  }
  .eyebrow{
    display:inline-flex;align-items:center;gap:8px;margin:0 0 20px;
    font-family:var(--mono);font-size:12px;color:var(--muted);
    padding:5px 11px;border:1px solid var(--line);border-radius:999px;
    background:var(--surface);
  }
  .eyebrow b{color:var(--accent);font-weight:650}
  .home-hero h1{
    font-size:clamp(34px,5.4vw,58px);font-weight:700;line-height:1.05;
    letter-spacing:-.035em;margin:0 0 22px;max-width:15ch;
  }
  .home-hero .lead{
    font-size:clamp(16px,1.6vw,19px);line-height:1.55;color:var(--ink-soft);
    max-width:44ch;margin:0 0 30px;
  }
  .home-hero .cmd{
    display:flex;align-items:center;gap:12px;max-width:400px;
    font-family:var(--mono);font-size:14px;
    background:var(--code-bg);color:var(--code-fg);
    padding:14px 16px;border-radius:11px;margin-bottom:20px;
    box-shadow:var(--shadow);
  }
  .home-hero .cmd::before{content:'$';color:var(--accent);font-weight:700}
  .home-hero .cmd code{flex:1;overflow:hidden;text-overflow:ellipsis}
  .home-hero .cmd .copy{color:#9a9aa6;font-size:12px}
  .home-hero .links{display:flex;flex-wrap:wrap;gap:12px}
  .home-hero .links a{
    font-family:var(--mono);font-size:13px;text-decoration:none;
    padding:11px 18px;border-radius:10px;
  }
  .home-hero .links .primary{
    background:linear-gradient(103deg,var(--accent),var(--accent-2));
    color:#fff;box-shadow:var(--shadow);
  }
  .home-hero .links .primary:hover{filter:brightness(1.06)}
  .home-hero .links .ghost{border:1px solid var(--line-2);color:var(--ink)}
  .home-hero .links .ghost:hover{border-color:var(--accent);color:var(--accent)}

  /* Scheduler output panel (dogfooded) */
  .sched{
    background:var(--surface);border:1px solid var(--line);
    border-radius:var(--radius-lg);box-shadow:var(--shadow-lg);
    overflow:hidden;
  }
  .sched-head{
    display:flex;align-items:center;gap:8px;
    padding:12px 16px;border-bottom:1px solid var(--line);
    font-family:var(--mono);font-size:12px;color:var(--muted);
    background:var(--surface-2);
  }
  .sched-head .tl{display:flex;gap:6px;margin-right:6px}
  .sched-head .tl i{width:10px;height:10px;border-radius:50%;background:var(--line-2);display:block}
  .sched-head .tl i:first-child{background:var(--accent)}
  .sched-body{padding:8px 8px 12px}
  .node{
    display:grid;grid-template-columns:26px 1fr auto;gap:12px;align-items:center;
    padding:11px 12px;border-radius:11px;
  }
  .node:hover{background:var(--surface-2)}
  .node .ord{font-family:var(--mono);font-size:12px;color:var(--muted)}
  .node .meta{min-width:0}
  .node .id{font-family:var(--mono);font-size:13.5px;font-weight:600}
  .node .bar{height:5px;border-radius:3px;background:var(--surface-2);margin-top:7px;overflow:hidden}
  .node .bar i{display:block;height:100%;border-radius:3px;background:linear-gradient(90deg,var(--accent),var(--accent-2))}
  .badge{
    font-family:var(--mono);font-size:10.5px;font-weight:650;letter-spacing:.03em;
    text-transform:uppercase;padding:4px 9px;border-radius:999px;white-space:nowrap;
  }
  .badge.eager{background:var(--accent-soft);color:var(--accent-text)}
  .badge.lazy{background:color-mix(in srgb,var(--muted) 16%,transparent);color:var(--ink-soft)}
  .badge.static{background:color-mix(in srgb,var(--ok) 15%,transparent);color:var(--ok)}
  .sched-foot{
    padding:11px 16px;border-top:1px solid var(--line);
    font-family:var(--mono);font-size:11.5px;color:var(--muted);
    display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;
  }
  .sched-foot b{color:var(--ok);font-weight:650}

  /* Marquee band */
  .home-band{
    margin-top:clamp(20px,4vw,44px);padding:18px 0;
    border-top:1px solid var(--line);border-bottom:1px solid var(--line);
    display:flex;flex-wrap:wrap;gap:10px 26px;align-items:center;
    font-family:var(--mono);font-size:12.5px;color:var(--muted);
  }
  .home-band b{color:var(--ink)}
  .home-band .sep{color:var(--accent)}

  /* Lighthouse audit */
  .home-scores{
    padding:clamp(40px,6vw,64px) 0;
    border-bottom:1px solid var(--line);
  }
  .home-scores .intro{max-width:46ch;margin-bottom:28px}
  .home-scores .intro .sub{color:var(--muted);font-size:15px;line-height:1.6;margin:10px 0 0}
  .scores-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:20px}
  .score-card{
    background:var(--surface);border:1px solid var(--line);
    border-radius:var(--radius);overflow:hidden;box-shadow:var(--shadow);
  }
  .score-card figcaption{
    padding:10px 14px;border-top:1px solid var(--line);
    font-family:var(--mono);font-size:12px;color:var(--muted);
    display:flex;justify-content:space-between;gap:8px;
  }
  .score-card picture{display:block}
  .score-card img{display:block;width:100%;height:auto}
  .home-scores .fine{
    margin-top:16px;font-family:var(--mono);font-size:11px;color:var(--muted);
  }
  @media(max-width:700px){.scores-grid{grid-template-columns:1fr}}

  /* Feature spec grid */
  .home-spec{padding:clamp(48px,7vw,80px) 0}
  .sec-eyebrow{
    font-family:var(--mono);font-size:12px;font-weight:650;
    text-transform:uppercase;letter-spacing:.1em;color:var(--accent);margin:0 0 10px;
  }
  .sec-title{font-size:clamp(24px,3.2vw,32px);letter-spacing:-.03em;margin:0 0 32px;max-width:20ch}
  .spec-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
  .spec-card{
    position:relative;background:var(--surface);border:1px solid var(--line);
    border-radius:var(--radius);padding:22px 20px;box-shadow:var(--shadow);
    transition:transform .18s ease,border-color .18s ease;
  }
  .spec-card:hover{transform:translateY(-3px);border-color:var(--line-2)}
  .spec-card .n{font-family:var(--mono);font-size:12px;color:var(--accent-text);font-weight:650}
  .spec-card h3{font-size:16px;margin:14px 0 8px}
  .spec-card p{font-size:14px;color:var(--muted);margin:0;line-height:1.6}

  /* Playground */
  .home-play{
    padding:clamp(48px,7vw,80px) 0;
    display:grid;grid-template-columns:1fr 1fr;gap:clamp(28px,4vw,52px);align-items:center;
  }
  .home-play .lead-col h2{font-size:clamp(22px,3vw,28px);letter-spacing:-.03em;margin-bottom:12px}
  .home-play .sub{color:var(--muted);font-size:15px;margin:0 0 22px;max-width:42ch;line-height:1.6}
  .home-play .note{
    font-size:14px;color:var(--ink-soft);line-height:1.7;
    border-left:2px solid var(--accent);padding-left:16px;
  }
  .home-play .note p{margin:0 0 8px}
  .home-play .note p:last-child{margin:0;color:var(--muted)}
  .panel{
    background:var(--surface);border:1px solid var(--line);
    border-radius:var(--radius-lg);padding:22px;box-shadow:var(--shadow-lg);
  }
  .panel label{
    display:flex;justify-content:space-between;align-items:baseline;
    font-family:var(--mono);font-size:11px;text-transform:uppercase;
    letter-spacing:.06em;color:var(--ink-soft);margin:16px 0 7px;
  }
  .panel label:first-of-type{margin-top:0}
  .panel label .v{color:var(--ink);font-weight:650}
  .panel input[type=range]{
    width:100%;accent-color:var(--accent);height:5px;cursor:pointer;
  }
  /* zone meter */
  .zones{display:flex;height:34px;margin:22px 0 8px;border-radius:9px;overflow:hidden;border:1px solid var(--line);position:relative}
  .zone{display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--ink-soft)}
  .zone-static{flex:0 0 8%;background:color-mix(in srgb,var(--ok) 12%,var(--surface))}
  .zone-lazy{flex:0 0 42%;background:color-mix(in srgb,var(--muted) 12%,var(--surface))}
  .zone-eager{flex:1;background:var(--accent-soft);color:var(--ink-soft)}
  .marker{
    position:absolute;top:-4px;bottom:-4px;left:0;width:3px;border-radius:3px;
    background:var(--ink);box-shadow:0 0 0 3px var(--bg);transition:left .18s cubic-bezier(.4,1.3,.5,1);
  }
  .panel[data-plan="eager"] .zone-eager{background:color-mix(in srgb,var(--accent) 26%,var(--surface));color:var(--ink)}
  .panel[data-plan="lazy"] .zone-lazy{background:color-mix(in srgb,var(--muted) 26%,var(--surface));color:var(--ink)}
  .panel[data-plan="static"] .zone-static{background:color-mix(in srgb,var(--ok) 26%,var(--surface));color:var(--ok)}
  .out{
    margin-top:14px;padding:14px 16px;border-radius:11px;
    background:var(--code-bg);color:#a8a8b4;
    font-family:var(--mono);font-size:12.5px;line-height:1.7;
  }
  .out b{color:var(--code-fg);font-weight:650}
  .out .tag{color:#ffb3be;font-weight:650}

  /* Code showcase */
  .home-code{padding:clamp(40px,6vw,72px) 0}
  .code-wrap{
    display:grid;grid-template-columns:1fr;gap:0;
    border:1px solid var(--line);border-radius:var(--radius-lg);overflow:hidden;
    box-shadow:var(--shadow);background:var(--code-bg);
  }
  .code-wrap .cap{
    padding:11px 16px;border-bottom:1px solid rgba(255,255,255,.07);
    font-family:var(--mono);font-size:12px;color:#adb0bc;
  }
  .code-wrap pre{margin:0;padding:20px 20px;overflow-x:auto}
  .code-wrap code{font-family:var(--mono);font-size:13px;line-height:1.7;color:var(--code-fg)}
  .code-wrap .k{color:#ff8a5c}
  .code-wrap .a{color:#ff6b7f}
  .code-wrap .s{color:#7fd6a0}
  .code-wrap .c{color:#adb0bc}

  /* Principles */
  .home-why{padding:clamp(40px,6vw,72px) 0;border-top:1px solid var(--line)}
  .why-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(20px,3vw,40px)}
  .why-grid .p .n{font-family:var(--mono);font-size:13px;color:var(--accent)}
  .why-grid .p h3{font-size:17px;margin:12px 0 8px}
  .why-grid .p p{font-size:14.5px;color:var(--muted);line-height:1.65;margin:0}

  /* CTA */
  .home-cta{
    margin:clamp(40px,6vw,72px) 0 clamp(56px,8vw,96px);
    text-align:center;padding:clamp(40px,6vw,64px) 24px;
    border-radius:var(--radius-lg);position:relative;overflow:hidden;
    background:var(--surface);border:1px solid var(--line);box-shadow:var(--shadow-lg);
  }
  .home-cta::before{
    content:'';position:absolute;inset:0;z-index:0;
    background:radial-gradient(50% 120% at 50% 0%,var(--accent-soft),transparent 70%);
  }
  .home-cta>*{position:relative;z-index:1}
  .home-cta h2{font-size:clamp(24px,3.4vw,34px);letter-spacing:-.03em;margin:0 0 12px}
  .home-cta p{color:var(--muted);font-size:16px;max-width:46ch;margin:0 auto 26px}
  .home-cta .row{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
  .home-cta .primary{
    background:linear-gradient(103deg,var(--accent),var(--accent-2));color:#fff;
    text-decoration:none;font-family:var(--mono);font-size:14px;padding:13px 24px;border-radius:11px;box-shadow:var(--shadow);
  }
  .home-cta .primary:hover{filter:brightness(1.06)}
  .home-cta .ghost{
    border:1px solid var(--line-2);color:var(--ink);text-decoration:none;
    font-family:var(--mono);font-size:14px;padding:13px 24px;border-radius:11px;
  }
  .home-cta .ghost:hover{border-color:var(--accent);color:var(--accent)}

  @media(max-width:840px){
    .home-hero,.home-play{grid-template-columns:1fr}
    .spec-grid,.why-grid{grid-template-columns:1fr}
  }
  @media(min-width:841px) and (max-width:1000px){
    .spec-grid{grid-template-columns:repeat(2,1fr)}
  }

  /* ── Docs layout ── */
  .docs-shell{
    display:grid;grid-template-columns:var(--sidebar) 1fr;
    max-width:1180px;margin:0 auto;
    min-height:calc(100vh - 58px);
  }
  .docs-sidebar{
    position:sticky;top:58px;height:calc(100vh - 58px);
    overflow-y:auto;padding:28px 0 48px;
    border-right:1px solid var(--line);
  }
  .docs-sidebar .group{margin-bottom:22px}
  .docs-sidebar .group-title,
  .docs-nav-group summary.group-title{
    font-family:var(--mono);font-size:11px;font-weight:650;
    letter-spacing:.08em;text-transform:uppercase;color:var(--muted);
    padding:0 22px;margin-bottom:8px;
  }
  .docs-sidebar a,
  .docs-nav-group a{
    display:block;padding:6px 22px;font-size:14px;
    color:var(--muted);text-decoration:none;
    border-left:2px solid transparent;
  }
  .docs-sidebar a:hover,
  .docs-nav-group a:hover{color:var(--ink)}
  .docs-sidebar a.active,
  .docs-nav-group a.active{
    color:var(--accent);font-weight:600;
    border-left-color:var(--accent);background:var(--accent-soft);
  }
  .docs-nav-group{margin-bottom:22px}
  .docs-nav-group summary{list-style:none;cursor:default}
  .docs-nav-group summary::-webkit-details-marker{display:none}

  @media(min-width:901px){
    .docs-nav-group summary{display:none}
    .docs-nav-group .group-links{display:block}
  }

  .docs-main{padding:40px clamp(20px,4vw,56px) 88px;max-width:760px}
  .docs-main .breadcrumb{
    font-family:var(--mono);font-size:12px;color:var(--muted);margin-bottom:28px;
  }
  .docs-main .breadcrumb a{color:var(--muted);text-decoration:none}
  .docs-main .breadcrumb a:hover{color:var(--accent)}

  @media(max-width:900px){
    .docs-shell{grid-template-columns:1fr}
    .docs-sidebar{
      position:relative;top:0;height:auto;border-right:none;
      border-bottom:1px solid var(--line);padding:0;overflow:visible;
    }
    .docs-nav-group{border-bottom:1px solid var(--line)}
    .docs-nav-group:last-child{border-bottom:none}
    .docs-nav-group summary.group-title{
      display:flex;align-items:center;justify-content:space-between;
      padding:14px 20px;margin:0;cursor:pointer;
      font-size:12px;color:var(--ink-soft);
    }
    .docs-nav-group summary.group-title::after{
      content:'+';font-size:16px;font-weight:400;color:var(--muted);
    }
    .docs-nav-group[open] summary.group-title::after{content:'−'}
    .docs-nav-group .group-links{padding:4px 0 12px}
    .docs-nav-group a{
      padding:8px 20px 8px 28px;font-size:14px;border-left:none;
    }
    .docs-nav-group a.active{
      border-left:2px solid var(--accent);margin-left:0;
    }
    .docs-main{padding:24px 20px 64px}
  }

  /* ── Prose ── */
  .prose{font-size:16px;line-height:1.7;color:var(--ink-soft)}
  .prose h1{
    font-size:clamp(28px,4vw,38px);font-weight:700;color:var(--ink);letter-spacing:-.03em;
    margin:0 0 22px;padding-bottom:18px;border-bottom:1px solid var(--line);
  }
  .prose h2{font-size:22px;color:var(--ink);margin:2em 0 .6em;letter-spacing:-.02em}
  .prose h3{font-size:17px;color:var(--ink);margin:1.6em 0 .4em}
  .prose p{margin:0 0 1em}
  .prose ul,.prose ol{margin:0 0 1em;padding-left:1.3em}
  .prose li{margin:.35em 0}
  .prose li::marker{color:var(--accent)}
  .prose strong{color:var(--ink)}
  .prose blockquote{
    margin:1.4em 0;padding:14px 18px;border-radius:0 12px 12px 0;
    border-left:3px solid var(--accent);background:var(--accent-soft);color:var(--ink-soft);
  }
  .prose blockquote p:last-child{margin-bottom:0}
  .prose hr{border:none;border-top:1px solid var(--line);margin:2em 0}
  .prose code{
    font-family:var(--mono);font-size:.85em;color:var(--accent);
    background:var(--accent-soft);padding:.12em .38em;border-radius:5px;
  }
  .prose pre{
    margin:1.3em 0;padding:18px 20px;border-radius:12px;
    background:var(--code-bg);overflow-x:auto;box-shadow:var(--shadow);
  }
  .prose pre code{display:block;font-size:13px;line-height:1.65;color:var(--code-fg);background:none;padding:0}
  .prose table{width:100%;border-collapse:collapse;margin:1.3em 0;font-size:14px}
  .prose th,.prose td{padding:9px 13px;border:1px solid var(--line);text-align:left}
  .prose th{font-family:var(--mono);font-size:11px;text-transform:uppercase;letter-spacing:.04em;background:var(--surface-2);color:var(--ink);font-weight:650}
  .prose a{text-decoration:underline;text-decoration-color:var(--line-2)}
  .prose a:hover{text-decoration-color:var(--accent)}

  /* ── Docs index ── */
  .docs-index-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin-top:28px}
  .docs-index-card{
    display:block;padding:18px 18px;border:1px solid var(--line);border-radius:var(--radius);
    background:var(--surface);text-decoration:none;color:inherit;box-shadow:var(--shadow);
    transition:transform .16s ease,border-color .16s ease;
  }
  .docs-index-card:hover{transform:translateY(-2px);border-color:var(--accent)}
  .docs-index-card h3{font-family:var(--mono);font-size:14.5px;font-weight:650;margin:0 0 5px}
  .docs-index-card:hover h3{color:var(--accent)}
  .docs-index-card p{font-size:13.5px;color:var(--muted);margin:0}
  @media(max-width:640px){.docs-index-grid{grid-template-columns:1fr}}

  /* ── Footer ── */
  footer.site-footer{
    max-width:1120px;margin:0 auto;
    padding:32px max(20px,4vw);
    border-top:1px solid var(--line);
    font-family:var(--mono);font-size:12px;color:var(--muted);
    display:flex;flex-wrap:wrap;gap:16px;justify-content:space-between;align-items:center;
  }
  footer.site-footer a{color:var(--muted);text-decoration:none}
  footer.site-footer a:hover{color:var(--accent)}
`;

/**
 * Applied theme pre-paint (no FOUC) + delegated toggle handler.
 * Tiny, inline, honest: a theme switch needs JS — nothing else on static pages does.
 */
export const THEME_SCRIPT = `<script>(function(){function s(t){document.documentElement.dataset.theme=t}try{var m=matchMedia('(prefers-color-scheme:dark)');s(localStorage.getItem('biagio-theme')||(m.matches?'dark':'light'))}catch(e){s('light')}document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('#theme-toggle');if(!b)return;var d=document.documentElement,n=d.dataset.theme==='dark'?'light':'dark';s(n);try{localStorage.setItem('biagio-theme',n)}catch(e){}})})();</script>`;

export function topbar({ t, lp, active = '', langHtml = '' }) {
  const link = (href, label, key) =>
    `<a href="${href}" class="${active === key ? 'active' : ''}">${label}</a>`;
  return `<header class="topbar">
    <a class="brand" href="${lp('/')}"><span class="dot"></span>biagio<em>js</em></a>
    <nav>
      ${link(lp('/'), t('nav.site'), 'site')}
      ${link(lp('/docs/'), t('nav.docs'), 'docs')}
      ${link('https://github.com/Dani2097/biagiojs', t('nav.github'), 'gh')}
      ${link('https://www.npmjs.com/package/biagiojs', 'npm', 'npm')}
    </nav>
    <div class="topbar-end">
      <div class="lang">${langHtml}</div>
      <button id="theme-toggle" class="theme-toggle" type="button" aria-label="Toggle theme"></button>
    </div>
  </header>`;
}

export function siteFooter({ t }) {
  return `<footer class="site-footer">
    <span>${t('footer.line')}</span>
    <span>
      <a href="https://www.npmjs.com/package/biagiojs">npm</a>
      · <a href="https://github.com/Dani2097/biagiojs">source</a>
      · MIT
    </span>
  </footer>`;
}
