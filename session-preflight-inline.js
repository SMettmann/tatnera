/* TATNERA — inline prerequisite fixes inside "Sitzung starten"
   Missing consent, guardian data, ink/charge or deposit can be completed directly
   without navigating away from the session-start dialog. */
(function(){
  'use strict';
  if(window.__tatneraSessionPreflightInlineInstalled)return;
  window.__tatneraSessionPreflightInlineInstalled=true;

  const Core=window.TatneraCore;
  if(!Core)return;

  let activeEventId='';
  let activeProjectId='';
  let enhanceTimer=0;
  let refreshTimer=0;

  function eventById(id){return (window.state?.calendarEvents||[]).find(item=>String(item.id)===String(id))||null;}
  function currentProject(){return activeProjectId?Core.getProject(activeProjectId):null;}

  function rememberFromStart(target){
    const start=target?.closest?.('[data-start-session]');
    if(!start)return;
    activeEventId=String(start.dataset.startSession||'');
    const event=eventById(activeEventId);
    activeProjectId=String(event?.projectId||'');
  }

  function trigger(selector,attrs){
    const button=document.createElement('button');
    button.type='button';
    for(const [name,value] of Object.entries(attrs||{}))button.setAttribute(name,String(value));
    button.hidden=true;
    document.body.appendChild(button);
    try{button.click();}finally{button.remove();}
  }

  function openConsent(){
    if(!activeProjectId)return;
    trigger('consent',{'data-open-consent':activeProjectId});
  }

  function openInkPicker(){
    if(!activeProjectId)return;
    trigger('ink',{'data-pick-project-inks':activeProjectId});
  }

  function openDeposit(){
    if(!activeProjectId)return;
    trigger('deposit',{'data-pay-deposit':activeProjectId});
  }

  function actionForRow(row){
    const title=String(row?.querySelector('strong')?.textContent||'').trim();
    if(title==='Einwilligung'||title==='Alter / Sorgeberechtigung')return 'consent';
    if(title==='Farben & Chargen')return 'ink';
    if(title==='Anzahlung'){
      const detail=String(row.querySelector('span')?.textContent||'').toLowerCase();
      return detail.includes('offen')?'deposit':'';
    }
    return '';
  }

  function runAction(kind){
    if(kind==='consent')openConsent();
    if(kind==='ink')openInkPicker();
    if(kind==='deposit')openDeposit();
  }

  function addInlineButton(row,kind){
    if(!kind||row.querySelector('[data-session-inline-action]'))return;
    const button=document.createElement('button');
    button.type='button';
    button.className='btn ghost session-inline-fix';
    button.dataset.sessionInlineAction=kind;
    button.textContent=kind==='ink'?'Auswählen':kind==='deposit'?'Anzahlung erfassen':'Jetzt ausfüllen';
    row.appendChild(button);
  }

  function enhancePreflight(){
    const root=document.getElementById('sessionPreflight');
    const dialog=document.getElementById('sessionStartDialog');
    if(!root||!dialog)return;

    const project=currentProject();
    if(!project){
      const legacy=root.querySelector('[data-session-open-documents]');
      if(legacy)activeProjectId=String(legacy.dataset.sessionOpenDocuments||'');
    }

    root.querySelectorAll('[data-session-open-documents]').forEach(button=>{
      const text=String(button.textContent||'').toLowerCase();
      button.dataset.sessionInlineAction=text.includes('charg')?'ink':'consent';
      button.textContent=text.includes('charg')?'Auswählen':'Jetzt ausfüllen';
      button.classList.add('session-inline-fix');
    });

    root.querySelectorAll('.session-check').forEach(row=>{
      const kind=actionForRow(row);
      const unresolved=row.classList.contains('missing')||row.classList.contains('warn')||kind==='deposit';
      if(!kind||!unresolved){
        row.removeAttribute('data-session-fix-row');
        row.removeAttribute('tabindex');
        return;
      }
      row.dataset.sessionFixRow=kind;
      row.tabIndex=0;
      row.setAttribute('role','group');
      addInlineButton(row,kind);
    });
  }

  function scheduleEnhance(){
    clearTimeout(enhanceTimer);
    enhanceTimer=setTimeout(enhancePreflight,0);
  }

  function refreshParent(){
    clearTimeout(refreshTimer);
    refreshTimer=setTimeout(()=>{
      const dialog=document.getElementById('sessionStartDialog');
      if(!dialog?.open||!activeEventId)return;
      const healthWasChecked=Boolean(document.getElementById('sessionHealthAcknowledge')?.checked);
      const ownShowModal=dialog.showModal;
      const triggerButton=document.createElement('button');
      triggerButton.type='button';
      triggerButton.hidden=true;
      triggerButton.dataset.startSession=activeEventId;
      document.body.appendChild(triggerButton);
      try{
        /* session-management rebuilds the checklist and normally calls showModal().
           The parent is intentionally still open underneath the child dialog, so
           suppress only that redundant showModal call for this synchronous refresh. */
        dialog.showModal=function(){};
        triggerButton.click();
      }catch(error){
        console.error('TATNERA preflight refresh failed',error);
      }finally{
        dialog.showModal=ownShowModal;
        triggerButton.remove();
      }
      const health=document.getElementById('sessionHealthAcknowledge');
      if(health&&healthWasChecked){health.checked=true;health.dispatchEvent(new Event('change',{bubbles:true}));}
      scheduleEnhance();
    },35);
  }

  function installStyle(){
    if(document.getElementById('sessionPreflightInlineStyle'))return;
    const style=document.createElement('style');
    style.id='sessionPreflightInlineStyle';
    style.textContent=`
      #sessionStartDialog .session-check[data-session-fix-row]{cursor:pointer;transition:border-color .15s ease,background .15s ease}
      #sessionStartDialog .session-check[data-session-fix-row]:hover{border-color:color-mix(in srgb,var(--text) 28%,var(--line));background:color-mix(in srgb,var(--panel-2) 88%,var(--text) 4%)}
      #sessionStartDialog .session-inline-fix{white-space:nowrap;min-height:36px;padding:7px 10px!important}
      #sessionStartDialog .session-check:not(.missing):not(.warn) .session-inline-fix{display:none!important}
      @media(max-width:720px){
        #sessionStartDialog .session-check{grid-template-columns:24px minmax(0,1fr)!important}
        #sessionStartDialog .session-check>.session-inline-fix{grid-column:1/-1;width:100%;margin-top:2px}
      }
    `;
    document.head.appendChild(style);
  }

  /* This listener is loaded BEFORE session-management.js, therefore it can stop
     the old "open project documents" navigation before that handler runs. */
  document.addEventListener('click',event=>{
    const target=event.target instanceof Element?event.target:null;if(!target)return;
    rememberFromStart(target);

    const legacy=target.closest('[data-session-open-documents]');
    if(legacy){
      event.preventDefault();event.stopImmediatePropagation();
      activeProjectId=String(legacy.dataset.sessionOpenDocuments||activeProjectId);
      const kind=legacy.dataset.sessionInlineAction||(/charg/i.test(legacy.textContent||'')?'ink':'consent');
      runAction(kind);return;
    }

    const action=target.closest('[data-session-inline-action]');
    if(action){
      event.preventDefault();event.stopPropagation();runAction(action.dataset.sessionInlineAction);return;
    }

    const row=target.closest('[data-session-fix-row]');
    if(row&&!target.closest('button,input,select,textarea,label,a')){
      event.preventDefault();runAction(row.dataset.sessionFixRow);return;
    }
  },true);

  document.addEventListener('keydown',event=>{
    if(!['Enter',' '].includes(event.key))return;
    const row=event.target instanceof Element?event.target.closest('[data-session-fix-row]'):null;
    if(!row)return;event.preventDefault();runAction(row.dataset.sessionFixRow);
  });

  document.addEventListener('tatnera:data-changed',event=>{
    const type=String(event.detail?.type||'');
    if(['consent','ink','payment'].includes(type))refreshParent();
  });

  const observer=new MutationObserver(mutations=>{
    if(mutations.some(item=>item.target?.id==='sessionPreflight'||item.target?.closest?.('#sessionPreflight')||[...item.addedNodes].some(node=>node instanceof Element&&(node.id==='sessionStartDialog'||node.querySelector?.('#sessionStartDialog')))))scheduleEnhance();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});

  installStyle();scheduleEnhance();
})();