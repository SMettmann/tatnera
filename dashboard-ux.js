/* TATNERA — actionable dashboard UX */
(function(){
  const esc=value=>String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const euro=value=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(value)||0);
  const formatDate=value=>value?new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'short'}).format(new Date(value+'T12:00:00')):'—';

  function ensureCss(){if(document.querySelector('link[href="dashboard-ux.css"]'))return;const link=document.createElement('link');link.rel='stylesheet';link.href='dashboard-ux.css';document.head.appendChild(link);}
  function paymentTotal(p){return (p.payments||[]).reduce((sum,tx)=>sum+(tx.type==='Erstattung'?-1:1)*Math.abs(Number(tx.amount)||0),0);}
  function depositOpen(p){return Math.max(0,Number(p.deposit||0)-Math.min(Math.max(0,paymentTotal(p)),Number(p.deposit||0)));}
  function futureEvents(){const today=todayISO();return (state.calendarEvents||[]).filter(e=>e.date>=today).sort((a,b)=>a.date.localeCompare(b.date)||a.start.localeCompare(b.start));}
  function nextEvent(projectId){return futureEvents().find(e=>e.projectId===projectId)||null;}
  function hasFutureEvent(projectId){return Boolean(nextEvent(projectId));}

  function installDialog(){
    if(document.getElementById('dashboardActionDialog'))return;
    const dialog=document.createElement('dialog');dialog.id='dashboardActionDialog';dialog.className='dialog dashboard-action-dialog';
    dialog.innerHTML=`<div><div class="dialog-head"><div><span class="eyebrow">Dashboard</span><h2 id="dashboardActionTitle">Offene Punkte</h2><p class="muted" id="dashboardActionMeta"></p></div><button type="button" class="close-btn" data-close-dashboard-action>×</button></div><div class="dashboard-action-list" id="dashboardActionList"></div><div class="dialog-actions"><button type="button" class="btn ghost" data-close-dashboard-action>Schließen</button></div></div>`;
    document.body.appendChild(dialog);
    dialog.querySelectorAll('[data-close-dashboard-action]').forEach(btn=>btn.addEventListener('click',()=>dialog.close()));
    dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
  }

  function openProjectTab(projectId,tab){
    document.getElementById('dashboardActionDialog')?.close();
    openProject(projectId);
    if(tab)setTimeout(()=>document.querySelector(`#projectDetail [data-project-tab="${tab}"]`)?.click(),40);
  }

  function openActionDialog(type){
    installDialog();
    const dialog=document.getElementById('dashboardActionDialog');
    const title=document.getElementById('dashboardActionTitle');
    const meta=document.getElementById('dashboardActionMeta');
    const list=document.getElementById('dashboardActionList');
    let rows=[];

    if(type==='consents'){
      rows=state.projects.filter(p=>!['Unterschrieben','Vorhanden'].includes(p.consent));
      title.textContent='Offene Einwilligungen';meta.textContent=`${rows.length} Tattoo${rows.length===1?'':'s'} benötigen noch eine vollständige Einwilligung.`;
      list.innerHTML=rows.length?rows.map(p=>{const event=nextEvent(p.id);return `<button class="dashboard-action-row" data-action-project="${esc(p.id)}" data-action-tab="documents"><div><strong>${esc(p.title)}</strong><span>${esc(customerName(p.customerId))} · ${esc(p.artist||'—')}</span></div><div><small>${event?'Nächster Termin':'Termin'}</small><div class="amount">${event?esc(formatDate(event.date)+' · '+event.start):'noch keiner'}</div></div><span>→</span></button>`;}).join(''):'<div class="dashboard-action-empty">Alle Einwilligungen sind vollständig.</div>';
    }else if(type==='deposits'){
      rows=state.projects.filter(p=>depositOpen(p)>0);
      title.textContent='Offene Anzahlungen';meta.textContent=`${rows.length} Tattoo${rows.length===1?'':'s'} mit noch offener Anzahlung.`;
      list.innerHTML=rows.length?rows.map(p=>{const event=nextEvent(p.id);return `<button class="dashboard-action-row" data-action-project="${esc(p.id)}" data-action-tab="payments"><div><strong>${esc(p.title)}</strong><span>${esc(customerName(p.customerId))}${event?' · '+esc(formatDate(event.date)) : ''}</span></div><div><small>Noch offen</small><div class="amount">${esc(euro(depositOpen(p)))}</div></div><span>→</span></button>`;}).join(''):'<div class="dashboard-action-empty">Keine offenen Anzahlungen.</div>';
    }

    list.querySelectorAll('[data-action-project]').forEach(btn=>btn.addEventListener('click',()=>openProjectTab(btn.dataset.actionProject,btn.dataset.actionTab)));
    if(!dialog.open)dialog.showModal();
  }

  function installUsefulPanels(){
    const dashboard=document.getElementById('dashboard');if(!dashboard)return;
    const left=dashboard.querySelector('.cockpit-requests');
    if(left){left.className='panel cockpit-unscheduled';left.innerHTML=`<div class="cockpit-head"><div><span class="eyebrow">Planung</span><h3>Ohne Termin</h3></div><button class="text-btn" data-open-calendar>Kalender →</button></div><div class="dashboard-work-list" data-unscheduled-list></div>`;left.querySelector('[data-open-calendar]')?.addEventListener('click',()=>navigate('calendar'));}
    const right=dashboard.querySelector('.cockpit-projects');
    if(right){right.className='panel cockpit-nextsteps';right.innerHTML=`<div class="cockpit-head"><div><span class="eyebrow">Priorität</span><h3>Nächste Schritte</h3></div></div><div class="dashboard-work-list" data-nextsteps-list></div>`;}
  }

  function renderUnscheduled(){
    const root=document.querySelector('#dashboard [data-unscheduled-list]');if(!root)return;
    const projects=state.projects.filter(p=>p.status!=='Abgeschlossen'&&!hasFutureEvent(p.id)).slice(0,5);
    root.innerHTML=projects.length?projects.map(p=>`<button class="dashboard-work-row warn" data-unscheduled-project="${esc(p.id)}"><div><strong>${esc(p.title)}</strong><span>${esc(customerName(p.customerId))} · ${esc(p.artist||'—')}</span></div><div><small>Planung</small><div class="work-value">Termin fehlt</div></div><span>→</span></button>`).join(''):'<div class="dashboard-action-empty">Alle offenen Tattoos haben einen kommenden Termin.</div>';
    root.querySelectorAll('[data-unscheduled-project]').forEach(btn=>btn.addEventListener('click',()=>openProject(btn.dataset.unscheduledProject)));
  }

  function collectNextSteps(){
    const today=todayISO();const limitDate=new Date();limitDate.setDate(limitDate.getDate()+14);const limit=`${limitDate.getFullYear()}-${String(limitDate.getMonth()+1).padStart(2,'0')}-${String(limitDate.getDate()).padStart(2,'0')}`;
    const items=[];
    state.projects.forEach(p=>{
      const event=nextEvent(p.id);
      if(event&&event.date<=limit&&!['Unterschrieben','Vorhanden'].includes(p.consent))items.push({priority:1,kind:'project',projectId:p.id,tab:'documents',severity:'urgent',title:'Einwilligung fehlt',subtitle:`${customerName(p.customerId)} · ${p.title}`,value:`${formatDate(event.date)} · ${event.start}`});
      if(event&&event.date<=limit&&depositOpen(p)>0)items.push({priority:2,kind:'project',projectId:p.id,tab:'payments',severity:'warn',title:`Anzahlung offen · ${euro(depositOpen(p))}`,subtitle:`${customerName(p.customerId)} · ${p.title}`,value:`${formatDate(event.date)} · ${event.start}`});
      const ac=p.aftercare||{};
      if(ac.status==='Nachstechen empfohlen')items.push({priority:1,kind:'project',projectId:p.id,tab:'aftercare',severity:'urgent',title:'Nachstechen empfohlen',subtitle:`${customerName(p.customerId)} · ${p.title}`,value:ac.followupDate?formatDate(ac.followupDate):'prüfen'});
      else if(ac.followupDate&&ac.followupDate<=today&&ac.status!=='Abgeschlossen'&&ac.status!=='Nachstechen geplant')items.push({priority:2,kind:'project',projectId:p.id,tab:'aftercare',severity:'warn',title:'Heilungskontrolle fällig',subtitle:`${customerName(p.customerId)} · ${p.title}`,value:formatDate(ac.followupDate)});
    });
    (Array.isArray(state.requests)?state.requests:[]).filter(r=>r.stage==='ready'&&!r.archived).forEach(r=>items.push({priority:3,kind:'request',requestId:r.id,severity:'info',title:'Anfrage ist terminbereit',subtitle:`${(r.firstName||'')+' '+(r.lastName||'')} · ${r.motif||'Tattoo'}`,value:'Termin planen'}));
    return items.sort((a,b)=>a.priority-b.priority).slice(0,5);
  }

  function renderNextSteps(){
    const root=document.querySelector('#dashboard [data-nextsteps-list]');if(!root)return;
    const items=collectNextSteps();
    root.innerHTML=items.length?items.map((item,index)=>`<button class="dashboard-work-row ${item.severity}" data-nextstep-index="${index}"><div><strong>${esc(item.title)}</strong><span>${esc(item.subtitle)}</span></div><div><small>Nächster Schritt</small><div class="work-value">${esc(item.value)}</div></div><span>→</span></button>`).join(''):'<div class="dashboard-action-empty">Aktuell keine dringenden nächsten Schritte.</div>';
    root.querySelectorAll('[data-nextstep-index]').forEach(btn=>btn.addEventListener('click',()=>{
      const item=items[Number(btn.dataset.nextstepIndex)];if(!item)return;
      if(item.kind==='project')openProjectTab(item.projectId,item.tab);
      else if(item.kind==='request'){navigate('requests');setTimeout(()=>document.querySelector(`[data-open-request="${item.requestId}"]`)?.click(),30);}
    }));
  }

  function renderTaskButtons(){
    const grid=document.querySelector('#dashboard .cockpit-task-grid');if(!grid)return;
    const requestCount=Array.isArray(state.requests)?state.requests.filter(r=>r.stage==='new'&&!r.archived).length:0;
    const missing=state.projects.filter(p=>!['Unterschrieben','Vorhanden'].includes(p.consent)).length;
    const deposits=state.projects.reduce((sum,p)=>sum+depositOpen(p),0);
    grid.innerHTML=`<button type="button" data-dashboard-task="requests"><span>Neue Anfragen</span><strong data-dash-requests>${requestCount}</strong><small>jetzt prüfen</small></button><button type="button" data-dashboard-task="consents"><span>Einwilligungen</span><strong data-dash-consents>${missing}</strong><small>betroffene Tattoos anzeigen</small></button><button type="button" data-dashboard-task="deposits"><span>Anzahlungen</span><strong data-dash-deposits>${esc(euro(deposits))}</strong><small>offene Zahlungen anzeigen</small></button>`;
    grid.querySelector('[data-dashboard-task="requests"]')?.addEventListener('click',()=>navigate('requests'));
    grid.querySelector('[data-dashboard-task="consents"]')?.addEventListener('click',()=>openActionDialog('consents'));
    grid.querySelector('[data-dashboard-task="deposits"]')?.addEventListener('click',()=>openActionDialog('deposits'));
  }

  function installAppointmentRenderer(){
    renderAppointments=function(){
      const root=document.getElementById('todayAppointments');if(!root)return;
      const today=todayISO();const events=(state.calendarEvents||[]).filter(e=>e.date===today).sort((a,b)=>a.start.localeCompare(b.start));
      root.innerHTML=events.slice(0,5).map(e=>{const customer=e.customerId?customerName(e.customerId):eventTypeLabel(e.type);const detail=e.projectId?projectName(e.projectId):(e.notes||eventTypeLabel(e.type));return `<button type="button" class="appointment dashboard-appointment" data-dashboard-event="${esc(e.id)}"><div class="time">${esc(e.start)}</div><div class="main-info"><strong>${esc(customer)}</strong><span>${esc(detail)} · ${esc(e.artist||'—')}</span></div><span class="status-pill">${esc(e.status)}</span></button>`;}).join('')||'<p class="muted">Heute sind noch keine Termine eingetragen.</p>';
      root.querySelectorAll('[data-dashboard-event]').forEach(btn=>btn.addEventListener('click',()=>{const event=state.calendarEvents.find(e=>e.id===btn.dataset.dashboardEvent);if(!event)return;if(event.projectId)openProject(event.projectId);else if(event.customerId)openCustomer(event.customerId);else openAppointmentDialog(event.id,event.date);}));
    };
    renderAppointments();
  }

  function enhanceInkAlert(){
    const card=document.getElementById('dashboardInkAlert');if(!card||card.dataset.dashboardClickBound==='1')return;
    card.dataset.dashboardClickBound='1';card.tabIndex=0;card.setAttribute('role','button');
    const open=()=>{navigate('settings');setTimeout(()=>document.querySelector('.ink-settings')?.scrollIntoView({behavior:'smooth',block:'start'}),30);};
    card.addEventListener('click',event=>{if(event.target.closest('button'))return;open();});
    card.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();open();}});
  }

  function refresh(){installUsefulPanels();renderTaskButtons();renderUnscheduled();renderNextSteps();renderAppointments();enhanceInkAlert();}

  function wrapUpdates(){
    const oldPersist=persist;persist=function(){oldPersist();queueMicrotask(refresh);};
    const oldNavigate=navigate;navigate=function(view){oldNavigate(view);if(view==='dashboard')queueMicrotask(refresh);};
  }

  ensureCss();installDialog();installAppointmentRenderer();installUsefulPanels();wrapUpdates();refresh();
  setTimeout(enhanceInkAlert,250);
})();
