/* TATNERA — customer & tattoo record management
   Editing keeps stable IDs. Archiving removes records from the active workspace
   but stores the complete record + related calendar events for later restore. */
(function(){
  'use strict';
  const Core=window.TatneraCore;if(!Core)return;
  const esc=Core.esc;
  const ARCHIVE_KEY='tatnera_archive_v1';
  let activeCustomerId='',activeProjectId='';

  function loadArchive(){
    try{
      const parsed=JSON.parse(localStorage.getItem(ARCHIVE_KEY)||'null');
      return parsed&&typeof parsed==='object'?{customers:Array.isArray(parsed.customers)?parsed.customers:[],projects:Array.isArray(parsed.projects)?parsed.projects:[]}:{customers:[],projects:[]};
    }catch(_error){return {customers:[],projects:[]};}
  }
  let archive=loadArchive();
  function saveArchive(){localStorage.setItem(ARCHIVE_KEY,JSON.stringify(archive));updateArchiveButtons();}
  function formatDate(value){return value?new Intl.DateTimeFormat('de-DE',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)):'—';}
  function euro(value){return new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:2}).format(Number(value)||0);}
  function paid(project){return Math.max(0,(project?.payments||[]).reduce((sum,tx)=>sum+(tx.type==='Erstattung'?-1:1)*Math.abs(Number(tx.amount)||0),0));}
  function futureEvents(predicate){const today=todayISO();return (state.calendarEvents||[]).filter(event=>event.date>=today&&predicate(event));}
  function uniquePush(target,items,key='id'){for(const item of items||[]){if(item&&!target.some(existing=>existing?.[key]===item?.[key]))target.push(item);}}

  function installStyle(){
    if(document.getElementById('recordManagementStyle'))return;
    const style=document.createElement('style');style.id='recordManagementStyle';style.textContent=`
      .record-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
      .record-danger{border-color:#7d3232!important;color:#ef9a9a!important}
      .record-danger:hover{background:#3a1818!important;color:#fff!important}
      .record-archive-btn{white-space:nowrap}
      .record-dialog{width:min(92vw,820px);max-width:820px}
      .record-dialog form,.record-dialog-inner{padding:22px}
      .record-archive-sections{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:16px}
      .record-archive-section{border:1px solid var(--line);border-radius:13px;padding:14px;background:var(--panel-2)}
      .record-archive-section h3{margin:0 0 10px;font-size:15px}
      .record-archive-list{display:flex;flex-direction:column;gap:8px}
      .record-archive-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px;border:1px solid var(--line);border-radius:10px;background:var(--panel)}
      .record-archive-row>div{min-width:0}
      .record-archive-row strong,.record-archive-row span{display:block}
      .record-archive-row strong{font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .record-archive-row span{font-size:10px;color:var(--muted);margin-top:3px}
      .record-empty{font-size:11px;color:var(--muted);padding:12px;border:1px dashed var(--line);border-radius:10px;text-align:center}
      @media(max-width:720px){.record-archive-sections{grid-template-columns:1fr}}
    `;document.head.appendChild(style);
  }

  function installDialogs(){
    if(!document.getElementById('customerEditDialog')){
      const dialog=document.createElement('dialog');dialog.id='customerEditDialog';dialog.className='dialog record-dialog';dialog.innerHTML=`<form id="customerEditForm"><div class="dialog-head"><div><span class="eyebrow">Kundenakte</span><h2>Kundendaten bearbeiten</h2></div><button type="button" class="close-btn" data-close-customer-edit>×</button></div><div class="form-grid"><label>Vorname<input required name="firstName"></label><label>Nachname<input required name="lastName"></label><label>E-Mail<input type="email" name="email"></label><label>Telefon<input name="phone"></label><label class="full">Notizen<textarea name="notes" rows="4"></textarea></label></div><div class="dialog-actions"><button type="button" class="btn ghost" data-close-customer-edit>Abbrechen</button><button type="submit" class="btn primary">Änderungen speichern</button></div></form>`;document.body.appendChild(dialog);
      dialog.querySelectorAll('[data-close-customer-edit]').forEach(button=>button.addEventListener('click',()=>dialog.close()));
      dialog.querySelector('#customerEditForm').addEventListener('submit',saveCustomerEdit);
    }

    if(!document.getElementById('projectEditDialog')){
      const dialog=document.createElement('dialog');dialog.id='projectEditDialog';dialog.className='dialog record-dialog';dialog.innerHTML=`<form id="projectEditForm"><div class="dialog-head"><div><span class="eyebrow">Tattoo-Akte</span><h2>Tattoo bearbeiten</h2><p class="muted" id="projectEditMeta"></p></div><button type="button" class="close-btn" data-close-project-edit>×</button></div><div class="form-grid three"><label>Motiv<input required name="title"></label><label>Körperstelle<input required name="placement"></label><label>Größe<input name="size"></label><label>Artist<select required name="artist"></select></label><label>Status<select required name="status"><option>Entwurf</option><option>Termin geplant</option><option>In Arbeit</option><option>Pausiert</option><option>Abgeschlossen</option></select></label><label>Gesamtpreis (€)<input type="number" min="0" step="0.01" name="price"></label><label>Anzahlung (€)<input type="number" min="0" step="0.01" name="deposit"></label><label class="full">Beschreibung<textarea name="description" rows="4"></textarea></label></div><div class="dialog-actions"><button type="button" class="btn ghost" data-close-project-edit>Abbrechen</button><button type="submit" class="btn primary">Änderungen speichern</button></div></form>`;document.body.appendChild(dialog);
      dialog.querySelectorAll('[data-close-project-edit]').forEach(button=>button.addEventListener('click',()=>dialog.close()));
      dialog.querySelector('#projectEditForm').addEventListener('submit',saveProjectEdit);
    }

    if(!document.getElementById('recordArchiveDialog')){
      const dialog=document.createElement('dialog');dialog.id='recordArchiveDialog';dialog.className='dialog record-dialog';dialog.innerHTML=`<div class="record-dialog-inner"><div class="dialog-head"><div><span class="eyebrow">Archiv</span><h2>Archivierte Akten</h2><p class="muted">Archivierte Datensätze bleiben vollständig erhalten und können jederzeit wiederhergestellt werden.</p></div><button type="button" class="close-btn" data-close-record-archive>×</button></div><div class="record-archive-sections"><section class="record-archive-section"><h3>Kunden</h3><div class="record-archive-list" data-archive-customers></div></section><section class="record-archive-section"><h3>Tattoo-Akten</h3><div class="record-archive-list" data-archive-projects></div></section></div><div class="dialog-actions"><button type="button" class="btn ghost" data-close-record-archive>Schließen</button></div></div>`;document.body.appendChild(dialog);
      dialog.querySelectorAll('[data-close-record-archive]').forEach(button=>button.addEventListener('click',()=>dialog.close()));
    }
  }

  function installArchiveButtons(){
    const customerToolbar=document.querySelector('#customers .section-toolbar');
    const addCustomer=document.getElementById('addCustomerBtn');
    if(customerToolbar&&addCustomer&&!customerToolbar.querySelector('[data-open-record-archive]'))addCustomer.insertAdjacentHTML('beforebegin','<button type="button" class="btn ghost record-archive-btn" data-open-record-archive>Archiv <span data-archive-count></span></button>');
    const projectToolbar=document.querySelector('#projects .section-toolbar');
    const addProject=document.getElementById('addProjectBtn');
    if(projectToolbar&&addProject&&!projectToolbar.querySelector('[data-open-record-archive]'))addProject.insertAdjacentHTML('beforebegin','<button type="button" class="btn ghost record-archive-btn" data-open-record-archive>Archiv <span data-archive-count></span></button>');
    updateArchiveButtons();
  }

  function updateArchiveButtons(){const count=(archive.customers?.length||0)+(archive.projects?.length||0);document.querySelectorAll('[data-archive-count]').forEach(node=>node.textContent=count?`(${count})`:'');}

  function enhanceCustomer(id){
    const customer=Core.getCustomer(id),root=document.getElementById('customerDetail');if(!customer||!root)return;
    const actions=root.querySelector('.customer-primary-actions');if(!actions||actions.querySelector('[data-edit-customer]'))return;
    actions.insertAdjacentHTML('beforeend',`<button type="button" class="btn ghost" data-edit-customer="${esc(id)}">Bearbeiten</button><button type="button" class="btn ghost record-danger" data-archive-customer="${esc(id)}">Archivieren</button>`);
  }

  function enhanceProject(id){
    const project=Core.getProject(id),root=document.getElementById('projectDetail');if(!project||!root)return;
    const title=root.querySelector('.project-focus-title')||root.querySelector('.detail-card');if(!title||title.querySelector('[data-edit-project]'))return;
    const actions=document.createElement('div');actions.className='record-actions';actions.innerHTML=`<button type="button" class="btn ghost" data-edit-project="${esc(id)}">Tattoo bearbeiten</button><button type="button" class="btn ghost record-danger" data-archive-project="${esc(id)}">Archivieren</button>`;title.appendChild(actions);
  }

  function openCustomerEdit(id){
    const customer=Core.getCustomer(id),form=document.getElementById('customerEditForm');if(!customer||!form)return;activeCustomerId=id;form.elements.firstName.value=customer.firstName||'';form.elements.lastName.value=customer.lastName||'';form.elements.email.value=customer.email||'';form.elements.phone.value=customer.phone||'';form.elements.notes.value=customer.notes||'';document.getElementById('customerEditDialog').showModal();
  }

  function saveCustomerEdit(event){
    event.preventDefault();const customer=Core.getCustomer(activeCustomerId);if(!customer)return;const data=Object.fromEntries(new FormData(event.currentTarget).entries());customer.firstName=String(data.firstName||'').trim();customer.lastName=String(data.lastName||'').trim();customer.email=String(data.email||'').trim();customer.phone=String(data.phone||'').trim();customer.notes=String(data.notes||'').trim();persist();document.getElementById('customerEditDialog').close();renderCustomers();updateCustomerSelect();openCustomer(customer.id);document.dispatchEvent(new CustomEvent('tatnera:data-changed',{detail:{type:'customer',customerId:customer.id}}));
  }

  function openProjectEdit(id){
    const project=Core.getProject(id),form=document.getElementById('projectEditForm');if(!project||!form)return;activeProjectId=id;form.elements.title.value=project.title||'';form.elements.placement.value=project.placement||'';form.elements.size.value=project.size||'';Core.populateArtistSelect(form.elements.artist,project.artist||Core.artistNameFallback());const statuses=[...form.elements.status.options].map(option=>option.value);if(project.status&&!statuses.includes(project.status)){const option=new Option(project.status,project.status);form.elements.status.add(option);}form.elements.status.value=project.status||'Entwurf';form.elements.price.value=Number(project.price)||0;form.elements.deposit.value=Number(project.deposit)||0;form.elements.description.value=project.description||'';document.getElementById('projectEditMeta').textContent=`${customerName(project.customerId)} · ID ${project.id}`;document.getElementById('projectEditDialog').showModal();
  }

  function saveProjectEdit(event){
    event.preventDefault();const project=Core.getProject(activeProjectId);if(!project)return;const data=Object.fromEntries(new FormData(event.currentTarget).entries()),nextPrice=Math.max(0,Number(data.price)||0),nextDeposit=Math.max(0,Number(data.deposit)||0);if(nextDeposit>nextPrice&&nextPrice>0&&!confirm('Die Anzahlung ist höher als der Gesamtpreis. Trotzdem speichern?'))return;if(nextPrice<paid(project)&&!confirm(`Es wurden bereits ${euro(paid(project))} bezahlt. Der neue Gesamtpreis liegt darunter. Trotzdem speichern?`))return;const oldArtist=project.artist,oldTitle=project.title;project.title=String(data.title||'').trim();project.placement=String(data.placement||'').trim();project.size=String(data.size||'').trim();project.artist=String(data.artist||'').trim();project.status=String(data.status||'Entwurf');project.price=nextPrice;project.deposit=nextDeposit;project.description=String(data.description||'').trim();if(oldArtist!==project.artist)(state.calendarEvents||[]).forEach(item=>{if(item.projectId===project.id)item.artist=project.artist;});const customer=Core.getCustomer(project.customerId);if(customer&&(customer.lastProject===oldTitle||!customer.lastProject||customer.lastProject==='—'))customer.lastProject=project.title;persist();document.getElementById('projectEditDialog').close();renderProjects();renderCustomers();openProject(project.id);document.dispatchEvent(new CustomEvent('tatnera:data-changed',{detail:{type:'project',projectId:project.id}}));
  }

  function archiveProject(id){
    const project=Core.getProject(id);if(!project)return;const upcoming=futureEvents(event=>event.projectId===id);if(upcoming.length){alert(`Dieses Tattoo hat noch ${upcoming.length} zukünftige${upcoming.length===1?'n Termin':' Termine'}. Bitte den Termin zuerst absagen, verschieben oder entfernen.`);return;}if(!confirm(`„${project.title}“ archivieren?\n\nZahlungen, Einwilligung, Farben, Nachsorge und bisherige Termine bleiben im Archiv erhalten.`))return;const events=(state.calendarEvents||[]).filter(event=>event.projectId===id);archive.projects.unshift({project:structuredClone(project),events:structuredClone(events),customerSnapshot:customerName(project.customerId),archivedAt:new Date().toISOString()});state.projects=state.projects.filter(item=>item.id!==id);state.calendarEvents=state.calendarEvents.filter(event=>event.projectId!==id);const customer=Core.getCustomer(project.customerId);if(customer){const remaining=state.projects.filter(item=>item.customerId===customer.id);customer.lastProject=remaining[0]?.title||'—';}persist();saveArchive();renderProjects();renderCustomers();document.dispatchEvent(new CustomEvent('tatnera:data-changed',{detail:{type:'archive-project',projectId:id}}));if(customer)openCustomer(customer.id);else navigate('customers');
  }

  function archiveCustomer(id){
    const customer=Core.getCustomer(id);if(!customer)return;const projects=state.projects.filter(project=>project.customerId===id),projectIds=new Set(projects.map(project=>project.id));const upcoming=futureEvents(event=>event.customerId===id||projectIds.has(event.projectId));if(upcoming.length){alert(`Dieser Kunde hat noch ${upcoming.length} zukünftige${upcoming.length===1?'n Termin':' Termine'}. Bitte diese zuerst absagen, verschieben oder entfernen.`);return;}const openRequests=(state.requests||[]).filter(request=>request.customerId===id&&request.stage!=='archived');if(openRequests.length){alert('Zu diesem Kunden existiert noch eine offene Anfrage. Bitte die Anfrage zuerst abschließen oder archivieren.');return;}if(!confirm(`${customer.firstName} ${customer.lastName} archivieren?\n\n${projects.length} Tattoo-Akte${projects.length===1?'':'n'} und die zugehörige Historie werden gemeinsam ins Archiv verschoben.`))return;const events=(state.calendarEvents||[]).filter(event=>event.customerId===id||projectIds.has(event.projectId));archive.customers.unshift({customer:structuredClone(customer),projects:structuredClone(projects),events:structuredClone(events),archivedAt:new Date().toISOString()});state.customers=state.customers.filter(item=>item.id!==id);state.projects=state.projects.filter(project=>project.customerId!==id);state.calendarEvents=state.calendarEvents.filter(event=>!(event.customerId===id||projectIds.has(event.projectId)));persist();saveArchive();renderCustomers();renderProjects();updateCustomerSelect();document.dispatchEvent(new CustomEvent('tatnera:data-changed',{detail:{type:'archive-customer',customerId:id}}));navigate('customers');
  }

  function restoreProject(index){
    const entry=archive.projects[index];if(!entry?.project)return;if(Core.getProject(entry.project.id)){alert('Diese Tattoo-ID existiert bereits im aktiven Bereich. Wiederherstellung abgebrochen.');return;}if(!Core.getCustomer(entry.project.customerId)){alert('Der zugehörige Kunde ist nicht aktiv. Stelle zuerst den Kunden wieder her.');return;}state.projects.unshift(structuredClone(entry.project));uniquePush(state.calendarEvents,structuredClone(entry.events||[]));archive.projects.splice(index,1);persist();saveArchive();renderCustomers();renderProjects();renderArchive();openProject(entry.project.id);document.getElementById('recordArchiveDialog')?.close();
  }

  function restoreCustomer(index){
    const entry=archive.customers[index];if(!entry?.customer)return;if(Core.getCustomer(entry.customer.id)){alert('Diese Kunden-ID existiert bereits im aktiven Bereich. Wiederherstellung abgebrochen.');return;}state.customers.unshift(structuredClone(entry.customer));for(const project of entry.projects||[]){if(!Core.getProject(project.id))state.projects.push(structuredClone(project));}uniquePush(state.calendarEvents,structuredClone(entry.events||[]));archive.customers.splice(index,1);persist();saveArchive();renderCustomers();renderProjects();updateCustomerSelect();renderArchive();openCustomer(entry.customer.id);document.getElementById('recordArchiveDialog')?.close();
  }

  function renderArchive(){
    const customers=document.querySelector('[data-archive-customers]'),projects=document.querySelector('[data-archive-projects]');if(customers)customers.innerHTML=archive.customers.length?archive.customers.map((entry,index)=>`<div class="record-archive-row"><div><strong>${esc(entry.customer?.firstName||'')} ${esc(entry.customer?.lastName||'')}</strong><span>${entry.projects?.length||0} Tattoo${entry.projects?.length===1?'':'s'} · archiviert ${esc(formatDate(entry.archivedAt))}</span></div><button type="button" class="btn ghost" data-restore-customer="${index}">Wiederherstellen</button></div>`).join(''):'<div class="record-empty">Keine archivierten Kunden.</div>';if(projects)projects.innerHTML=archive.projects.length?archive.projects.map((entry,index)=>`<div class="record-archive-row"><div><strong>${esc(entry.project?.title||'Tattoo')}</strong><span>${esc(entry.customerSnapshot||'Kunde')} · archiviert ${esc(formatDate(entry.archivedAt))}</span></div><button type="button" class="btn ghost" data-restore-project="${index}">Wiederherstellen</button></div>`).join(''):'<div class="record-empty">Keine archivierten Tattoo-Akten.</div>';
  }

  document.addEventListener('click',event=>{
    const editCustomer=event.target.closest('[data-edit-customer]');if(editCustomer){event.preventDefault();openCustomerEdit(editCustomer.dataset.editCustomer);return;}
    const editProject=event.target.closest('[data-edit-project]');if(editProject){event.preventDefault();openProjectEdit(editProject.dataset.editProject);return;}
    const archiveCustomerButton=event.target.closest('[data-archive-customer]');if(archiveCustomerButton){event.preventDefault();archiveCustomer(archiveCustomerButton.dataset.archiveCustomer);return;}
    const archiveProjectButton=event.target.closest('[data-archive-project]');if(archiveProjectButton){event.preventDefault();archiveProject(archiveProjectButton.dataset.archiveProject);return;}
    if(event.target.closest('[data-open-record-archive]')){event.preventDefault();renderArchive();document.getElementById('recordArchiveDialog').showModal();return;}
    const restoreCustomerButton=event.target.closest('[data-restore-customer]');if(restoreCustomerButton){event.preventDefault();restoreCustomer(Number(restoreCustomerButton.dataset.restoreCustomer));return;}
    const restoreProjectButton=event.target.closest('[data-restore-project]');if(restoreProjectButton){event.preventDefault();restoreProject(Number(restoreProjectButton.dataset.restoreProject));}
  });

  document.addEventListener('tatnera:customer-opened',event=>requestAnimationFrame(()=>enhanceCustomer(event.detail?.customerId)));
  document.addEventListener('tatnera:project-opened',event=>requestAnimationFrame(()=>enhanceProject(event.detail?.projectId)));

  installStyle();installDialogs();installArchiveButtons();
})();