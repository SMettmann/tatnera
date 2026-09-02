/* TATNERA — direct appointment management from customer/tattoo records */
(function(){
  'use strict';
  const Core=window.TatneraCore;if(!Core)return;
  const esc=Core.esc;

  function installStyle(){
    if(document.getElementById('appointmentManagementStyle'))return;
    const style=document.createElement('style');
    style.id='appointmentManagementStyle';
    style.textContent=`
      .record-appointments{margin-top:14px}
      .record-appointments-list{display:flex;flex-direction:column;gap:8px;margin-top:10px}
      .record-appointment-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:center;padding:11px 12px;border:1px solid var(--line);border-radius:11px;background:var(--panel-2)}
      .record-appointment-row strong,.record-appointment-row span{display:block}
      .record-appointment-row strong{font-size:12px}
      .record-appointment-row span{font-size:10px;color:var(--muted);margin-top:3px}
      .record-appointment-actions{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}
      .record-appointment-delete{border-color:#7d3232!important;color:#ef9a9a!important}
      .record-appointment-delete:hover{background:#3a1818!important;color:#fff!important}
      @media(max-width:650px){.record-appointment-row{grid-template-columns:1fr}.record-appointment-actions{justify-content:flex-start}}
    `;
    document.head.appendChild(style);
  }

  function futureEventsForProject(projectId){
    const today=todayISO();
    return (state.calendarEvents||[]).filter(event=>event.projectId===projectId&&event.date>=today).sort((a,b)=>a.date.localeCompare(b.date)||String(a.start).localeCompare(String(b.start)));
  }

  function futureEventsForCustomer(customerId){
    const today=todayISO();
    return (state.calendarEvents||[]).filter(event=>event.customerId===customerId&&event.date>=today).sort((a,b)=>a.date.localeCompare(b.date)||String(a.start).localeCompare(String(b.start)));
  }

  function dateLabel(event){
    if(!event?.date)return '—';
    const date=new Date(event.date+'T12:00:00');
    return `${new Intl.DateTimeFormat('de-DE',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'}).format(date)} · ${event.start||'—'} Uhr`;
  }

  function typeLabel(type){return ({tattoo:'Tattoo',consultation:'Beratung',touchup:'Nachstechen',block:'Blockzeit'})[type]||type||'Termin';}

  function appointmentRows(events){
    return events.map(event=>`<div class="record-appointment-row" data-record-event-row="${esc(event.id)}"><div><strong>${esc(dateLabel(event))}</strong><span>${esc(typeLabel(event.type))} · ${esc(event.artist||'—')} · ${esc(event.status||'')}</span></div><div class="record-appointment-actions"><button type="button" class="btn ghost" data-record-edit-event="${esc(event.id)}">Bearbeiten</button><button type="button" class="btn ghost record-appointment-delete" data-record-delete-event="${esc(event.id)}">Löschen</button></div></div>`).join('');
  }

  function renderProjectAppointments(projectId){
    const root=document.getElementById('projectDetail');
    if(!root||root.dataset.projectId!==projectId)return;
    root.querySelector('[data-project-upcoming-appointments]')?.remove();
    const events=futureEventsForProject(projectId);
    const section=document.createElement('section');
    section.className='detail-card space-top record-appointments';
    section.dataset.projectUpcomingAppointments=projectId;
    section.innerHTML=`<div class="panel-head"><div><span class="eyebrow">Planung</span><h3>Kommende Termine</h3></div><button type="button" class="btn primary" data-record-new-project-event="${esc(projectId)}">+ Termin</button></div><div class="record-appointments-list">${events.length?appointmentRows(events):'<p class="muted">Für dieses Tattoo ist kein zukünftiger Termin eingetragen. Die Akte kann archiviert werden.</p>'}</div>`;
    root.appendChild(section);
  }

  function renderCustomerAppointments(customerId){
    const root=document.getElementById('customerDetail');
    if(!root||root.dataset.customerId!==customerId)return;
    root.querySelector('[data-customer-upcoming-appointments]')?.remove();
    const events=futureEventsForCustomer(customerId);
    const section=document.createElement('section');
    section.className='detail-card space-top record-appointments';
    section.dataset.customerUpcomingAppointments=customerId;
    section.innerHTML=`<div class="panel-head"><div><span class="eyebrow">Planung</span><h3>Kommende Termine</h3></div></div><div class="record-appointments-list">${events.length?appointmentRows(events):'<p class="muted">Keine zukünftigen Termine.</p>'}</div>`;
    root.appendChild(section);
  }

  function deleteEvent(eventId){
    const event=(state.calendarEvents||[]).find(item=>item.id===eventId);if(!event)return;
    const label=`${dateLabel(event)} · ${typeLabel(event.type)}`;
    if(!confirm(`Diesen Termin wirklich löschen?\n\n${label}`))return;
    state.calendarEvents=state.calendarEvents.filter(item=>item.id!==eventId);
    persist();
    renderAppointments?.();
    renderCalendar?.();
    renderCustomers?.();
    const projectId=document.getElementById('projectDetail')?.dataset.projectId||'';
    const customerId=document.getElementById('customerDetail')?.dataset.customerId||'';
    if(projectId)renderProjectAppointments(projectId);
    if(customerId)renderCustomerAppointments(customerId);
    document.dispatchEvent(new CustomEvent('tatnera:data-changed',{detail:{type:'appointment-delete',eventId,projectId:event.projectId||'',customerId:event.customerId||''}}));
  }

  function ensureDialogDelete(eventId){
    const button=document.getElementById('deleteAppointmentBtn');if(!button)return;
    const exists=Boolean(eventId&&(state.calendarEvents||[]).some(item=>item.id===eventId));
    button.hidden=!exists;
    button.disabled=!exists;
    if(exists)button.textContent='Termin löschen';
  }

  function wrapAppointmentDialog(){
    if(typeof openAppointmentDialog!=='function'||window.__tatneraAppointmentDialogWrapped)return;
    window.__tatneraAppointmentDialogWrapped=true;
    const previous=openAppointmentDialog;
    openAppointmentDialog=function(eventId='',date=''){
      previous(eventId,date);
      ensureDialogDelete(eventId);
    };
  }

  document.addEventListener('click',event=>{
    const edit=event.target.closest('[data-record-edit-event]');
    if(edit){event.preventDefault();openAppointmentDialog(edit.dataset.recordEditEvent);return;}
    const remove=event.target.closest('[data-record-delete-event]');
    if(remove){event.preventDefault();deleteEvent(remove.dataset.recordDeleteEvent);return;}
    const add=event.target.closest('[data-record-new-project-event]');
    if(add){
      event.preventDefault();
      const project=Core.getProject(add.dataset.recordNewProjectEvent);if(!project)return;
      openAppointmentDialog('',todayISO());
      const form=document.getElementById('appointmentForm');if(!form)return;
      form.elements.customerId.value=project.customerId||'';
      form.elements.projectId.value=project.id;
      form.elements.type.value='tattoo';
      if(form.elements.artist)Core.populateArtistSelect(form.elements.artist,project.artist||Core.artistNameFallback());
      form.elements.status.value='Angefragt';
      form.elements.notes.value=`Termin für ${project.title}`;
    }
  });

  document.addEventListener('tatnera:project-opened',event=>requestAnimationFrame(()=>renderProjectAppointments(event.detail?.projectId||'')));
  document.addEventListener('tatnera:customer-opened',event=>requestAnimationFrame(()=>renderCustomerAppointments(event.detail?.customerId||'')));
  document.addEventListener('tatnera:data-changed',()=>{
    const projectId=document.getElementById('projectDetail')?.dataset.projectId||'';
    const customerId=document.getElementById('customerDetail')?.dataset.customerId||'';
    if(projectId&&document.getElementById('project-detail')?.classList.contains('active-view'))renderProjectAppointments(projectId);
    if(customerId&&document.getElementById('customer-detail')?.classList.contains('active-view'))renderCustomerAppointments(customerId);
  });

  installStyle();
  wrapAppointmentDialog();
})();