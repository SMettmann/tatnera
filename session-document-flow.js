/* TATNERA — direct document flow from session preflight */
(function(){
  'use strict';

  function enhanceSessionDocumentActions(){
    const dialog=document.getElementById('sessionStartDialog');
    if(!dialog?.open)return;
    dialog.querySelectorAll('[data-session-open-documents]').forEach(button=>{
      const label=String(button.textContent||'').trim().toLowerCase();
      if(label==='dokumente')button.textContent='Einwilligung ausfüllen';
      else if(label.includes('einwilligung'))button.textContent='Einwilligung ergänzen';
    });
  }

  function openConsentDirect(projectId){
    if(!projectId)return;
    const sessionDialog=document.getElementById('sessionStartDialog');
    if(sessionDialog?.open)sessionDialog.close();

    // consent-v2 owns the form. Trigger its existing project-ID based action directly,
    // without navigating to the project documents page first.
    const trigger=document.createElement('button');
    trigger.type='button';
    trigger.hidden=true;
    trigger.dataset.openConsent=projectId;
    document.body.appendChild(trigger);
    trigger.click();
    trigger.remove();
  }

  window.addEventListener('click',event=>{
    const target=event.target instanceof Element?event.target:null;
    if(!target)return;

    const start=target.closest('[data-start-session]');
    if(start)setTimeout(enhanceSessionDocumentActions,0);

    const action=target.closest('#sessionStartDialog [data-session-open-documents]');
    if(!action)return;
    const label=String(action.textContent||'').trim().toLowerCase();
    if(label.includes('charg'))return;

    event.preventDefault();
    event.stopImmediatePropagation();
    openConsentDirect(action.dataset.sessionOpenDocuments||'');
  },true);
})();
