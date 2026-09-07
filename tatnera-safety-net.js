/* TATNERA interaction safety net — duplicate-action protection & unsaved-change guard */
(function(){
  'use strict';
  if(window.__tatneraSafetyNetInstalled)return;
  window.__tatneraSafetyNetInstalled=true;

  const dirtyForms=new WeakSet();
  const submittedForms=new WeakSet();
  const cooldownButtons=new WeakMap();

  function isEditable(el){return el&&el.matches&&el.matches('input,textarea,select');}
  function markDirty(el){const form=el?.form;if(form)dirtyForms.add(form);}
  function clearDirty(form){if(form)dirtyForms.delete(form);}

  document.addEventListener('input',event=>{if(isEditable(event.target))markDirty(event.target);},true);
  document.addEventListener('change',event=>{if(isEditable(event.target))markDirty(event.target);},true);
  document.addEventListener('reset',event=>clearDirty(event.target),true);

  document.addEventListener('submit',event=>{
    const form=event.target;
    if(!(form instanceof HTMLFormElement))return;
    if(submittedForms.has(form)){
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    submittedForms.add(form);
    clearDirty(form);
    const buttons=[...form.querySelectorAll('button[type="submit"],input[type="submit"]')];
    buttons.forEach(btn=>{btn.dataset.tatneraWasDisabled=btn.disabled?'1':'0';btn.disabled=true;btn.setAttribute('aria-busy','true');});
    setTimeout(()=>{
      submittedForms.delete(form);
      buttons.forEach(btn=>{if(btn.dataset.tatneraWasDisabled!=='1')btn.disabled=false;btn.removeAttribute('aria-busy');delete btn.dataset.tatneraWasDisabled;});
    },1800);
  },true);

  document.addEventListener('click',event=>{
    const button=event.target.closest('button');
    if(!button||button.type==='submit'||button.disabled)return;
    const text=(button.textContent||'').toLowerCase();
    const id=(button.id||'').toLowerCase();
    const actionish=/speichern|anlegen|erstellen|löschen|entfernen|abschließen|bezahlen|senden|archivieren/.test(text)||/save|create|delete|remove|submit|archive|pay/.test(id);
    if(!actionish)return;
    const now=Date.now(),until=cooldownButtons.get(button)||0;
    if(now<until){event.preventDefault();event.stopImmediatePropagation();return;}
    cooldownButtons.set(button,now+700);
  },true);

  window.addEventListener('beforeunload',event=>{
    const hasDirty=[...document.querySelectorAll('form')].some(form=>dirtyForms.has(form));
    if(!hasDirty)return;
    event.preventDefault();
    event.returnValue='';
  });

  document.addEventListener('close',event=>{if(event.target instanceof HTMLDialogElement){const form=event.target.querySelector('form');clearDirty(form);}},true);
  document.addEventListener('cancel',event=>{if(event.target instanceof HTMLDialogElement){const form=event.target.querySelector('form');clearDirty(form);}},true);
})();
