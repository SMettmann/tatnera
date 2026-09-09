/* TATNERA admin controls — manual bonus approval + support archive */
(function(){
  'use strict';
  if(window.__tatneraAdminControlsInstalled)return;
  window.__tatneraAdminControlsInstalled=true;

  let client=null,busy=false,showArchive=false;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=v=>v?new Intl.DateTimeFormat('de-DE',{dateStyle:'short'}).format(new Date(v)):'–';
  const isSupport=x=>/^\[Support\s*·/i.test(String(x?.title||''));

  async function db(){
    if(client)return client;
    if(!window.supabase?.createClient)return null;
    try{
      const source=await fetch('tatnera-admin.js',{cache:'no-store'}).then(r=>r.text());
      const url=source.match(/SUPABASE_URL='([^']+)'/)?.[1];
      const key=source.match(/SUPABASE_KEY='([^']+)'/)?.[1];
      if(!url||!key)return null;
      client=window.supabase.createClient(url,key);
      return client;
    }catch(error){console.warn('Admin client konnte nicht initialisiert werden.',error);return null;}
  }

  function ensureArchiveToggle(){
    const card=document.querySelector('#tatnera-admin [data-admin-support-card]');
    if(!card)return;
    const head=card.querySelector('h3');
    if(!head||card.querySelector('[data-admin-archive-toggle]'))return;
    const button=document.createElement('button');
    button.type='button';button.className='btn ghost';button.dataset.adminArchiveToggle='1';button.textContent='Archiv anzeigen';button.style.marginLeft='12px';
    head.appendChild(button);
  }

  async function decorate(){
    if(busy||!document.getElementById('tatnera-admin'))return;
    const api=await db();if(!api)return;
    busy=true;
    try{
      const [sRes,rRes]=await Promise.all([
        api.from('feedback_suggestions').select('id,title,status,reward_months,reward_approved_at,archived_at'),
        api.from('referrals').select('id,status,reward_months,rewarded_at')
      ]);
      if(sRes.error||rRes.error)return;
      const suggestions=new Map((sRes.data||[]).map(x=>[x.id,x]));
      const referrals=new Map((rRes.data||[]).map(x=>[x.id,x]));

      ensureArchiveToggle();

      document.querySelectorAll('#tatneraAdminSupport tbody tr').forEach(row=>{
        const select=row.querySelector('[data-support-status]');if(!select)return;
        const item=suggestions.get(select.dataset.supportStatus);if(!item)return;
        const archived=!!item.archived_at;
        row.style.display=(showArchive?archived:!archived)?'':'none';
        let action=row.querySelector('[data-admin-support-action]');
        if(!action){action=document.createElement('button');action.type='button';action.className='btn ghost';action.dataset.adminSupportAction='1';action.style.marginLeft='8px';select.insertAdjacentElement('afterend',action);}
        if(archived){action.textContent='Wiederherstellen';action.dataset.restoreSupport=item.id;delete action.dataset.archiveSupport;}
        else if(item.status==='umgesetzt'){action.textContent='Archivieren';action.dataset.archiveSupport=item.id;delete action.dataset.restoreSupport;action.style.display='inline-flex';}
        else{action.style.display='none';}
      });

      document.querySelectorAll('#tatneraAdminSuggestions tbody tr').forEach(row=>{
        const select=row.querySelector('[data-suggestion-status]');if(!select)return;
        const item=suggestions.get(select.dataset.suggestionStatus);if(!item||isSupport(item)){row.remove();return;}
        const bonus=row.lastElementChild;if(!bonus)return;
        if(item.reward_approved_at){bonus.innerHTML=`<strong>${Number(item.reward_months)||1} Monat${(Number(item.reward_months)||1)===1?'':'e'}</strong><br><small>bestätigt ${esc(fmt(item.reward_approved_at))}</small>`;}
        else if(item.status==='umgesetzt'){bonus.innerHTML=`<button type="button" class="btn primary" data-confirm-suggestion="${esc(item.id)}">Bonus bestätigen</button>`;}
        else{bonus.textContent='–';}
      });

      document.querySelectorAll('#tatneraAdminReferrals tbody tr').forEach(row=>{
        const select=row.querySelector('[data-referral-status]');if(!select)return;
        const item=referrals.get(select.dataset.referralStatus);if(!item)return;
        const belohnt=select.querySelector('option[value="belohnt"]');
        if(belohnt&&!item.rewarded_at)belohnt.remove();
        if(item.rewarded_at)select.disabled=true;
        const bonus=row.lastElementChild;if(!bonus)return;
        if(item.rewarded_at){bonus.innerHTML=`<strong>${Number(item.reward_months)||2} Monate</strong><br><small>bestätigt ${esc(fmt(item.rewarded_at))}</small>`;}
        else if(item.status==='zahlend'){bonus.innerHTML=`<button type="button" class="btn primary" data-confirm-referral="${esc(item.id)}">Bonus bestätigen</button>`;}
        else{bonus.textContent='–';}
      });
    }finally{busy=false;}
  }

  document.addEventListener('click',async event=>{
    const toggle=event.target.closest('[data-admin-archive-toggle]');
    if(toggle){showArchive=!showArchive;toggle.textContent=showArchive?'Aktive anzeigen':'Archiv anzeigen';decorate();return;}

    const suggestion=event.target.closest('[data-confirm-suggestion]');
    if(suggestion){
      if(!confirm('1 Gratismonat für diesen umgesetzten Verbesserungsvorschlag gutschreiben?'))return;
      suggestion.disabled=true;const api=await db();const {error}=await api.rpc('approve_suggestion_reward',{p_suggestion_id:suggestion.dataset.confirmSuggestion});
      suggestion.disabled=false;if(error){alert('Bonus konnte nicht gutgeschrieben werden.');console.warn(error);return;}
      document.getElementById('tatneraAdminRefresh')?.click();setTimeout(decorate,250);return;
    }

    const referral=event.target.closest('[data-confirm-referral]');
    if(referral){
      if(!confirm('Empfehlungsbonus jetzt gutschreiben?'))return;
      referral.disabled=true;const api=await db();const {error}=await api.rpc('approve_referral_reward',{p_referral_id:referral.dataset.confirmReferral});
      referral.disabled=false;if(error){alert('Empfehlungsbonus konnte nicht gutgeschrieben werden.');console.warn(error);return;}
      document.getElementById('tatneraAdminRefresh')?.click();setTimeout(decorate,250);return;
    }

    const archive=event.target.closest('[data-archive-support]');
    if(archive){
      const api=await db();archive.disabled=true;const {error}=await api.from('feedback_suggestions').update({archived_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',archive.dataset.archiveSupport).eq('status','umgesetzt');archive.disabled=false;
      if(error){alert('Anfrage konnte nicht archiviert werden.');console.warn(error);return;}decorate();return;
    }

    const restore=event.target.closest('[data-restore-support]');
    if(restore){
      const api=await db();restore.disabled=true;const {error}=await api.from('feedback_suggestions').update({archived_at:null,updated_at:new Date().toISOString()}).eq('id',restore.dataset.restoreSupport);restore.disabled=false;
      if(error){alert('Anfrage konnte nicht wiederhergestellt werden.');console.warn(error);return;}decorate();
    }
  });

  const observer=new MutationObserver(()=>setTimeout(decorate,80));
  observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('tatnera:auth-ready',()=>setTimeout(decorate,300));
  document.addEventListener('tatnera:runtime-refresh',()=>setTimeout(decorate,150));
  setTimeout(decorate,500);
})();
