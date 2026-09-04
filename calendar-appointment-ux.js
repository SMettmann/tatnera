/* TATNERA — calendar appointment UX
   - Clicking a calendar day opens a new appointment for that date.
   - New customers can be created directly inside the appointment dialog. */
(function(){
  'use strict';

  if(window.__tatneraCalendarAppointmentUxInstalled)return;
  window.__tatneraCalendarAppointmentUxInstalled=true;

  let customerMode='existing';

  function installStyle(){
    if(document.getElementById('calendarAppointmentUxStyle'))return;
    const style=document.createElement('style');
    style.id='calendarAppointmentUxStyle';
    style.textContent=`
      .calendar-month-day{cursor:pointer}
      .appointment-customer-mode{grid-column:1/-1;margin-top:2px}
      .appointment-customer-mode-label{display:block;margin-bottom:7px;font-size:10px;font-weight:800;color:var(--muted)}
      .appointment-customer-tabs{display:flex;gap:5px;padding:4px;border:1px solid var(--line);border-radius:11px;background:var(--panel-2)}
      .appointment-customer-tabs button{appearance:none;flex:1;border:0;border-radius:8px;background:transparent;color:var(--muted);padding:8px 10px;font:inherit;font-size:10px;font-weight:850;cursor:pointer}
      .appointment-customer-tabs button.active{background:var(--text);color:var(--panel)}
      .appointment-new-customer{grid-column:1/-1;padding:12px;border:1px solid var(--line);border-radius:11px;background:var(--panel-2)}
      .appointment-new-customer[hidden]{display:none!important}
      .appointment-new-customer-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}
      .appointment-new-customer-grid label{display:flex;flex-direction:column;gap:6px;font-size:10px;font-weight:700;color:var(--muted)}
      .appointment-new-customer-grid input{width:100%;border:1px solid var(--line);border-radius:9px;background:var(--panel);color:var(--text);padding:9px 10px;font:inherit;font-size:11px}
      .appointment-new-customer-note{margin:9px 0 0;font-size:9px;line-height:1.45;color:var(--muted)}
      html[data-theme="light"] .appointment-customer-tabs,
      html[data-theme="light"] .appointment-new-customer{background:#f7f8fa!important;border-color:#d9dde2!important}
      html[data-theme="light"] .appointment-customer-tabs button.active{background:#232a24!important;color:#fff!important}
      html[data-theme="light"] .appointment-new-customer-grid input{background:#fff!important;color:#20252a!important;border-color:#d8dde1!important}
      @media(max-width:650px){.appointment-new-customer-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function form(){return document.getElementById('appointmentForm');}

  function setCustomerMode(mode,{resetNew=false}={}){
    const appointmentForm=form();if(!appointmentForm)return;
    const select=appointmentForm.elements.customerId;
    const existingLabel=select?.closest('label');
    const modeBox=appointmentForm.querySelector('[data-appointment-customer-mode]');
    const newBox=appointmentForm.querySelector('[data-appointment-new-customer]');
    const project=appointmentForm.elements.projectId;
    customerMode=mode==='new'?'new':'existing';

    modeBox?.querySelectorAll('[data-appointment-customer-mode-button]').forEach(button=>button.classList.toggle('active',button.dataset.appointmentCustomerModeButton===customerMode));
    if(existingLabel)existingLabel.hidden=customerMode==='new';
    if(newBox)newBox.hidden=customerMode!=='new';

    const newFields=['newCustomerFirstName','newCustomerLastName','newCustomerEmail','newCustomerPhone'];
    newFields.forEach(name=>{
      const input=appointmentForm.elements[name];if(!input)return;
      input.disabled=customerMode!=='new';
      input.required=customerMode==='new'&&(name==='newCustomerFirstName'||name==='newCustomerLastName');
      if(resetNew&&customerMode==='new')input.value='';
    });

    if(customerMode==='new'){
      if(select)select.value='';
      if(project){project.value='';project.disabled=true;}
      appointmentForm.elements.newCustomerFirstName?.focus();
    }else if(project){
      project.disabled=false;
    }
  }

  function ensureCustomerUi(){
    const appointmentForm=form();if(!appointmentForm||appointmentForm.dataset.customerCreateReady==='1')return;
    const select=appointmentForm.elements.customerId;const existingLabel=select?.closest('label');
    if(!select||!existingLabel)return;
    appointmentForm.dataset.customerCreateReady='1';

    const mode=document.createElement('div');
    mode.className='appointment-customer-mode';
    mode.dataset.appointmentCustomerMode='true';
    mode.innerHTML=`<span class="appointment-customer-mode-label">Kunde</span><div class="appointment-customer-tabs"><button type="button" class="active" data-appointment-customer-mode-button="existing">Bestandskunde</button><button type="button" data-appointment-customer-mode-button="new">+ Neuer Kunde</button></div>`;
    existingLabel.insertAdjacentElement('beforebegin',mode);

    const newBox=document.createElement('div');
    newBox.className='appointment-new-customer';
    newBox.dataset.appointmentNewCustomer='true';
    newBox.hidden=true;
    newBox.innerHTML=`<div class="appointment-new-customer-grid"><label>Vorname<input name="newCustomerFirstName" autocomplete="given-name"></label><label>Nachname<input name="newCustomerLastName" autocomplete="family-name"></label><label>Telefon<input name="newCustomerPhone" type="tel" autocomplete="tel"></label><label>E-Mail<input name="newCustomerEmail" type="email" autocomplete="email"></label></div><p class="appointment-new-customer-note">Der Kunde wird beim Speichern automatisch in der Kundenkartei angelegt und direkt mit diesem Termin verknüpft.</p>`;
    existingLabel.insertAdjacentElement('afterend',newBox);

    mode.querySelectorAll('[data-appointment-customer-mode-button]').forEach(button=>button.addEventListener('click',()=>setCustomerMode(button.dataset.appointmentCustomerModeButton,{resetNew:button.dataset.appointmentCustomerModeButton==='new'})));

    appointmentForm.addEventListener('submit',event=>{
      if(customerMode!=='new')return;
      const firstName=String(appointmentForm.elements.newCustomerFirstName?.value||'').trim();
      const lastName=String(appointmentForm.elements.newCustomerLastName?.value||'').trim();
      if(!firstName||!lastName){
        event.preventDefault();event.stopImmediatePropagation();appointmentForm.reportValidity();return;
      }

      const id='c'+Date.now();
      const customer={
        id,
        firstName,
        lastName,
        email:String(appointmentForm.elements.newCustomerEmail?.value||'').trim(),
        phone:String(appointmentForm.elements.newCustomerPhone?.value||'').trim(),
        notes:'',
        lastProject:'—',
        next:'—',
        status:'Neu'
      };
      state.customers.unshift(customer);

      let option=[...select.options].find(item=>item.value===id);
      if(!option){option=new Option(`${firstName} ${lastName}`,id,true,true);select.appendChild(option);}
      select.value=id;
      select.disabled=false;
      if(appointmentForm.elements.projectId){appointmentForm.elements.projectId.disabled=false;appointmentForm.elements.projectId.value='';}

      persist();
      try{renderCustomers(document.getElementById('customerSearch')?.value||'');}catch(_error){}
      try{updateCustomerSelect();}catch(_error){}
      setTimeout(()=>document.dispatchEvent(new CustomEvent('tatnera:data-changed',{detail:{type:'customer-create-from-appointment',customerId:id}})),0);
    },true);

    setCustomerMode('existing');
  }

  function wrapAppointmentDialog(){
    if(window.__tatneraCalendarAppointmentDialogWrapped||typeof window.openAppointmentDialog!=='function')return;
    window.__tatneraCalendarAppointmentDialogWrapped=true;
    const previous=window.openAppointmentDialog;
    const wrapped=function(eventId='',date=''){
      previous.apply(this,arguments);
      ensureCustomerUi();
      const appointmentForm=form();if(!appointmentForm)return;
      const modeBox=appointmentForm.querySelector('[data-appointment-customer-mode]');
      const editing=Boolean(eventId);
      if(modeBox)modeBox.hidden=editing;
      setCustomerMode('existing');
    };
    window.openAppointmentDialog=wrapped;
    try{openAppointmentDialog=wrapped;}catch(_error){}
  }

  function appointmentFromCalendarDay(event){
    const target=event.target instanceof Element?event.target:null;if(!target)return;

    const monthDay=target.closest('.calendar-month-day');
    if(monthDay){
      if(target.closest('.calendar-month-event,.calendar-month-add,.calendar-month-more'))return;
      const iso=monthDay.querySelector('.calendar-month-date')?.dataset.openDay||'';
      if(!iso||typeof window.openAppointmentDialog!=='function')return;
      event.preventDefault();event.stopImmediatePropagation();
      window.openAppointmentDialog('',iso);
      return;
    }

    const weekDay=target.closest('.calendar-day');
    if(weekDay){
      if(target.closest('.calendar-event,.mini-add-btn'))return;
      const iso=weekDay.querySelector('.calendar-day-head')?.dataset.openDay||'';
      if(!iso||typeof window.openAppointmentDialog!=='function')return;
      event.preventDefault();event.stopImmediatePropagation();
      window.openAppointmentDialog('',iso);
    }
  }

  installStyle();
  ensureCustomerUi();
  wrapAppointmentDialog();
  document.addEventListener('click',appointmentFromCalendarDay,true);
  document.addEventListener('tatnera:runtime-refresh',()=>setTimeout(()=>{ensureCustomerUi();wrapAppointmentDialog();},0));
})();