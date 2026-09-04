/* TATNERA — local tenant guard
   Prevents browser-local MVP data from being reused by a different studio. */
(function(){
  'use strict';
  if(window.__tatneraTenantLocalGuardInstalled)return;
  window.__tatneraTenantLocalGuardInstalled=true;

  const MARKER='tatnera_last_cloud_studio_v2';
  const SWITCH_RELOAD='tatnera_tenant_switch_reload_v2';
  const MANAGER_ONLY=new Set(['tatnera_studio_profile_v1','tatnera_invoices_v1','tatnera_archive_v1']);
  const MANAGED=[
    'tatnera_customers','tatnera_projects','tatnera_calendar',
    'tatnera_artists','tatnera_requests','tatnera_studio_profile_v1',
    'tatnera_invoices_v1','tatnera_sessions_v1','tatnera_archive_v1',
    'tatnera_appointment_history','tatnera_inks'
  ];

  function clearKeys(keys){
    for(const key of keys){
      try{localStorage.removeItem(key);}catch(_error){}
    }
  }

  function onAuthReady(event){
    const studioId=event.detail?.studioId||window.TatneraAuth?.studioId?.()||'';
    const role=event.detail?.role||window.TatneraAuth?.membership?.()?.role||'';
    if(!studioId)return;

    const previous=localStorage.getItem(MARKER)||'';
    const isManager=['owner','admin'].includes(role);

    if(previous&&previous!==studioId){
      clearKeys(MANAGED);
      localStorage.setItem(MARKER,studioId);
      const reloadKey=`${studioId}`;
      if(sessionStorage.getItem(SWITCH_RELOAD)!==reloadKey){
        sessionStorage.setItem(SWITCH_RELOAD,reloadKey);
        setTimeout(()=>location.reload(),0);
        return;
      }
    }

    if(!isManager)clearKeys([...MANAGER_ONLY]);
  }

  function markReady(event){
    const studioId=event.detail?.studioId||window.TatneraAuth?.studioId?.()||'';
    if(!studioId)return;
    localStorage.setItem(MARKER,studioId);
    sessionStorage.removeItem(SWITCH_RELOAD);
  }

  document.addEventListener('tatnera:auth-ready',onAuthReady);
  document.addEventListener('tatnera:cloud-ready',markReady);
  document.addEventListener('tatnera:studio-state-ready',markReady);
})();
