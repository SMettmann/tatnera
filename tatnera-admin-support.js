/* TATNERA internal admin — separate support / bug / question inbox */
(function(){
  'use strict';
  if(window.__tatneraAdminSupportInstalled)return;
  window.__tatneraAdminSupportInstalled=true;

  const SUPABASE_URL='https://ayxvspeufbsoxtccaqap.supabase.co';
  const SUPABASE_KEY='sb_publishable_g8Z9qVH3GSJHHkbuT-ne5A_0IfhKJz1';
  let client=null,queued=false,loading=false;
  const db=()=>client||(window.supabase?.createClient?(client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY)):null);
  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const fmt=v=>v?new Intl.DateTimeFormat('de-DE',{dateStyle:'short',timeStyle:'short'}).format(new Date(v)):'–';
  const statusLabel=s=>({eingegangen:'Eingegangen',wird_geprueft:'In Bearbeitung',erledigt:'Erledigt'})[s]||s;
  const isSupport=x=>/^\[Support\s*·/i.test(String(x?.title||''));
  function parseTitle(title){const match=String(title||'').match(/^\[Support\s*·\s*([^\]]+)\]\s*(.*)$/i);return {category:match?.[1]||'Support',title:match?.[2]||title||''};}

  function ensureCard(){
    const grid=document.querySelector('#tatnera-admin .tatnera-admin-grid');if(!grid)return null;
    let card=grid.querySelector('[data-admin-support-card]');
    if(card)return card;
    card=document.createElement('section');card.className='tatnera-admin-card';card.dataset.adminSupportCard='true';card.innerHTML='<h3>🛟 Support, Fehler & Fragen <span id="tatneraAdminSupportCount" class="muted" style="font-size:12px;font-weight:700"></span></h3><div id="tatneraAdminSupport" class="tatnera-admin-table-wrap"><div class="tatnera-admin-empty">Wird geladen …</div></div>';
    grid.prepend(card);
    const intro=document.querySelector('#tatnera-admin .tatnera-admin-head .muted');if(intro)intro.textContent='Studios, Support, Verbesserungsvorschläge und Empfehlungen zentral verwalten.';
    card.addEventListener('change',async event=>{
      const select=event.target.closest('[data-support-status]');if(!select)return;
      event.stopPropagation();
      const previous=select.dataset.savedStatus||select.value;
      select.disabled=true;
      const {error}=await db().from('feedback_suggestions').update({status:select.value,updated_at:new Date().toISOString()}).eq('id',select.dataset.supportStatus);
      select.disabled=false;
      if(error){select.value=previous;alert('Support-Status konnte nicht gespeichert werden.');console.warn(error);return;}
      select.dataset.savedStatus=select.value;
      setTimeout(load,80);
    });
    return card;
  }

  function removeSupportFromSuggestionTable(){
    const target=document.getElementById('tatneraAdminSuggestions');if(!target)return;
    target.querySelectorAll('tbody tr').forEach(row=>{const title=row.querySelector('.tatnera-admin-details strong')?.textContent||'';if(/^\[Support\s*·/i.test(title))row.remove();});
  }

  async function load(){
    if(loading)return;
    const card=ensureCard(),target=document.getElementById('tatneraAdminSupport');if(!card||!target)return;
    const api=db();if(!api)return;
    loading=true;
    try{
      const [studiosRes,profilesRes,itemsRes]=await Promise.all([
        api.from('studios').select('id,name,email'),
        api.from('profiles').select('id,email,display_name'),
        api.from('feedback_suggestions').select('id,studio_id,user_id,title,details,status,created_at').order('created_at',{ascending:false})
      ]);
      if(studiosRes.error||profilesRes.error||itemsRes.error){target.innerHTML='<div class="tatnera-admin-empty">Support-Daten konnten nicht geladen werden.</div>';return;}
      const studios=new Map((studiosRes.data||[]).map(x=>[x.id,x])),profiles=new Map((profilesRes.data||[]).map(x=>[x.id,x]));
      const all=itemsRes.data||[],support=all.filter(isSupport),suggestions=all.filter(x=>!isSupport(x));
      const count=document.getElementById('tatneraAdminSupportCount');if(count)count.textContent=`(${support.length})`;
      const kpi=document.getElementById('adminKpiSuggestions');if(kpi)kpi.textContent=String(suggestions.length);
      const open=document.getElementById('adminKpiOpen');if(open)open.textContent=String(suggestions.filter(x=>['eingegangen','wird_geprueft'].includes(x.status)).length);
      target.innerHTML=support.length?`<table class="tatnera-admin-table"><thead><tr><th>Datum</th><th>Studio</th><th>Absender</th><th>Art</th><th>Anfrage</th><th>Status</th></tr></thead><tbody>${support.map(x=>{const st=studios.get(x.studio_id)||{},p=profiles.get(x.user_id)||{},parsed=parseTitle(x.title);return `<tr><td>${esc(fmt(x.created_at))}</td><td><strong>${esc(st.name||'Unbekannt')}</strong><br><small>${esc(st.email||'')}</small></td><td>${esc(p.display_name||p.email||'–')}</td><td><strong>${esc(parsed.category)}</strong></td><td class="tatnera-admin-details"><strong>${esc(parsed.title)}</strong><br>${esc(x.details||'')}</td><td><select data-support-status="${esc(x.id)}" data-saved-status="${esc(x.status||'eingegangen')}">${['eingegangen','wird_geprueft','erledigt'].map(v=>`<option value="${v}"${v===x.status?' selected':''}>${esc(statusLabel(v))}</option>`).join('')}</select></td></tr>`;}).join('')}</tbody></table>`:'<div class="tatnera-admin-empty">Noch keine Support-Anfragen.</div>';
      removeSupportFromSuggestionTable();
    } finally { loading=false; }
  }

  function schedule(){if(queued)return;queued=true;setTimeout(()=>{queued=false;if(document.getElementById('tatnera-admin'))load();},180);}
  document.addEventListener('tatnera:auth-ready',()=>setTimeout(schedule,250));
  document.addEventListener('tatnera:runtime-refresh',schedule);
  document.addEventListener('click',event=>{if(event.target.closest('[data-view="tatnera-admin"],[data-mobile-more-admin]'))setTimeout(schedule,120);});
  /* Only watch creation/removal of the admin view. Do not rerender while a select is being used. */
  const observer=new MutationObserver(mutations=>{if(mutations.some(m=>[...m.addedNodes,...m.removedNodes].some(n=>n.nodeType===1&&(n.id==='tatnera-admin'||n.querySelector?.('#tatnera-admin')))))schedule();});
  observer.observe(document.body,{childList:true,subtree:true});
  schedule();
})();
