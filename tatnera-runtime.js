/* TATNERA — consolidated application runtime v2
   Navigation, workflow, dashboard, artists and browser history live here.
   Fachmodule bleiben eigenständig und kommunizieren über Events / IDs. */
(function(){
  'use strict';
  const Core=window.TatneraCore;if(!Core)return;
  const esc=Core.esc;
  const euro=value=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(value)||0);
  const formatDate=value=>value?new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(value+'T12:00:00')):'—';
  const minutes=time=>{const [h,m]=String(time||'00:00').split(':').map(Number);return (h||0)*60+(m||0);};
  const paid=p=>Math.max(0,(p?.payments||[]).reduce((sum,tx)=>sum+(tx.type==='Erstattung'?-1:1)*Math.abs(Number(tx.amount)||0),0));
  const depositOpen=p=>Math.max(0,Math.max(0,Number(p?.deposit)||0)-Math.min(paid(p),Math.max(0,Number(p?.deposit)||0)));
  const futureEvents=()=>[...(state.calendarEvents||[])].filter(e=>e.date>=todayISO()).sort((a,b)=>a.date.localeCompare(b.date)||String(a.start).localeCompare(String(b.start)));
  const nextProjectEvent=id=>futureEvents().find(e=>e.projectId===id)||null;
  const nextCustomerEvent=id=>futureEvents().find(e=>e.customerId===id)||null;
  let activeRequestId='';

  function installStyles(){
    if(!document.querySelector('link[href="dashboard-ux.css"]')){const link=document.createElement('link');link.rel='stylesheet';link.href='dashboard-ux.css';document.head.appendChild(link);}
    const style=document.createElement('style');style.textContent=`
      .customer-primary-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:16px}
      .customer-project-actions{display:flex;gap:7px;margin-top:11px;padding-top:10px;border-top:1px solid var(--line)}
      .customer-project-actions .btn{font-size:11px;padding:7px 10px}
      .project-header-action{display:flex;justify-content:flex-start;margin-top:11px}
      .artist-settings-list{display:flex;flex-direction:column;gap:8px;margin-top:14px}
      .artist-settings-row{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:12px;border:1px solid var(--line);border-radius:12px}
      .artist-settings-row>div:first-child{display:flex;flex-direction:column;gap:3px}
      .artist-settings-row small{color:var(--muted)}
      .artist-settings-row>div:last-child{display:flex;gap:7px;flex-wrap:wrap}
    `;document.head.appendChild(style);
  }

  function installRenderers(){
    renderProjects=function(){
      const list=document.getElementById('projectList'),recent=document.getElementById('recentProjects');
      if(list)list.innerHTML=state.projects.map(projectCard).join('');
      if(recent)recent.innerHTML=state.projects.slice(0,3).map(projectCard).join('');
      bindProjectCards();
    };

    renderCustomers=function(filter=''){
      const body=document.getElementById('customerTableBody');if(!body)return;
      const q=String(filter||'').trim().toLowerCase();
      const items=(state.customers||[]).filter(c=>`${c.firstName||''} ${c.lastName||''} ${c.email||''} ${c.phone||''}`.toLowerCase().includes(q));
      body.innerHTML=items.map(c=>{
        const projects=state.projects.filter(p=>p.customerId===c.id),event=nextCustomerEvent(c.id),openDeposit=projects.reduce((sum,p)=>sum+depositOpen(p),0);
        return `<tr data-customer-id="${esc(c.id)}"><td><div class="customer-cell"><div class="customer-avatar">${esc(initials(c))}</div><strong>${esc(c.firstName)} ${esc(c.lastName)}</strong></div></td><td><span>${esc(c.email||'—')}</span><br><span class="muted">${esc(c.phone||'—')}</span></td><td>${esc(c.lastProject||projects[0]?.title||'—')}</td><td>${event?esc(formatDate(event.date)+' · '+event.start):'—'}</td><td><span class="status-pill">${openDeposit>0?'Anzahlung offen':esc(c.status||'Aktiv')}</span></td><td>→</td></tr>`;
      }).join('')||'<tr><td colspan="6" class="muted">Keine Kunden gefunden.</td></tr>';
      body.querySelectorAll('[data-customer-id]').forEach(row=>row.addEventListener('click',()=>openCustomer(row.dataset.customerId)));
    };

    renderAppointments=function(){
      const root=document.getElementById('todayAppointments');if(!root)return;
      const events=(state.calendarEvents||[]).filter(e=>e.date===todayISO()).sort((a,b)=>a.start.localeCompare(b.start));
      root.innerHTML=events.slice(0,6).map(e=>{
        const customer=e.customerId?customerName(e.customerId):eventTypeLabel(e.type),detail=e.projectId?projectName(e.projectId):(e.notes||eventTypeLabel(e.type));
        return `<button type="button" class="appointment dashboard-appointment" data-dashboard-event="${esc(e.id)}"><div class="time">${esc(e.start)}</div><div class="main-info"><strong>${esc(customer)}</strong><span>${esc(detail)} · ${esc(e.artist||'—')}</span></div><span class="status-pill">${esc(e.status||'')}</span></button>`;
      }).join('')||'<p class="muted">Heute sind noch keine Termine eingetragen.</p>';
    };

    openCustomer=function(id){
      const c=Core.getCustomer(id);if(!c)return;
      const projects=state.projects.filter(p=>p.customerId===id),totalPaid=projects.reduce((sum,p)=>sum+paid(p),0),event=nextCustomerEvent(id),root=document.getElementById('customerDetail');if(!root)return;
      root.dataset.customerId=id;
      root.innerHTML=`<div class="detail-hero"><section class="detail-card"><div class="detail-profile"><div class="big-avatar">${esc(initials(c))}</div><div><span class="eyebrow">Kunde</span><h2>${esc(c.firstName)} ${esc(c.lastName)}</h2><div class="muted">${esc(c.email||'Keine E-Mail')} · ${esc(c.phone||'Keine Telefonnummer')}</div></div></div><div class="detail-stat-grid"><div class="mini-stat"><span>Tattoos</span><strong>${projects.length}</strong></div><div class="mini-stat"><span>Bezahlt</span><strong>${esc(euro(totalPaid))}</strong></div><div class="mini-stat"><span>Nächster Termin</span><strong>${event?esc(formatDate(event.date)+' · '+event.start):'—'}</strong></div></div><div class="customer-primary-actions"><button type="button" class="btn primary" data-customer-schedule="${esc(id)}">+ Termin vereinbaren</button><button type="button" class="btn ghost" data-customer-new-tattoo="${esc(id)}">+ Neues Tattoo</button></div></section><section class="detail-card"><span class="eyebrow">Notizen</span><h3>Studio-Hinweise</h3><p class="muted">${esc(c.notes||'Noch keine Notizen vorhanden.')}</p></section></div><section class="detail-card"><div class="panel-head"><div><span class="eyebrow">Historie</span><h3>Tattoo-Projekte</h3></div></div><div class="project-grid">${projects.length?projects.map(p=>{const card=projectCard(p);return card.replace('</div></article>',`<div class="customer-project-actions"><button type="button" class="btn ghost" data-project-schedule="${esc(p.id)}" data-project-customer="${esc(id)}">Termin planen</button></div></div></article>`);}).join(''):'<p class="muted">Noch kein Tattoo angelegt.</p>'}</div></section>`;
      navigate('customer-detail');bindProjectCards();
      document.dispatchEvent(new CustomEvent('tatnera:customer-opened',{detail:{customerId:id}}));
    };
  }

  function installProjectWrapper(){
    const previous=openProject;
    openProject=function(id){
      const p=Core.getProject(id);if(!p)return;
      previous(id);
      const detail=document.getElementById('projectDetail');if(detail)detail.dataset.projectId=id;
      requestAnimationFrame(()=>{
        enhanceProject(id);
        if(!detail?.querySelector('[data-project-tab].active'))Core.activateProjectTab('overview',{emit:false});
        document.dispatchEvent(new CustomEvent('tatnera:project-opened',{detail:{projectId:id}}));
      });
    };
    document.addEventListener('click',event=>{const tab=event.target.closest('#projectDetail [data-project-tab]');if(!tab)return;event.preventDefault();Core.activateProjectTab(tab.dataset.projectTab);},true);
  }

  function enhanceProject(id){
    const p=Core.getProject(id),detail=document.getElementById('projectDetail');if(!p||!detail)return;
    detail.dataset.projectId=id;
    const title=detail.querySelector('.project-focus-title');
    if(title&&!title.querySelector('[data-project-schedule]'))title.insertAdjacentHTML('beforeend',`<div class="project-header-action"><button type="button" class="btn primary" data-project-schedule="${esc(id)}" data-project-customer="${esc(p.customerId)}">+ Termin vereinbaren</button></div>`);
  }

  function syncArtistControls(){
    const projectForm=document.getElementById('projectForm');if(projectForm?.elements.artist)Core.populateArtistSelect(projectForm.elements.artist,Core.artistNameFallback());
    const appointmentForm=document.getElementById('appointmentForm');if(appointmentForm?.elements.artist){const current=appointmentForm.elements.artist.value;Core.populateArtistSelect(appointmentForm.elements.artist,current&&Core.getArtists(true).some(a=>a.name===current)?current:Core.artistNameFallback());}
    renderArtistFilter();
  }

  function renderArtistFilter(){
    const root=document.getElementById('artistFilter');if(!root)return;
    if(state.calendar.artist!=='all'&&!Core.getArtists(true).some(a=>a.name===state.calendar.artist))state.calendar.artist='all';
    const selected=state.calendar.artist||'all';
    root.innerHTML=`<button data-artist="all" class="${selected==='all'?'active':''}">Alle</button>${Core.getArtists(true).map(a=>`<button data-artist="${esc(a.name)}" class="${selected===a.name?'active':''}">${esc(a.name)}</button>`).join('')}`;
  }

  function renderArtistSettings(){
    const settings=document.getElementById('settings');if(!settings)return;
    document.getElementById('artistSettingsPanel')?.remove();
    const panel=document.createElement('section');panel.id='artistSettingsPanel';panel.className='theme-settings-panel artist-settings-panel';
    panel.innerHTML=`<div class="theme-settings-head"><div><span class="eyebrow">Studio</span><h3>Artists</h3><p>Artists zentral verwalten. Kalender und neue Tattoos verwenden automatisch diese Liste.</p></div><button type="button" class="btn primary" data-add-artist>+ Artist</button></div><div class="artist-settings-list">${Core.getArtists(false).map(a=>`<div class="artist-settings-row"><div><strong>${esc(a.name)}</strong><small>${a.active!==false?'Aktiv':'Deaktiviert'}</small></div><div><button type="button" class="btn ghost" data-rename-artist="${esc(a.id)}">Umbenennen</button><button type="button" class="btn ghost" data-toggle-artist="${esc(a.id)}">${a.active!==false?'Deaktivieren':'Aktivieren'}</button></div></div>`).join('')}</div>`;
    const ink=settings.querySelector('.ink-settings');if(ink)settings.insertBefore(panel,ink);else settings.append(panel);
  }

  function installArtistUi(){
    renderArtistSettings();syncArtistControls();
    document.addEventListener('tatnera:artists-changed',()=>{renderArtistSettings();syncArtistControls();renderCalendar();});
    document.addEventListener('click',event=>{
      const add=event.target.closest('[data-add-artist]');if(add){const name=prompt('Name des Artists:');if(name)Core.addArtist(name);return;}
      const rename=event.target.closest('[data-rename-artist]');if(rename){const artist=Core.getArtists(false).find(a=>a.id===rename.dataset.renameArtist),name=prompt('Artist umbenennen:',artist?.name||'');if(name)Core.renameArtist(rename.dataset.renameArtist,name);return;}
      const toggle=event.target.closest('[data-toggle-artist]');if(toggle){const artist=Core.getArtists(false).find(a=>a.id===toggle.dataset.toggleArtist);if(!artist)return;if(artist.active!==false&&Core.getArtists(true).length<=1){alert('Mindestens ein aktiver Artist muss vorhanden bleiben.');return;}Core.setArtistActive(toggle.dataset.toggleArtist,artist.active===false);}
    });
  }

  function installDialogWrappers(){
    const previousProjectDialog=openProjectDialog;
    openProjectDialog=function(customerId=''){
      previousProjectDialog(customerId);
      const form=document.getElementById('projectForm');if(form?.elements.artist)Core.populateArtistSelect(form.elements.artist,Core.artistNameFallback());
    };

    const previousAppointment=openAppointmentDialog;
    openAppointmentDialog=function(eventId='',date=''){
      previousAppointment(eventId,date);
      const form=document.getElementById('appointmentForm'),existing=state.calendarEvents.find(item=>item.id===eventId);
      if(form?.elements.artist){const preferred=existing?.artist||(state.calendar.artist!=='all'&&Core.getArtists(true).some(a=>a.name===state.calendar.artist)?state.calendar.artist:Core.artistNameFallback());Core.populateArtistSelect(form.elements.artist,preferred);}
    };

    const appointment=document.getElementById('appointmentForm');
    if(appointment){
      appointment.addEventListener('submit',event=>{
        const end=minutes(appointment.elements.start.value)+Number(appointment.elements.duration.value||0);
        if(end>1440){event.preventDefault();event.stopImmediatePropagation();alert('Der Termin darf nicht über Mitternacht hinausgehen.');return;}
        if(appointment.elements.type.value==='block'){appointment.elements.customerId.value='';appointment.elements.projectId.value='';appointment.elements.status.value='Blockiert';}
        else if(appointment.elements.projectId.value){const project=Core.getProject(appointment.elements.projectId.value);if(project)appointment.elements.customerId.value=project.customerId;}
      },true);
      appointment.elements.projectId?.addEventListener('change',()=>{const project=Core.getProject(appointment.elements.projectId.value);if(project){appointment.elements.customerId.value=project.customerId;Core.populateArtistSelect(appointment.elements.artist,project.artist);appointment.elements.type.value='tattoo';}});
    }

    const projectForm=document.getElementById('projectForm');
    if(projectForm)projectForm.addEventListener('submit',event=>{
      const price=Number(projectForm.elements.price?.value)||0,deposit=Number(projectForm.elements.deposit?.value)||0;
      if(price>0&&deposit>price&&!confirm('Die Anzahlung ist höher als der Gesamtpreis. Tattoo trotzdem anlegen?')){event.preventDefault();event.stopImmediatePropagation();return;}
      if(projectForm.elements.scheduleAppointment?.checked&&minutes(projectForm.elements.appointmentStart.value)+Number(projectForm.elements.appointmentDuration.value||0)>1440){event.preventDefault();event.stopImmediatePropagation();alert('Der erste Termin darf nicht über Mitternacht hinausgehen.');}
    },true);
  }

  function prepareAppointment(customerId,projectId=''){
    const projects=state.projects.filter(p=>p.customerId===customerId),project=Core.getProject(projectId),chosen=project&&project.customerId===customerId?project:(projects.length===1?projects[0]:null);
    openAppointmentDialog('',todayISO());
    const form=document.getElementById('appointmentForm');if(!form)return;
    form.elements.projectId.innerHTML='<option value="">Kein Tattoo-Projekt / Beratung</option>'+projects.map(p=>`<option value="${esc(p.id)}">${esc(p.title)}</option>`).join('');
    form.elements.customerId.value=customerId;form.elements.projectId.value=chosen?.id||'';form.elements.type.value=chosen?'tattoo':'consultation';Core.populateArtistSelect(form.elements.artist,chosen?.artist||Core.artistNameFallback());form.elements.status.value='Angefragt';form.elements.duration.value=chosen?120:45;form.elements.notes.value=chosen?`Termin für ${chosen.title}`:'Beratung';
  }

  function ensureRequestLinks(request){
    let customerId=request.customerId;
    if(!customerId||!Core.getCustomer(customerId)){
      let customer=state.customers.find(c=>c.email&&request.email&&c.email.toLowerCase()===request.email.toLowerCase())||state.customers.find(c=>c.phone&&request.phone&&c.phone===request.phone);
      if(!customer){customer={id:'c'+Date.now(),firstName:request.firstName||'',lastName:request.lastName||'',email:request.email||'',phone:request.phone||'',notes:`Aus Tattoo-Anfrage: ${request.motif}`,lastProject:'—',next:'—',status:'Neu'};state.customers.unshift(customer);}
      customerId=customer.id;request.customerId=customerId;
    }
    let projectId=request.projectId;
    if(!projectId||!Core.getProject(projectId)){
      const p={id:'p'+(Date.now()+1),customerId,title:request.motif,placement:request.placement||'—',size:request.size||'',artist:request.artist||Core.artistNameFallback(),price:Number(request.quotedPrice||0),deposit:0,status:'Entwurf',description:request.description||'',consent:'Fehlt',colors:[],inkIds:[],versions:[],payments:[],aftercare:{status:'Offen',tattooDate:'',followupDate:'',instructionsGiven:false,records:[]}};
      state.projects.unshift(p);projectId=p.id;request.projectId=projectId;const c=Core.getCustomer(customerId);if(c)c.lastProject=p.title;
    }
    persist();localStorage.setItem('tatnera_requests',JSON.stringify(state.requests));return{customerId,projectId};
  }

  function archiveRequest(request){
    if(!request||!state.requests?.some(r=>r.id===request.id))return;
    const archive=JSON.parse(localStorage.getItem('tatnera_request_archive')||'[]');archive.unshift({...request,stage:'done',completedAt:new Date().toISOString()});localStorage.setItem('tatnera_request_archive',JSON.stringify(archive.slice(0,250)));
    state.requests=state.requests.filter(r=>r.id!==request.id);localStorage.setItem('tatnera_requests',JSON.stringify(state.requests));
    const card=document.querySelector(`[data-open-request="${CSS.escape(request.id)}"]`)?.closest('.request-card'),column=card?.closest('.request-column');card?.remove();
    if(column){const count=column.querySelectorAll('.request-card').length,badge=column.querySelector('.column-head span');if(badge)badge.textContent=String(count);if(!count&&!column.querySelector('.request-empty-column'))column.insertAdjacentHTML('beforeend','<div class="request-empty-column">Keine Anfragen</div>');}
    document.querySelectorAll('.nav-item[data-view="requests"] .badge').forEach(b=>b.textContent=String(state.requests.length));
  }

  function convertRequest(request,openAfter=true){const links=ensureRequestLinks(request);request.stage='ready';localStorage.setItem('tatnera_requests',JSON.stringify(state.requests));refreshAll();document.getElementById('requestDetailDialog')?.close();if(openAfter)openProject(links.projectId);return links;}

  function planRequest(request){
    const links=convertRequest(request,false),before=new Set(state.calendarEvents.map(e=>e.id));
    openAppointmentDialog('',state.calendar?.anchor||todayISO());
    const form=document.getElementById('appointmentForm');if(!form)return;
    form.elements.type.value='tattoo';Core.populateArtistSelect(form.elements.artist,request.artist||Core.getProject(links.projectId)?.artist||Core.artistNameFallback());form.elements.customerId.value=links.customerId;form.elements.projectId.value=links.projectId;form.elements.duration.value=180;form.elements.status.value='Angefragt';form.elements.notes.value=`Aus Anfrage: ${request.motif}`;
    form.addEventListener('submit',()=>setTimeout(()=>{const saved=state.calendarEvents.find(e=>!before.has(e.id)&&e.projectId===links.projectId);if(saved){archiveRequest(request);refreshAll();}},0),{once:true});
  }

  function installDashboard(){
    const dashboard=document.getElementById('dashboard');if(!dashboard)return;
    const left=dashboard.querySelector('.cockpit-requests'),right=dashboard.querySelector('.cockpit-projects');
    if(left){left.className='panel cockpit-unscheduled';left.innerHTML='<div class="cockpit-head"><div><span class="eyebrow">Planung</span><h3>Ohne Termin</h3></div><button class="text-btn" data-runtime-calendar>Kalender →</button></div><div class="dashboard-work-list" data-unscheduled-list></div>';}
    if(right){right.className='panel cockpit-nextsteps';right.innerHTML='<div class="cockpit-head"><div><span class="eyebrow">Priorität</span><h3>Nächste Schritte</h3></div></div><div class="dashboard-work-list" data-nextsteps-list></div>';}
    const tasks=dashboard.querySelector('.cockpit-task-grid');if(tasks)tasks.innerHTML='<button type="button" data-dashboard-task="requests"><span>Neue Anfragen</span><strong data-dash-requests>0</strong><small>jetzt prüfen</small></button><button type="button" data-dashboard-task="consents"><span>Einwilligungen</span><strong data-dash-consents>0</strong><small>betroffene Tattoos anzeigen</small></button><button type="button" data-dashboard-task="deposits"><span>Anzahlungen</span><strong data-dash-deposits>0 €</strong><small>offene Zahlungen anzeigen</small></button>';
    ensureActionDialog();refreshDashboardRuntime();
  }

  function ensureActionDialog(){if(document.getElementById('runtimeActionDialog'))return;const dialog=document.createElement('dialog');dialog.id='runtimeActionDialog';dialog.className='dialog dashboard-action-dialog';dialog.innerHTML='<div><div class="dialog-head"><div><span class="eyebrow">Dashboard</span><h2 id="runtimeActionTitle">Offene Punkte</h2><p class="muted" id="runtimeActionMeta"></p></div><button type="button" class="close-btn" data-close-runtime-action>×</button></div><div class="dashboard-action-list" id="runtimeActionList"></div><div class="dialog-actions"><button type="button" class="btn ghost" data-close-runtime-action>Schließen</button></div></div>';document.body.append(dialog);dialog.querySelectorAll('[data-close-runtime-action]').forEach(b=>b.addEventListener('click',()=>dialog.close()));}

  function openAction(type){
    const dialog=document.getElementById('runtimeActionDialog'),title=document.getElementById('runtimeActionTitle'),meta=document.getElementById('runtimeActionMeta'),list=document.getElementById('runtimeActionList');let projects=[];
    if(type==='consents'){projects=state.projects.filter(p=>!['Unterschrieben','Vorhanden'].includes(p.consent));title.textContent='Offene Einwilligungen';meta.textContent=`${projects.length} Tattoo${projects.length===1?'':'s'} betroffen.`;list.innerHTML=projects.map(p=>`<button class="dashboard-action-row" data-action-project="${esc(p.id)}" data-action-tab="documents"><div><strong>${esc(p.title)}</strong><span>${esc(customerName(p.customerId))}</span></div><span>→</span></button>`).join('')||'<div class="dashboard-action-empty">Alles erledigt.</div>';}
    else{projects=state.projects.filter(p=>depositOpen(p)>0);title.textContent='Offene Anzahlungen';meta.textContent=`${projects.length} Tattoo${projects.length===1?'':'s'} betroffen.`;list.innerHTML=projects.map(p=>`<button class="dashboard-action-row" data-action-project="${esc(p.id)}" data-action-tab="payments"><div><strong>${esc(p.title)}</strong><span>${esc(customerName(p.customerId))}</span></div><div><small>Noch offen</small><strong>${esc(euro(depositOpen(p)))}</strong></div><span>→</span></button>`).join('')||'<div class="dashboard-action-empty">Alles erledigt.</div>';}
    if(!dialog.open)dialog.showModal();
  }

  function nextSteps(){
    const limit=new Date();limit.setDate(limit.getDate()+14);const limitIso=limit.toISOString().slice(0,10),items=[];
    state.projects.forEach(p=>{const e=nextProjectEvent(p.id);if(e&&e.date<=limitIso&&!['Unterschrieben','Vorhanden'].includes(p.consent))items.push({priority:1,severity:'urgent',title:'Einwilligung fehlt',subtitle:`${customerName(p.customerId)} · ${p.title}`,value:`${formatDate(e.date)} · ${e.start}`,projectId:p.id,tab:'documents'});if(e&&e.date<=limitIso&&depositOpen(p)>0)items.push({priority:2,severity:'warn',title:`Anzahlung offen · ${euro(depositOpen(p))}`,subtitle:`${customerName(p.customerId)} · ${p.title}`,value:`${formatDate(e.date)} · ${e.start}`,projectId:p.id,tab:'payments'});if(p.aftercare?.status==='Nachstechen empfohlen')items.push({priority:1,severity:'urgent',title:'Nachstechen empfohlen',subtitle:`${customerName(p.customerId)} · ${p.title}`,value:'prüfen',projectId:p.id,tab:'aftercare'});else if(p.aftercare?.followupDate&&p.aftercare.followupDate<=todayISO()&&!['Abgeschlossen','Nachstechen geplant'].includes(p.aftercare.status))items.push({priority:2,severity:'warn',title:'Heilungskontrolle fällig',subtitle:`${customerName(p.customerId)} · ${p.title}`,value:formatDate(p.aftercare.followupDate),projectId:p.id,tab:'aftercare'});});
    return items.sort((a,b)=>a.priority-b.priority).slice(0,5);
  }

  function refreshDashboardRuntime(){
    const dashboard=document.getElementById('dashboard');if(!dashboard)return;renderAppointments();
    const fresh=(state.requests||[]).filter(r=>r.stage==='new').length,missing=state.projects.filter(p=>!['Unterschrieben','Vorhanden'].includes(p.consent)).length,deposits=state.projects.reduce((sum,p)=>sum+depositOpen(p),0);
    const r=dashboard.querySelector('[data-dash-requests]'),c=dashboard.querySelector('[data-dash-consents]'),d=dashboard.querySelector('[data-dash-deposits]');if(r)r.textContent=fresh;if(c)c.textContent=missing;if(d)d.textContent=euro(deposits);
    const unscheduled=dashboard.querySelector('[data-unscheduled-list]');if(unscheduled){const projects=state.projects.filter(p=>p.status!=='Abgeschlossen'&&!nextProjectEvent(p.id)).slice(0,5);unscheduled.innerHTML=projects.map(p=>`<button class="dashboard-work-row warn" data-runtime-project="${esc(p.id)}"><div><strong>${esc(p.title)}</strong><span>${esc(customerName(p.customerId))} · ${esc(p.artist||'—')}</span></div><div><small>Planung</small><div class="work-value">Termin fehlt</div></div><span>→</span></button>`).join('')||'<div class="dashboard-action-empty">Alle offenen Tattoos haben einen Termin.</div>';}
    const items=nextSteps(),steps=dashboard.querySelector('[data-nextsteps-list]');if(steps)steps.innerHTML=items.map((item,index)=>`<button class="dashboard-work-row ${item.severity}" data-runtime-step="${index}"><div><strong>${esc(item.title)}</strong><span>${esc(item.subtitle)}</span></div><div><small>Nächster Schritt</small><div class="work-value">${esc(item.value)}</div></div><span>→</span></button>`).join('')||'<div class="dashboard-action-empty">Aktuell keine dringenden nächsten Schritte.</div>';dashboard._runtimeSteps=items;
  }

  function installHistory(){
    let restoring=false,mute=0,lastKey='';
    const key=route=>JSON.stringify(route);
    const current=()=>{const route={view:state.currentView||'dashboard'};if(route.view==='project-detail'){route.projectId=Core.projectIdFromDetail();route.tab=document.querySelector('#projectDetail [data-project-tab].active')?.dataset.projectTab||'overview';}if(route.view==='customer-detail')route.customerId=document.getElementById('customerDetail')?.dataset.customerId||'';if(route.view==='calendar')route.calendar={view:state.calendar.view,anchor:state.calendar.anchor,artist:state.calendar.artist};return route;};
    const url=route=>route.view==='project-detail'&&route.projectId?`#tattoo/${encodeURIComponent(route.projectId)}/${encodeURIComponent(route.tab||'overview')}`:route.view==='customer-detail'&&route.customerId?`#kunde/${encodeURIComponent(route.customerId)}`:`#${encodeURIComponent(route.view||'dashboard')}`;
    const push=(route,replace=false)=>{if(restoring||mute)return;const k=key(route);if(!replace&&k===lastKey)return;const payload={tatnera:true,route};replace?history.replaceState(payload,'',url(route)):history.pushState(payload,'',url(route));lastKey=k;};

    const originalNavigate=navigate;
    navigate=function(view){originalNavigate(view);if(!restoring&&!mute)queueMicrotask(()=>push(current()));if(view==='dashboard')queueMicrotask(refreshDashboardRuntime);};
    const originalCustomer=openCustomer;
    openCustomer=function(id){mute++;try{originalCustomer(id);}finally{mute--;}if(!restoring)queueMicrotask(()=>push({view:'customer-detail',customerId:id}));};
    const originalProject=openProject;
    openProject=function(id){mute++;try{originalProject(id);}finally{mute--;}if(!restoring)queueMicrotask(()=>push({view:'project-detail',projectId:id,tab:document.querySelector('#projectDetail [data-project-tab].active')?.dataset.projectTab||'overview'}));};

    const restore=route=>{restoring=true;mute++;try{if(route.view==='project-detail'&&route.projectId){originalProject(route.projectId);setTimeout(()=>Core.activateProjectTab(route.tab||'overview',{emit:false}),0);}else if(route.view==='customer-detail'&&route.customerId)originalCustomer(route.customerId);else{if(route.view==='calendar'&&route.calendar)Object.assign(state.calendar,route.calendar);originalNavigate(route.view||'dashboard');}lastKey=key(route);}finally{mute--;setTimeout(()=>restoring=false,0);}};

    if(!(history.state?.tatnera)){history.replaceState({tatneraGuard:true},'',location.pathname+location.search);const route=current();history.pushState({tatnera:true,route},'',url(route));lastKey=key(route);}else lastKey=key(history.state.route||current());
    window.addEventListener('popstate',event=>{if(event.state?.tatnera)restore(event.state.route);else if(event.state?.tatneraGuard){const route={view:'dashboard'};history.pushState({tatnera:true,route},'',url(route));restore(route);}});
    document.addEventListener('tatnera:project-tab',event=>{if(!restoring&&event.detail?.projectId)push({view:'project-detail',projectId:event.detail.projectId,tab:event.detail.tab});});
    document.addEventListener('click',event=>{const back=event.target.closest('.back-btn');if(back){event.preventDefault();event.stopImmediatePropagation();history.back();}},true);
    document.addEventListener('click',event=>{if(!event.target.closest('#calendar button'))return;setTimeout(()=>{if(state.currentView==='calendar')push(current(),true);},0);});
    document.addEventListener('change',event=>{if(!event.target.closest('#calendar'))return;setTimeout(()=>{if(state.currentView==='calendar')push(current(),true);},0);});
  }

  function installInteractions(){
    document.addEventListener('click',event=>{
      const appointment=event.target.closest('[data-dashboard-event]');if(appointment){const e=state.calendarEvents.find(item=>item.id===appointment.dataset.dashboardEvent);if(e?.projectId)openProject(e.projectId);else if(e?.customerId)openCustomer(e.customerId);else if(e)openAppointmentDialog(e.id,e.date);return;}
      const scheduleCustomer=event.target.closest('[data-customer-schedule]');if(scheduleCustomer){event.preventDefault();prepareAppointment(scheduleCustomer.dataset.customerSchedule);return;}
      const scheduleProject=event.target.closest('[data-project-schedule]');if(scheduleProject){event.preventDefault();event.stopPropagation();prepareAppointment(scheduleProject.dataset.projectCustomer,scheduleProject.dataset.projectSchedule);return;}
      const newTattoo=event.target.closest('[data-customer-new-tattoo]');if(newTattoo){event.preventDefault();openProjectDialog(newTattoo.dataset.customerNewTattoo);return;}
      const openRequest=event.target.closest('[data-open-request]');if(openRequest)activeRequestId=openRequest.dataset.openRequest;
      const convert=event.target.closest('[data-convert-request]');if(convert&&activeRequestId){const request=state.requests?.find(r=>r.id===activeRequestId);if(request){event.preventDefault();event.stopImmediatePropagation();convertRequest(request,true);}return;}
      const plan=event.target.closest('[data-plan-request]');if(plan&&activeRequestId){const request=state.requests?.find(r=>r.id===activeRequestId);if(request){event.preventDefault();event.stopImmediatePropagation();planRequest(request);}return;}
      const task=event.target.closest('[data-dashboard-task]');if(task){if(task.dataset.dashboardTask==='requests')navigate('requests');else openAction(task.dataset.dashboardTask);return;}
      const action=event.target.closest('[data-action-project]');if(action){document.getElementById('runtimeActionDialog')?.close();openProject(action.dataset.actionProject);setTimeout(()=>Core.activateProjectTab(action.dataset.actionTab),0);return;}
      const project=event.target.closest('[data-runtime-project]');if(project){openProject(project.dataset.runtimeProject);return;}
      const step=event.target.closest('[data-runtime-step]');if(step){const item=document.getElementById('dashboard')?._runtimeSteps?.[Number(step.dataset.runtimeStep)];if(item){openProject(item.projectId);setTimeout(()=>Core.activateProjectTab(item.tab),0);}return;}
      if(event.target.closest('[data-runtime-calendar]'))navigate('calendar');
    },true);

    const appointmentForm=document.getElementById('appointmentForm');
    if(appointmentForm)appointmentForm.addEventListener('submit',()=>{const projectId=appointmentForm.elements.projectId.value;if(projectId){const linked=state.requests?.find(r=>r.projectId===projectId);if(linked&&!document.getElementById('requestDetailDialog')?.open)setTimeout(()=>archiveRequest(linked),0);}setTimeout(refreshAll,0);});
    document.addEventListener('tatnera:data-changed',refreshAll);
  }

  function refreshAll(){renderCustomers(document.getElementById('customerSearch')?.value||'');renderProjects();refreshDashboardRuntime();renderArtistSettings();try{renderCalendar();}catch(_error){}document.dispatchEvent(new CustomEvent('tatnera:runtime-refresh'));}

  function installNotification(){const button=document.querySelector('.icon-btn[title="Benachrichtigungen"]');if(!button)return;button.onclick=()=>{let toast=document.getElementById('runtimeToast');if(!toast){toast=document.createElement('div');toast.id='runtimeToast';toast.style.cssText='position:fixed;right:24px;top:78px;z-index:9999;padding:11px 14px;border:1px solid var(--line);border-radius:11px;background:var(--panel);box-shadow:0 14px 35px rgba(0,0,0,.18);font-size:12px';document.body.appendChild(toast);}toast.textContent='Aktuell keine neuen Benachrichtigungen.';toast.hidden=false;clearTimeout(toast._timer);toast._timer=setTimeout(()=>toast.hidden=true,2200);};}

  function install(){installStyles();installRenderers();installProjectWrapper();installDialogWrappers();installArtistUi();installDashboard();installInteractions();installNotification();syncArtistControls();refreshAll();installHistory();document.dispatchEvent(new CustomEvent('tatnera:runtime-ready'));}
  install();
})();
