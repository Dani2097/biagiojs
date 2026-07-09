/**
 * Overlay dev: CWV + weights inspector (solo con overlay:true).
 */

/** @param {string} nodesJson — JSON nodi con pesi */
export function weightsInspectorScript(nodesJson, thresholdsJson, weightsJson = '{"conversion":0.6,"seo":0.25,"interaction":0.15}') {
  return `
(function(){
  const W=${nodesJson};
  const TH=${thresholdsJson};
  const BW=${weightsJson};
  const norm=x=>Math.max(x,0.01);
  function biz(n){return BW.conversion*n.c+BW.seo*n.s+BW.interaction*n.i;}
  function tier(n){
    if(!n.h)return'static';
    if(n.m==='never')return'static';
    if(n.m==='inline'||n.m==='eager')return'eager';
    if(n.m==='visible'||n.m==='idle')return'lazy';
    const p=n.i*biz(n);
    if(p>=TH.eager)return'eager';
    if(p>=TH.lazy)return'lazy';
    return'static';
  }
  function plan(){
    const e=[],l=[],s=[];
    for(const n of W){const t=tier(n);(t==='eager'?e:t==='lazy'?l:s).push(n.id);}
    return{e,l,s};
  }
  let panel=document.getElementById('cvw-weights');
  if(!panel){
    panel=document.createElement('div');
    panel.id='cvw-weights';
    panel.style.cssText='position:fixed;top:12px;right:12px;background:#111e;border:1px solid #3a3a52;color:#eee;font:11px/1.5 ui-monospace,monospace;padding:12px 14px;border-radius:10px;z-index:10000;max-width:320px;max-height:70vh;overflow:auto';
    document.body.appendChild(panel);
  }
  function draw(){
    const p=plan();
    let h='<b style="color:#7CFC98">Weights inspector</b> ';
    h+='<button id="cvw-w-exp" style="float:right;background:#2a2a3a;color:#fff;border:none;padding:4px 8px;border-radius:6px;cursor:pointer;font-size:10px">Esporta</button><br>';
    h+='<span style="color:#aaa">eager: '+p.e.length+' · lazy: '+p.l.length+' · static: '+p.s.length+'</span><hr style="border-color:#333;margin:8px 0">';
    for(const n of W){
      h+='<div style="margin-bottom:10px"><b>'+n.id+'</b> <span style="color:#888">'+tier(n)+'</span><br>';
      for(const[k,label]of[['c','conv'],['s','seo'],['i','int']]){
        h+=label+': <input type="range" min="0" max="100" value="'+Math.round(n[k]*100)+'" data-id="'+n.id+'" data-k="'+k+'" style="width:100px;vertical-align:middle"> '+n[k].toFixed(2)+' ';
      }
      h+='</div>';
    }
    panel.innerHTML=h;
    panel.querySelectorAll('input[type=range]').forEach(inp=>{
      inp.oninput=()=>{const n=W.find(x=>x.id===inp.dataset.id);n[inp.dataset.k]=inp.value/100;draw();const raw=window.__CVW_PLAN__||{};const pl=plan();window.__CVW_PLAN__={e:pl.e,l:pl.l,static:pl.s};document.dispatchEvent(new CustomEvent('cvw:plan-update',{detail:pl}));};
    });
    const btn=panel.querySelector('#cvw-w-exp');
    if(btn)btn.onclick=()=>{
      const lines=W.map(n=>n.id+':  conversion="'+n.c.toFixed(2)+'" seo="'+n.s.toFixed(2)+'" interaction="'+n.i.toFixed(2)+'"');
      const txt='<!-- Pesi componenti: incolla gli attributi nei rispettivi <component> .biagio -->\\n'+lines.join('\\n');
      navigator.clipboard?.writeText(txt);
      btn.textContent='Copiato!';
      setTimeout(()=>{btn.textContent='Esporta';},1500);
    };
  }
  draw();
})();
`;
}

export const OVERLAY_PLAN_LISTENER = `
document.addEventListener('cvw:plan-update',function(){
  var box=document.querySelector('[style*="bottom:12px"]');
  if(!box)return;
  var d=event.detail||{};
  var eN=(d.e||[]).length,lN=(d.l||[]).length,sN=(d.s||[]).length;
  var span=box.querySelector('span[style*="color:#aaa"]');
  if(span)span.textContent='islands: '+eN+' eager / '+lN+' lazy / '+sN+' static';
});
`;
