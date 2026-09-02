/* TATNERA — appointment lifecycle
   Active appointments stay in state.calendarEvents.
   Terminal states move into a separate, traceable appointment history. */
(function(){
  'use strict';
  const Core=window.TatneraCore;if(!Core)return;
  const esc=Core.esc;
  const HISTORY_KEY='tatnera_appointment_history';
  const ACTIVE=['Bestätigt','Angefragt','Einwilligung fehlt','Blockiert'];
  const TERMINAL=['Abgesagt','Verschoben','Nicht erschienen','Abgeschlossen'];

  function normalizeStatus(status){return status==='No-Show'?'Nicht erschienen':status;}
  function normalizeItem(item){return item&&item.status==='No-Show'?{...item,status:'Nicht erschienen'}:item;}
  function loadHistory(){
    try{const parsed=JSON.parse(localStorage.getItem(HISTORY_KEY)||'null');return Array.isArray(parsed)?parsed.map(normalizeItem):[];}
    catch(_error){return [];}
  }
  state.appointmentHistory=loadHistory();

  function saveHistory(){localStorage.setItem(HISTORY_KEY,JSON.stringify(state.appointmentHistory||[]));}
  function isTerminal(value){const status=normalizeStatus(typeof value==='string'?value:value?.status);return TERMINAL.includes(String(status||''));}
  function isActive(value){return !isTerminal(value);}
  function statusClass(status){return ({Abgesagt:'cancelled',Verschoben:'moved','Nicht erschienen':'noshow',Abgeschlossen:'completed'})[normalizeStatus(status)]||'neutral';}
  function typeLabel(type){return ({tattoo:'Tattoo',consultation:'Beratung',touchup:'Nachstechen',block:'Blockzeit'})[type]||type||'Termin';}
  function historyForProject(id){return (state.appointmentHistory||[]).filter(item=>item.projectId===id).sort(historySort);}
  function historyForCustomer(id){return (state.appointmentHistory||[]).filter(item=>item.customerId===id).sort(historySort);}
  function historySort(a,b){return String(b.date||'').localeCompare(String(a.date||''))||String(b.start||'').localeCompare(String(a.start||''));}
  function dateLabel(item){
    if(!item?.date)return '—';
    const date=new Date(item.date+'T12:00:00');
    return `${new Intl.DateTimeFormat('de-DE',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'}).format(date)} · ${item.start||'—'} Uhr`;
  }

  Core.isTerminalAppointment=isTerminal;
  Core.isActiveAppointment=isActive;
  Core.getAppointmentHistory=()=>[...(state.appointmentHistory||[])];

  function installStyle(){
    if(document.getElementById('appointmentStatusStyle'))return;
    const style=document.createElement('style');style.id='appointmentStatusStyle';style.textContent=`
      .appointment-history{margin-top:14px}
      .appointment-history-list{display:flex;flex-direction:column;gap:8px;margin-top:10px}
      .appointment-history-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:10px 12px;border:1px solid var(--line);border-radius:11px;background:var(--panel-2)}
      .appointment-history-row strong,.appointment-history-row span{display:block}
      .appointment-history-row strong{font-size:12px}
      .appointment-history-row span{font-size:10px;color:var(--muted);margin-top:3px}
      .appointment-history-status{font-size:10px!important;font-weight:700;border:1px solid var(--line);border-radius:999px;padding:5px 8px;margin:0!important;white-space:nowrap;color:var(--text)!important}
      .appointment-history-status.completed{border-color:#356c4b;color:#8ed3a8!important}
      .appointment-history-status.cancelled{border-color:#7d3232;color:#ef9a9a!important}
      .appointment-history-status.noshow{border-color:#825037;color:#e9ad86!important}
      .appointment-history-status.moved{border-color:#55517d;color:#b9b3ef!important}
      @media(max-width:600px){.appointment-history-row{grid-template-columns:1fr}.appointment-history-status{justify-self:start}}
    `;document.head.appendChild(style);
  }

  function migrateTerminalEvents(){
    let changed=false;
    (state.calendarEvents||[]).forEach(event=>{if(event.status==='No-Show'){event.status='Nicht erschienen';changed=true;}});
    const terminal=(state.calendarEvents||[]).filter(isTerminal);
    if(terminal.length){
      terminal.forEach(event=>pushHistory({...event,closedAt:event.closedAt||new Date().toISOString()}));
      state.calendarEvents=(state.calendarEvents||[]).filter(isActive);
      changed=true;
    }
    saveHistory();
    if(changed)try{persist();}catch(_error){}
  }

  function pushHistory(item){
    if(!item?.id)return;
    item=normalizeItem(item);
    const index=(state.appointmentHistory||[]).findIndex(existing=>existing.id===item.id);
    if(index>=0)state.appointmentHistory[index]=item;else state.appointmentHistory.unshift(item);
  }

  function syncStatusSelect(eventId=''){
    const form=document.getElementById('appointmentForm'),select=form?.elements.status;if(!select)return;
    const current=normalizeStatus(String(select.value||'Bestätigt')),existing=Boolean(eventId&&(state.calendarEvents||[]).some(item=>item.id===eventId));
    const options=existing?[...ACTIVE,...TERMINAL]:ACTIVE;
    select.innerHTML=options.map(status=>`<option value="${esc(status)}">${esc(status)}</option>`).join('');
    select.value=options.includes(current)?current:'Bestätigt';
  }

  function wrapAppointmentDialog(){
    if(typeof openAppointmentDialog!=='function'||window.__tatneraAppointmentStatusWrapped)return;
    window.__tatneraAppointmentStatusWrapped=true;
    const previous=openAppointmentDialog;
    openAppointmentDialog=function(eventId='',date=''){
      previous(eventId,date);
      syncStatusSelect(eventId);
    };
  }

  function payloadFromForm(form){
    const data=Object.fromEntries(new FormData(form).entries());
    return {id:data.eventId||'',date:data.date,start:data.start,duration:Number(data.duration||60),customerId:data.customerId||'',projectId:data.projectId||'',artist:data.artist||'',type:data.type||'tattoo',status:normalizeStatus(data.status||'Bestätigt'),notes:data.notes||''};
  }

  function finalizeTerminal(event){
    const form=event.currentTarget,payload=payloadFromForm(form);if(!isTerminal(payload.status))return;
    event.preventDefault();event.stopImmediatePropagation();
    const existing=(state.calendarEvents||[]).find(item=>item.id===payload.id);
    if(!existing){alert('Dieser Status kann nur für einen bereits angelegten Termin verwendet werden.');return;}

    let historyEntry={...existing,...payload,id:existing.id,closedAt:new Date().toISOString()};
    let replacement=null;
    if(payload.status==='Verschoben'){
      historyEntry={...existing,status:'Verschoben',notes:payload.notes||existing.notes||'',closedAt:new Date().toISOString()};
      const changed=payload.date!==existing.date||payload.start!==existing.start||Number(payload.duration)!==Number(existing.duration)||payload.artist!==existing.artist;
      if(changed){
        replacement={...payload,id:'e'+Date.now(),status:'Angefragt',rescheduledFrom:existing.id,rescheduledAt:new Date().toISOString()};
        historyEntry.rescheduledTo=replacement.id;
      }
    }
    if(payload.status==='Abgeschlossen')historyEntry.completedAt=new Date().toISOString();

    pushHistory(historyEntry);
    state.calendarEvents=(state.calendarEvents||[]).filter(item=>item.id!==existing.id);
    if(replacement)state.calendarEvents.push(replacement);

    if(payload.status==='Abgeschlossen'&&payload.type==='tattoo'&&payload.projectId){
      const project=Core.getProject(payload.projectId);
      if(project){project.lastCompletedAppointmentId=existing.id;project.lastCompletedAt=historyEntry.completedAt;if(['Entwurf','Termin geplant'].includes(project.status))project.status='In Arbeit';}
    }

    saveHistory();persist();
    try{renderAppointments();renderCalendar();renderCustomers();renderProjects();}catch(_error){}
    document.getElementById('appointmentDialog')?.close();
    document.dispatchEvent(new CustomEvent('tatnera:data-changed',{detail:{type:'appointment-status',status:payload.status,eventId:existing.id,projectId:payload.projectId,customerId:payload.customerId,replacementId:replacement?.id||''}}));
    document.dispatchEvent(new CustomEvent('tatnera:appointment-terminal',{detail:{appointment:normalizeItem(historyEntry),replacement}}));
    if(payload.status==='Verschoben'&&replacement)alert('Der bisherige Termin wurde als „Verschoben“ dokumentiert und der neue Termin als „Angefragt“ angelegt.');
  }

  function historyRows(items){
    return items.map(item=>{const status=normalizeStatus(item.status);return `<div class="appointment-history-row"><div><strong>${esc(dateLabel(item))}</strong><span>${esc(typeLabel(item.type))} · ${esc(item.artist||'—')}${item.notes?' · '+esc(item.notes):''}</span></div><span class="appointment-history-status ${statusClass(status)}">${esc(status||'—')}</span></div>`;}).join('');
  }

  function renderProjectHistory(projectId){
    const root=document.getElementById('projectDetail');if(!root||root.dataset.projectId!==projectId)return;
    root.querySelector('[data-project-appointment-history]')?.remove();
    const items=historyForProject(projectId);if(!items.length)return;
    const pane=root.querySelector('[data-project-pane="overview"]')||root;
    const section=document.createElement('section');section.className='detail-card appointment-history';section.dataset.projectAppointmentHistory=projectId;
    section.innerHTML=`<div class="panel-head"><div><span class="eyebrow">Historie</span><h3>Terminverlauf</h3></div></div><div class="appointment-history-list">${historyRows(items)}</div>`;
    pane.appendChild(section);
  }

  function renderCustomerHistory(customerId){
    const root=document.getElementById('customerDetail');if(!root||root.dataset.customerId!==customerId)return;
    root.querySelector('[data-customer-appointment-history]')?.remove();
    const items=historyForCustomer(customerId);if(!items.length)return;
    const section=document.createElement('section');section.className='detail-card space-top appointment-history';section.dataset.customerAppointmentHistory=customerId;
    section.innerHTML=`<div class="panel-head"><div><span class="eyebrow">Historie</span><h3>Terminverlauf</h3></div></div><div class="appointment-history-list">${historyRows(items)}</div>`;
    root.appendChild(section);
  }

  function rerenderOpenHistory(){
    const projectId=document.getElementById('projectDetail')?.dataset.projectId||'';
    const customerId=document.getElementById('customerDetail')?.dataset.customerId||'';
    if(projectId)renderProjectHistory(projectId);
    if(customerId)renderCustomerHistory(customerId);
  }

  function archivedIds(){
    let archive={customers:[],projects:[]};
    try{const parsed=JSON.parse(localStorage.getItem('tatnera_archive_v1')||'null');if(parsed)archive=parsed;}catch(_error){}
    const projects=new Set((archive.projects||[]).map(entry=>entry.project?.id).filter(Boolean));
    const customers=new Set((archive.customers||[]).map(entry=>entry.customer?.id).filter(Boolean));
    (archive.customers||[]).forEach(entry=>(entry.projects||[]).forEach(project=>project?.id&&projects.add(project.id)));
    return {projects,customers};
  }

  function purgeDeletedHistory(projectId='',customerId=''){
    const archived=archivedIds();
    state.appointmentHistory=(state.appointmentHistory||[]).filter(item=>{
      if(projectId&&item.projectId===projectId)return Boolean(Core.getProject(projectId)||archived.projects.has(projectId));
      if(customerId&&item.customerId===customerId)return Boolean(Core.getCustomer(customerId)||archived.customers.has(customerId));
      return true;
    });
    saveHistory();
  }

  const form=document.getElementById('appointmentForm');
  if(form)form.addEventListener('submit',finalizeTerminal,true);

  document.addEventListener('tatnera:project-opened',event=>requestAnimationFrame(()=>renderProjectHistory(event.detail?.projectId||'')));
  document.addEventListener('tatnera:customer-opened',event=>requestAnimationFrame(()=>renderCustomerHistory(event.detail?.customerId||'')));
  document.addEventListener('tatnera:data-changed',()=>requestAnimationFrame(rerenderOpenHistory));
  document.addEventListener('click',event=>{
    const deleteProject=event.target.closest('[data-delete-project]');if(deleteProject){const id=deleteProject.dataset.deleteProject;setTimeout(()=>purgeDeletedHistory(id,''),0);return;}
    const deleteCustomer=event.target.closest('[data-delete-customer]');if(deleteCustomer){const id=deleteCustomer.dataset.deleteCustomer;setTimeout(()=>purgeDeletedHistory('',id),0);return;}
    if(event.target.closest('[data-purge-archive-project],[data-purge-archive-customer]'))setTimeout(()=>{const archived=archivedIds();state.appointmentHistory=(state.appointmentHistory||[]).filter(item=>(!item.projectId||Core.getProject(item.projectId)||archived.projects.has(item.projectId))&&(!item.customerId||Core.getCustomer(item.customerId)||archived.customers.has(item.customerId)));saveHistory();},0);
  });

  installStyle();
  saveHistory();
  migrateTerminalEvents();
  wrapAppointmentDialog();
  syncStatusSelect('');
})();
