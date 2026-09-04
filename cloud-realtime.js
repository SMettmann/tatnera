/* TATNERA — realtime multi-device synchronisation
   Refreshes the app when another signed-in studio device changes shared data.
   Open forms are protected from surprise reloads until the user leaves them. */
(function(){
  'use strict';
  if(window.__tatneraRealtimeSyncInstalled)return;
  window.__tatneraRealtimeSyncInstalled=true;

  let channel=null,client=null,studioId='',userId='',pending=false,reloadTimer=null;

  function actor(payload){
    return payload?.new?.updated_by||payload?.old?.updated_by||payload?.new?.created_by||payload?.old?.created_by||'';
  }
  function unsafeToReload(){
    if(document.querySelector('dialog[open]'))return true;
    const active=document.activeElement;
    return Boolean(active&&active!==document.body&&active.matches?.('input,textarea,select,[contenteditable="true"]'));
  }
  function ensureNotice(){
    let node=document.getElementById('tatneraRealtimeNotice');
    if(node)return node;
    node=document.createElement('div');node.id='tatneraRealtimeNotice';
    node.style.cssText='position:fixed;right:16px;bottom:16px;z-index:99999;max-width:360px;padding:12px 14px;border-radius:12px;background:#202822;color:#fff;font:700 13px/1.4 inherit;box-shadow:0 12px 35px rgba(0,0,0,.22);display:none';
    node.textContent='Änderungen von einem anderen Gerät erkannt. TATNERA aktualisiert, sobald das offene Formular geschlossen ist.';
    document.body.appendChild(node);return node;
  }
  function hideNotice(){const node=document.getElementById('tatneraRealtimeNotice');if(node)node.style.display='none';}

  function tryReload(){
    if(!pending)return;
    if(unsafeToReload()){
      ensureNotice().style.display='block';
      clearTimeout(reloadTimer);reloadTimer=setTimeout(tryReload,900);
      return;
    }
    pending=false;hideNotice();
    location.reload();
  }
  function scheduleReload(payload){
    const changedBy=actor(payload);
    if(changedBy&&changedBy===userId)return;
    pending=true;
    clearTimeout(reloadTimer);reloadTimer=setTimeout(tryReload,350);
  }

  function subscribe(event){
    client=window.TatneraAuth?.client||null;
    studioId=event.detail?.studioId||window.TatneraAuth?.studioId?.()||'';
    userId=event.detail?.userId||window.TatneraAuth?.user?.()?.id||'';
    if(!client||!studioId||!userId)return;
    if(channel){try{client.removeChannel(channel);}catch(_error){}}

    channel=client.channel(`tatnera-studio-live-${studioId}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'customers',filter:`studio_id=eq.${studioId}`},scheduleReload)
      .on('postgres_changes',{event:'*',schema:'public',table:'tattoo_projects',filter:`studio_id=eq.${studioId}`},scheduleReload)
      .on('postgres_changes',{event:'*',schema:'public',table:'appointments',filter:`studio_id=eq.${studioId}`},scheduleReload)
      .on('postgres_changes',{event:'*',schema:'public',table:'studio_state',filter:`studio_id=eq.${studioId}`},scheduleReload)
      .on('postgres_changes',{event:'*',schema:'public',table:'studio_members',filter:`studio_id=eq.${studioId}`},scheduleReload)
      .on('postgres_changes',{event:'*',schema:'public',table:'studios',filter:`id=eq.${studioId}`},scheduleReload)
      .subscribe(status=>{
        if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')console.warn('TATNERA Realtime:',status);
      });
  }

  document.addEventListener('tatnera:auth-ready',subscribe);
  document.addEventListener('close',()=>{if(pending)setTimeout(tryReload,50);},true);
  document.addEventListener('focusout',()=>{if(pending)setTimeout(tryReload,150);},true);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&pending)setTimeout(tryReload,100);});
  window.addEventListener('beforeunload',()=>{if(channel&&client){try{client.removeChannel(channel);}catch(_error){}}});
})();
