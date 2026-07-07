/**
 * CVW-First — Consent (GDPR) come primitiva del framework.
 * Priorità: compliance PRIMA, Core Web Vitals subito dopo.
 *
 * Config (cvw.config.js):
 *   site.consent = {
 *     mode: 'native',                       // banner del framework: 0 KB critical path
 *     categories: ['analytics','marketing'],// oltre a 'necessary' (sempre attiva)
 *     policyUrl: '/privacy/',
 *     text: { title, body, accept, reject, policy },   // testi personalizzabili
 *   }
 *   // oppure vendor classico, ottimizzato:
 *   site.consent = {
 *     mode: 'vendor', vendor: 'cookiebot'|'iubenda', id: '...',
 *     strategy: 'idle'|'defer'|'interaction',   // default 'idle'
 *     iubendaConfig: {...},                     // solo iubenda: _iub.csConfiguration
 *   }
 *
 * Garanzie di compliance (entrambe le modalità):
 *   - NESSUN tracker parte prima del consenso: gli script marcati
 *     <script type="text/plain" data-cvw-consent="marketing"> restano inerti
 *     e le isole con `consent: 'marketing'` non si idratano.
 *   - Consent Mode v2 inline default-denied (~200 byte) per l'ecosistema Google.
 *   - Rifiutare è facile quanto accettare (native: due bottoni pari livello).
 *   - Scelta persistita 12 mesi (cookie SameSite=Lax) + evento 'cvw:consent'.
 */

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Consent Mode v2: default denied. Inline, prima di qualsiasi tag Google. */
export const CONSENT_MODE_SNIPPET = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});`;

/**
 * Runtime consenso (inline, ~1 KB): window.cvwConsent {has, get, set},
 * attivazione script gated, aggiornamento Consent Mode, evento 'cvw:consent'.
 */
export const CONSENT_RUNTIME = `
(function(){
  const NAME='cvw_consent';
  function read(){
    const m=document.cookie.match(new RegExp(NAME+'=([^;]*)'));
    try{return m?JSON.parse(decodeURIComponent(m[1])):null}catch{return null}
  }
  function activate(cats){
    document.querySelectorAll('script[type="text/plain"][data-cvw-consent]').forEach(s=>{
      if(!cats.includes(s.dataset.cvwConsent))return;
      const n=document.createElement('script');
      for(const a of s.attributes)if(!['type','data-cvw-consent'].includes(a.name))n.setAttribute(a.name,a.value);
      n.text=s.text; s.replaceWith(n);
    });
    // iframe gated (embed YouTube/Maps/…): data-src -> src. Senza autoplay:
    // qui non c'è gesto utente (attivazione da cookie salvato o dal banner).
    document.querySelectorAll('iframe[data-cvw-consent][data-src]').forEach(f=>{
      if(!cats.includes(f.dataset.cvwConsent))return;
      f.src=f.dataset.src; f.removeAttribute('data-src');
    });
    // facade video: sostituite con l'iframe (senza autoplay)
    document.querySelectorAll('[data-cvw-facade]').forEach(el=>{
      if(!cats.includes(el.dataset.cvwConsent))return;
      window.__cvwFacadePlay&&window.__cvwFacadePlay(el,false);
    });
  }
  function updateGoogle(cats){
    if(typeof gtag!=='function')return;
    gtag('consent','update',{
      analytics_storage:cats.includes('analytics')?'granted':'denied',
      ad_storage:cats.includes('marketing')?'granted':'denied',
      ad_user_data:cats.includes('marketing')?'granted':'denied',
      ad_personalization:cats.includes('marketing')?'granted':'denied'
    });
  }
  window.cvwConsent={
    get(){return read()},
    has(cat){const c=read();return cat==='necessary'||Boolean(c&&c.cats.includes(cat))},
    set(cats){
      cats=[...new Set(['necessary',...cats])];
      const v=encodeURIComponent(JSON.stringify({cats,ts:Date.now(),v:1}));
      document.cookie=NAME+'='+v+';path=/;max-age=31536000;SameSite=Lax'+(location.protocol==='https:'?';Secure':'');
      activate(cats); updateGoogle(cats);
      document.dispatchEvent(new CustomEvent('cvw:consent',{detail:{cats}}));
      const b=document.getElementById('cvw-consent-banner'); if(b)b.remove();
    }
  };
  const saved=read();
  if(saved){activate(saved.cats);updateGoogle(saved.cats);
    const b=document.getElementById('cvw-consent-banner'); if(b)b.remove();}
})();
`;

/** Banner nativo: HTML server-rendered (primo paint, zero CLS: overlay fixed). */
export function nativeBannerHtml({ categories = ['analytics', 'marketing'], policyUrl = '/privacy/', text = {} } = {}) {
  const t = {
    title: 'Cookie e privacy',
    body: 'Usiamo cookie tecnici e, con il tuo consenso, cookie di analisi e marketing.',
    accept: 'Accetta tutto',
    reject: 'Solo necessari',
    policy: 'Informativa',
    ...text,
  };
  return `<div id="cvw-consent-banner" role="dialog" aria-modal="false" aria-label="${esc(t.title)}"
  style="position:fixed;left:12px;right:12px;bottom:12px;z-index:99999;background:#fff;color:#14141f;border:1px solid #e5e5ea;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.18);padding:18px 20px;max-width:680px;margin:0 auto;font:14px/1.5 system-ui,sans-serif">
  <b>${esc(t.title)}</b>
  <p style="margin:6px 0 12px;color:#55555f">${esc(t.body)} <a href="${esc(policyUrl)}" style="color:inherit">${esc(t.policy)}</a></p>
  <div style="display:flex;gap:10px;flex-wrap:wrap">
    <button id="cvw-consent-accept" style="flex:1;min-width:140px;padding:11px 18px;border:none;border-radius:999px;background:#14141f;color:#fff;font-weight:700;cursor:pointer">${esc(t.accept)}</button>
    <button id="cvw-consent-reject" style="flex:1;min-width:140px;padding:11px 18px;border:1px solid #ccc;border-radius:999px;background:#fff;color:#14141f;font-weight:700;cursor:pointer">${esc(t.reject)}</button>
  </div>
</div>
<script>
(function(){
  var a=document.getElementById('cvw-consent-accept'),r=document.getElementById('cvw-consent-reject');
  if(a)a.addEventListener('click',function(){window.cvwConsent.set(${JSON.stringify(categories)})});
  if(r)r.addEventListener('click',function(){window.cvwConsent.set([])});
})();
<\/script>`;
}

/**
 * Facade video GDPR-safe: placeholder statico (thumbnail + play), zero cookie
 * finché l'utente non clicca. Al click: consenso per la categoria + iframe con
 * AUTOPLAY (il click è il gesto utente che lo consente). Se il consenso esiste
 * già al load, il runtime sostituisce la facade con l'iframe senza autoplay.
 *
 * Bonus CWV: un embed YouTube pesa ~800 KB; la facade ~2 KB.
 * Usa youtube-nocookie.com. provider: 'youtube' | 'youtube-nocookie' | url custom.
 */
export function videoFacadeHtml({ id, title = 'Video', category = 'marketing', thumbnail, embedUrl } = {}) {
  const thumb = thumbnail || `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`;
  const src = embedUrl || `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`;
  const uid = 'cvwf_' + Math.random().toString(36).slice(2, 8);
  return `<div id="${uid}" data-cvw-facade data-cvw-consent="${esc(category)}" data-embed="${esc(src)}" data-title="${esc(title)}"
  style="position:relative;aspect-ratio:16/9;background:#000 url('${esc(thumb)}') center/cover;border-radius:12px;overflow:hidden;cursor:pointer;display:flex;align-items:center;justify-content:center">
  <button style="background:rgba(0,0,0,.75);color:#fff;border:1px solid rgba(255,255,255,.4);border-radius:999px;padding:14px 26px;font:600 15px system-ui;cursor:pointer">
    ▶ ${esc(title)} — carica il video (cookie di YouTube)
  </button>
</div>
<script>
(function(){
  if(!window.__cvwFacadePlay){
    window.__cvwFacadePlay=function(el,autoplay){
      var f=document.createElement('iframe');
      f.src=el.dataset.embed+(autoplay?(el.dataset.embed.includes('?')?'&':'?')+'autoplay=1':'');
      f.title=el.dataset.title||'Video';
      f.allow='accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture';
      f.allowFullscreen=true;
      f.style.cssText='width:100%;aspect-ratio:16/9;border:0;border-radius:12px';
      el.replaceWith(f);
    };
  }
  var el=document.getElementById('${uid}');
  el.addEventListener('click',function(){
    var cat=el.dataset.cvwConsent;
    if(!(window.cvwConsent&&window.cvwConsent.has(cat))){
      var cur=(window.cvwConsent&&window.cvwConsent.get())||{cats:[]};
      window.cvwConsent.set(cur.cats.concat([cat])); // il set attiva le ALTRE facade senza autoplay…
    }
    window.__cvwFacadePlay(el,true); // …ma QUESTA parte con autoplay: c'è il gesto utente
  });
})();
<\/script>`;
}

const VENDOR_ORIGINS = {
  cookiebot: ['https://consent.cookiebot.com', 'https://consentcdn.cookiebot.com'],
  iubenda: ['https://cdn.iubenda.com', 'https://cs.iubenda.com'],
};

/** Preconnect per la modalità vendor (connessione calda prima dello script). */
export function vendorPreconnect(vendor) {
  return (VENDOR_ORIGINS[vendor] || []).map(o => `<link rel="preconnect" href="${o}" crossorigin>`).join('\n');
}

/** Loader vendor fuori dal critical path, secondo la strategy. */
export function vendorLoaderScript({ vendor, id, strategy = 'idle', iubendaConfig = null }) {
  const inject = vendor === 'cookiebot'
    ? `var s=document.createElement('script');s.src='https://consent.cookiebot.com/uc.js';s.setAttribute('data-cbid',${JSON.stringify(id)});s.setAttribute('data-blockingmode','manual');document.head.appendChild(s);`
    : `window._iub=window._iub||[];_iub.csConfiguration=${JSON.stringify(iubendaConfig || { siteId: id, lang: 'it' })};var s=document.createElement('script');s.src='https://cdn.iubenda.com/cs/iubenda_cs.js';document.head.appendChild(s);`;

  const wrap = {
    defer: `(function(){${inject}})();`,
    idle: `(window.requestIdleCallback||function(f){setTimeout(f,1500)})(function(){${inject}});`,
    interaction: `(function(){var done=false;function go(){if(done)return;done=true;${inject}}
['scroll','pointerdown','keydown','touchstart'].forEach(function(e){addEventListener(e,go,{once:true,passive:true})});
setTimeout(go,4000);})();`,   // fallback: mai oltre 4s senza banner (compliance)
  };
  return wrap[strategy] || wrap.idle;
}

/** Blocchi head+body pronti per l'iniezione in renderPage. */
export function consentBlocks(consent) {
  if (!consent) return { head: '', body: '' };
  const head = [
    `<script>${CONSENT_MODE_SNIPPET}<\/script>`,      // sempre: default denied
    consent.mode === 'vendor' ? vendorPreconnect(consent.vendor) : '',
  ].filter(Boolean).join('\n');

  const body = [
    `<script>${CONSENT_RUNTIME}<\/script>`,
    consent.mode === 'vendor'
      ? `<script>${vendorLoaderScript(consent)}<\/script>`
      : nativeBannerHtml(consent),
  ].join('\n');

  return { head, body };
}
