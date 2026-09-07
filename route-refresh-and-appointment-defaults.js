/* TATNERA — preserve active route on reload + confirmed default for record scheduling */
(function(){
  'use strict';

  function decode(value){try{return decodeURIComponent(value||'');}catch(_error){return value||'';}}

  function routeFromLocation(){
    const hash=String(location.hash||'').replace(/^#/,'');
    if(!hash)return null;
    const parts=hash.split('/').map(decode);
    if(parts[0]==='tattoo'&&parts[1])return {view:'project-detail',projectId:parts[1],tab:parts[2]||'overview'};
    if(parts[0]==='kunde'&&parts[1])return {view:'customer-detail',customerId:parts[1]};
    const known=new Set(['dashboard','customers','projects','calendar','requests','invoices','settings']);
    if(known.has(parts[0]))return {view:parts[0]};
    return null;
  }

  function restoreRoute(){
    const route=routeFromLocation()||history.state?.route||null;
    if(!route)return;
    try{
      if(route.view==='project-detail'&&route.projectId&&typeof window.openProject==='function'){
        window.openProject(route.projectId);
        setTimeout(()=>window.TatneraCore?.activateProjectTab?.(route.tab||'overview',{emit:false}),0);
        return;
      }
      if(route.view==='customer-detail'&&route.customerId&&typeof window.openCustomer==='function'){
        window.openCustomer(route.customerId);return;
      }
      if(route.view&&typeof window.navigate==='function')window.navigate(route.view);
    }catch(error){console.warn('TATNERA Route konnte nach Reload nicht wiederhergestellt werden',error);}
  }

  function forceConfirmedForRecordScheduling(target){
    const fromRecord=target?.closest?.('[data-project-schedule],[data-customer-schedule]');
    if(!fromRecord)return;
    queueMicrotask(()=>{
      const form=document.getElementById('appointmentForm');
      if(form?.elements?.status)form.elements.status.value='Bestätigt';
    });
  }

  document.addEventListener('click',event=>forceConfirmedForRecordScheduling(event.target),true);

  /* Runtime starts on dashboard before it reads the existing URL. Restore the URL route
     once all runtime wrappers are installed, so F5 stays exactly where the user was. */
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(restoreRoute,0),{once:true});
  else setTimeout(restoreRoute,0);
})();