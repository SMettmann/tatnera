/* TATNERA — production release cleanup
   Removes old development/demo artefacts without touching real studio data. */
(function(){
  'use strict';
  if(window.__tatneraReleaseCleanupInstalled)return;
  window.__tatneraReleaseCleanupInstalled=true;

  const DEMO_CUSTOMERS=new Set(['lea@example.de','max@example.de','jonas@example.de','mia@example.de']);
  const DEMO_PROJECT_IDS=new Set(['p1','p2','p3']);
  const DEMO_EVENT_IDS=new Set(['e1','e2','e3','e4','e5','e6','e7']);

  function safeArray(key){
    try{
      const parsed=JSON.parse(localStorage.getItem(key)||'[]');
      return Array.isArray(parsed)?parsed:[];
    }catch(_){return [];}
  }

  function write(key,value){
    try{localStorage.setItem(key,JSON.stringify(value));}catch(_){ }
  }

  function cleanLegacySeedData(){
    const customers=safeArray('tatnera_customers');
    const removedCustomerIds=new Set(customers.filter(c=>DEMO_CUSTOMERS.has(String(c?.email||'').toLowerCase())).map(c=>String(c.id||'')));
    const cleanCustomers=customers.filter(c=>!DEMO_CUSTOMERS.has(String(c?.email||'').toLowerCase()));
    if(cleanCustomers.length!==customers.length)write('tatnera_customers',cleanCustomers);

    const projects=safeArray('tatnera_projects');
    const cleanProjects=projects.filter(p=>!(DEMO_PROJECT_IDS.has(String(p?.id||''))&&removedCustomerIds.has(String(p?.customerId||''))));
    if(cleanProjects.length!==projects.length)write('tatnera_projects',cleanProjects);

    const events=safeArray('tatnera_calendar');
    const cleanEvents=events.filter(e=>!DEMO_EVENT_IDS.has(String(e?.id||'')));
    if(cleanEvents.length!==events.length)write('tatnera_calendar',cleanEvents);

    try{
      if(typeof state==='object'&&state){
        if(Array.isArray(state.customers))state.customers=state.customers.filter(c=>!DEMO_CUSTOMERS.has(String(c?.email||'').toLowerCase()));
        if(Array.isArray(state.projects))state.projects=state.projects.filter(p=>!(DEMO_PROJECT_IDS.has(String(p?.id||''))&&removedCustomerIds.has(String(p?.customerId||''))));
        if(Array.isArray(state.calendarEvents))state.calendarEvents=state.calendarEvents.filter(e=>!DEMO_EVENT_IDS.has(String(e?.id||'')));
      }
    }catch(_){ }
  }

  function removeVisibleDevUi(){
    document.getElementById('calendarDemoBtn')?.remove();
    document.querySelectorAll('[data-demo],[data-test-only],.demo-only,.test-only').forEach(el=>el.remove());

    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    const nodes=[];
    while(walker.nextNode()){
      const n=walker.currentNode;
      if(/\b(demo[- ]?termin|testdaten|testzugang|platzhalter)\b/i.test(n.nodeValue||''))nodes.push(n);
    }
    nodes.forEach(n=>{
      const parent=n.parentElement;
      if(parent&&parent.closest('button,a,.placeholder-page'))parent.remove();
    });
  }

  function run(){
    cleanLegacySeedData();
    removeVisibleDevUi();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});
  else run();
  document.addEventListener('tatnera:auth-ready',run);
})();
