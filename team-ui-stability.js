/* TATNERA — keep team form controls stable during direct interaction */
(function(){
  'use strict';
  let protectUntil=0;
  const protect=()=>{protectUntil=Date.now()+8000;};
  const isTeamControl=target=>target instanceof Element&&!!target.closest('#studioTeamPanel select,#studioTeamPanel input,#studioTeamPanel button');

  ['pointerdown','touchstart','focusin','input','change','keydown','click'].forEach(type=>{
    document.addEventListener(type,event=>{if(isTeamControl(event.target))protect();},true);
  });

  /* runtime-refresh is dispatched on document. Intercept on window during the
     capture phase so the team renderer never receives it while the user is
     actively using a select/input. */
  window.addEventListener('tatnera:runtime-refresh',event=>{
    if(Date.now()<protectUntil){
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
  },true);

  document.addEventListener('focusout',event=>{
    if(isTeamControl(event.target))protectUntil=Math.max(protectUntil,Date.now()+1200);
  },true);
})();
