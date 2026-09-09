/* TATNERA — load heavy admin modules only when the admin area is actually opened */
(function(){
  'use strict';
  if(window.__tatneraAdminLazyLoaderInstalled)return;
  window.__tatneraAdminLazyLoaderInstalled=true;

  let loading=null;
  const load=src=>new Promise((resolve,reject)=>{
    if(document.querySelector(`script[src^="${src.split('?')[0]}"]`)){resolve();return;}
    const script=document.createElement('script');
    script.src=src;script.defer=true;
    script.onload=resolve;script.onerror=reject;
    document.head.appendChild(script);
  });

  function loadAdminExtras(){
    if(loading)return loading;
    loading=load('tatnera-admin-controls.js?v=20260909-2')
      .then(()=>load('tatnera-admin-studios.js?v=20260909-1'))
      .catch(error=>{console.warn('TATNERA Admin-Erweiterungen konnten nicht geladen werden.',error);loading=null;});
    return loading;
  }

  document.addEventListener('click',event=>{
    if(event.target.closest('[data-view="tatnera-admin"], [data-mobile-more-admin]'))loadAdminExtras();
  },true);

  window.TatneraLoadAdminExtras=loadAdminExtras;
})();
