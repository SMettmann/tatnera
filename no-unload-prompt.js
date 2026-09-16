/* TATNERA — never block reload/close with the browser's generic unsaved-changes dialog.
   TATNERA persists changes continuously; a manual F5, tab close or device switch must remain frictionless. */
(function(){
  'use strict';
  if(window.__tatneraNoUnloadPromptInstalled)return;
  window.__tatneraNoUnloadPromptInstalled=true;

  /* Install before the application scripts. Because this listener runs first on
     beforeunload, no later module can cancel the event and trigger Chrome/Edge's
     generic "Vorgenommene Änderungen werden unter Umständen nicht gespeichert" dialog. */
  window.addEventListener('beforeunload',function(event){
    event.stopImmediatePropagation();
  },true);
})();
