/* TATNERA — consolidated UI shell
   Owns layout/view composition only. No persist/navigation wrappers. */
(function(){
  'use strict';
  const Core=window.TatneraCore;
  const esc=Core?.esc||((v)=>String(v??''));
  const euro=v=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(v)||0);
  const formatDate=v=>v?new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(v+'T12:00:00')):'—';
  const paymentTotal=p=>Math.max(0,(p.payments||[]).reduce((sum,tx)=>sum+(tx.type==='Erstattung'?-1:1)*Math.abs(Number(tx.amount)||0),0));
  const depositOpen=p=>Math.max(0,Number(p.deposit||0)-Math.min(paymentTotal(p),Number(p.deposit||0)));
  const restOpen=p=>Math.max(0,Number(p.price||0)-paymentTotal(p));
  const nextProjectEvent=id=>[...(state.calendarEvents||[])].filter(e=>e.projectId===id&&e.date>=todayISO()).sort((a,b)=>a.date.localeCompare(b.date)||String(a.start).localeCompare(String(b.start)))[0]||null;
  const minutes=t=>{const [h,m]=String(t||'00:00').split(':').map(Number);return (h||0)*60+(m||0);};
  let demoRevenue='8.640 €';

  function installCss(){
    ['ui-refresh.css','ui-polish.css'].forEach(href=>{if(document.querySelector(`link[href="${href}"]`))return;const link=document.createElement('link');link.rel='stylesheet';link.href=href;document.head.appendChild(link);});
  }

  function simplifyNavigation(){
    const nav=document.querySelector('.nav');
    if(nav)['dashboard','calendar','requests','customers'].forEach(view=>{const item=nav.querySelector(`.nav-item[data-view="${view}"]`);if(item)nav.appendChild(item);});
    const quick=document.getElementById('quickProjectBtn');if(quick)quick.textContent='+ Neues Tattoo';
    const add=document.getElementById('addProjectBtn');if(add)add.textContent='+ Neues Tattoo';
  }

  function installMoreMenu(){
    const bottom=document.querySelector('.sidebar-bottom'),settings=bottom?.querySelector('.nav-item[data-view="settings"]');
    if(!bottom||!settings||document.getElementById('moreNavToggle'))return;
    const wrap=document.createElement('div');wrap.className='more-nav-wrap';
    const toggle=document.createElement('button');toggle.type='button';toggle.id='moreNavToggle';toggle.className='nav-item more-nav-toggle';toggle.innerHTML='<span>•••</span> Mehr <b>⌄</b>';
    const menu=document.createElement('div');menu.className='more-nav-menu';menu.hidden=true;
    const finance=document.createElement('button');finance.type='button';finance.className='nav-item';finance.dataset.view='finance';finance.innerHTML='<span>€</span> Finanzen';
    settings.remove();menu.append(finance,settings);wrap.append(toggle,menu);bottom.prepend(wrap);
    toggle.addEventListener('click',()=>{menu.hidden=!menu.hidden;toggle.classList.toggle('open',!menu.hidden);});
    finance.addEventListener('click',()=>{menu.hidden=true;toggle.classList.remove('open');navigate('finance');});
    settings.addEventListener('click',()=>{menu.hidden=true;toggle.classList.remove('open');});
    document.addEventListener('click',event=>{if(!wrap.contains(event.target)){menu.hidden=true;toggle.classList.remove('open');}});
  }

  function installFinanceView(){
    if(document.getElementById('finance'))return;
    const section=document.createElement('section');section.id='finance';section.className='view';section.innerHTML='<div class="finance-view" id="financeView"></div>';document.querySelector('.main')?.appendChild(section);
    try{pageTitles.finance='Finanzen';}catch(_error){}
    renderFinance();
  }

  function monthlyPayments(){
    const now=new Date(),y=now.getFullYear(),m=now.getMonth();let total=0,count=0;
    state.projects.forEach(project=>(project.payments||[]).forEach(tx=>{if(!tx.date)return;const d=new Date(tx.date+'T12:00:00');if(d.getFullYear()!==y||d.getMonth()!==m)return;const amount=Math.abs(Number(tx.amount)||0);total+=tx.type==='Erstattung'?-amount:amount;count++;}));
    return {total:Math.max(0,total),count};
  }

  function renderFinance(){
    const root=document.getElementById('financeView');if(!root)return;
    const month=monthlyPayments(),openDeposits=state.projects.reduce((sum,p)=>sum+depositOpen(p),0),openRest=state.projects.reduce((sum,p)=>sum+restOpen(p),0),label=new Intl.DateTimeFormat('de-DE',{month:'long',year:'numeric'}).format(new Date()),revenue=month.count?euro(month.total):demoRevenue;
    root.innerHTML=`<div class="finance-heading"><div><span class="eyebrow">Studio</span><h2>Finanzen</h2><p class="muted">Zahlungen und offene Beträge – bewusst außerhalb des täglichen Dashboards.</p></div></div><div class="finance-stats"><article class="finance-main"><span>Monatsumsatz · ${esc(label)}</span><strong>${esc(revenue)}</strong><small>${month.count?month.count+' erfasste Zahlung'+(month.count===1?'':'en'):'Demo-Wert, bis echte Zahlungen erfasst sind'}</small></article><article><span>Offene Anzahlungen</span><strong>${esc(euro(openDeposits))}</strong><small>${state.projects.filter(p=>depositOpen(p)>0).length} Projekte</small></article><article><span>Offene Restbeträge</span><strong>${esc(euro(openRest))}</strong><small>über alle Tattoo-Akten</small></article></div><section class="panel finance-list-panel"><div class="panel-head"><div><span class="eyebrow">Offen</span><h3>Zahlungen nach Tattoo</h3></div></div><div class="finance-project-list">${state.projects.filter(p=>restOpen(p)>0).slice(0,8).map(p=>`<button data-finance-project="${esc(p.id)}"><div><strong>${esc(p.title)}</strong><span>${esc(customerName(p.customerId))}</span></div><div><small>Restbetrag</small><strong>${esc(euro(restOpen(p)))}</strong></div><span>→</span></button>`).join('')||'<p class="muted">Keine offenen Beträge.</p>'}</div></section>`;
  }
  window.renderFinance=renderFinance;

  function rebuildDashboard(){
    const dashboard=document.getElementById('dashboard');if(!dashboard)return;
    const oldRevenue=dashboard.querySelector('.metric-card.accent strong')?.textContent||dashboard.querySelector('.focus-revenue strong')?.textContent;if(oldRevenue)demoRevenue=oldRevenue;
    dashboard.innerHTML=`<div class="cockpit-grid"><section class="panel cockpit-today"><div class="cockpit-head"><div><span class="eyebrow">Heute</span><h2>Im Studio</h2></div><button class="text-btn" data-cockpit-view="calendar">Kalender →</button></div><div id="todayAppointments" class="timeline"></div></section><section class="panel cockpit-tasks"><div class="cockpit-head"><div><span class="eyebrow">Offen</span><h3>Zu erledigen</h3></div></div><div class="cockpit-task-grid"></div></section><section class="panel cockpit-requests"><div class="cockpit-head"><div><span class="eyebrow">Planung</span><h3>Ohne Termin</h3></div></div><div class="dashboard-work-list" data-unscheduled-list></div></section><section class="panel cockpit-projects"><div class="cockpit-head"><div><span class="eyebrow">Priorität</span><h3>Nächste Schritte</h3></div></div><div class="dashboard-work-list" data-nextsteps-list></div></section></div>`;
    dashboard.querySelectorAll('[data-cockpit-view]').forEach(btn=>btn.addEventListener('click',()=>navigate(btn.dataset.cockpitView)));
  }

  function headerHtml(p){
    const event=nextProjectEvent(p.id),rest=restOpen(p),consentOk=['Unterschrieben','Vorhanden'].includes(p.consent),dep=depositOpen(p);
    return `<div class="detail-hero project-focus-header"><div class="project-focus-main"><div class="project-focus-title"><span class="eyebrow">Tattoo</span><h2>${esc(p.title)}</h2><p class="muted">${esc(customerName(p.customerId))} · ${esc(p.artist||'—')} · ${esc(p.placement||'—')}</p></div><div class="project-focus-badges"><span class="project-focus-badge ${event?'good':''}" data-focus-next>${event?`Termin · ${esc(formatDate(event.date))} · ${esc(event.start)}`:'Kein Termin'}</span><span class="project-focus-badge ${consentOk?'good':'warn'}" data-focus-consent>Einwilligung ${consentOk?'✓':'offen'}</span><span class="project-focus-badge ${dep<=0?'good':'warn'}" data-focus-deposit>${Number(p.deposit||0)>0?(dep<=0?'Anzahlung ✓':`Anzahlung ${esc(euro(dep))} offen`):'Keine Anzahlung'}</span><span class="project-focus-badge" data-focus-rest>Rest ${esc(euro(rest))}</span></div></div></div>`;
  }

  function overviewHtml(p){
    const event=nextProjectEvent(p.id);
    return `<div class="project-overview-grid"><div class="project-overview-stat"><span>Nächster Termin</span><strong data-overview-next>${event?esc(formatDate(event.date)+' · '+event.start):'Noch kein Termin'}</strong></div><div class="project-overview-stat"><span>Körperstelle</span><strong>${esc(p.placement||'—')}</strong></div><div class="project-overview-stat"><span>Preis</span><strong>${esc(euro(p.price))}</strong></div><div class="project-overview-stat"><span>Restbetrag</span><strong data-overview-rest>${esc(euro(restOpen(p)))}</strong></div></div><div class="project-overview-body"><section class="project-overview-card"><h3>Projekt</h3><p class="muted">${esc(p.description||'Noch keine Beschreibung hinterlegt.')}</p></section><section class="project-overview-card"><h3>Auf einen Blick</h3><div class="project-overview-list"><div><span>Größe</span><strong>${esc(p.size||'—')}</strong></div><div><span>Artist</span><strong>${esc(p.artist||'—')}</strong></div><div><span>Status</span><strong>${esc(p.status||'Entwurf')}</strong></div><div><span>Kunde</span><button class="text-btn" id="openLinkedCustomer">${esc(customerName(p.customerId))} →</button></div></div></section></div>`;
  }

  function designHtml(p){
    return `<section class="detail-card"><div class="panel-head"><div><span class="eyebrow">Design</span><h3>Entwürfe & Versionen</h3></div><button class="btn ghost" id="addVersionBtn">+ Version</button></div><div class="design-area">${(p.versions||[]).map((v,i)=>`<div class="design-tile"><span class="version-badge">${v.type==='procreate'?'Procreate':'Datei'} · ${i+1}</span><strong>${esc(v.name)}</strong><span class="muted">In Tattoo-Akte gespeichert</span></div>`).join('')}<label class="design-tile"><span class="version-badge">Upload</span><strong>Datei hinzufügen</strong><input type="file" accept="image/*,.psd,.pdf,.procreate" data-design-upload="${esc(p.id)}"><span class="muted">Referenz, PNG, PSD, PDF oder Procreate-Datei</span></label></div></section>`;
  }

  function installProjectView(){
    openProject=function(id){
      const p=state.projects.find(item=>item.id===id),detail=document.getElementById('projectDetail');if(!p||!detail)return;
      navigate('project-detail');detail.dataset.projectId=id;
      detail.innerHTML=`${headerHtml(p)}<div class="project-tabs" role="tablist"><button type="button" class="project-tab-btn active" data-project-tab="overview">Übersicht</button><button type="button" class="project-tab-btn" data-project-tab="design">Design</button><button type="button" class="project-tab-btn" data-project-tab="documents">Dokumente</button><button type="button" class="project-tab-btn" data-project-tab="payments">Zahlung</button><button type="button" class="project-tab-btn" data-project-tab="aftercare">Nachsorge</button></div><div class="project-tab-pane active" data-project-pane="overview">${overviewHtml(p)}</div><div class="project-tab-pane" data-project-pane="design">${designHtml(p)}</div><div class="project-tab-pane" data-project-pane="documents"></div><div class="project-tab-pane" data-project-pane="payments"><div class="project-tab-empty">Zahlungen werden geladen …</div></div><div class="project-tab-pane" data-project-pane="aftercare"><div class="project-tab-empty">Nachsorge wird geladen …</div></div>`;
      detail.querySelector('#openLinkedCustomer')?.addEventListener('click',()=>openCustomer(p.customerId));
      detail.querySelector('#addVersionBtn')?.addEventListener('click',()=>addVersion(p.id));
      Core?.activateProjectTab('overview',{emit:false});
    };
  }

  function projectDialogHtml(){
    return `<form id="projectForm" class="focus-project-form"><div class="dialog-head"><div><span class="eyebrow">Tattoo-Projekt</span><h2>Neues Tattoo</h2><p class="muted">Kunde, Tattoo und auf Wunsch direkt den ersten Termin in einem Schritt anlegen.</p></div><button type="button" class="close-btn" data-close-project>×</button></div><div class="project-form-scroll"><section class="project-form-section"><div class="project-form-section-head"><div><h3>Kunde</h3><p>Neuen Kunden direkt anlegen oder einen bestehenden auswählen.</p></div><div class="customer-mode"><button type="button" class="active" data-customer-mode="new"><strong>Neuer Kunde</strong><small>Daten direkt eingeben</small></button><button type="button" data-customer-mode="existing"><strong>Bestehender Kunde</strong><small>Aus Kundenliste auswählen</small></button></div></div><div class="customer-block" data-customer-block="new"><div class="form-grid"><label>Vorname<input name="newFirstName" autocomplete="given-name" required></label><label>Nachname<input name="newLastName" autocomplete="family-name" required></label><label>E-Mail<input type="email" name="newEmail" autocomplete="email"></label><label>Telefon<input name="newPhone" autocomplete="tel"></label></div></div><div class="customer-block" data-customer-block="existing" hidden><label>Kunde<select name="customerId" id="projectCustomerSelect"></select></label></div></section><section class="project-form-section"><div class="project-form-section-head"><div><h3>Tattoo</h3><p>Die wichtigsten Projektdaten.</p></div></div><div class="form-grid three"><label>Motiv<input required name="title" placeholder="z. B. Löwe"></label><label>Körperstelle<input required name="placement" placeholder="rechter Unterarm"></label><label>Größe<input name="size" placeholder="18 × 12 cm"></label><label>Artist<select name="artist"></select></label><label>Preis (€)<input name="price" type="number" min="0" step="10"></label><label>Anzahlung (€)<input name="deposit" type="number" min="0" step="10"></label><label class="full">Beschreibung<textarea name="description" rows="2" placeholder="Stil, Idee, Besonderheiten …"></textarea></label></div></section><section class="project-form-section"><div class="project-form-section-head"><div><h3>Erster Termin</h3><p>Optional direkt mit dem Tattoo anlegen.</p></div></div><label class="project-appointment-toggle"><input type="checkbox" name="scheduleAppointment"><span>Termin direkt einplanen</span></label><div class="appointment-project-fields" data-project-appointment-fields hidden><div class="form-grid three" style="margin-top:11px"><label>Datum<input type="date" name="appointmentDate"></label><label>Start<input type="time" name="appointmentStart" value="10:00"></label><label>Dauer (Min.)<input type="number" min="15" step="15" name="appointmentDuration" value="120"></label><label>Status<select name="appointmentStatus"><option>Bestätigt</option><option>Angefragt</option></select></label></div><div class="project-inline-note">Der Artist wird aus dem Tattoo übernommen. Bei einer Überschneidung warnt TATNERA.</div></div></section></div><div class="focus-project-actions"><button type="button" class="btn ghost" data-close-project>Abbrechen</button><button type="submit" class="btn primary">Tattoo anlegen</button></div></form>`;
  }

  function installProjectDialog(){
    const dialog=document.getElementById('projectDialog');if(!dialog)return;dialog.classList.add('focus-project-dialog');dialog.innerHTML=projectDialogHtml();
    dialog.querySelectorAll('[data-close-project]').forEach(btn=>btn.addEventListener('click',()=>dialog.close()));
    dialog.querySelectorAll('[data-customer-mode]').forEach(btn=>btn.addEventListener('click',()=>setCustomerMode(btn.dataset.customerMode)));
    dialog.querySelector('[name="scheduleAppointment"]').addEventListener('change',event=>toggleAppointment(event.target.checked));
    dialog.querySelector('#projectForm').addEventListener('submit',saveProjectFlow);
    updateCustomerSelect=function(selected=''){const select=document.getElementById('projectCustomerSelect');if(select)select.innerHTML='<option value="">Kunde auswählen …</option>'+state.customers.map(c=>`<option value="${esc(c.id)}" ${c.id===selected?'selected':''}>${esc(c.firstName)} ${esc(c.lastName)}</option>`).join('');};
    openProjectDialog=function(customerId=''){
      const form=document.getElementById('projectForm');form.reset();updateCustomerSelect(customerId);Core?.populateArtistSelect(form.elements.artist,Core.artistNameFallback());form.elements.appointmentStart.value='10:00';form.elements.appointmentDuration.value=120;form.elements.appointmentStatus.value='Bestätigt';form.elements.appointmentDate.value=todayISO();setCustomerMode(customerId?'existing':'new');toggleAppointment(false);dialog.showModal();
    };
    updateCustomerSelect();
  }

  function setCustomerMode(mode){
    const form=document.getElementById('projectForm');if(!form)return;form.dataset.customerMode=mode;
    form.querySelectorAll('[data-customer-mode]').forEach(btn=>btn.classList.toggle('active',btn.dataset.customerMode===mode));form.querySelectorAll('[data-customer-block]').forEach(block=>block.hidden=block.dataset.customerBlock!==mode);
    form.elements.customerId.required=mode==='existing';form.elements.newFirstName.required=mode==='new';form.elements.newLastName.required=mode==='new';
  }
  function toggleAppointment(enabled){const form=document.getElementById('projectForm');if(!form)return;form.elements.scheduleAppointment.checked=enabled;form.querySelector('[data-project-appointment-fields]').hidden=!enabled;form.elements.appointmentDate.required=enabled;form.elements.appointmentStart.required=enabled;form.elements.appointmentDuration.required=enabled;}

  function projectConflicts(payload){const start=minutes(payload.start),end=start+Number(payload.duration||0);return (state.calendarEvents||[]).filter(e=>e.date===payload.date&&e.artist===payload.artist&&start<minutes(e.start)+Number(e.duration||0)&&minutes(e.start)<end).sort((a,b)=>a.start.localeCompare(b.start));}
  function confirmConflict(payload,list){return new Promise(resolve=>{let dialog=document.getElementById('projectConflictDialog');if(!dialog){dialog=document.createElement('dialog');dialog.id='projectConflictDialog';dialog.className='dialog';dialog.innerHTML='<div style="padding:22px"><div class="dialog-head"><div><span class="eyebrow">Terminkonflikt</span><h2>Artist bereits belegt</h2><p class="muted" id="projectConflictIntro"></p></div><button type="button" class="close-btn" data-project-conflict-cancel>×</button></div><div id="projectConflictList" class="project-conflict-list"></div><div class="dialog-actions"><button type="button" class="btn ghost" data-project-conflict-cancel>Zurück</button><button type="button" class="btn primary" data-project-conflict-confirm>Trotzdem anlegen</button></div></div>';document.body.appendChild(dialog);}const end=minutes(payload.start)+Number(payload.duration||0),endText=`${String(Math.floor(end/60)%24).padStart(2,'0')}:${String(end%60).padStart(2,'0')}`;document.getElementById('projectConflictIntro').textContent=`${payload.artist} ist am ${formatDate(payload.date)} während ${payload.start}–${endText} bereits belegt.`;document.getElementById('projectConflictList').innerHTML=list.map(e=>`<div class="project-conflict-row"><strong>${esc(e.start)}–${esc(eventEnd(e.start,e.duration))}</strong><div><strong>${esc(e.projectId?projectName(e.projectId):(e.customerId?customerName(e.customerId):eventTypeLabel(e.type)))}</strong><br><span>${esc(eventTypeLabel(e.type))}${e.notes?' · '+esc(e.notes):''}</span></div></div>`).join('');let done=false;const finish=value=>{if(done)return;done=true;dialog.close();resolve(value);};dialog.querySelectorAll('[data-project-conflict-cancel]').forEach(btn=>btn.onclick=()=>finish(false));dialog.querySelector('[data-project-conflict-confirm]').onclick=()=>finish(true);dialog.oncancel=event=>{event.preventDefault();finish(false);};dialog.showModal();});}

  async function saveProjectFlow(event){
    event.preventDefault();const form=event.currentTarget,data=Object.fromEntries(new FormData(form).entries()),mode=form.dataset.customerMode||'new',schedule=form.elements.scheduleAppointment.checked;
    const appointment=schedule?{date:data.appointmentDate,start:data.appointmentStart,duration:Number(data.appointmentDuration||120),artist:data.artist}:null;
    if(schedule){const conflicts=projectConflicts(appointment);if(conflicts.length&&!(await confirmConflict(appointment,conflicts)))return;}
    const stamp=Date.now();let customerId=data.customerId;
    if(mode==='new'){const customer={id:'c'+stamp,firstName:String(data.newFirstName||'').trim(),lastName:String(data.newLastName||'').trim(),email:String(data.newEmail||'').trim(),phone:String(data.newPhone||'').trim(),notes:'',lastProject:'—',next:'—',status:'Neu'};state.customers.unshift(customer);customerId=customer.id;}
    if(!customerId)return;
    const project={id:'p'+(stamp+1),customerId,title:String(data.title||'').trim(),placement:String(data.placement||'').trim(),size:String(data.size||'').trim(),artist:data.artist||Core?.artistNameFallback()||'',price:Number(data.price||0),deposit:Number(data.deposit||0),status:schedule?'Termin geplant':'Entwurf',description:String(data.description||'').trim(),consent:'Fehlt',colors:[],inkIds:[],versions:[],payments:[],aftercare:{status:'Offen',tattooDate:'',followupDate:'',instructionsGiven:false,records:[]}};
    state.projects.unshift(project);const customer=state.customers.find(c=>c.id===customerId);if(customer){customer.lastProject=project.title;customer.status='Aktiv';}
    if(schedule){const cal={id:'e'+(stamp+2),date:data.appointmentDate,start:data.appointmentStart,duration:Number(data.appointmentDuration||120),customerId,projectId:project.id,artist:project.artist,type:'tattoo',status:data.appointmentStatus||'Bestätigt',notes:'Erster Tattoo-Termin'};state.calendarEvents.push(cal);}
    persist();renderCustomers();renderProjects();renderAppointments();renderCalendar();updateCustomerSelect(customerId);dialogClose();form.reset();openProject(project.id);document.dispatchEvent(new CustomEvent('tatnera:data-changed',{detail:{type:'project',projectId:project.id}}));
    function dialogClose(){document.getElementById('projectDialog')?.close();}
  }

  function install(){installCss();simplifyNavigation();installMoreMenu();installFinanceView();rebuildDashboard();installProjectView();installProjectDialog();}
  install();
})();
