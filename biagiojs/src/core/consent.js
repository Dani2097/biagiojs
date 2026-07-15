/**
 * biagiojs — Consent (GDPR) come primitiva del framework.
 * Priorità: compliance PRIMA, Core Web Vitals subito dopo.
 *
 * Config (biagio.config.js):
 *   site.consent = {
 *     mode: 'native',                       // banner del framework: 0 KB critical path
 *     categories: ['analytics','marketing'],// oltre a 'necessary' (sempre attiva)
 *     policyUrl: '/privacy/',
 *     text: { title, body, bodyHtml, accept, reject, policy, preferences, save, necessary },
 *     categoryLabels: { analytics: 'Statistiche', ... }, // label checkbox
 *     preferences: true,                    // pannello granulare per categoria
 *     css: '#cvw-consent-banner{...}',      // CSS custom (override delle classi)
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

/**
 * Banner nativo: HTML server-rendered (primo paint, zero CLS: overlay fixed).
 *
 * Personalizzazione:
 *   text.bodyHtml — corpo in HTML RAW (non escapato: contenuto trusted del sito)
 *   text.preferences / text.save — label del pannello preferenze
 *   categoryLabels — { analytics: 'Statistiche', ... } per le checkbox
 *   preferences: false — nasconde il pannello granulare per categoria
 *   css — CSS custom appended dopo quello di default (le classi cvw-consent-*
 *         sono stabili e sovrascrivibili; niente più stili inline)
 */
export function nativeBannerHtml({ categories = ['analytics', 'marketing'], policyUrl = '/privacy/', text = {}, categoryLabels = {}, preferences = true, css = '' } = {}) {
  const t = {
    title: 'Cookie e privacy',
    body: 'Usiamo cookie tecnici e, con il tuo consenso, cookie di analisi e marketing.',
    accept: 'Accetta tutto',
    reject: 'Solo necessari',
    policy: 'Informativa',
    preferences: 'Personalizza',
    save: 'Salva preferenze',
    necessary: 'Necessari (sempre attivi)',
    ...text,
  };
  const labels = { analytics: 'Analisi', marketing: 'Marketing', ...categoryLabels };
  const bodyHtml = t.bodyHtml || esc(t.body);

  const prefsPanel = preferences ? `
  <div id="cvw-consent-prefs" class="cvw-consent-prefs" hidden>
    <label class="cvw-consent-cat"><input type="checkbox" checked disabled> ${esc(t.necessary)}</label>
    ${categories.map(c => `<label class="cvw-consent-cat"><input type="checkbox" data-cvw-cat="${esc(c)}"> ${esc(labels[c] || c)}</label>`).join('\n    ')}
    <button id="cvw-consent-save" class="cvw-consent-btn cvw-consent-btn-save">${esc(t.save)}</button>
  </div>` : '';

  const prefsToggle = preferences
    ? `<button id="cvw-consent-prefs-toggle" class="cvw-consent-btn cvw-consent-btn-ghost" aria-expanded="false" aria-controls="cvw-consent-prefs">${esc(t.preferences)}</button>`
    : '';

  return `<style>
#cvw-consent-banner{position:fixed;left:12px;right:12px;bottom:12px;z-index:99999;background:rgba(255,255,255,.92);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);color:#14141f;border:1px solid rgba(20,20,31,.08);border-radius:16px;box-shadow:0 8px 24px rgba(0,0,0,.08),0 20px 60px rgba(0,0,0,.14);padding:20px 22px;max-width:680px;margin:0 auto;font:14px/1.55 system-ui,sans-serif;animation:cvw-consent-in .35s cubic-bezier(.22,1,.36,1)}
@keyframes cvw-consent-in{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){#cvw-consent-banner{animation:none}}
#cvw-consent-banner>b{font-size:15px;letter-spacing:-.01em}
#cvw-consent-banner .cvw-consent-body{margin:6px 0 14px;color:#55555f}
#cvw-consent-banner .cvw-consent-body a{color:inherit;text-underline-offset:2px}
#cvw-consent-banner .cvw-consent-actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
#cvw-consent-banner .cvw-consent-btn{flex:1;min-width:140px;padding:11px 18px;border:1px solid #d6d6dd;border-radius:999px;background:#fff;color:#14141f;font-weight:700;font-size:14px;cursor:pointer;transition:background .15s,border-color .15s,transform .1s}
#cvw-consent-banner .cvw-consent-btn:hover{background:#f4f4f7;border-color:#b9b9c4}
#cvw-consent-banner .cvw-consent-btn:active{transform:scale(.98)}
#cvw-consent-banner .cvw-consent-btn-accept{border:1px solid #14141f;background:#14141f;color:#fff}
#cvw-consent-banner .cvw-consent-btn-accept:hover{background:#2b2b3a;border-color:#2b2b3a}
#cvw-consent-banner .cvw-consent-btn-ghost{flex:0 1 auto;min-width:0;padding:11px 6px;border:none;background:transparent;text-decoration:underline;text-underline-offset:3px;font-weight:500;color:#55555f}
#cvw-consent-banner .cvw-consent-btn-ghost:hover{background:transparent;color:#14141f}
#cvw-consent-banner .cvw-consent-prefs{margin:2px 0 14px;padding:12px 14px;display:flex;flex-direction:column;gap:9px;background:rgba(20,20,31,.04);border-radius:12px}
#cvw-consent-banner .cvw-consent-prefs[hidden]{display:none}
#cvw-consent-banner .cvw-consent-cat{display:flex;align-items:center;gap:9px;cursor:pointer}
#cvw-consent-banner .cvw-consent-cat input{width:16px;height:16px;accent-color:#14141f;cursor:pointer}
#cvw-consent-banner .cvw-consent-btn-save{margin-top:3px;align-self:flex-start;flex:0 1 auto;padding:8px 16px;font-size:13px}
${css}
</style>
<div id="cvw-consent-banner" role="dialog" aria-modal="false" aria-label="${esc(t.title)}">
  <b>${esc(t.title)}</b>
  <p class="cvw-consent-body">${bodyHtml} <a href="${esc(policyUrl)}">${esc(t.policy)}</a></p>${prefsPanel}
  <div class="cvw-consent-actions">
    <button id="cvw-consent-accept" class="cvw-consent-btn cvw-consent-btn-accept">${esc(t.accept)}</button>
    <button id="cvw-consent-reject" class="cvw-consent-btn">${esc(t.reject)}</button>
    ${prefsToggle}
  </div>
</div>
<script>
(function(){
  // Scelta già salvata (il runtime gira PRIMA che questo HTML sia nel DOM,
  // quindi la rimozione va rifatta qui): niente banner sulle pagine successive.
  var b=document.getElementById('cvw-consent-banner');
  if(window.cvwConsent&&window.cvwConsent.get()){if(b)b.remove();return}
  var a=document.getElementById('cvw-consent-accept'),r=document.getElementById('cvw-consent-reject');
  if(a)a.addEventListener('click',function(){window.cvwConsent.set(${JSON.stringify(categories)})});
  if(r)r.addEventListener('click',function(){window.cvwConsent.set([])});
  var tg=document.getElementById('cvw-consent-prefs-toggle'),p=document.getElementById('cvw-consent-prefs');
  if(tg&&p)tg.addEventListener('click',function(){p.hidden=!p.hidden;tg.setAttribute('aria-expanded',String(!p.hidden))});
  var sv=document.getElementById('cvw-consent-save');
  if(sv)sv.addEventListener('click',function(){
    var cats=[].slice.call(document.querySelectorAll('#cvw-consent-prefs input[data-cvw-cat]:checked')).map(function(i){return i.dataset.cvwCat});
    window.cvwConsent.set(cats);
  });
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
