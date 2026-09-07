/* TATNERA — dashboard shortcut: missing consent opens the consent form directly */
(function(){
  'use strict';

  document.addEventListener('click',function(event){
    const button=event.target.closest('[data-runtime-step]');
    if(!button)return;

    const dashboard=document.getElementById('dashboard');
    const item=dashboard?._runtimeSteps?.[Number(button.dataset.runtimeStep)];
    if(!item || item.title!=='Einwilligung fehlt' || !item.projectId)return;

    event.preventDefault();
    event.stopImmediatePropagation();

    if(typeof openProject==='function')openProject(item.projectId);

    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      window.TatneraCore?.activateProjectTab?.('documents');
      const consentButton=document.querySelector(`[data-open-consent="${CSS.escape(item.projectId)}"]`);
      if(consentButton)consentButton.click();
    }));
  },true);
})();
