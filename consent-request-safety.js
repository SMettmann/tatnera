/* TATNERA — safe consent request marker + clear sent state */
(function(){
  'use strict';
  if(window.__tatneraConsentRequestSafetyInstalled)return;
  window.__tatneraConsentRequestSafetyInstalled=true;

  const Core=window.TatneraCore;
  if(!Core)return;
  let busy=false;

  const formatSent=value=>{
    if(!value)return '';
    const date=new Date(value);
    if(Number.isNaN(date.getTime()))return '';
    return new Intl.DateTimeFormat('de-DE',{dateStyle:'short',timeStyle:'short'}).format(date);
  };

  function currentProject(){
    const id=Core.projectIdFromDetail?.();
    return id?Core.getProject(id):null;
  }

  function decorate(){
    const p=currentProject();
    if(!p)return;
    const card=document.querySelector(`.consent-card[data-consent-project="${CSS.escape(String(p.id))}"]`);
    if(!card)return;
    const actions=card.querySelector('.consent-actions');
    if(!actions)return;

    const existing=actions.querySelector('[data-consent-sent-badge]');
    const requested=actions.querySelector('[data-request-consent]');
    if(p.consent==='Angefordert'){
      requested?.remove();
      if(!existing){
        const badge=document.createElement('span');
        badge.dataset.consentSentBadge='';
        badge.className='consent-sent-badge';
        const when=formatSent(p.consentRequestedAt);
        badge.textContent=when?`✓ Gesendet am ${when}`:'✓ Gesendet';
        actions.appendChild(badge);
      }
    }else existing?.remove();
  }

  function installStyle(){
    if(document.getElementById('consentRequestSafetyStyle'))return;
    const style=document.createElement('style');
    style.id='consentRequestSafetyStyle';
    style.textContent=`
      .consent-sent-badge{
        display:inline-flex;align-items:center;justify-content:center;gap:6px;
        min-height:38px;padding:8px 12px;border-radius:10px;
        background:#dff5e4!important;border:1px solid #67a876!important;
        color:#195d2c!important;font-size:11px;font-weight:850;line-height:1.2;
        box-shadow:0 0 0 1px rgba(25,93,44,.05) inset;
      }
      :root[data-theme="dark"] .consent-sent-badge,
      :root[data-theme="pink"] .consent-sent-badge{
        background:#163c24!important;border-color:#3f8b57!important;color:#a9efbb!important;
      }
    `;
    document.head.appendChild(style);
  }

  document.addEventListener('click',event=>{
    const target=event.target instanceof Element?event.target.closest('[data-request-consent]'):null;
    if(!target)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if(busy)return;

    const p=Core.getProject(target.dataset.requestConsent);
    if(!p)return;
    if(p.consent==='Angefordert'){
      decorate();
      return;
    }

    busy=true;
    target.disabled=true;
    try{
      p.consent='Angefordert';
      if(!p.consentRequestedAt)p.consentRequestedAt=new Date().toISOString();
      if(typeof persist==='function')persist();
      decorate();
      document.dispatchEvent(new CustomEvent('tatnera:data-changed',{detail:{type:'consent-requested',projectId:p.id}}));
      requestAnimationFrame(decorate);
    }finally{
      setTimeout(()=>{busy=false;},350);
    }
  },true);

  document.addEventListener('tatnera:project-opened',()=>requestAnimationFrame(decorate));
  document.addEventListener('tatnera:runtime-refresh',()=>requestAnimationFrame(decorate));
  document.addEventListener('tatnera:data-changed',()=>requestAnimationFrame(decorate));

  const observer=new MutationObserver(()=>requestAnimationFrame(decorate));
  observer.observe(document.documentElement,{childList:true,subtree:true});

  installStyle();
  requestAnimationFrame(decorate);
})();
