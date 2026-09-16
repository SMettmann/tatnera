/* TATNERA — realtime multi-device synchronisation
   Pulls fresh cloud data into the open app without reloading the website.
   Open forms are protected so remote changes never interrupt an active input. */
(function(){
  'use strict';
  if(window.__tatneraRealtimeSyncInstalled)return;
  window.__tatneraRealtimeSyncInstalled=true;

  const CORE_TABLES=new Set(['customers','tattoo_projects','appointments']);
  let channel=null,client=null,studioId='',userId='',refreshTimer=null,refreshing=false;
  let localWriteUntil=0;
  const pendingTables=new Set();
  const pendingEvents=[];

  function actor(payload){
    return payload?.new?.updated_by||payload?.old?.updated_by||payload?.new?.created_by||payload?.old?.created_by||'';
  }
  function markLocalWrite(){
    /* Realtime echoes our own save back to this browser. Suppress the immediate
       echo only briefly. A second device using the same account still refreshes
       as long as this browser did not just write at the same moment. */
    localWriteUntil=Math.max(localWriteUntil,Date.now()+2500);
  }
  function unsafeToRefresh(){
    if(document.querySelector('dialog[open]'))return true;
    const active=document.activeElement;
    return Boolean(active&&active!==document.body&&active.matches?.('input,textarea,select,[contenteditable="true"]'));
  }
  function ensureNotice(){
    let node=document.getElementById('tatneraRealtimeNotice');
    if(node)return node;
    node=document.createElement('div');node.id='tatneraRealtimeNotice';
    node.style.cssText='position:fixed;right:16px;bottom:16px;z-index:99999;max-width:360px;padding:12px 14px;border-radius:12px;background:#202822;color:#fff;font:700 13px/1.4 inherit;box-shadow:0 12px 35px rgba(0,0,0,.22);display:none';
    node.textContent='Änderungen von einem anderen Gerät erkannt. Sie werden übernommen, sobald die offene Eingabe beendet ist.';
    document.body.appendChild(node);return node;
  }
  function hideNotice(){const node=document.getElementById('tatneraRealtimeNotice');if(node)node.style.display='none';}

  function roleLabel(role){
    return role==='owner'?'Inhaber':role==='admin'?'Admin':role==='staff'?'Mitarbeiter':'Tätowierer';
  }
  function applyAuthContextEvents(events){
    let changed=false;
    for(const entry of events){
      const row=entry.payload?.new||entry.payload?.old||null;
      if(!row)continue;
      if(entry.table==='studios'&&row.id===studioId){
        const studio=window.TatneraAuth?.studio?.();
        if(studio&&entry.payload?.new){Object.assign(studio,entry.payload.new);changed=true;}
      }
      if(entry.table==='studio_members'&&row.studio_id===studioId&&row.user_id===userId){
        const membership=window.TatneraAuth?.membership?.();
        if(membership&&entry.payload?.new){Object.assign(membership,entry.payload.new);changed=true;}
      }
    }
    if(!changed)return;
    const studio=window.TatneraAuth?.studio?.(),membership=window.TatneraAuth?.membership?.();
    const card=document.querySelector('.studio-card');
    const strong=card?.querySelector('strong'),span=card?.querySelector('span');
    if(strong&&studio?.name)strong.textContent=studio.name;
    if(span&&membership?.role)span.textContent=roleLabel(membership.role);
    document.dispatchEvent(new CustomEvent('tatnera:studio-context-refreshed',{detail:{studioId,userId,role:membership?.role||''}}));
  }

  function queueRetry(delay=700){
    clearTimeout(refreshTimer);refreshTimer=setTimeout(performRefresh,delay);
  }

  async function performRefresh(){
    if(!pendingTables.size)return;
    if(unsafeToRefresh()){
      ensureNotice().style.display='block';
      queueRetry(900);
      return;
    }
    if(refreshing){queueRetry(350);return;}

    const tables=[...pendingTables];
    const events=pendingEvents.splice(0,pendingEvents.length);
    pendingTables.clear();
    hideNotice();
    refreshing=true;

    try{
      let retryCore=false,retryState=false;
      if(tables.some(table=>CORE_TABLES.has(table))){
        const refresh=window.TatneraCloud?.refresh;
        if(typeof refresh==='function'){
          const ok=await refresh();
          if(ok===false)retryCore=true;
        }else retryCore=true;
      }

      if(tables.includes('studio_state')){
        const refreshState=window.TatneraStudioState?.refresh;
        if(typeof refreshState==='function'){
          const ok=await refreshState();
          if(ok===false)retryState=true;
        }else retryState=true;
      }

      if(tables.includes('studio_members')||tables.includes('studios'))applyAuthContextEvents(events);

      document.dispatchEvent(new CustomEvent('tatnera:remote-data-changed',{detail:{tables,studioId}}));

      if(retryCore)for(const table of tables)if(CORE_TABLES.has(table))pendingTables.add(table);
      if(retryState)pendingTables.add('studio_state');
    }catch(error){
      console.warn('TATNERA Realtime-Aktualisierung fehlgeschlagen',error);
      for(const table of tables)pendingTables.add(table);
    }finally{
      refreshing=false;
      if(pendingTables.size)queueRetry(700);
    }
  }

  function scheduleRefresh(table,payload){
    const changedBy=actor(payload);
    if(changedBy&&changedBy===userId&&Date.now()<localWriteUntil)return;
    pendingTables.add(table);
    pendingEvents.push({table,payload});
    clearTimeout(refreshTimer);refreshTimer=setTimeout(performRefresh,500);
  }

  function subscribe(event){
    client=window.TatneraAuth?.client||null;
    studioId=event.detail?.studioId||window.TatneraAuth?.studioId?.()||'';
    userId=event.detail?.userId||window.TatneraAuth?.user?.()?.id||'';
    if(!client||!studioId||!userId)return;
    if(channel){try{client.removeChannel(channel);}catch(_error){}}

    channel=client.channel(`tatnera-studio-live-${studioId}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'customers',filter:`studio_id=eq.${studioId}`},payload=>scheduleRefresh('customers',payload))
      .on('postgres_changes',{event:'*',schema:'public',table:'tattoo_projects',filter:`studio_id=eq.${studioId}`},payload=>scheduleRefresh('tattoo_projects',payload))
      .on('postgres_changes',{event:'*',schema:'public',table:'appointments',filter:`studio_id=eq.${studioId}`},payload=>scheduleRefresh('appointments',payload))
      .on('postgres_changes',{event:'*',schema:'public',table:'studio_state',filter:`studio_id=eq.${studioId}`},payload=>scheduleRefresh('studio_state',payload))
      .on('postgres_changes',{event:'*',schema:'public',table:'studio_members',filter:`studio_id=eq.${studioId}`},payload=>scheduleRefresh('studio_members',payload))
      .on('postgres_changes',{event:'*',schema:'public',table:'studios',filter:`id=eq.${studioId}`},payload=>scheduleRefresh('studios',payload))
      .subscribe(status=>{
        if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')console.warn('TATNERA Realtime:',status);
      });
  }

  document.addEventListener('tatnera:auth-ready',subscribe);
  document.addEventListener('tatnera:data-changed',markLocalWrite);
  document.addEventListener('tatnera:studio-changed',markLocalWrite);
  document.addEventListener('tatnera:studio-state-saved',markLocalWrite);
  document.addEventListener('close',()=>{if(pendingTables.size)setTimeout(performRefresh,50);},true);
  document.addEventListener('focusout',()=>{if(pendingTables.size)setTimeout(performRefresh,150);},true);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&pendingTables.size)setTimeout(performRefresh,100);});
  window.addEventListener('beforeunload',()=>{if(channel&&client){try{client.removeChannel(channel);}catch(_error){}}});
})();