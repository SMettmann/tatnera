/* TATNERA — focused workflow refresh */
(function(){
  let organizeQueued=false;
  let organizing=false;

  const esc=v=>String(v??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const euro=v=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(v)||0);
  const formatDate=v=>v?new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(v+'T12:00:00')):'—';
  const paymentTotal=p=>Math.max(0,(p.payments||[]).reduce((sum,tx)=>sum+(tx.type==='Erstattung'?-1:1)*Math.abs(Number(tx.amount)||0),0));
  const depositOpen=p=>Math.max(0,Math.max(0,Number(p.deposit)||0)-Math.min(paymentTotal(p),Math.max(0,Number(p.deposit)||0)));
  const nextProjectEvent=id=>[...(state.calendarEvents||[])].filter(e=>e.projectId===id&&e.date>=todayISO()).sort((a,b)=>a.date.localeCompare(b.date)||a.start.localeCompare(b.start))[0]||null;
  const nextLabel=e=>e?`${formatDate(e.date)} · ${e.start}`:'Noch kein Termin';
  const setText=(el,text)=>{if(el&&el.textContent!==text)el.textContent=text};

  function installStyle(){
    if(document.querySelector('link[href="ui-refresh.css"]'))return;
    const link=document.createElement('link');link.rel='stylesheet';link.href='ui-refresh.css';document.head.appendChild(link);
  }

  function simplifyNavigation(){
    const nav=document.querySelector('.nav');
    if(nav)['dashboard','calendar','requests','customers'].forEach(view=>{const item=nav.querySelector(`.nav-item[data-view="${view}"]`);if(item)nav.appendChild(item)});
    const quick=document.getElementById('quickProjectBtn');if(quick)quick.textContent='+ Tattoo starten';
  }

  function rebuildDashboard(){
    const dashboard=document.getElementById('dashboard');if(!dashboard)return;
    const revenue=dashboard.querySelector('.metric-card.accent strong')?.textContent||'8.640 €';
    dashboard.innerHTML=`<div class="focus-dashboard">
      <section class="panel focus-panel">
        <div class="focus-panel-head"><div><span class="eyebrow">Heute</span><h2>Dein Tag im Studio</h2></div><button class="text-btn" data-focus-view="calendar">Kalender →</button></div>
        <div id="todayAppointments" class="timeline"></div>
      </section>
      <aside><section class="panel focus-panel">
        <div class="focus-panel-head"><div><span class="eyebrow">Offen</span><h3>Zu erledigen</h3></div></div>
        <div class="focus-tasks">
          <article class="metric-card focus-task"><span>Offene Anfragen</span><strong>0</strong><small>neue Anfragen prüfen</small></article>
          <article class="metric-card focus-task"><span>Einwilligungen fehlen</span><strong>0</strong><small>vor dem Termin klären</small></article>
          <article class="metric-card focus-task"><span>Offene Anzahlungen</span><strong>0 €</strong><small>noch ausstehend</small></article>
        </div>
        <div class="focus-revenue"><div><span>September</span><br><small>Monatsumsatz</small></div><strong>${esc(revenue)}</strong></div>
      </section></aside>
    </div><div id="recentProjects" class="focus-recent-projects"></div>`;
    dashboard.querySelectorAll('[data-focus-view]').forEach(btn=>btn.addEventListener('click',()=>navigate(btn.dataset.focusView)));
    renderAppointments();refreshFocusDashboard();
  }

  function refreshFocusDashboard(){
    const dashboard=document.getElementById('dashboard');if(!dashboard)return;
    const requests=Array.isArray(state.requests)?state.requests:[];
    const missing=state.projects.filter(p=>!['Unterschrieben','Vorhanden'].includes(p.consent)).length;
    const open=state.projects.reduce((sum,p)=>sum+depositOpen(p),0);
    const cards=[...dashboard.querySelectorAll('.metric-card')];
    const r=cards.find(c=>c.textContent.includes('Offene Anfragen'));
    const c=cards.find(c=>c.textContent.includes('Einwilligungen fehlen'));
    const d=cards.find(c=>c.textContent.includes('Offene Anzahlungen'));
    if(r){setText(r.querySelector('strong'),String(requests.length));setText(r.querySelector('small'),`${requests.filter(x=>x.stage==='new').length} neu`)}
    if(c)setText(c.querySelector('strong'),String(missing));
    if(d){setText(d.querySelector('strong'),euro(open));const count=state.projects.filter(p=>depositOpen(p)>0).length;setText(d.querySelector('small'),`${count} Projekt${count===1?'':'e'}`)}
  }

  function headerHtml(p){
    const event=nextProjectEvent(p.id),rest=Math.max(0,Number(p.price||0)-paymentTotal(p));
    const consentOk=['Unterschrieben','Vorhanden'].includes(p.consent),dep=depositOpen(p);
    return `<div class="detail-hero project-focus-header"><div class="project-focus-main">
      <div class="project-focus-title"><span class="eyebrow">Tattoo</span><h2>${esc(p.title)}</h2><p class="muted">${esc(customerName(p.customerId))} · ${esc(p.artist||'—')} · ${esc(p.placement||'—')}</p></div>
      <div class="project-focus-badges">
        <span class="project-focus-badge ${event?'good':''}" data-focus-next>${event?`Termin · ${esc(formatDate(event.date))} · ${esc(event.start)}`:'Kein Termin'}</span>
        <span class="project-focus-badge ${consentOk?'good':'warn'}" data-focus-consent>Einwilligung ${consentOk?'✓':'offen'}</span>
        <span class="project-focus-badge ${dep<=0?'good':'warn'}" data-focus-deposit>${Number(p.deposit||0)>0?(dep<=0?'Anzahlung ✓':`Anzahlung ${esc(euro(dep))} offen`):'Keine Anzahlung'}</span>
        <span class="project-focus-badge" data-focus-rest>Rest ${esc(euro(rest))}</span>
      </div>
    </div></div>`;
  }

  function overviewHtml(p){
    const event=nextProjectEvent(p.id),rest=Math.max(0,Number(p.price||0)-paymentTotal(p));
    return `<div class="project-overview-grid">
      <div class="project-overview-stat"><span>Nächster Termin</span><strong data-overview-next>${esc(nextLabel(event))}</strong></div>
      <div class="project-overview-stat"><span>Körperstelle</span><strong>${esc(p.placement||'—')}</strong></div>
      <div class="project-overview-stat"><span>Preis</span><strong>${esc(euro(p.price))}</strong></div>
      <div class="project-overview-stat"><span>Restbetrag</span><strong data-overview-rest>${esc(euro(rest))}</strong></div>
    </div>
    <div class="project-overview-body">
      <section class="project-overview-card"><h3>Projekt</h3><p class="muted">${esc(p.description||'Noch keine Beschreibung hinterlegt.')}</p></section>
      <section class="project-overview-card"><h3>Auf einen Blick</h3><div class="project-overview-list">
        <div><span>Größe</span><strong>${esc(p.size||'—')}</strong></div><div><span>Artist</span><strong>${esc(p.artist||'—')}</strong></div><div><span>Status</span><strong>${esc(p.status||'Entwurf')}</strong></div>
        <div><span>Kunde</span><button class="text-btn" id="openLinkedCustomer">${esc(customerName(p.customerId))} →</button></div>
      </div></section>
    </div>`;
  }

  function designHtml(p){
    return `<section class="detail-card"><div class="panel-head"><div><span class="eyebrow">Design</span><h3>Entwürfe & Versionen</h3></div><button class="btn ghost" id="addVersionBtn">+ Version</button></div><div class="design-area">
      ${(p.versions||[]).map((v,i)=>`<div class="design-tile"><span class="version-badge">${v.type==='procreate'?'Procreate':'Datei'} · ${i+1}</span><strong>${esc(v.name)}</strong><span class="muted">In Tattoo-Akte gespeichert</span></div>`).join('')}
      <label class="design-tile"><span class="version-badge">Upload</span><strong>Datei hinzufügen</strong><input type="file" accept="image/*,.psd,.pdf,.procreate" data-design-upload="${p.id}"><span class="muted">Referenz, PNG, PSD, PDF oder Procreate-Datei</span></label>
    </div></section>`;
  }

  function installFocusedProjectView(){
    openProject=function(id){
      const p=state.projects.find(x=>x.id===id);if(!p)return;
      const detail=document.getElementById('projectDetail');if(!detail)return;
      navigate('project-detail');detail.dataset.projectId=id;
      detail.innerHTML=`${headerHtml(p)}
        <div class="project-tabs" role="tablist"><button class="project-tab-btn active" data-project-tab="overview">Übersicht</button><button class="project-tab-btn" data-project-tab="design">Design</button><button class="project-tab-btn" data-project-tab="documents">Dokumente</button><button class="project-tab-btn" data-project-tab="payments">Zahlung</button><button class="project-tab-btn" data-project-tab="aftercare">Nachsorge</button></div>
        <div class="project-tab-pane active" data-project-pane="overview">${overviewHtml(p)}</div>
        <div class="project-tab-pane" data-project-pane="design">${designHtml(p)}</div>
        <div class="project-tab-pane" data-project-pane="documents"><section class="detail-card"><span class="eyebrow">Ink Passport</span><h3>Verwendete Farben</h3><p class="muted">Noch keine Farben / Chargen geladen.</p></section></div>
        <div class="project-tab-pane" data-project-pane="payments"><div class="project-tab-empty">Zahlungen werden geladen …</div></div>
        <div class="project-tab-pane" data-project-pane="aftercare"><div class="project-tab-empty">Nachsorge wird geladen …</div></div>`;
      detail.querySelectorAll('[data-project-tab]').forEach(btn=>btn.addEventListener('click',()=>activateTab(btn.dataset.projectTab)));
      detail.querySelector('#openLinkedCustomer')?.addEventListener('click',()=>openCustomer(p.customerId));
      detail.querySelector('#addVersionBtn')?.addEventListener('click',()=>addVersion(p.id));
      detail.querySelector(`[data-design-upload="${p.id}"]`)?.addEventListener('change',e=>{if(e.target.files?.[0])addVersion(p.id,e.target.files[0].name)});
      scheduleOrganize();
    };
  }

  function activateTab(name){
    const detail=document.getElementById('projectDetail');if(!detail)return;
    detail.querySelectorAll('[data-project-tab]').forEach(btn=>btn.classList.toggle('active',btn.dataset.projectTab===name));
    detail.querySelectorAll('[data-project-pane]').forEach(pane=>pane.classList.toggle('active',pane.dataset.projectPane===name));
  }

  function refreshProjectSummary(){
    const detail=document.getElementById('projectDetail'),p=state.projects.find(x=>x.id===detail?.dataset.projectId);if(!p)return;
    const event=nextProjectEvent(p.id),rest=Math.max(0,Number(p.price||0)-paymentTotal(p)),consentOk=['Unterschrieben','Vorhanden'].includes(p.consent),dep=depositOpen(p);
    const next=detail.querySelector('[data-focus-next]');setText(next,event?`Termin · ${formatDate(event.date)} · ${event.start}`:'Kein Termin');if(next)next.classList.toggle('good',Boolean(event));
    const consent=detail.querySelector('[data-focus-consent]');setText(consent,`Einwilligung ${consentOk?'✓':'offen'}`);if(consent){consent.classList.toggle('good',consentOk);consent.classList.toggle('warn',!consentOk)}
    const deposit=detail.querySelector('[data-focus-deposit]');setText(deposit,Number(p.deposit||0)>0?(dep<=0?'Anzahlung ✓':`Anzahlung ${euro(dep)} offen`):'Keine Anzahlung');if(deposit){deposit.classList.toggle('good',dep<=0);deposit.classList.toggle('warn',dep>0)}
    setText(detail.querySelector('[data-focus-rest]'),`Rest ${euro(rest)}`);setText(detail.querySelector('[data-overview-next]'),nextLabel(event));setText(detail.querySelector('[data-overview-rest]'),euro(rest));
  }

  function scheduleOrganize(){if(organizeQueued)return;organizeQueued=true;requestAnimationFrame(()=>{organizeQueued=false;organizeModules()})}
  function organizeModules(){
    if(organizing)return;const detail=document.getElementById('projectDetail');if(!detail?.dataset.projectId)return;organizing=true;
    try{
      const docs=detail.querySelector('[data-project-pane="documents"]'),pay=detail.querySelector('[data-project-pane="payments"]'),after=detail.querySelector('[data-project-pane="aftercare"]');
      const consent=detail.querySelector('.consent-card'),ink=detail.querySelector('.ink-project-panel'),payment=detail.querySelector('.payment-card'),aftercare=detail.querySelector('.aftercare-card');
      if(consent&&docs&&!docs.contains(consent))docs.prepend(consent);
      if(ink&&docs&&!docs.contains(ink))docs.append(ink);
      if(payment&&pay&&!pay.contains(payment)){pay.innerHTML='';pay.append(payment)}
      if(aftercare&&after&&!after.contains(aftercare)){after.innerHTML='';after.append(aftercare)}
      refreshProjectSummary();refreshFocusDashboard();
    }finally{organizing=false}
  }

  function installProjectObserver(){
    const detail=document.getElementById('projectDetail');if(!detail)return;
    new MutationObserver(records=>{
      const important=records.some(record=>{
        if(record.target===detail)return true;
        const target=record.target;
        if(target?.nodeType===1&&(target.classList?.contains('payment-card')||target.classList?.contains('aftercare-card')||target.classList?.contains('consent-card')))return true;
        return [...record.addedNodes].some(node=>node.nodeType===1&&node.matches?.('.consent-card,.payment-card,.aftercare-card,.ink-project-panel'));
      });
      if(important)scheduleOrganize();
    }).observe(detail,{childList:true,subtree:true});
  }

  function projectDialogHtml(){
    return `<form id="projectForm" class="focus-project-form"><div class="dialog-head"><div><span class="eyebrow">Tattoo starten</span><h2>Neues Tattoo</h2><p class="muted">Kunde, Projekt und auf Wunsch direkt den ersten Termin in einem Schritt anlegen.</p></div><button type="button" class="close-btn" data-close-project>×</button></div>
      <div class="project-form-scroll">
        <section class="project-form-section"><div class="project-form-section-head"><div><h3>Kunde</h3><p>Bestehenden Kunden wählen oder direkt neu anlegen.</p></div><div class="customer-mode"><button type="button" class="active" data-customer-mode="existing">Bestehend</button><button type="button" data-customer-mode="new">+ Neuer Kunde</button></div></div>
          <div class="customer-block" data-customer-block="existing"><label>Kunde<select name="customerId" id="projectCustomerSelect" required></select></label></div>
          <div class="customer-block" data-customer-block="new" hidden><div class="form-grid"><label>Vorname<input name="newFirstName" autocomplete="given-name"></label><label>Nachname<input name="newLastName" autocomplete="family-name"></label><label>E-Mail<input type="email" name="newEmail" autocomplete="email"></label><label>Telefon<input name="newPhone" autocomplete="tel"></label></div></div>
        </section>
        <section class="project-form-section"><div class="project-form-section-head"><div><h3>Tattoo</h3><p>Nur die Informationen, die für den Start wirklich nötig sind.</p></div></div><div class="form-grid three">
          <label>Motiv<input required name="title" placeholder="z. B. Löwe"></label><label>Körperstelle<input required name="placement" placeholder="rechter Unterarm"></label><label>Größe<input name="size" placeholder="18 × 12 cm"></label>
          <label>Artist<select name="artist"><option>Sven</option><option>Mara</option></select></label><label>Preis (€)<input name="price" type="number" min="0" step="10"></label><label>Anzahlung (€)<input name="deposit" type="number" min="0" step="10"></label>
          <label class="full">Beschreibung<textarea name="description" rows="2" placeholder="Stil, Idee, Besonderheiten …"></textarea></label></div>
        </section>
        <section class="project-form-section"><div class="project-form-section-head"><div><h3>Erster Termin</h3><p>Optional direkt mit dem Tattoo anlegen.</p></div></div><label class="project-appointment-toggle"><input type="checkbox" name="scheduleAppointment"><span>Termin direkt einplanen</span></label>
          <div class="appointment-project-fields" data-project-appointment-fields hidden><div class="form-grid three" style="margin-top:11px"><label>Datum<input type="date" name="appointmentDate"></label><label>Start<input type="time" name="appointmentStart" value="10:00"></label><label>Dauer (Min.)<input type="number" min="15" step="15" name="appointmentDuration" value="120"></label><label>Status<select name="appointmentStatus"><option>Bestätigt</option><option>Angefragt</option></select></label></div><div class="project-inline-note">Der Artist wird aus dem Tattoo übernommen. Bei einer Überschneidung warnt TATNERA vor dem Speichern.</div></div>
        </section>
      </div><div class="focus-project-actions"><button type="button" class="btn ghost" data-close-project>Abbrechen</button><button type="submit" class="btn primary">Tattoo anlegen</button></div></form>`;
  }

  function installProjectDialog(){
    const dialog=document.getElementById('projectDialog');if(!dialog)return;dialog.classList.add('focus-project-dialog');dialog.innerHTML=projectDialogHtml();
    dialog.querySelectorAll('[data-close-project]').forEach(btn=>btn.addEventListener('click',()=>dialog.close()));
    dialog.querySelectorAll('[data-customer-mode]').forEach(btn=>btn.addEventListener('click',()=>setCustomerMode(btn.dataset.customerMode)));
    dialog.querySelector('[name="scheduleAppointment"]').addEventListener('change',e=>toggleAppointment(e.target.checked));
    dialog.querySelector('#projectForm').addEventListener('submit',saveProjectFlow);
    updateCustomerSelect=function(selected=''){const select=document.getElementById('projectCustomerSelect');if(select)select.innerHTML='<option value="">Kunde auswählen …</option>'+state.customers.map(c=>`<option value="${c.id}" ${c.id===selected?'selected':''}>${esc(c.firstName)} ${esc(c.lastName)}</option>`).join('')};
    openProjectDialog=function(customerId=''){
      const form=document.getElementById('projectForm');form.reset();form.elements.artist.value='Sven';form.elements.appointmentStart.value='10:00';form.elements.appointmentDuration.value=120;form.elements.appointmentStatus.value='Bestätigt';form.elements.appointmentDate.value=todayISO();
      updateCustomerSelect(customerId);setCustomerMode('existing');toggleAppointment(false);dialog.showModal();
    };
    updateCustomerSelect();
  }

  function setCustomerMode(mode){
    const form=document.getElementById('projectForm');if(!form)return;form.dataset.customerMode=mode;
    form.querySelectorAll('[data-customer-mode]').forEach(btn=>btn.classList.toggle('active',btn.dataset.customerMode===mode));form.querySelectorAll('[data-customer-block]').forEach(block=>block.hidden=block.dataset.customerBlock!==mode);
    form.elements.customerId.required=mode==='existing';form.elements.newFirstName.required=mode==='new';form.elements.newLastName.required=mode==='new';
  }
  function toggleAppointment(enabled){
    const form=document.getElementById('projectForm');if(!form)return;form.elements.scheduleAppointment.checked=enabled;form.querySelector('[data-project-appointment-fields]').hidden=!enabled;
    form.elements.appointmentDate.required=enabled;form.elements.appointmentStart.required=enabled;form.elements.appointmentDuration.required=enabled;
  }

  const minutes=t=>{const [h,m]=String(t||'00:00').split(':').map(Number);return (h||0)*60+(m||0)};
  function conflicts(payload){const start=minutes(payload.start),end=start+Number(payload.duration||0);return (state.calendarEvents||[]).filter(e=>e.date===payload.date&&e.artist===payload.artist).filter(e=>start<minutes(e.start)+Number(e.duration||0)&&minutes(e.start)<end).sort((a,b)=>a.start.localeCompare(b.start))}
  function ensureProjectConflictDialog(){
    let dialog=document.getElementById('projectConflictDialog');if(dialog)return dialog;dialog=document.createElement('dialog');dialog.id='projectConflictDialog';dialog.className='dialog';
    dialog.innerHTML=`<div style="padding:22px"><div class="dialog-head"><div><span class="eyebrow">Terminkonflikt</span><h2>Artist bereits belegt</h2><p class="muted" id="projectConflictIntro"></p></div><button type="button" class="close-btn" data-project-conflict-cancel>×</button></div><div id="projectConflictList" class="project-conflict-list"></div><div class="dialog-actions"><button type="button" class="btn ghost" data-project-conflict-cancel>Zurück</button><button type="button" class="btn primary" data-project-conflict-confirm>Trotzdem anlegen</button></div></div>`;document.body.appendChild(dialog);return dialog;
  }
  function confirmConflict(payload,list){
    const dialog=ensureProjectConflictDialog(),end=minutes(payload.start)+Number(payload.duration||0),endText=`${String(Math.floor(end/60)%24).padStart(2,'0')}:${String(end%60).padStart(2,'0')}`;
    setText(dialog.querySelector('#projectConflictIntro'),`${payload.artist} ist am ${formatDate(payload.date)} während ${payload.start}–${endText} bereits belegt.`);
    dialog.querySelector('#projectConflictList').innerHTML=list.map(e=>`<div class="project-conflict-row"><strong>${esc(e.start)}–${esc(eventEnd(e.start,e.duration))}</strong><div><strong>${esc(e.projectId?projectName(e.projectId):(e.customerId?customerName(e.customerId):eventTypeLabel(e.type)))}</strong><br><span>${esc(eventTypeLabel(e.type))}${e.notes?' · '+esc(e.notes):''}</span></div></div>`).join('');
    return new Promise(resolve=>{let done=false;const finish=value=>{if(done)return;done=true;dialog.close();resolve(value)};dialog.querySelectorAll('[data-project-conflict-cancel]').forEach(btn=>btn.onclick=()=>finish(false));dialog.querySelector('[data-project-conflict-confirm]').onclick=()=>finish(true);dialog.oncancel=e=>{e.preventDefault();finish(false)};dialog.showModal()});
  }

  async function saveProjectFlow(event){
    event.preventDefault();const form=event.currentTarget,data=Object.fromEntries(new FormData(form).entries()),mode=form.dataset.customerMode||'existing',schedule=form.elements.scheduleAppointment.checked;
    const appointment=schedule?{date:data.appointmentDate,start:data.appointmentStart,duration:Number(data.appointmentDuration||120),artist:data.artist}:null;
    if(schedule){const list=conflicts(appointment);if(list.length&&!(await confirmConflict(appointment,list)))return}
    const stamp=Date.now();let customerId=data.customerId;
    if(mode==='new'){
      const customer={id:'c'+stamp,firstName:data.newFirstName.trim(),lastName:data.newLastName.trim(),email:data.newEmail.trim(),phone:data.newPhone.trim(),notes:'',lastProject:'—',next:'—',status:'Neu'};state.customers.unshift(customer);customerId=customer.id;
    }
    if(!customerId)return;
    const project={id:'p'+(stamp+1),customerId,title:data.title.trim(),placement:data.placement.trim(),size:data.size.trim(),artist:data.artist,price:Number(data.price||0),deposit:Number(data.deposit||0),status:schedule?'Termin geplant':'Entwurf',description:data.description.trim(),consent:'Fehlt',colors:[],inkIds:[],versions:[],payments:[],aftercare:{status:'Offen',tattooDate:'',followupDate:'',instructionsGiven:false,records:[]}};
    state.projects.unshift(project);const customer=state.customers.find(c=>c.id===customerId);if(customer){customer.lastProject=project.title;customer.status='Aktiv'}
    if(schedule){const cal={id:'e'+(stamp+2),date:data.appointmentDate,start:data.appointmentStart,duration:Number(data.appointmentDuration||120),customerId,projectId:project.id,artist:project.artist,type:'tattoo',status:data.appointmentStatus||'Bestätigt',notes:'Erster Tattoo-Termin'};state.calendarEvents.push(cal);if(customer)customer.next=`${formatDate(cal.date)} · ${cal.start}`}
    persist();renderCustomers();renderProjects();renderAppointments();renderCalendar();updateCustomerSelect(customerId);refreshFocusDashboard();document.getElementById('projectDialog').close();form.reset();openProject(project.id);
  }

  function install(){installStyle();simplifyNavigation();rebuildDashboard();installFocusedProjectView();installProjectObserver();installProjectDialog()}
  install();
})();
