/* TATNERA — early production cleanup + recovery capture */
(function(){
  'use strict';

  /* Run before app.js so legacy seed/demo content can never become the initial app state. */
  try{
    const DEMO_EMAILS=new Set(['lea@example.de','max@example.de','jonas@example.de','mia@example.de']);
    const DEMO_PROJECT_IDS=new Set(['p1','p2','p3']);
    const DEMO_EVENT_IDS=new Set(['e1','e2','e3','e4','e5','e6','e7']);
    const read=(key)=>{try{const value=JSON.parse(localStorage.getItem(key)||'null');return Array.isArray(value)?value:null}catch(_){return null}};
    const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));

    const customers=read('tatnera_customers');
    if(customers===null){
      write('tatnera_customers',[]);
    }else{
      const removedIds=new Set(customers.filter(c=>DEMO_EMAILS.has(String(c?.email||'').toLowerCase())).map(c=>String(c?.id||'')));
      const cleanCustomers=customers.filter(c=>!DEMO_EMAILS.has(String(c?.email||'').toLowerCase()));
      if(cleanCustomers.length!==customers.length)write('tatnera_customers',cleanCustomers);

      const projects=read('tatnera_projects');
      if(projects===null)write('tatnera_projects',[]);
      else{
        const cleanProjects=projects.filter(p=>!(DEMO_PROJECT_IDS.has(String(p?.id||''))&&removedIds.has(String(p?.customerId||''))));
        if(cleanProjects.length!==projects.length)write('tatnera_projects',cleanProjects);
      }
    }

    if(read('tatnera_projects')===null)write('tatnera_projects',[]);
    const events=read('tatnera_calendar');
    if(events===null)write('tatnera_calendar',[]);
    else{
      const cleanEvents=events.filter(e=>!DEMO_EVENT_IDS.has(String(e?.id||'')));
      if(cleanEvents.length!==events.length)write('tatnera_calendar',cleanEvents);
    }

    const style=document.createElement('style');
    style.id='tatneraEarlyProductionCleanup';
    style.textContent='#calendarDemoBtn,[data-demo],[data-test-only],.demo-only,.test-only{display:none!important}';
    document.head.appendChild(style);
  }catch(_error){}

  const KEYS={
    pending:'tatnera_password_recovery_v1',
    access:'tatnera_recovery_access_token_v1',
    refresh:'tatnera_recovery_refresh_token_v1',
    code:'tatnera_recovery_code_v1',
    tokenHash:'tatnera_recovery_token_hash_v1',
    type:'tatnera_recovery_type_v1'
  };
  try{
    const query=new URLSearchParams(location.search);
    const hash=new URLSearchParams(location.hash.replace(/^#/,''));
    const type=query.get('type')||hash.get('type')||'';
    const isRecovery=query.get('mode')==='recovery'||type==='recovery';
    if(!isRecovery)return;
    sessionStorage.setItem(KEYS.pending,'1');
    const access=hash.get('access_token')||query.get('access_token')||'';
    const refresh=hash.get('refresh_token')||query.get('refresh_token')||'';
    const code=query.get('code')||hash.get('code')||'';
    const tokenHash=query.get('token_hash')||hash.get('token_hash')||'';
    if(access)sessionStorage.setItem(KEYS.access,access);
    if(refresh)sessionStorage.setItem(KEYS.refresh,refresh);
    if(code)sessionStorage.setItem(KEYS.code,code);
    if(tokenHash)sessionStorage.setItem(KEYS.tokenHash,tokenHash);
    sessionStorage.setItem(KEYS.type,'recovery');
  }catch(_error){}
})();
