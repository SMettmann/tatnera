/* TATNERA — full service flow from calendar
   New calendar entries for Tattoo/Piercing use the complete service form,
   create customer + studio record + appointment in one step.
   Existing appointments keep the compact edit dialog. */
(function(){
  'use strict';
  if(window.__tatneraCalendarFullServiceFlowInstalled)return;
  window.__tatneraCalendarFullServiceFlowInstalled=true;

  let calendarFlow=false;
  let calendarDate='';
  let wrapperInstalled=false;

  function installStyle(){
    if(document.getElementById('tatneraCalendarFullServiceStyle'))return;
    const style=document.createElement('style');
    style.id='tatneraCalendarFullServiceStyle';
    style.textContent=`
      #projectDialog.calendar-project-flow .service-type-picker{display:grid!important}
      #projectDialog.calendar-project-flow .project-appointment-toggle{display:none!important}
      #projectDialog.calendar-project-flow [data-project-appointment-fields]{display:block!important}
      #projectDialog.calendar-project-flow .project-form-section:last-of-type .project-form-section-head p{max-width:620px}
      #projectDialog.calendar-project-flow .focus-project-actions [type="submit"]{min-width:190px}
    `;
    document.head.appendChild(style);
  }

  function projectForm(){return document.getElementById('projectForm');}
  function projectDialog(){return document.getElementById('projectDialog');}

  function allowedDefaultService(){
    const permissions=window.TatneraPermissions;
    if(permissions?.canCreateService){
      if(permissions.canCreateService('tattoo'))return 'tattoo';
      if(permissions.canCreateService('piercing'))return 'piercing';
    }
    return 'tattoo';
  }

  function applyCalendarMode(date){
    const dialog=projectDialog(),form=projectForm();if(!dialog||!form)return;
    calendarFlow=true;
    calendarDate=date||state?.calendar?.anchor||(typeof todayISO==='function'?todayISO():new Date().toISOString().slice(0,10));
    dialog.classList.add('calendar-project-flow');
    dialog.dataset.calendarProjectFlow='1';

    const head=dialog.querySelector('.dialog-head');
    if(head){
      const eyebrow=head.querySelector('.eyebrow'),title=head.querySelector('h2'),copy=head.querySelector('p');
      if(eyebrow)eyebrow.textContent='Studio-Kalender';
      if(title)title.textContent='Termin anlegen';
      if(copy)copy.textContent='Kunde, Tattoo oder Piercing und den Termin direkt in einem Schritt anlegen.';
    }

    const appointmentSection=[...form.querySelectorAll('.project-form-section')].find(section=>section.querySelector('[name="scheduleAppointment"]'));
    if(appointmentSection){
      const title=appointmentSection.querySelector('.project-form-section-head h3');
      const copy=appointmentSection.querySelector('.project-form-section-head p');
      if(title)title.textContent='Termin';
      if(copy)copy.textContent='Dieser Termin wird zusammen mit der Studio-Akte angelegt. Eine bestehende Tattoo- oder Piercing-Akte ist nicht nötig.';
    }

    const schedule=form.elements.scheduleAppointment;
    if(schedule){schedule.checked=true;schedule.dispatchEvent(new Event('change',{bubbles:true}));}
    if(form.elements.appointmentDate){form.elements.appointmentDate.value=calendarDate;form.elements.appointmentDate.required=true;}
    if(form.elements.appointmentStart&&!form.elements.appointmentStart.value)form.elements.appointmentStart.value='10:00';
    if(form.elements.appointmentDuration){form.elements.appointmentDuration.required=true;}

    const submit=form.querySelector('[type="submit"]');
    if(submit)submit.textContent='Termin + Akte anlegen';

    /* service-create-ui normally hides the picker because there are separate buttons.
       In the calendar we deliberately show it, so the user can choose Tattoo/Piercing here. */
    const current=form.querySelector('[name="serviceType"]:checked');
    if(!current){
      const preferred=form.querySelector(`[name="serviceType"][value="${allowedDefaultService()}"]`);
      if(preferred){preferred.checked=true;preferred.dispatchEvent(new Event('change',{bubbles:true}));}
    }

    window.TatneraPermissions?.apply?.();
  }

  function clearCalendarMode(){
    const dialog=projectDialog();
    dialog?.classList.remove('calendar-project-flow');
    if(dialog)delete dialog.dataset.calendarProjectFlow;
    calendarFlow=false;
  }

  function openFullCalendarFlow(date){
    if(typeof window.openProjectDialog!=='function')return false;
    const service=allowedDefaultService();
    window.openProjectDialog('',service);
    requestAnimationFrame(()=>requestAnimationFrame(()=>applyCalendarMode(date)));
    return true;
  }

  function shouldUseFullFlow(eventId){
    return !eventId&&state?.currentView==='calendar';
  }

  function installWrapper(){
    if(typeof window.openAppointmentDialog!=='function')return;
    const current=window.openAppointmentDialog;
    if(current.__tatneraFullServiceCalendarWrapper)return;

    const wrapped=function(eventId='',date=''){
      if(shouldUseFullFlow(eventId)&&openFullCalendarFlow(date))return;
      return current.apply(this,arguments);
    };
    wrapped.__tatneraFullServiceCalendarWrapper=true;
    wrapped.__tatneraPrevious=current;
    window.openAppointmentDialog=wrapped;
    try{openAppointmentDialog=wrapped;}catch(_error){}
    wrapperInstalled=true;
  }

  /* Enforce a real appointment when the full calendar flow is used. */
  window.addEventListener('submit',event=>{
    if(!calendarFlow)return;
    const form=event.target;if(!(form instanceof HTMLFormElement)||form.id!=='projectForm')return;
    const schedule=form.elements.scheduleAppointment;
    if(schedule&&!schedule.checked){schedule.checked=true;schedule.dispatchEvent(new Event('change',{bubbles:true}));}
    if(form.elements.appointmentDate&&!form.elements.appointmentDate.value)form.elements.appointmentDate.value=calendarDate;
  },true);

  /* The normal project flow opens the new record after saving. When creation started
     from the calendar, return directly to the calendar instead. */
  document.addEventListener('tatnera:data-changed',event=>{
    if(!calendarFlow||event.detail?.type!=='project')return;
    const targetDate=projectForm()?.elements?.appointmentDate?.value||calendarDate;
    setTimeout(()=>{
      if(state?.calendar&&targetDate)state.calendar.anchor=targetDate;
      clearCalendarMode();
      if(typeof navigate==='function')navigate('calendar');
      try{renderCalendar?.();}catch(_error){}
    },0);
  });

  document.addEventListener('change',event=>{
    if(!calendarFlow||!event.target.matches?.('#projectForm [name="serviceType"]'))return;
    setTimeout(()=>{
      /* piercing-support updates labels after the service change; restore calendar wording. */
      const form=projectForm(),section=form?[...form.querySelectorAll('.project-form-section')].find(item=>item.querySelector('[name="scheduleAppointment"]')):null;
      if(section){
        const title=section.querySelector('.project-form-section-head h3'),copy=section.querySelector('.project-form-section-head p');
        if(title)title.textContent='Termin';
        if(copy)copy.textContent='Dieser Termin wird zusammen mit der Studio-Akte angelegt. Eine bestehende Tattoo- oder Piercing-Akte ist nicht nötig.';
      }
      const submit=form?.querySelector('[type="submit"]');if(submit)submit.textContent='Termin + Akte anlegen';
    },0);
  });

  document.addEventListener('close',event=>{if(event.target?.id==='projectDialog')clearCalendarMode();},true);
  document.addEventListener('cancel',event=>{if(event.target?.id==='projectDialog')clearCalendarMode();},true);

  installStyle();
  installWrapper();
  document.addEventListener('tatnera:runtime-refresh',()=>setTimeout(installWrapper,0));
  document.addEventListener('tatnera:auth-ready',()=>setTimeout(installWrapper,500));
  setTimeout(installWrapper,900);

  window.TatneraCalendarFullService={open:openFullCalendarFlow,isActive:()=>calendarFlow};
})();