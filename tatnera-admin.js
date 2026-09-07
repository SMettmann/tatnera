/* TATNERA internal admin — visible only to app admins */
(function(){
  'use strict';
  if(window.__tatneraAdminInstalled)return;
  window.__tatneraAdminInstalled=true;

  const SUPABASE_URL='https://ayxvspeufbsoxtccaqap.supabase.co';
  const SUPABASE_KEY='sb_publishable_g8Z9qVH3GSJHHkbuT-ne5A_0IfhKJz1';
  let client=null,isAdmin=false;
  const db=()=>client||(window.supabase?.createClient?(client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY)):null);
  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const fmt=v=>v?new Intl.DateTimeFormat('de-DE',{dateStyle:'short',timeStyle:'short'}).format(new Date(v)):'–';
  const suggestionLabel=s=>({eingegangen:'Eingegangen',wird_geprueft:'Wird geprüft',geplant:'Geplant',umgesetzt:'Umgesetzt',abgelehnt:'Nicht umgesetzt'})[s]||s;
  const referralLabel=s=>({registriert:'Registriert',zahlend:'Zahlend',belohnt:'Belohnt',storniert:'Storniert'})[s]||s;

  function installStyle(){
    if(document.getElementById('tatneraAdminStyle'))return;
    const style=document.createElement('style');style.id='tatneraAdminStyle';style.textContent=`
      .tatnera-admin-nav{margin-top:8px}.tatnera-admin-view{max-width:1180px}.tatnera-admin-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-end;margin-bottom:18px}.tatnera-admin-head h2{margin:4px 0}.tatnera-admin-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:18px}.tatnera-admin-kpi{padding:15px;border:1px solid var(--line);border-radius:14px;background:var(--panel)}.tatnera-admin-kpi span,.tatnera-admin-kpi strong{display:block}.tatnera-admin-kpi strong{font-size:24px;margin-top:5px}.tatnera-admin-grid{display:grid;gap:16px}.tatnera-admin-card{border:1px solid var(--line);border-radius:16px;background:var(--panel);padding:16px;overflow:hidden}.tatnera-admin-card h3{margin:0 0 12px}.tatnera-admin-table-wrap{overflow:auto}.tatnera-admin-table{width:100%;border-collapse:collapse;min-width:860px}.tatnera-admin-table th,.tatnera-admin-table td{text-align:left;padding:10px;border-bottom:1px solid var(--line);vertical-align:top}.tatnera-admin-table th{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}.tatnera-admin-table td{font-size:13px}.tatnera-admin-table select{border:1px solid var(--line);background:var(--panel-2);color:var(--text);border-radius:9px;padding:7px}.tatnera-admin-details{max-width:380px;white-space:normal;line-height:1.4}.tatnera-admin-empty{color:var(--muted);padding:16px 0}.tatnera-admin-refresh{white-space:nowrap}@media(max-width:760px){.sidebar-bottom .tatnera-admin-nav{display:none!important}.tatnera-admin-head{align-items:flex-start;flex-direction:column}.tatnera-admin-kpis{grid-template-columns:1fr 1fr}.tatnera-admin-view{max-width:none}}
    `;document.head.appendChild(style);
  }

  function openView(){
    if(!isAdmin)return;
    if(typeof window.navigate==='function')window.navigate('tatnera-admin');
    const section=document.getElementById('tatnera-admin');
    if(!section?.classList.contains('active-view')){
      document.querySelectorAll('.view').forEach(v=>v.classList.remove('active-view'));
      section?.classList.add('active-view');
      document.querySelectorAll('.nav-item').forEach(item=>item.classList.toggle('active',item.dataset.view==='tatnera-admin'));
    }
    const title=document.getElementById('pageTitle');if(title)title.textContent='TATNERA Admin';
    loadData();
  }

  function addDesktopNav(){
    if(!isAdmin)return;
    const nav=document.querySelector('.sidebar-bottom');if(!nav)return;
    let button=nav.querySelector('[data-view="tatnera-admin"]');
    if(!button){button=document.createElement('button');button.type='button';button.className='nav-item tatnera-admin-nav';button.dataset.view='tatnera-admin';button.innerHTML='<span>◆</span> TATNERA Admin';nav.insertBefore(button,nav.firstChild);}
    if(!button.dataset.bound){button.dataset.bound='1';button.addEventListener('click',e=>{e.preventDefault();openView();});}
  }

  function addMobileItem(){
    if(!isAdmin)return;
    const list=document.querySelector('#mobileMoreBackdrop .mobile-more-list');if(!list||list.querySelector('[data-mobile-more-admin]'))return;
    const button=document.createElement('button');button.type='button';button.className='mobile-more-item';button.dataset.mobileMoreAdmin='true';button.innerHTML='<span>◆</span><div><strong>TATNERA Admin</strong><small>Vorschläge & Empfehlungen verwalten</small></div><span class="arrow">→</span>';
    const logout=list.querySelector('[data-mobile-logout]');list.insertBefore(button,logout||null);
    button.addEventListener('click',()=>{document.getElementById('mobileMoreBackdrop')?.classList.remove('open');openView();});
  }

  function buildView(){
    if(document.getElementById('tatnera-admin'))return;
    const anchor=document.getElementById('tatnera-you')||document.getElementById('settings');if(!anchor)return;
    const section=document.createElement('section');section.id='tatnera-admin';section.className='view tatnera-admin-view';section.innerHTML=`
      <div class="tatnera-admin-head"><div><span class="eyebrow">INTERN</span><h2>TATNERA Admin</h2><p class="muted">Verbesserungsvorschläge und Empfehlungen aller Studios.</p></div><button class="btn ghost tatnera-admin-refresh" id="tatneraAdminRefresh">↻ Aktualisieren</button></div>
      <div class="tatnera-admin-kpis"><div class="tatnera-admin-kpi"><span>Vorschläge gesamt</span><strong id="adminKpiSuggestions">–</strong></div><div class="tatnera-admin-kpi"><span>Offen / Prüfung</span><strong id="adminKpiOpen">–</strong></div><div class="tatnera-admin-kpi"><span>Empfehlungen</span><strong id="adminKpiReferrals">–</strong></div><div class="tatnera-admin-kpi"><span>Zahlend / belohnt</span><strong id="adminKpiPaid">–</strong></div></div>
      <div class="tatnera-admin-grid"><section class="tatnera-admin-card"><h3>💡 Verbesserungsvorschläge</h3><div id="tatneraAdminSuggestions" class="tatnera-admin-table-wrap"><div class="tatnera-admin-empty">Wird geladen …</div></div></section><section class="tatnera-admin-card"><h3>🤝 Freund werben</h3><div id="tatneraAdminReferrals" class="tatnera-admin-table-wrap"><div class="tatnera-admin-empty">Wird geladen …</div></div></section></div>`;
    anchor.insertAdjacentElement('afterend',section);
    section.querySelector('#tatneraAdminRefresh')?.addEventListener('click',loadData);
    section.addEventListener('change',async event=>{
      const target=event.target;
      if(target.matches('[data-suggestion-status]')){
        target.disabled=true;const {error}=await db().from('feedback_suggestions').update({status:target.value,updated_at:new Date().toISOString()}).eq('id',target.dataset.suggestionStatus);target.disabled=false;if(error){alert('Status konnte nicht gespeichert werden.');console.warn(error);}else loadData();
      }
      if(target.matches('[data-referral-status]')){
        target.disabled=true;const status=target.value,payload={status};if(status==='zahlend')payload.paid_at=new Date().toISOString();if(status==='belohnt')payload.rewarded_at=new Date().toISOString();const {error}=await db().from('referrals').update(payload).eq('id',target.dataset.referralStatus);target.disabled=false;if(error){alert('Status konnte nicht gespeichert werden.');console.warn(error);}else loadData();
      }
    });
  }

  async function loadData(){
    if(!isAdmin)return;
    const api=db(),sTarget=document.getElementById('tatneraAdminSuggestions'),rTarget=document.getElementById('tatneraAdminReferrals');if(!api||!sTarget||!rTarget)return;
    const [studiosRes,profilesRes,suggestionsRes,referralsRes]=await Promise.all([
      api.from('studios').select('id,name,email'),api.from('profiles').select('id,email,display_name'),api.from('feedback_suggestions').select('id,studio_id,user_id,title,details,status,reward_months,created_at').order('created_at',{ascending:false}),api.from('referrals').select('id,referrer_studio_id,referred_studio_id,referred_user_id,status,reward_months,registered_at,paid_at,rewarded_at').order('registered_at',{ascending:false})
    ]);
    if(studiosRes.error||profilesRes.error||suggestionsRes.error||referralsRes.error){sTarget.innerHTML='<div class="tatnera-admin-empty">Daten konnten nicht geladen werden.</div>';rTarget.innerHTML='';console.warn(studiosRes.error||profilesRes.error||suggestionsRes.error||referralsRes.error);return;}
    const studios=new Map((studiosRes.data||[]).map(x=>[x.id,x])),profiles=new Map((profilesRes.data||[]).map(x=>[x.id,x])),suggestions=suggestionsRes.data||[],referrals=referralsRes.data||[];
    document.getElementById('adminKpiSuggestions').textContent=suggestions.length;
    document.getElementById('adminKpiOpen').textContent=suggestions.filter(x=>['eingegangen','wird_geprueft'].includes(x.status)).length;
    document.getElementById('adminKpiReferrals').textContent=referrals.length;
    document.getElementById('adminKpiPaid').textContent=referrals.filter(x=>['zahlend','belohnt'].includes(x.status)).length;
    sTarget.innerHTML=suggestions.length?`<table class="tatnera-admin-table"><thead><tr><th>Datum</th><th>Studio</th><th>Absender</th><th>Vorschlag</th><th>Status</th><th>Bonus</th></tr></thead><tbody>${suggestions.map(x=>{const st=studios.get(x.studio_id)||{},p=profiles.get(x.user_id)||{};return `<tr><td>${esc(fmt(x.created_at))}</td><td><strong>${esc(st.name||'Unbekannt')}</strong><br><small>${esc(st.email||'')}</small></td><td>${esc(p.display_name||p.email||'–')}</td><td class="tatnera-admin-details"><strong>${esc(x.title)}</strong><br>${esc(x.details)}</td><td><select data-suggestion-status="${esc(x.id)}">${['eingegangen','wird_geprueft','geplant','umgesetzt','abgelehnt'].map(v=>`<option value="${v}"${v===x.status?' selected':''}>${esc(suggestionLabel(v))}</option>`).join('')}</select></td><td>${x.status==='umgesetzt'?'1 Monat':'–'}</td></tr>`;}).join('')}</tbody></table>`:'<div class="tatnera-admin-empty">Noch keine Verbesserungsvorschläge.</div>';
    rTarget.innerHTML=referrals.length?`<table class="tatnera-admin-table"><thead><tr><th>Registriert</th><th>Werber</th><th>Geworbenes Studio</th><th>Kontakt</th><th>Status</th><th>Bonus</th></tr></thead><tbody>${referrals.map(x=>{const from=studios.get(x.referrer_studio_id)||{},to=studios.get(x.referred_studio_id)||{},p=profiles.get(x.referred_user_id)||{};return `<tr><td>${esc(fmt(x.registered_at))}</td><td><strong>${esc(from.name||'Unbekannt')}</strong></td><td><strong>${esc(to.name||'Unbekannt')}</strong><br><small>${esc(to.email||'')}</small></td><td>${esc(p.display_name||p.email||'–')}</td><td><select data-referral-status="${esc(x.id)}">${['registriert','zahlend','belohnt','storniert'].map(v=>`<option value="${v}"${v===x.status?' selected':''}>${esc(referralLabel(v))}</option>`).join('')}</select></td><td>${['zahlend','belohnt'].includes(x.status)?`${Number(x.reward_months)||2} Monate`:'–'}</td></tr>`;}).join('')}</tbody></table>`:'<div class="tatnera-admin-empty">Noch keine Empfehlungen.</div>';
  }

  async function checkAdmin(){
    const api=db();if(!api)return false;
    const {data:{user}}=await api.auth.getUser();if(!user)return false;
    const {data,error}=await api.from('app_admins').select('user_id').eq('user_id',user.id).maybeSingle();
    isAdmin=!error&&!!data;
    if(isAdmin){buildView();addDesktopNav();addMobileItem();}
    return isAdmin;
  }

  installStyle();
  document.addEventListener('tatnera:auth-ready',async()=>{await checkAdmin();setTimeout(addMobileItem,150);});
  document.addEventListener('tatnera:runtime-refresh',()=>{if(isAdmin){addDesktopNav();addMobileItem();}});
  if(document.readyState!=='loading')setTimeout(checkAdmin,300);else document.addEventListener('DOMContentLoaded',()=>setTimeout(checkAdmin,300),{once:true});
})();
