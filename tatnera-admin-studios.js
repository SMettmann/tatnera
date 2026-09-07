/* TATNERA Admin — Studios & trial/subscription overview */
(function(){
  'use strict';
  if(window.__tatneraAdminStudiosInstalled)return;
  window.__tatneraAdminStudiosInstalled=true;

  const SUPABASE_URL='https://ayxvspeufbsoxtccaqap.supabase.co';
  const SUPABASE_KEY='sb_publishable_g8Z9qVH3GSJHHkbuT-ne5A_0IfhKJz1';
  let client=null,isAdmin=false;
  const db=()=>client||(window.supabase?.createClient?(client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY)):null);
  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const fmt=v=>v?new Intl.DateTimeFormat('de-DE',{dateStyle:'short'}).format(new Date(v)):'–';
  const statusLabel=s=>({trial:'Testphase',active:'Aktiv',past_due:'Zahlung offen',expired:'Abgelaufen',paused:'Pausiert',cancelled:'Gekündigt'})[s]||s;
  const daysLeft=v=>{if(!v)return null;return Math.ceil((new Date(v).getTime()-Date.now())/86400000);};

  function installStyle(){
    if(document.getElementById('tatneraAdminStudiosStyle'))return;
    const style=document.createElement('style');style.id='tatneraAdminStudiosStyle';style.textContent=`
      .tatnera-admin-studios{margin-top:16px}.tatnera-admin-studio-state{display:inline-flex;align-items:center;padding:5px 8px;border-radius:999px;font-weight:800;font-size:11px}.tatnera-admin-studio-state.trial{background:#fff4d8;color:#7a5a00}.tatnera-admin-studio-state.active{background:#e4f5e9;color:#245f39}.tatnera-admin-studio-state.past_due,.tatnera-admin-studio-state.expired,.tatnera-admin-studio-state.cancelled{background:#fde8e8;color:#8e3030}.tatnera-admin-studio-state.paused{background:#ececf2;color:#555}.tatnera-admin-studio-meta{font-size:11px;color:var(--muted);margin-top:3px}.tatnera-admin-studios select{min-width:135px}
    `;document.head.appendChild(style);
  }

  function ensureCard(){
    const view=document.getElementById('tatnera-admin');
    if(!view||document.getElementById('tatneraAdminStudios'))return;
    const card=document.createElement('section');card.className='tatnera-admin-card tatnera-admin-studios';card.innerHTML='<h3>🏢 Studios & Testphase</h3><div id="tatneraAdminStudios" class="tatnera-admin-table-wrap"><div class="tatnera-admin-empty">Wird geladen …</div></div>';
    const grid=view.querySelector('.tatnera-admin-grid');(grid||view).appendChild(card);
    card.addEventListener('change',async event=>{
      const select=event.target.closest('[data-studio-subscription-status]');if(!select)return;
      select.disabled=true;
      const {error}=await db().from('studios').update({subscription_status:select.value,updated_at:new Date().toISOString()}).eq('id',select.dataset.studioSubscriptionStatus);
      select.disabled=false;
      if(error){alert('Abo-Status konnte nicht gespeichert werden.');console.warn(error);}else loadStudios();
    });
  }

  async function loadStudios(){
    if(!isAdmin)return;
    ensureCard();
    const target=document.getElementById('tatneraAdminStudios');if(!target)return;
    const {data,error}=await db().from('studios').select('id,name,email,city,created_at,subscription_status,trial_started_at,trial_ends_at').order('created_at',{ascending:false});
    if(error){target.innerHTML='<div class="tatnera-admin-empty">Studios konnten nicht geladen werden.</div>';console.warn(error);return;}
    const rows=data||[];
    target.innerHTML=rows.length?`<table class="tatnera-admin-table"><thead><tr><th>Studio</th><th>Registriert</th><th>Testphase</th><th>Status</th><th>Stripe</th></tr></thead><tbody>${rows.map(x=>{const left=daysLeft(x.trial_ends_at),trialText=x.subscription_status==='trial'?(left>0?`${left} Tag${left===1?'':'e'} übrig`:left===0?'endet heute':'abgelaufen'):statusLabel(x.subscription_status);return `<tr><td><strong>${esc(x.name||'Ohne Namen')}</strong><div class="tatnera-admin-studio-meta">${esc(x.email||'')}${x.city?' · '+esc(x.city):''}</div></td><td>${esc(fmt(x.created_at))}</td><td>${esc(fmt(x.trial_ends_at))}<div class="tatnera-admin-studio-meta">${esc(trialText)}</div></td><td><span class="tatnera-admin-studio-state ${esc(x.subscription_status)}">${esc(statusLabel(x.subscription_status))}</span><br><select data-studio-subscription-status="${esc(x.id)}">${['trial','active','past_due','expired','paused','cancelled'].map(v=>`<option value="${v}"${v===x.subscription_status?' selected':''}>${esc(statusLabel(v))}</option>`).join('')}</select></td><td><span class="muted">Noch nicht verbunden</span><div class="tatnera-admin-studio-meta">Stripe kommt zum Produktiv-Setup.</div></td></tr>`;}).join('')}</tbody></table>`:'<div class="tatnera-admin-empty">Noch keine Studios.</div>';
  }

  async function checkAdmin(){
    const api=db();if(!api)return;
    const {data:{user}}=await api.auth.getUser();if(!user)return;
    const {data,error}=await api.from('app_admins').select('user_id').eq('user_id',user.id).maybeSingle();
    isAdmin=!error&&!!data;
    if(isAdmin){ensureCard();loadStudios();}
  }

  installStyle();
  document.addEventListener('tatnera:auth-ready',()=>setTimeout(checkAdmin,120));
  document.addEventListener('tatnera:runtime-refresh',()=>{if(isAdmin){ensureCard();loadStudios();}});
  document.addEventListener('click',event=>{if(isAdmin&&event.target.closest('[data-view="tatnera-admin"], [data-mobile-more-admin]'))setTimeout(loadStudios,80);});
  if(document.readyState!=='loading')setTimeout(checkAdmin,450);else document.addEventListener('DOMContentLoaded',()=>setTimeout(checkAdmin,450),{once:true});
})();
