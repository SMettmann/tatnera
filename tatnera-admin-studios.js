/* TATNERA Admin — Studios & trial/subscription overview */
(function(){
  'use strict';
  if(window.__tatneraAdminStudiosInstalled)return;
  window.__tatneraAdminStudiosInstalled=true;

  const SUPABASE_URL='https://ayxvspeufbsoxtccaqap.supabase.co';
  const SUPABASE_KEY='sb_publishable_g8Z9qVH3GSJHHkbuT-ne5A_0IfhKJz1';
  let client=null,isAdmin=false,rows=[];
  const db=()=>client||(window.supabase?.createClient?(client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY)):null);
  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const fmt=v=>v?new Intl.DateTimeFormat('de-DE',{dateStyle:'short'}).format(new Date(v)):'–';
  const statusLabel=s=>({trial:'Testphase',active:'Aktiv',past_due:'Zahlung offen',expired:'Abgelaufen',paused:'Pausiert',cancelled:'Gekündigt'})[s]||s||'–';
  const daysLeft=v=>{if(!v)return null;return Math.ceil((new Date(v).getTime()-Date.now())/86400000);};

  function installStyle(){
    if(document.getElementById('tatneraAdminStudiosStyle'))return;
    const style=document.createElement('style');style.id='tatneraAdminStudiosStyle';style.textContent=`
      .tatnera-admin-studios{margin-top:16px}.tatnera-admin-studio-state{display:inline-flex;align-items:center;padding:5px 8px;border-radius:999px;font-weight:800;font-size:11px}.tatnera-admin-studio-state.trial{background:#fff4d8;color:#7a5a00}.tatnera-admin-studio-state.active{background:#e4f5e9;color:#245f39}.tatnera-admin-studio-state.past_due,.tatnera-admin-studio-state.expired,.tatnera-admin-studio-state.cancelled{background:#fde8e8;color:#8e3030}.tatnera-admin-studio-state.paused{background:#ececf2;color:#555}.tatnera-admin-studio-meta{font-size:11px;color:var(--muted);margin-top:3px}.tatnera-admin-studios select{min-width:135px}.tatnera-admin-studio-tools{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:0 0 14px}.tatnera-admin-studio-tools input,.tatnera-admin-studio-tools select{border:1px solid var(--line);background:var(--panel-2);color:var(--text);border-radius:10px;padding:9px 11px}.tatnera-admin-studio-tools input{min-width:250px;flex:1}.tatnera-admin-studio-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin:0 0 14px}.tatnera-admin-studio-kpi{border:1px solid var(--line);border-radius:12px;padding:11px;background:var(--panel-2)}.tatnera-admin-studio-kpi span,.tatnera-admin-studio-kpi strong{display:block}.tatnera-admin-studio-kpi span{font-size:11px;color:var(--muted)}.tatnera-admin-studio-kpi strong{font-size:20px;margin-top:3px}.tatnera-admin-trial-warning{font-weight:800;color:#9a6500}.tatnera-admin-trial-expired{font-weight:800;color:#9a3030}@media(max-width:760px){.tatnera-admin-studio-kpis{grid-template-columns:1fr 1fr}.tatnera-admin-studio-tools input{min-width:100%;width:100%}}
    `;document.head.appendChild(style);
  }

  function ensureCard(){
    const view=document.getElementById('tatnera-admin');if(!view||document.getElementById('tatneraAdminStudios'))return;
    const card=document.createElement('section');card.className='tatnera-admin-card tatnera-admin-studios';card.innerHTML=`<h3>🏢 Studios & Testphase</h3><div class="tatnera-admin-studio-kpis"><div class="tatnera-admin-studio-kpi"><span>Studios</span><strong id="adminStudiosTotal">–</strong></div><div class="tatnera-admin-studio-kpi"><span>Testphase</span><strong id="adminStudiosTrial">–</strong></div><div class="tatnera-admin-studio-kpi"><span>Aktiv</span><strong id="adminStudiosActive">–</strong></div><div class="tatnera-admin-studio-kpi"><span>Läuft bald ab</span><strong id="adminStudiosEnding">–</strong></div><div class="tatnera-admin-studio-kpi"><span>Problem / Ende</span><strong id="adminStudiosProblem">–</strong></div></div><div class="tatnera-admin-studio-tools"><input id="tatneraAdminStudioSearch" type="search" placeholder="Studio, E-Mail oder Ort suchen …"><select id="tatneraAdminStudioFilter"><option value="all">Alle Status</option>${['trial','active','past_due','expired','paused','cancelled'].map(v=>`<option value="${v}">${statusLabel(v)}</option>`).join('')}</select></div><div id="tatneraAdminStudios" class="tatnera-admin-table-wrap"><div class="tatnera-admin-empty">Wird geladen …</div></div>`;
    const grid=view.querySelector('.tatnera-admin-grid');(grid||view).appendChild(card);
    card.querySelector('#tatneraAdminStudioSearch')?.addEventListener('input',render);
    card.querySelector('#tatneraAdminStudioFilter')?.addEventListener('change',render);
    card.addEventListener('change',async event=>{const select=event.target.closest('[data-studio-subscription-status]');if(!select)return;select.disabled=true;const {error}=await db().from('studios').update({subscription_status:select.value,updated_at:new Date().toISOString()}).eq('id',select.dataset.studioSubscriptionStatus);select.disabled=false;if(error){alert('Abo-Status konnte nicht gespeichert werden.');console.warn(error);}else loadStudios();});
  }

  function render(){
    const target=document.getElementById('tatneraAdminStudios');if(!target)return;
    const q=(document.getElementById('tatneraAdminStudioSearch')?.value||'').trim().toLowerCase(),filter=document.getElementById('tatneraAdminStudioFilter')?.value||'all';
    const shown=rows.filter(x=>(filter==='all'||x.subscription_status===filter)&&(!q||[x.name,x.email,x.city].some(v=>String(v||'').toLowerCase().includes(q))));
    target.innerHTML=shown.length?`<table class="tatnera-admin-table"><thead><tr><th>Studio</th><th>Registriert</th><th>Testphase</th><th>Status</th><th>Nutzer</th><th>Stripe</th></tr></thead><tbody>${shown.map(x=>{const left=daysLeft(x.trial_ends_at),trialText=x.subscription_status==='trial'?(left>0?`${left} Tag${left===1?'':'e'} übrig`:left===0?'endet heute':'abgelaufen'):statusLabel(x.subscription_status),trialClass=x.subscription_status==='trial'?(left!==null&&left<0?'tatnera-admin-trial-expired':left!==null&&left<=3?'tatnera-admin-trial-warning':''):'';return `<tr><td><strong>${esc(x.name||'Ohne Namen')}</strong><div class="tatnera-admin-studio-meta">${esc(x.email||'')}${x.city?' · '+esc(x.city):''}</div></td><td>${esc(fmt(x.created_at))}</td><td>${esc(fmt(x.trial_started_at))} → ${esc(fmt(x.trial_ends_at))}<div class="tatnera-admin-studio-meta ${trialClass}">${esc(trialText)}</div></td><td><span class="tatnera-admin-studio-state ${esc(x.subscription_status)}">${esc(statusLabel(x.subscription_status))}</span><br><select data-studio-subscription-status="${esc(x.id)}">${['trial','active','past_due','expired','paused','cancelled'].map(v=>`<option value="${v}"${v===x.subscription_status?' selected':''}>${esc(statusLabel(v))}</option>`).join('')}</select></td><td><strong>${Number(x.user_count)||0}</strong></td><td><span class="muted">Noch nicht verbunden</span><div class="tatnera-admin-studio-meta">Stripe kommt zum Produktiv-Setup.</div></td></tr>`;}).join('')}</tbody></table>`:'<div class="tatnera-admin-empty">Keine passenden Studios gefunden.</div>';
  }

  async function loadStudios(){
    if(!isAdmin)return;ensureCard();const target=document.getElementById('tatneraAdminStudios');if(!target)return;
    const api=db();const [studiosRes,membersRes]=await Promise.all([api.from('studios').select('id,name,email,city,created_at,subscription_status,trial_started_at,trial_ends_at').order('created_at',{ascending:false}),api.from('studio_members').select('studio_id,user_id')]);
    if(studiosRes.error){target.innerHTML='<div class="tatnera-admin-empty">Studios konnten nicht geladen werden.</div>';console.warn(studiosRes.error);return;}
    const counts=new Map();if(!membersRes.error)(membersRes.data||[]).forEach(m=>counts.set(m.studio_id,(counts.get(m.studio_id)||0)+1));
    rows=(studiosRes.data||[]).map(x=>({...x,user_count:counts.get(x.id)||0}));
    const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value;};
    set('adminStudiosTotal',rows.length);set('adminStudiosTrial',rows.filter(x=>x.subscription_status==='trial').length);set('adminStudiosActive',rows.filter(x=>x.subscription_status==='active').length);set('adminStudiosEnding',rows.filter(x=>x.subscription_status==='trial'&&daysLeft(x.trial_ends_at)!==null&&daysLeft(x.trial_ends_at)>=0&&daysLeft(x.trial_ends_at)<=3).length);set('adminStudiosProblem',rows.filter(x=>['past_due','expired','cancelled'].includes(x.subscription_status)||(x.subscription_status==='trial'&&daysLeft(x.trial_ends_at)<0)).length);render();
  }

  async function checkAdmin(){const api=db();if(!api)return;const {data:{user}}=await api.auth.getUser();if(!user)return;const {data,error}=await api.from('app_admins').select('user_id').eq('user_id',user.id).maybeSingle();isAdmin=!error&&!!data;if(isAdmin){ensureCard();loadStudios();}}
  installStyle();document.addEventListener('tatnera:auth-ready',()=>setTimeout(checkAdmin,120));document.addEventListener('tatnera:runtime-refresh',()=>{if(isAdmin){ensureCard();loadStudios();}});document.addEventListener('click',event=>{if(isAdmin&&event.target.closest('[data-view="tatnera-admin"], [data-mobile-more-admin]'))setTimeout(loadStudios,80);});if(document.readyState!=='loading')setTimeout(checkAdmin,450);else document.addEventListener('DOMContentLoaded',()=>setTimeout(checkAdmin,450),{once:true});
})();
