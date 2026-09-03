/* TATNERA — navigation persistence
   Restores the last open main view or customer/project record after a page reload. */
(function(){
  'use strict';

  const KEY='tatnera_navigation_v1';
  const VIEWS=new Set(['dashboard','calendar','customers','projects','requests','invoices','settings','customer-detail','project-detail']);
  const Core=window.TatneraCore;

  function read(){
    try{
      const value=JSON.parse(localStorage.getItem(KEY)||'null');
      return value&&typeof value==='object'?value:{};
    }catch(_error){return {};}
  }

  function write(next){
    try{localStorage.setItem(KEY,JSON.stringify(next));}catch(_error){}
  }

  function rememberView(view){
    if(!VIEWS.has(view))return;
    const previous=read(),next={view};
    if(view==='project-detail'&&previous.projectId)next.projectId=previous.projectId;
    if(view==='customer-detail'&&previous.customerId)next.customerId=previous.customerId;
    write(next);
  }

  const previousNavigate=window.navigate;
  if(typeof previousNavigate==='function'){
    window.navigate=function(view){
      rememberView(view);
      return previousNavigate.apply(this,arguments);
    };
  }

  document.addEventListener('tatnera:project-opened',event=>{
    const projectId=String(event.detail?.projectId||'');
    if(projectId)write({view:'project-detail',projectId});
  });

  document.addEventListener('tatnera:customer-opened',event=>{
    const customerId=String(event.detail?.customerId||'');
    if(customerId)write({view:'customer-detail',customerId});
  });

  document.addEventListener('click',event=>{
    const direct=event.target.closest('[data-view]');
    if(direct?.dataset.view)rememberView(direct.dataset.view);
    const target=event.target.closest('[data-view-target]');
    if(target?.dataset.viewTarget)rememberView(target.dataset.viewTarget);
  },true);

  function restore(){
    const saved=read(),view=saved.view;
    if(!VIEWS.has(view))return;

    if(view==='project-detail'){
      if(saved.projectId&&Core?.getProject?.(saved.projectId)&&typeof window.openProject==='function'){
        window.openProject(saved.projectId);return;
      }
      write({view:'projects'});window.navigate?.('projects');return;
    }

    if(view==='customer-detail'){
      if(saved.customerId&&Core?.getCustomer?.(saved.customerId)&&typeof window.openCustomer==='function'){
        window.openCustomer(saved.customerId);return;
      }
      write({view:'customers'});window.navigate?.('customers');return;
    }

    if(document.getElementById(view)&&typeof window.navigate==='function')window.navigate(view);
  }

  // Run after all remaining static scripts (especially the project-tab controller) have initialized.
  setTimeout(restore,0);
})();
