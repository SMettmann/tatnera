/* TATNERA — load heavy admin modules only when the admin area is actually opened */
(function(){
  'use strict';
  if(window.__tatneraAdminLazyLoaderInstalled)return;
  window.__tatneraAdminLazyLoaderInstalled=true;

  let loading=null,loaded=false;
  const load=src=>new Promise((resolve,reject)=>{
    if(document.querySelector(`script[src^="${src.split('?')[0]}"]`)){resolve();return;}
    const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=reject;document.head.appendChild(script);
  });

  function notifyOpen(){document.dispatchEvent(new CustomEvent('tatnera:admin-open'));}
  function loadAdminExtras(){
    if(loaded){notifyOpen();return Promise.resolve();}
    if(loading)return loading.then(notifyOpen);
    loading=Promise.all([
      load('tatnera-admin-controls.js?v=20260909-3'),
      load('tatnera-admin-studios.js?v=20260909-2')
    ]).then(()=>{loaded=true;notifyOpen();}).catch(error=>{console.warn('TATNERA Admin-Erweiterungen konnten nicht geladen werden.',error);loading=null;});
    return loading;
  }

  document.addEventListener('click',event=>{
    if(event.target.closest('[data-view="tatnera-admin"], [data-mobile-more-admin]'))setTimeout(loadAdminExtras,0);
  },true);

  window.TatneraLoadAdminExtras=loadAdminExtras;
})();