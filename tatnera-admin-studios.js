/* TATNERA Admin — Studios, trial/subscription and usage overview */
(function(){
  'use strict';
  if(window.__tatneraAdminStudiosInstalled)return;
  window.__tatneraAdminStudiosInstalled=true;

  let client=null,rows=[],busy=false;
  const db=()=>client||(client=window.TatneraAuth?.client||null);
  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const fmt=v=>v?new Intl.DateTimeFormat('de-DE',{dateStyle:'short'}).format(new Date(v)):'–';
  const statusLabel=s=>({trial:'Testphase',active:'Zahlend / Aktiv',past_due:'Zahlung offen',expired:'Abgelaufen',paused:'Pausiert',cancelled:'Gekündigt'})[s]||s||'–';
  const daysLeft=v=>{if(!v)return null;return Math.ceil((new Date(v).getTime()-Date.now())/86400000);};

  function activityLabel(value){
    if(!value)return '–';
    const date=new Date(value),now=new Date();
    const time=new Intl.DateTimeFormat('de-DE',{hour:'2-digit',minute:'2-digit'}).format(date);
    const sameDay=date.getFullYear()===now.getFullYear()&&date.getMonth()===now.getMonth()&&date.getDate()===now.getDate();
    const yesterday=new Date(now.getFullYear(),now.getMonth(),now.getDate()-1);
    const isYesterday=date.getFullYear()===yesterday.getFullYear()&&date.getMonth()===yesterday.getMonth()&&date.getDate()===yesterday.getDate();
    if(sameDay)return `Heute, ${time}`;
    if(isYesterday)return `Gestern, ${time}`;
    return `${new Intl.DateTimeFormat('de-DE',{dateStyle:'short'}).format(date)}, ${time}`;
  }

  function usageState(row){
    if(row.usage_available===false)return {label:'Nicht verfügbar',kind:'unknown'};
    const customers=Number(row.customer_count)||0,appointments=Number(row.appointment_count)||0,invoices=Number(row.invoice_count)||0;
    const total=customers+appointments+invoices;
    if(total===0)return {label:'Keine Daten angelegt',kind:'unused'};
    if(invoices>0||appointments>=2||total>=3)return {label:'Aktiv genutzt',kind:'active'};
    return {label:'Ausprobiert',kind:'tried'};
  }

  function installStyle(){
    if(document.getElementById('tatneraAdminStudiosStyle'))return;
    const style=document.createElement('style');style.id='tatneraAdminStudiosStyle';style.textContent=`
      .tatnera-admin-studios{margin-top:16px}
      .tatnera-admin-studio-state{display:inline-flex;align-items:center;padding:5px 8px;border-radius:999px;font-weight:800;font-size:11px}
      .tatnera-admin-studio-state.trial{background:#fff4d8;color:#7a5a00}.tatnera-admin-studio-state.active{background:#e4f5e9;color:#245f39}
      .tatnera-admin-studio-state.past_due,.tatnera-admin-studio-state.expired,.tatnera-admin-studio-state.cancelled{background:#fde8e8;color:#8e3030}.tatnera-admin-studio-state.paused{background:#ececf2;color:#555}
      .tatnera-admin-studio-meta{font-size:11px;color:var(--muted);margin-top:3px}.tatnera-admin-studios select{min-width:135px}
      .tatnera-admin-studio-tools{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:0 0 14px}.tatnera-admin-studio-tools input,.tatnera-admin-studio-tools select{border:1px solid var(--line);background:var(--panel-2);color:var(--text);border-radius:10px;padding:9px 11px}.tatnera-admin-studio-tools input{min-width:250px;flex:1}
      .tatnera-admin-studio-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin:0 0 14px}.tatnera-admin-studio-kpi{border:1px solid var(--line);border-radius:12px;padding:11px;background:var(--panel-2)}.tatnera-admin-studio-kpi span,.tatnera-admin-studio-kpi strong{display:block}.tatnera-admin-studio-kpi span{font-size:11px;color:var(--muted)}.tatnera-admin-studio-kpi strong{font-size:20px;margin-top:3px}
      .tatnera-admin-trial-warning{font-weight:800;color:#9a6500}.tatnera-admin-trial-expired{font-weight:800;color:#9a3030}
      .tatnera-admin-usage{display:grid;grid-template-columns:repeat(3,max-content);gap:4px 10px;align-items:center}.tatnera-admin-usage span{font-size:11px;white-space:nowrap}.tatnera-admin-usage strong{font-variant-numeric:tabular-nums}
      .tatnera-admin-usage-state{display:inline-flex;align-items:center;padding:5px 8px;border-radius:999px;font-size:10px;font-weight:800;margin-bottom:5px}.tatnera-admin-usage-state.unused{background:#f0f0f3;color:#666}.tatnera-admin-usage-state.tried{background:#fff4d8;color:#7a5a00}.tatnera-admin-usage-state.active{background:#e4f5e9;color:#245f39}.tatnera-admin-usage-state.unknown{background:#ececf2;color:#666}
      .tatnera-admin-last-activity{white-space:nowrap;font-size:11px}.tatnera-admin-last-activity strong{display:block;font-size:11px}.tatnera-admin-last-activity span{display:block;color:var(--muted);font-size:10px;margin-top:4px}
      @media(max-width:980px){.tatnera-admin-table{min-width:980px}}@media(max-width:760px){.tatnera-admin-studio-kpis{grid-template-columns:1fr 1fr}.tatnera-admin-studio-tools input{min-width:100%;width:100%}}
    `;document.head.appendChild(style);
  }

  function ensureCard(){
    const view=document.getElementById('tatnera-admin');
    if(!view||document.getElementById('tatneraAdminStudios'))return;
    const card=document.createElement('section');card.className='tatnera-admin-card tatnera-admin-studios';
    card.innerHTML=`<h3>🏢 Studios & Status</h3><div class="tatnera-admin-studio-kpis"><div class="tatnera-admin-studio-kpi"><span>Studios gesamt</span><strong id="adminStudiosTotal">–</strong></div><div class="tatnera-admin-studio-kpi"><span>Im Test</span><strong id="adminStudiosTrial">–</strong></div><div class="tatnera-admin-studio-kpi"><span>Zahlend / Aktiv</span><strong id="adminStudiosActive">–</strong></div><div class="tatnera-admin-studio-kpi"><span>Test endet bald</span><strong id="adminStudiosEnding">–</strong></div><div class="tatnera-admin-studio-kpi"><span>Problem / Ende</span><strong id="adminStudiosProblem">–</strong></div></div><div class="tatnera-admin-studio-tools"><input id="tatneraAdminStudioSearch" type="search" placeholder="Studio, E-Mail oder Ort suchen …"><select id="tatneraAdminStudioFilter"><option value="all">Alle Status</option>${['trial','active','past_due','expired','paused','cancelled'].map(v=>`<option value="${v}">${statusLabel(v)}</option>`).join('')}</select></div><div id="tatneraAdminStudios" class="tatnera-admin-table-wrap"><div class="tatnera-admin-empty">Wird geladen …</div></div>`;
    const grid=view.querySelector('.tatnera-admin-grid');(grid||view).appendChild(card);
    card.querySelector('#tatneraAdminStudioSearch')?.addEventListener('input',render);
    card.querySelector('#tatneraAdminStudioFilter')?.addEventListener('change',render);
    card.addEventListener('change',async event=>{
      const select=event.target.closest('[data-studio-subscription-status]');if(!select)return;
      const api=db();if(!api)return;select.disabled=true;
      const {error}=await api.from('studios').update({subscription_status:select.value,updated_at:new Date().toISOString()}).eq('id',select.dataset.studioSubscriptionStatus);
      select.disabled=false;
      if(error){alert('Abo-Status konnte nicht gespeichert werden.');console.warn(error);}else loadStudios();
    });
  }

  function render(){
    const target=document.getElementById('tatneraAdminStudios');if(!target)return;
    const q=(document.getElementById('tatneraAdminStudioSearch')?.value||'').trim().toLowerCase(),filter=document.getElementById('tatneraAdminStudioFilter')?.value||'all';
    const shown=rows.filter(x=>(filter==='all'||x.subscription_status===filter)&&(!q||[x.name,x.email,x.city].some(v=>String(v||'').toLowerCase().includes(q))));
    target.innerHTML=shown.length?`<table class="tatnera-admin-table"><thead><tr><th>Studio</th><th>Registriert</th><th>Testphase</th><th>Status</th><th>Nutzung</th><th>Letzte Nutzung</th></tr></thead><tbody>${shown.map(x=>{
      const left=daysLeft(x.trial_ends_at),trialText=x.subscription_status==='trial'?(left>0?`${left} Tag${left===1?'':'e'} übrig`:left===0?'endet heute':'abgelaufen'):statusLabel(x.subscription_status),trialClass=x.subscription_status==='trial'?(left!==null&&left<0?'tatnera-admin-trial-expired':left!==null&&left<=3?'tatnera-admin-trial-warning':''):'';
      const usage=usageState(x),available=x.usage_available!==false;
      const customers=available?Number(x.customer_count)||0:'–',appointments=available?Number(x.appointment_count)||0:'–',invoices=available?Number(x.invoice_count)||0:'–';
      const login=available?activityLabel(x.last_login_at):'Nicht verfügbar';
      const dataActivity=available?activityLabel(x.last_data_activity_at):'Nicht verfügbar';
      return `<tr><td><strong>${esc(x.name||'Ohne Namen')}</strong><div class="tatnera-admin-studio-meta">${esc(x.email||'')}${x.city?' · '+esc(x.city):''}</div></td><td>${esc(fmt(x.created_at))}</td><td>${esc(fmt(x.trial_started_at))} → ${esc(fmt(x.trial_ends_at))}<div class="tatnera-admin-studio-meta ${trialClass}">${esc(trialText)}</div></td><td><span class="tatnera-admin-studio-state ${esc(x.subscription_status)}">${esc(statusLabel(x.subscription_status))}</span><br><select data-studio-subscription-status="${esc(x.id)}">${['trial','active','past_due','expired','paused','cancelled'].map(v=>`<option value="${v}"${v===x.subscription_status?' selected':''}>${esc(statusLabel(v))}</option>`).join('')}</select></td><td><span class="tatnera-admin-usage-state ${usage.kind}">${esc(usage.label)}</span><div class="tatnera-admin-usage"><span><strong>${customers}</strong> Kunden</span><span><strong>${appointments}</strong> Termine</span><span><strong>${invoices}</strong> Rechnungen</span></div></td><td><div class="tatnera-admin-last-activity"><strong>Login: ${esc(login)}</strong><span>Datenaktion: ${esc(dataActivity)}</span></div></td></tr>`;
    }).join('')}</tbody></table>`:'<div class="tatnera-admin-empty">Keine passenden Studios gefunden.</div>';
  }

  async function loadStudios(){
    if(busy||!document.getElementById('tatnera-admin')?.classList.contains('active-view'))return;
    const api=db();if(!api)return;busy=true;ensureCard();
    const target=document.getElementById('tatneraAdminStudios');
    try{
      const [studiosRes,usageRes]=await Promise.all([
        api.from('studios').select('id,name,email,city,created_at,subscription_status,trial_started_at,trial_ends_at').order('created_at',{ascending:false}),
        api.rpc('admin_studio_usage_metrics')
      ]);
      if(studiosRes.error){if(target)target.innerHTML='<div class="tatnera-admin-empty">Studios konnten nicht geladen werden.</div>';console.warn(studiosRes.error);return;}
      const usageMap=new Map();
      if(usageRes.error){console.warn('Studio-Nutzung konnte nicht geladen werden.',usageRes.error);}else{
        (usageRes.data||[]).forEach(item=>usageMap.set(item.studio_id,item));
      }
      rows=(studiosRes.data||[]).map(x=>{
        const usage=usageMap.get(x.id);
        return {...x,customer_count:Number(usage?.customer_count)||0,appointment_count:Number(usage?.appointment_count)||0,invoice_count:Number(usage?.invoice_count)||0,last_data_activity_at:usage?.last_data_activity_at||null,last_login_at:usage?.last_login_at||null,usage_available:!usageRes.error};
      });
      const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value;};
      set('adminStudiosTotal',rows.length);
      set('adminStudiosTrial',rows.filter(x=>x.subscription_status==='trial').length);
      set('adminStudiosActive',rows.filter(x=>x.subscription_status==='active').length);
      set('adminStudiosEnding',rows.filter(x=>x.subscription_status==='trial'&&daysLeft(x.trial_ends_at)!==null&&daysLeft(x.trial_ends_at)>=0&&daysLeft(x.trial_ends_at)<=3).length);
      set('adminStudiosProblem',rows.filter(x=>['past_due','expired','cancelled'].includes(x.subscription_status)||(x.subscription_status==='trial'&&daysLeft(x.trial_ends_at)<0)).length);
      render();
    }finally{busy=false;}
  }

  installStyle();
  document.addEventListener('tatnera:admin-open',()=>setTimeout(loadStudios,100));
  document.getElementById('tatneraAdminRefresh')?.addEventListener('click',()=>setTimeout(loadStudios,100));
})();