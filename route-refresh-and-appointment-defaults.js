/* TATNERA — preserve active route on reload + confirmed default for record scheduling */
(function(){
  'use strict';

  const RELOAD_ROUTE_KEY='tatnera_reload_route_v2';

  function decode(value){try{return decodeURIComponent(value||'');}catch(_error){return value||'';}}

  function routeFromLocation(){
    const hash=String(location.hash||'').replace(/^#/,'');
    if(!hash)return null;
    const parts=hash.split('/').map(decode);
    if(parts[0]==='tattoo'&&parts[1])return {view:'project-detail',projectId:parts[1],tab:parts[2]||'overview'};
    if(parts[0]==='kunde'&&parts[1])return {view:'customer-detail',customerId:parts[1]};
    const known=new Set(['dashboard','customers','projects','calendar','requests','invoices','settings','tatnera-admin']);
    if(known.has(parts[0]))return {view:parts[0]};
    return null;
  }

  function routeFromDom(){
    const active=[...document.querySelectorAll('.main .view.active-view')].find(view=>getComputedStyle(view).display!=='none');
    if(!active?.id)return null;
    const route={view:active.id};
    if(route.view==='project-detail'){
      route.projectId=document.getElementById('projectDetail')?.dataset.projectId||'';
      route.tab=document.querySelector('#projectDetail [data-project-tab].active')?.dataset.projectTab||'overview';
      if(!route.projectId)return null;
    }
    if(route.view==='customer-detail'){
      route.customerId=document.getElementById('customerDetail')?.dataset.customerId||'';
      if(!route.customerId)return null;
    }
    return route;
  }

  function rememberCurrentRoute(){
    const route=routeFromDom();
    if(!route)return;
    try{sessionStorage.setItem(RELOAD_ROUTE_KEY,JSON.stringify(route));}catch(_error){}
  }

  function rememberedRoute(){
    try{
      const value=JSON.parse(sessionStorage.getItem(RELOAD_ROUTE_KEY)||'null');
      return value?.view?value:null;
    }catch(_error){return null;}
  }

  function isReload(){
    try{return performance.getEntriesByType('navigation')[0]?.type==='reload';}catch(_error){return false;}
  }

  function routeUrl(route){
    if(route?.view==='project-detail'&&route.projectId)return `#tattoo/${encodeURIComponent(route.projectId)}/${encodeURIComponent(route.tab||'overview')}`;
    if(route?.view==='customer-detail'&&route.customerId)return `#kunde/${encodeURIComponent(route.customerId)}`;
    return `#${encodeURIComponent(route?.view||'dashboard')}`;
  }

  function syncHistory(route){
    if(!route?.view)return;
    try{history.replaceState({tatnera:true,route},'',routeUrl(route));}catch(_error){}
  }

  function openRoute(route){
    if(!route?.view)return false;
    try{
      if(route.view==='project-detail'&&route.projectId&&typeof window.openProject==='function'){
        window.openProject(route.projectId);
        setTimeout(()=>window.TatneraCore?.activateProjectTab?.(route.tab||'overview',{emit:false}),0);
        syncHistory(route);
        return true;
      }
      if(route.view==='customer-detail'&&route.customerId&&typeof window.openCustomer==='function'){
        window.openCustomer(route.customerId);
        syncHistory(route);
        return true;
      }
      if(document.getElementById(route.view)&&typeof window.navigate==='function'){
        window.navigate(route.view);
        syncHistory(route);
        return true;
      }
    }catch(error){console.warn('TATNERA Route konnte nach Reload nicht wiederhergestellt werden',error);}
    return false;
  }

  function restoreRoute(){
    /* On F5 the view that was really visible wins. This prevents a stale admin
       history/hash entry from pulling the user back into the admin area. */
    const route=(isReload()?rememberedRoute():null)||routeFromLocation()||history.state?.route||null;
    if(!route)return;

    if(openRoute(route))return;

    /* The internal admin view is created only after the auth/admin check. If the
       user really refreshed while being there, wait for that view instead of
       changing to another page. */
    if(route.view==='tatnera-admin'){
      let attempts=0;
      const retry=()=>{
        if(openRoute(route))return;
        if(++attempts<20)setTimeout(retry,100);
        else openRoute({view:'dashboard'});
      };
      setTimeout(retry,100);
    }
  }

  function forceConfirmedForRecordScheduling(target){
    const fromRecord=target?.closest?.('[data-project-schedule],[data-customer-schedule]');
    if(!fromRecord)return;
    queueMicrotask(()=>{
      const form=document.getElementById('appointmentForm');
      if(form?.elements?.status)form.elements.status.value='Bestätigt';
    });
  }

  function cloneCommunication(value){
    if(!value||typeof value!=='object')return null;
    try{return structuredClone(value);}catch(_error){
      try{return JSON.parse(JSON.stringify(value));}catch(_error2){return {...value};}
    }
  }

  function preserveCommunicationOnSave(event){
    const form=event.target;
    if(!(form instanceof HTMLFormElement)||form.id!=='appointmentForm')return;
    const eventId=form.elements?.eventId?.value||'';
    if(!eventId)return;
    const existing=(window.state?.calendarEvents||state.calendarEvents||[]).find(item=>item.id===eventId);
    const communication=cloneCommunication(existing?.communication);
    if(!communication)return;

    setTimeout(()=>{
      const events=window.state?.calendarEvents||state.calendarEvents||[];
      const saved=events.find(item=>item.id===eventId);
      if(!saved)return;
      saved.communication=communication;
      try{persist();}catch(_error){}
      document.dispatchEvent(new CustomEvent('tatnera:data-changed',{detail:{type:'appointment-communication-preserved',eventId,projectId:saved.projectId||'',customerId:saved.customerId||''}}));
    },0);
  }

  document.addEventListener('click',event=>{
    forceConfirmedForRecordScheduling(event.target);
    setTimeout(rememberCurrentRoute,0);
  },true);
  document.addEventListener('submit',preserveCommunicationOnSave,true);
  document.addEventListener('tatnera:project-opened',()=>setTimeout(rememberCurrentRoute,0));
  document.addEventListener('tatnera:customer-opened',()=>setTimeout(rememberCurrentRoute,0));
  document.addEventListener('tatnera:project-tab',()=>setTimeout(rememberCurrentRoute,0));
  document.addEventListener('tatnera:admin-open',()=>setTimeout(rememberCurrentRoute,0));
  window.addEventListener('pagehide',rememberCurrentRoute);
  window.addEventListener('beforeunload',rememberCurrentRoute);

  /* Runtime starts on dashboard before it reads the existing URL. Restore the URL route
     once all runtime wrappers are installed, so F5 stays exactly where the user was. */
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(restoreRoute,0),{once:true});
  else setTimeout(restoreRoute,0);
})();
