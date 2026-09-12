/* TATNERA — keep team form controls stable during direct interaction */
(function(){
  'use strict';
  let protectUntil=0;
  let teamReadySeen=false;
  const isMobile=()=>window.matchMedia?.('(max-width: 820px)')?.matches||false;
  const protect=(ms=12000)=>{protectUntil=Math.max(protectUntil,Date.now()+ms);};
  const protectedNow=()=>Date.now()<protectUntil;
  const panelExists=()=>!!document.getElementById('studioTeamPanel');
  const isTeamControl=target=>target instanceof Element&&!!target.closest('#studioTeamPanel select,#studioTeamPanel input,#studioTeamPanel button');

  ['pointerdown','pointerup','touchstart','touchend','focusin','input','change','keydown','click'].forEach(type=>{
    document.addEventListener(type,event=>{
      if(!isTeamControl(event.target))return;
      protect(type==='change'?4000:12000);
    },true);
  });

  /* Android/iOS native select pickers can resize/freeze the visual viewport.
     During that time TATNERA must not rebuild the team DOM. */
  window.visualViewport?.addEventListener('resize',()=>{
    const active=document.activeElement;
    if(isMobile()&&(isTeamControl(active)||protectedNow()))protect(12000);
  },{passive:true});

  function stopLateTeamRefresh(event){
    if(!isMobile()||!panelExists())return;
    if(protectedNow()){
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
  }

  window.addEventListener('tatnera:runtime-refresh',stopLateTeamRefresh,true);
  window.addEventListener('tatnera:auth-ready',event=>{
    if(!isMobile())return;
    if(panelExists()){
      /* Once the team panel is already rendered, a later auth-ready event is
         only a duplicate bootstrap and must not restart loadTeam on mobile. */
      if(teamReadySeen||protectedNow()){
        event.stopPropagation();
        event.stopImmediatePropagation();
        return;
      }
      teamReadySeen=true;
    }
  },true);

  document.addEventListener('focusout',event=>{
    if(isTeamControl(event.target))protect(2500);
  },true);
})();
