/* TATNERA — permanent delete for customers, tattoo records and archive entries */
(function(){
  'use strict';
  const Core=window.TatneraCore;if(!Core)return;
  const esc=Core.esc;
  const ARCHIVE_KEY='tatnera_archive_v1';

  function installStyle(){
    if(document.getElementById('recordDeleteStyle'))return;
    const style=document.createElement('style');style.id='recordDeleteStyle';style.textContent=`
      .record-permanent-delete{border-color:#9a3535!important;color:#ff8d8d!important;background:transparent!important}
      .record-permanent-delete:hover{background:#4a1717!important;color:#fff!important}
      .record-archive-row-actions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
    `;document.head.appendChild(style);
  }

  function eventMoment(event){
    const date=String(event?.date||'');if(!date)return null;
    const time=String(event?.start||'23:59');
    const moment=new Date(`${date}T${time}:00`);
    return Number.isNaN(moment.getTime())?null:moment;
  }
  function futureEvents(predicate){
    const now=new Date();
    return (state.calendarEvents||[]).filter(event=>{
      const moment=eventMoment(event);
      return moment&&moment>=now&&predicate(event);
    });
  }
  function persistRequests(){if(Array.isArray(state.requests))localStorage.setItem('tatnera_requests',JSON.stringify(state.requests));}
  function refreshAll(){
    persist();persistRequests();
    if(typeof renderCustomers==='function')renderCustomers();
    if(typeof renderProjects==='function')renderProjects();
    if(typeof updateCustomerSelect==='function')updateCustomerSelect();
    if(typeof renderCalendar==='function')renderCalendar();
    if(typeof renderAppointments==='function')renderAppointments();
    document.dispatchEvent(new CustomEvent('tatnera:data-changed',{detail:{type:'permanent-delete'}}));
  }

  function enhanceCustomer(id){
    const customer=Core.getCustomer(id),root=document.getElementById('customerDetail');if(!customer||!root)return;
    const actions=root.querySelector('.customer-primary-actions');if(!actions||actions.querySelector('[data-delete-customer]'))return;
    actions.insertAdjacentHTML('beforeend',`<button type="button" class="btn ghost record-permanent-delete" data-delete-customer="${esc(id)}">Endgültig löschen</button>`);
  }

  function enhanceProject(id){
    const project=Core.getProject(id),root=document.getElementById('projectDetail');if(!project||!root)return;
    const actions=root.querySelector('.record-actions')||root.querySelector('.project-header-action');if(!actions||actions.querySelector('[data-delete-project]'))return;
    actions.insertAdjacentHTML('beforeend',`<button type="button" class="btn ghost record-permanent-delete" data-delete-project="${esc(id)}">Endgültig löschen</button>`);
  }

  function deleteProject(id){
    const project=Core.getProject(id);if(!project)return;
    const upcoming=futureEvents(event=>event.projectId===id);
    if(upcoming.length){alert(`Dieses Tattoo hat noch ${upcoming.length} anstehende${upcoming.length===1?'n Termin':' Termine'}. Bitte zuerst den Termin löschen oder verschieben.`);return;}
    const linkedEvents=(state.calendarEvents||[]).filter(event=>event.projectId===id).length;
    if(!confirm(`„${project.title}“ endgültig löschen?\n\nDas kann nicht rückgängig gemacht werden. Die Tattoo-Akte sowie ${linkedEvents} zugehörige${linkedEvents===1?'r Termin':' Termine'} werden dauerhaft entfernt.`))return;
    const customerId=project.customerId;
    state.projects=state.projects.filter(item=>item.id!==id);
    state.calendarEvents=(state.calendarEvents||[]).filter(event=>event.projectId!==id);
    if(Array.isArray(state.requests))state.requests.forEach(request=>{if(request.projectId===id)request.projectId='';});
    const customer=Core.getCustomer(customerId);
    if(customer){const remaining=state.projects.filter(item=>item.customerId===customerId);customer.lastProject=remaining[0]?.title||'—';}
    refreshAll();
    if(customer)openCustomer(customerId);else navigate('projects');
  }

  function deleteCustomer(id){
    const customer=Core.getCustomer(id);if(!customer)return;
    const projects=state.projects.filter(project=>project.customerId===id),projectIds=new Set(projects.map(project=>project.id));
    const upcoming=futureEvents(event=>event.customerId===id||projectIds.has(event.projectId));
    if(upcoming.length){alert(`Dieser Kunde hat noch ${upcoming.length} anstehende${upcoming.length===1?'n Termin':' Termine'}. Bitte zuerst die Termine löschen oder verschieben.`);return;}
    const linkedEvents=(state.calendarEvents||[]).filter(event=>event.customerId===id||projectIds.has(event.projectId)).length;
    if(!confirm(`${customer.firstName} ${customer.lastName} endgültig löschen?\n\nDas kann nicht rückgängig gemacht werden. ${projects.length} Tattoo-Akte${projects.length===1?'':'n'} und ${linkedEvents} zugehörige${linkedEvents===1?'r Termin':' Termine'} werden ebenfalls dauerhaft entfernt. Verknüpfte Anfragen bleiben erhalten, werden aber vom Kunden getrennt.`))return;
    state.customers=state.customers.filter(item=>item.id!==id);
    state.projects=state.projects.filter(project=>project.customerId!==id);
    state.calendarEvents=(state.calendarEvents||[]).filter(event=>!(event.customerId===id||projectIds.has(event.projectId)));
    if(Array.isArray(state.requests))state.requests.forEach(request=>{
      if(request.customerId===id)request.customerId='';
      if(projectIds.has(request.projectId))request.projectId='';
    });
    refreshAll();navigate('customers');
  }

  function loadArchive(){
    try{const parsed=JSON.parse(localStorage.getItem(ARCHIVE_KEY)||'null');return parsed&&typeof parsed==='object'?{customers:Array.isArray(parsed.customers)?parsed.customers:[],projects:Array.isArray(parsed.projects)?parsed.projects:[]}:{customers:[],projects:[]};}
    catch(_error){return {customers:[],projects:[]};}
  }
  function saveArchive(archive){
    localStorage.setItem(ARCHIVE_KEY,JSON.stringify(archive));
    const count=archive.customers.length+archive.projects.length;
    document.querySelectorAll('[data-archive-count]').forEach(node=>node.textContent=count?`(${count})`:'');
  }
  function formatArchiveDate(value){
    if(!value)return '—';
    try{return new Intl.DateTimeFormat('de-DE',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));}catch(_error){return '—';}
  }
  function renderArchiveWithDelete(){
    const archive=loadArchive(),customers=document.querySelector('[data-archive-customers]'),projects=document.querySelector('[data-archive-projects]');
    if(customers)customers.innerHTML=archive.customers.length?archive.customers.map((entry,index)=>`<div class="record-archive-row"><div><strong>${esc(entry.customer?.firstName||'')} ${esc(entry.customer?.lastName||'')}</strong><span>${entry.projects?.length||0} Tattoo${entry.projects?.length===1?'':'s'} · archiviert ${esc(formatArchiveDate(entry.archivedAt))}</span></div><div class="record-archive-row-actions"><button type="button" class="btn ghost" data-restore-customer="${index}">Wiederherstellen</button><button type="button" class="btn ghost record-permanent-delete" data-purge-archive-customer="${index}">Löschen</button></div></div>`).join(''):'<div class="record-empty">Keine archivierten Kunden.</div>';
    if(projects)projects.innerHTML=archive.projects.length?archive.projects.map((entry,index)=>`<div class="record-archive-row"><div><strong>${esc(entry.project?.title||'Tattoo')}</strong><span>${esc(entry.customerSnapshot||'Kunde')} · archiviert ${esc(formatArchiveDate(entry.archivedAt))}</span></div><div class="record-archive-row-actions"><button type="button" class="btn ghost" data-restore-project="${index}">Wiederherstellen</button><button type="button" class="btn ghost record-permanent-delete" data-purge-archive-project="${index}">Löschen</button></div></div>`).join(''):'<div class="record-empty">Keine archivierten Tattoo-Akten.</div>';
  }
  function purgeArchiveCustomer(index){
    const archive=loadArchive(),entry=archive.customers[index];if(!entry)return;
    if(!confirm(`${entry.customer?.firstName||''} ${entry.customer?.lastName||''} endgültig aus dem Archiv löschen?\n\nAlle darin archivierten Tattoo-Akten und Termine werden unwiderruflich entfernt.`))return;
    archive.customers.splice(index,1);saveArchive(archive);renderArchiveWithDelete();
  }
  function purgeArchiveProject(index){
    const archive=loadArchive(),entry=archive.projects[index];if(!entry)return;
    if(!confirm(`„${entry.project?.title||'Tattoo'}“ endgültig aus dem Archiv löschen?\n\nDieser Vorgang kann nicht rückgängig gemacht werden.`))return;
    archive.projects.splice(index,1);saveArchive(archive);renderArchiveWithDelete();
  }

  document.addEventListener('click',event=>{
    const projectButton=event.target.closest('[data-delete-project]');if(projectButton){event.preventDefault();event.stopPropagation();deleteProject(projectButton.dataset.deleteProject);return;}
    const customerButton=event.target.closest('[data-delete-customer]');if(customerButton){event.preventDefault();event.stopPropagation();deleteCustomer(customerButton.dataset.deleteCustomer);return;}
    const purgeCustomer=event.target.closest('[data-purge-archive-customer]');if(purgeCustomer){event.preventDefault();event.stopPropagation();purgeArchiveCustomer(Number(purgeCustomer.dataset.purgeArchiveCustomer));return;}
    const purgeProject=event.target.closest('[data-purge-archive-project]');if(purgeProject){event.preventDefault();event.stopPropagation();purgeArchiveProject(Number(purgeProject.dataset.purgeArchiveProject));return;}
    if(event.target.closest('[data-open-record-archive]'))setTimeout(renderArchiveWithDelete,0);
  });

  document.addEventListener('tatnera:customer-opened',event=>requestAnimationFrame(()=>enhanceCustomer(event.detail?.customerId)));
  document.addEventListener('tatnera:project-opened',event=>requestAnimationFrame(()=>enhanceProject(event.detail?.projectId)));

  installStyle();
})();