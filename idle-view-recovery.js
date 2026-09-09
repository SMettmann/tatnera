/* TATNERA — recover the visible view after a long-idle/background tab */
(function(){
  'use strict';
  if(window.__tatneraIdleViewRecoveryInstalled)return;
  window.__tatneraIdleViewRecoveryInstalled=true;

  const NAV_KEY='tatnera_navigation_v1';
  let hiddenAt=0,recoverTimer=null,recovering=false;

  function savedRoute(){
    try{
      const raw=localStorage.getItem(NAV_KEY);
      const parsed=raw?JSON.parse(raw):null;
      if(parsed&&parsed.view)return parsed;
    }catch(_error){}
    return history.state?.route||null;
  }

  function visibleView(){
    return [...document.querySelectorAll('.main .view')].find(view=>view.classList.contains('active-view')&&getComputedStyle(view).display!=='none');
  }

  function openRoute(route){
    if(route?.view==='project-detail'&&route.projectId&&typeof window.openProject==='function'){
      window.openProject(route.projectId);
      setTimeout(()=>window.TatneraCore?.activateProjectTab?.(route.tab||'overview',{emit:false}),0);
      return true;
    }
    if(route?.view==='customer-detail'&&route.customerId&&typeof window.openCustomer==='function'){
      window.openCustomer(route.customerId);return true;
    }
    const target=route?.view||'dashboard';
    if(document.getElementById(target)&&typeof window.navigate==='function'){
      window.navigate(target);return true;
    }
    return false;
  }

  async function recover(){
    if(recovering||document.hidden||document.body.classList.contains('tatnera-auth-locked'))return;
    recovering=true;
    try{
      /* Give auth/realtime listeners a moment to finish their own wake-up work first. */
      await new Promise(resolve=>setTimeout(resolve,180));
      if(document.hidden||document.body.classList.contains('tatnera-auth-locked'))return;

      const current=visibleView();
      if(current)return;

      const route=savedRoute();
      if(!openRoute(route))openRoute({view:'dashboard'});

      /* Some runtime refreshes run just after visibilitychange. Verify once more. */
      await new Promise(resolve=>setTimeout(resolve,260));
      if(!visibleView()&&!document.body.classList.contains('tatnera-auth-locked'))openRoute({view:'dashboard'});
    }catch(error){
      console.warn('TATNERA Ansicht konnte nach Inaktivität nicht wiederhergestellt werden.',error);
      try{openRoute({view:'dashboard'});}catch(_error){}
    }finally{recovering=false;}
  }

  function scheduleRecovery(delay=80){
    clearTimeout(recoverTimer);recoverTimer=setTimeout(recover,delay);
  }

  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){hiddenAt=Date.now();return;}
    /* Always validate on return; background tabs may have suspended timers/network. */
    scheduleRecovery(hiddenAt&&Date.now()-hiddenAt>15000?120:40);
  });
  window.addEventListener('pageshow',()=>scheduleRecovery(80));
  window.addEventListener('focus',()=>scheduleRecovery(120));
  document.addEventListener('tatnera:auth-ready',()=>scheduleRecovery(180));
  document.addEventListener('tatnera:runtime-refresh',()=>scheduleRecovery(220));
})();
