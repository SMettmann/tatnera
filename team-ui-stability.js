/* TATNERA — keep team form controls stable during direct interaction */
(function(){
  'use strict';
  let protectUntil=0;
  const protect=()=>{protectUntil=Date.now()+2500;};
  const isTeamControl=target=>target instanceof Element&&!!target.closest('#studioTeamPanel select,#studioTeamPanel input,#studioTeamPanel button');
  ['pointerdown','touchstart','focusin','input','change','keydown'].forEach(type=>{
    document.addEventListener(type,event=>{if(isTeamControl(event.target))protect();},true);
  });
  document.addEventListener('tatnera:runtime-refresh',event=>{
    if(Date.now()<protectUntil){
      event.stopImmediatePropagation();
    }
  },true);
})();
