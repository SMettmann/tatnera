/* TATNERA & Du — feedback and referral area */
(function(){
  'use strict';
  if(window.__tatneraAndYouInstalled)return;
  window.__tatneraAndYouInstalled=true;

  const SUPABASE_URL='https://ayxvspeufbsoxtccaqap.supabase.co';
  const SUPABASE_KEY='sb_publishable_g8Z9qVH3GSJHHkbuT-ne5A_0IfhKJz1';
  const PENDING_REF='tatnera_pending_referral';
  let client=null;

  function db(){
    if(client)return client;
    if(!window.supabase?.createClient)return null;
    client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
    return client;
  }
  function studio(){return window.TatneraAuth?.studio?.()||null;}
  function user(){return window.TatneraAuth?.user?.()||null;}
  function esc(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}

  function captureReferral(){
    try{
      const code=new URLSearchParams(location.search).get('ref');
      if(code&&/^TAT-[A-Z0-9]{6,20}$/i.test(code))localStorage.setItem(PENDING_REF,code.toUpperCase());
    }catch(_e){}
  }

  function installStyles(){
    if(document.getElementById('tatneraAndYouStyle'))return;
    const style=document.createElement('style');style.id='tatneraAndYouStyle';style.textContent=`
      .tatnera-you-nav{margin-top:8px}.tatnera-you-view{max-width:980px}.tatnera-you-head{margin-bottom:22px}.tatnera-you-head h2{margin:4px 0 6px}.tatnera-you-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.tatnera-you-card{padding:22px;border:1px solid var(--line);border-radius:16px;background:var(--panel);box-shadow:var(--shadow-sm)}.tatnera-you-icon{font-size:25px;margin-bottom:10px}.tatnera-you-card h3{margin:0 0 7px;font-size:18px}.tatnera-you-card p{margin:0 0 16px;color:var(--muted);line-height:1.5}.tatnera-you-reward{padding:11px 12px;border-radius:11px;background:#e8f6ec;color:#245f39;font-weight:800;margin:0 0 15px}.tatnera-you-form{display:grid;gap:10px}.tatnera-you-form input,.tatnera-you-form textarea{box-sizing:border-box;width:100%;border:1px solid var(--line);border-radius:10px;background:var(--panel-2);color:var(--text);padding:11px;font:inherit}.tatnera-you-form textarea{min-height:110px;resize:vertical}.tatnera-you-note{font-size:11px;color:var(--muted);margin-top:10px!important}.tatnera-you-success,.tatnera-you-error{display:none;margin-top:10px;padding:9px 11px;border-radius:10px;font-weight:800}.tatnera-you-success{background:#e8f6ec;color:#245f39}.tatnera-you-error{background:#fdeaea;color:#8e3030}.tatnera-you-success.show,.tatnera-you-error.show{display:block}.tatnera-you-referral{display:flex;gap:8px}.tatnera-you-referral input{flex:1}.tatnera-you-status{margin-top:15px;padding:12px;border-radius:12px;background:var(--panel-2)}.tatnera-you-status strong,.tatnera-you-status span{display:block}.tatnera-you-status span{margin-top:3px;color:var(--muted);font-size:11px}.tatnera-you-history{margin-top:14px;display:grid;gap:7px}.tatnera-you-history-row{padding:9px 10px;border:1px solid var(--line);border-radius:10px}.tatnera-you-history-row strong,.tatnera-you-history-row small{display:block}.tatnera-you-history-row small{color:var(--muted);margin-top:3px}@media(max-width:760px){.tatnera-you-grid{grid-template-columns:1fr}.tatnera-you-referral{flex-direction:column}.sidebar-bottom .tatnera-you-nav{display:none!important}}
    `;document.head.appendChild(style);
  }

  function openView(){
    if(typeof window.navigate==='function')window.navigate('tatnera-you');
    const section=document.getElementById('tatnera-you');
    if(!section?.classList.contains('active-view')){
      document.querySelectorAll('.view').forEach(view=>view.classList.remove('active-view'));
      section?.classList.add('active-view');
      document.querySelectorAll('.nav-item').forEach(item=>item.classList.toggle('active',item.dataset.view==='tatnera-you'));
    }
    const title=document.getElementById('pageTitle');if(title)title.textContent='TATNERA & Du';
    refreshCloudData();
  }

  function addDesktopNav(){
    const nav=document.querySelector('.sidebar-bottom');if(!nav)return;
    let button=nav.querySelector('[data-view="tatnera-you"]');
    if(!button){button=document.createElement('button');button.type='button';button.className='nav-item tatnera-you-nav';button.dataset.view='tatnera-you';button.innerHTML='<span>♡</span> TATNERA & Du';nav.insertBefore(button,nav.firstChild);}
    if(!button.dataset.tatneraYouBound){button.dataset.tatneraYouBound='1';button.addEventListener('click',event=>{event.preventDefault();openView();});}
  }

  function addMobileMoreItem(){
    const list=document.querySelector('#mobileMoreBackdrop .mobile-more-list');if(!list||list.querySelector('[data-mobile-more-tatnera-you]'))return;
    const button=document.createElement('button');button.type='button';button.className='mobile-more-item';button.dataset.mobileMoreTatneraYou='true';button.innerHTML='<span>♡</span><div><strong>TATNERA & Du</strong><small>Verbesserung vorschlagen & Freund werben</small></div><span class="arrow">→</span>';
    const logout=list.querySelector('[data-mobile-logout]');list.insertBefore(button,logout||null);
    button.addEventListener('click',()=>{document.getElementById('mobileMoreBackdrop')?.classList.remove('open');document.getElementById('mobileMoreNav')?.setAttribute('aria-expanded','false');openView();});
  }

  async function ensureReferralCode(){
    const api=db(),s=studio(),u=user();if(!api||!s?.id||!u?.id)return null;
    let {data,error}=await api.from('referral_codes').select('id,code').eq('studio_id',s.id).maybeSingle();
    if(error)throw error;if(data)return data;
    for(let i=0;i<4;i++){
      const code='TAT-'+Math.random().toString(36).slice(2,10).toUpperCase();
      const result=await api.from('referral_codes').insert({studio_id:s.id,user_id:u.id,code}).select('id,code').single();
      if(!result.error)return result.data;
      if(result.error.code!=='23505')throw result.error;
    }
    throw new Error('Empfehlungscode konnte nicht erstellt werden.');
  }

  async function registerPendingReferral(){
    const api=db(),s=studio(),u=user();if(!api||!s?.id||!u?.id)return;
    let code='';try{code=localStorage.getItem(PENDING_REF)||'';}catch(_e){}
    if(!code)return;
    try{
      const {data:refCode,error}=await api.from('referral_codes').select('id,studio_id,code').eq('code',code).maybeSingle();
      if(error||!refCode||refCode.studio_id===s.id)return;
      const {error:insertError}=await api.from('referrals').insert({referral_code_id:refCode.id,referrer_studio_id:refCode.studio_id,referred_studio_id:s.id,referred_user_id:u.id,status:'registriert',reward_months:2});
      if(insertError&&insertError.code!=='23505')throw insertError;
      try{localStorage.removeItem(PENDING_REF);}catch(_e){}
    }catch(error){console.warn('TATNERA referral registration failed',error);}
  }

  async function submitSuggestion(event){
    event.preventDefault();
    const form=event.currentTarget,button=form.querySelector('[type="submit"]'),ok=document.getElementById('tatneraSuggestionSuccess'),bad=document.getElementById('tatneraSuggestionError');
    ok?.classList.remove('show');bad?.classList.remove('show');
    const api=db(),s=studio(),u=user();if(!api||!s?.id||!u?.id){if(bad){bad.textContent='Vorschlag konnte nicht gespeichert werden. Bitte neu einloggen.';bad.classList.add('show');}return;}
    button.disabled=true;
    try{
      const data=new FormData(form),title=String(data.get('title')||'').trim(),details=String(data.get('details')||'').trim();
      const {error}=await api.from('feedback_suggestions').insert({studio_id:s.id,user_id:u.id,title,details,status:'eingegangen'});if(error)throw error;
      form.reset();ok?.classList.add('show');await loadSuggestions();
    }catch(error){if(bad){bad.textContent='Speichern fehlgeschlagen. Bitte erneut versuchen.';bad.classList.add('show');}console.warn('TATNERA suggestion save failed',error);}finally{button.disabled=false;}
  }

  const statusLabel=status=>({eingegangen:'Eingegangen',wird_geprueft:'Wird geprüft',geplant:'Geplant',umgesetzt:'Umgesetzt',abgelehnt:'Nicht umgesetzt'})[status]||status;
  async function loadSuggestions(){
    const api=db(),s=studio(),target=document.getElementById('tatneraSuggestionHistory');if(!api||!s?.id||!target)return;
    const {data,error}=await api.from('feedback_suggestions').select('id,title,status,reward_months,created_at').eq('studio_id',s.id).order('created_at',{ascending:false}).limit(5);
    if(error)return;
    target.innerHTML=(data||[]).length?data.map(item=>`<div class="tatnera-you-history-row"><strong>${esc(item.title)}</strong><small>${esc(statusLabel(item.status))}${item.status==='umgesetzt'?' · 1 Gratismonat':''}</small></div>`).join(''):'<small class="muted">Noch keine Vorschläge eingereicht.</small>';
  }

  async function loadReferral(){
    const api=db(),s=studio();if(!api||!s?.id)return;
    try{
      const refCode=await ensureReferralCode();if(!refCode)return;
      const link=`${location.origin}${location.pathname}?ref=${encodeURIComponent(refCode.code)}`;
      const input=document.getElementById('tatneraReferralLink');if(input)input.value=link;
      const codeNode=document.getElementById('tatneraReferralCodeText');if(codeNode)codeNode.textContent=refCode.code;
      const {data}=await api.from('referrals').select('status,reward_months').eq('referrer_studio_id',s.id);
      const rows=data||[],registered=rows.length,successful=rows.filter(r=>r.status==='zahlend'||r.status==='belohnt').length,rewarded=rows.filter(r=>r.status==='belohnt').reduce((sum,r)=>sum+(Number(r.reward_months)||0),0);
      const strong=document.querySelector('#tatneraReferralStatus strong'),small=document.querySelector('#tatneraReferralStatus span');
      if(strong)strong.textContent=`${registered} Empfehlung${registered===1?'':'en'} · ${successful} erfolgreich`;
      if(small)small.textContent=rewarded?`${rewarded} Gratismonate bereits gutgeschrieben.`:'2 Gratismonate je geworbenem Studio, sobald es zahlender Kunde wird.';
    }catch(error){console.warn('TATNERA referral load failed',error);}
  }

  async function refreshCloudData(){await Promise.allSettled([loadSuggestions(),loadReferral()]);}

  function build(){
    if(!document.getElementById('tatnera-you')){
      const settings=document.getElementById('settings');if(!settings)return;
      const section=document.createElement('section');section.id='tatnera-you';section.className='view tatnera-you-view';section.innerHTML=`
        <div class="tatnera-you-head"><span class="eyebrow">TATNERA & DU</span><h2>Gemeinsam besser</h2><p class="muted">Hilf uns, TATNERA besser zu machen – und profitiere davon.</p></div>
        <div class="tatnera-you-grid">
          <article class="tatnera-you-card"><div class="tatnera-you-icon">💡</div><h3>Verbesserung vorschlagen</h3><div class="tatnera-you-reward">Wird deine Idee umgesetzt, bekommst du 1 Monat TATNERA kostenlos.</div><p>Fehlt dir etwas im Studioalltag? Schick uns deine Idee direkt. Sie landet zentral bei TATNERA und du kannst den Status hier verfolgen.</p><form class="tatnera-you-form" id="tatneraSuggestionForm"><input name="title" required maxlength="100" placeholder="Kurzer Titel deiner Idee"><textarea name="details" required maxlength="1500" placeholder="Was sollten wir verbessern oder ergänzen?"></textarea><button class="btn primary" type="submit">Vorschlag senden</button></form><div class="tatnera-you-success" id="tatneraSuggestionSuccess">✓ Vorschlag angekommen. Wir prüfen ihn.</div><div class="tatnera-you-error" id="tatneraSuggestionError"></div><div class="tatnera-you-history" id="tatneraSuggestionHistory"></div></article>
          <article class="tatnera-you-card"><div class="tatnera-you-icon">🤝</div><h3>Freund werben</h3><div class="tatnera-you-reward">Wird das geworbene Studio zahlender Kunde, bekommst du 2 Monate TATNERA kostenlos.</div><p>Teile deinen persönlichen Link. Registriert sich ein neues Studio darüber, wird die Empfehlung automatisch deinem Studio zugeordnet.</p><label class="tatnera-you-form"><span>Dein persönlicher Empfehlungslink</span><div class="tatnera-you-referral"><input id="tatneraReferralLink" readonly placeholder="Link wird geladen …"><button type="button" class="btn ghost" id="tatneraCopyReferral">Link kopieren</button></div></label><p class="tatnera-you-note">Empfehlungscode: <strong id="tatneraReferralCodeText">–</strong></p><div class="tatnera-you-status" id="tatneraReferralStatus"><strong>Empfehlungen werden geladen …</strong><span>2 Gratismonate je zahlendem Studio.</span></div><p class="tatnera-you-note">Die automatische Gutschrift der Gratismonate wird mit Stripe verbunden. Registrierung und Zuordnung werden bereits zentral gespeichert.</p></article>
        </div>`;
      settings.insertAdjacentElement('afterend',section);
      section.querySelector('#tatneraSuggestionForm')?.addEventListener('submit',submitSuggestion);
      section.querySelector('#tatneraCopyReferral')?.addEventListener('click',async event=>{const value=section.querySelector('#tatneraReferralLink')?.value||'';if(!value)return;try{await navigator.clipboard.writeText(value);event.currentTarget.textContent='Kopiert ✓';setTimeout(()=>event.currentTarget.textContent='Link kopieren',1300);}catch(_e){}});
    }
    addDesktopNav();addMobileMoreItem();refreshCloudData();
  }

  captureReferral();installStyles();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{build();setTimeout(addMobileMoreItem,250);},{once:true});else{build();setTimeout(addMobileMoreItem,250);}
  document.addEventListener('tatnera:auth-ready',async()=>{build();setTimeout(addMobileMoreItem,100);await registerPendingReferral();refreshCloudData();});
  document.addEventListener('tatnera:runtime-refresh',()=>{addDesktopNav();addMobileMoreItem();});
})();
