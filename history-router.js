/* TATNERA — internal browser history / back-button routing */
(function(){
  'use strict';

  const KEY='tatneraRoute';
  let installed=false;
  let restoring=false;
  let suspendPush=0;
  let lastRouteKey='';

  const routeKey=route=>JSON.stringify(route||{});
  const activeProjectTab=()=>document.querySelector('#projectDetail .project-tab-btn.active[data-project-tab]')?.dataset.projectTab||'overview';

  function currentRoute(){
    const view=state?.currentView||'dashboard';
    const route={view};
    if(view==='project-detail'){
      route.projectId=document.getElementById('projectDetail')?.dataset.projectId||'';
      route.tab=activeProjectTab();
    }
    if(view==='customer-detail'){
      route.customerId=document.getElementById('customerDetail')?.dataset.customerId||'';
    }
    if(view==='calendar'&&state?.calendar){
      route.calendar={view:state.calendar.view,anchor:state.calendar.anchor,artist:state.calendar.artist};
    }
    return route;
  }

  function urlFor(route){
    if(!route)return '#dashboard';
    if(route.view==='project-detail'&&route.projectId)return `#tattoo/${encodeURIComponent(route.projectId)}/${encodeURIComponent(route.tab||'overview')}`;
    if(route.view==='customer-detail'&&route.customerId)return `#kunde/${encodeURIComponent(route.customerId)}`;
    return `#${encodeURIComponent(route.view||'dashboard')}`;
  }

  function pushRoute(route,replace=false){
    if(restoring||suspendPush)return;
    const key=routeKey(route);if(!replace&&key===lastRouteKey)return;
    const payload={tatnera:true,[KEY]:route};
    if(replace)history.replaceState(payload,'',urlFor(route));
    else history.pushState(payload,'',urlFor(route));
    lastRouteKey=key;
  }

  function ensureCustomerDataset(id){
    const root=document.getElementById('customerDetail');if(root)root.dataset.customerId=id||'';
  }

  function restoreRoute(route){
    if(!route)return;
    restoring=true;
    try{
      if(route.view==='project-detail'&&route.projectId){
        openProject(route.projectId);
        if(route.tab){
          setTimeout(()=>{
            document.querySelector(`#projectDetail .project-tab-btn[data-project-tab="${CSS.escape(route.tab)}"]`)?.click();
            restoring=false;
          },30);
          lastRouteKey=routeKey(route);
          return;
        }
      }else if(route.view==='customer-detail'&&route.customerId){
        openCustomer(route.customerId);ensureCustomerDataset(route.customerId);
      }else{
        if(route.view==='calendar'&&route.calendar&&state?.calendar){
          state.calendar.view=route.calendar.view||state.calendar.view;
          state.calendar.anchor=route.calendar.anchor||state.calendar.anchor;
          state.calendar.artist=route.calendar.artist||state.calendar.artist;
        }
        navigate(route.view||'dashboard');
      }
      lastRouteKey=routeKey(route);
    }finally{
      if(!(route.view==='project-detail'&&route.projectId&&route.tab))restoring=false;
    }
  }

  function seedHistory(){
    const route=currentRoute();
    if(history.state?.tatnera&&history.state?.[KEY]){
      lastRouteKey=routeKey(history.state[KEY]);
      return;
    }
    // Guard entry keeps an accidental Back on the first TATNERA screen inside the app.
    history.replaceState({tatneraGuard:true},'',location.pathname+location.search);
    history.pushState({tatnera:true,[KEY]:route},'',urlFor(route));
    lastRouteKey=routeKey(route);
  }

  function wrapNavigation(){
    const originalNavigate=navigate;
    navigate=function(view){
      originalNavigate(view);
      if(!restoring&&!suspendPush)queueMicrotask(()=>pushRoute(currentRoute()));
    };

    const originalOpenCustomer=openCustomer;
    openCustomer=function(id){
      suspendPush++;
      try{originalOpenCustomer(id);ensureCustomerDataset(id);}finally{suspendPush--;}
      if(!restoring)queueMicrotask(()=>pushRoute({view:'customer-detail',customerId:id}));
    };

    const originalOpenProject=openProject;
    openProject=function(id){
      suspendPush++;
      try{originalOpenProject(id);}finally{suspendPush--;}
      if(!restoring)queueMicrotask(()=>pushRoute({view:'project-detail',projectId:id,tab:activeProjectTab()}));
    };
  }

  function installListeners(){
    // Our own back buttons should behave exactly like the browser Back button.
    document.addEventListener('click',event=>{
      const back=event.target.closest?.('.back-btn');
      if(back){event.preventDefault();event.stopImmediatePropagation();history.back();return;}
    },true);

    // Each project tab is a meaningful internal step.
    document.addEventListener('click',event=>{
      const tab=event.target.closest?.('#projectDetail .project-tab-btn[data-project-tab]');
      if(!tab||restoring)return;
      setTimeout(()=>{
        const id=document.getElementById('projectDetail')?.dataset.projectId;
        if(id)pushRoute({view:'project-detail',projectId:id,tab:tab.dataset.projectTab});
      },0);
    });

    // Calendar controls update the current calendar entry instead of creating dozens of Back steps.
    document.addEventListener('click',event=>{
      if(!event.target.closest?.('#calendar button'))return;
      setTimeout(()=>{if(state.currentView==='calendar')pushRoute(currentRoute(),true);},0);
    });
    document.addEventListener('change',event=>{
      if(!event.target.closest?.('#calendar'))return;
      setTimeout(()=>{if(state.currentView==='calendar')pushRoute(currentRoute(),true);},0);
    });

    window.addEventListener('popstate',event=>{
      const data=event.state;
      if(data?.tatnera&&data[KEY]){restoreRoute(data[KEY]);return;}
      if(data?.tatneraGuard){
        const route={view:'dashboard'};
        history.pushState({tatnera:true,[KEY]:route},'',urlFor(route));
        lastRouteKey=routeKey(route);
        restoreRoute(route);
      }
    });
  }

  function install(){
    if(installed)return;installed=true;
    wrapNavigation();
    installListeners();
    seedHistory();
  }

  // Important: wait until all dynamically added TATNERA modules have finished wrapping navigation.
  if(document.readyState==='complete')install();
  else window.addEventListener('load',install,{once:true});
})();
