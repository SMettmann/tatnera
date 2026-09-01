/* TATNERA — focused workflow refresh
   Keeps the existing data model/modules, but presents only what is needed in the current step. */
(function(){
  let projectOrganizeQueued=false;
  let projectOrganizeRunning=false;

  function esc(value){
    return String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  }
  function euro(value){
    return new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(value)||0);
  }
  function formatDate(value){
    if(!value)return '—';
    return new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(value+'T12:00:00'));
  }
  function paymentTotal(project){
    return Math.max(0,(project.payments||[]).reduce((sum,tx)=>{
      const amount=Math.abs(Number(tx.amount)||0);
      return sum+(tx.type==='Erstattung'?-amount:amount);
    },0));
  }
  function depositOpen(project){
    const deposit=Math.max(0,Number(project.deposit)||0);
    return Math.max(0,deposit-Math.min(paymentTotal(project),deposit));
  }
  function nextProjectEvent(projectId){
    const today=todayISO();
    return [...(state.calendarEvents||[])]
      .filter(e=>e.projectId===projectId&&e.date>=today)
      .sort((a,b)=>a.date.localeCompare(b.date)||a.start.localeCompare(b.start))[0]||null;
  }
  function nextLabel(event){
    if(!event)return 'Noch kein Termin';
    return `${formatDate(event.date)} · ${event.start}`;
  }

  function installStyle(){
    if(document.querySelector('link[href="ui-refresh.css"]'))return;
    const link=document.createElement('link');
    link.rel='stylesheet';link.href='ui-refresh.css';document.head.appendChild(link);
  }

  function simplifyNavigation(){
    const nav=document.querySelector('.nav');
    if(nav){
      ['dashboard','calendar','requests','customers'].forEach(view=>{
        const item=nav.querySelector(`.nav-item[data-view="${view}"]`);
        if(item)nav.appendChild(item);
      });
    }
    const quick=document.getElementById('quickProjectBtn');
    if(quick)quick.textContent='+ Tattoo starten';
  }

  function rebuildDashboard(){
    const dashboard=document.getElementById('dashboard');if(!dashboard)return;
    const oldRevenue=dashboard.querySelector('.metric-card.accent strong')?.textContent||'8.640 €';
    dashboard.innerHTML=`
      <div class="focus-dashboard">
        <section class="panel focus-panel">
          <div class="focus-panel-head">
            <div><span class="eyebrow">Heute</span><h2>Dein Tag im Studio</h2></div>
            <button class="text-btn" data-focus-view="calendar">Kalender →</button>
          </div>
          <div id="todayAppointments" class="timeline"></div>
        </section>
        <aside>
          <section class="panel focus-panel">
            <div class="focus-panel-head"><div><span class="eyebrow">Offen</span><h3>Zu erledigen</h3></div></div>
            <div class="focus-tasks">
              <article class="metric-card focus-task"><span>Offene Anfragen</span><strong>0</strong><small>neue Anfragen prüfen</small></article>
              <article class="metric-card focus-task"><span>Einwilligungen fehlen</span><strong>0</strong><small>vor dem Termin klären</small></article>
              <article class="metric-card focus-task"><span>Offene Anzahlungen</span><strong>0 €</strong><small>noch ausstehend</small></article>
            </div>
            <div class="focus-revenue"><div><span>September</span><br><small>Monatsumsatz</small></div><strong>${esc(oldRevenue)}</strong></div>
          </section>
        </aside>
      </div>
      <div id="recentProjects" class="focus-recent-projects"></div>`;
    dashboard.querySelectorAll('[data-focus-view]').forEach(btn=>btn.addEventListener('click',()=>navigate(btn.dataset.focusView)));
    renderAppointments();
    refreshFocusDashboard();
  }

  function refreshFocusDashboard(){
    const dashboard=document.getElementById('dashboard');if(!dashboard)return;
    const requests=Array.isArray(state.requests)?state.requests:[];
    const missingConsent=state.projects.filter(p=>!['Unterschrieben','Vorhanden'].includes(p.consent)).length;
    const openDeposits=state.projects.reduce((sum,p)=>sum+depositOpen(p),0);
    const cards=[...dashboard.querySelectorAll('.metric-card')];
    const requestCard=cards.find(c=>c.textContent.includes('Offene Anfragen'));
    const consentCard=cards.find(c=>c.textContent.includes('Einwilligungen fehlen'));
    const depositCard=cards.find(c=>c.textContent.includes('Offene Anzahlungen'));
    if(requestCard){requestCard.querySelector('strong').textContent=String(requests.length);const fresh=requests.filter(r=>r.stage==='new').length;requestCard.querySelector('small').textContent=`${fresh} neu`}
    if(consentCard)consentCard.querySelector('strong').textContent=String(missingConsent);
    if(depositCard){depositCard.querySelector('strong').textContent=euro(openDeposits);const count=state.projects.filter(p=>depositOpen(p)>0).length;depositCard.querySelector('small').textContent=`${count} Projekt${count===1?'':'e'}`}
  }

  function projectHeaderHtml(project){
    const event=nextProjectEvent(project.id);
    const paid=paymentTotal(project);
    const rest=Math.max(0,Number(project.price||0)-paid);
    const consentOk=['Unterschrieben','Vorhanden'].includes(project.consent);
    const depOpen=depositOpen(project);
    return `<div class="detail-hero project-focus-header">
      <div class="project-focus-main">
        <div class="project-focus-title">
          <span class="eyebrow">Tattoo</span>
          <h2>${esc(project.title)}</h2>
          <p class="muted">${esc(customerName(project.customerId))} · ${esc(project.artist||'—')} · ${esc(project.placement||'—')}</p>
        </div>
        <div class="project-focus-badges">
          <span class="project-focus-badge ${event?'good':''}" data-focus-next>${event?'Termin · '+esc(formatDate(event.date))+' · '+esc(event.start):'Kein Termin'}</span>
          <span class="project-focus-badge ${consentOk?'good':'warn'}" data-focus-consent>Einwilligung ${consentOk?'✓':'offen'}</span>
          <span class="project-focus-badge ${depOpen<=0?'good':'warn'}" data-focus-deposit>${Number(project.deposit||0)>0?(depOpen<=0?'Anzahlung ✓':`Anzahlung ${esc(euro(depOpen))} offen`):'Keine Anzahlung'}</span>
          <span class="project-focus-badge" data-focus-rest>Rest ${esc(euro(rest))}</span>
        </div>
      </div>
    </div>`;
  }

  function overviewHtml(project){
    const event=nextProjectEvent(project.id);
    const rest=Math.max(0,Number(project.price||0)-paymentTotal(project));
    return `<div class="project-overview-grid">
      <div class="project-overview-stat"><span>Nächster Termin</span><strong data-overview-next>${esc(nextLabel(event))}</strong></div>
      <div class="project-overview-stat"><span>Körperstelle</span><strong>${esc(project.placement||'—')}</strong></div>
      <div class="project-overview-stat"><span>Preis</span><strong>${esc(euro(project.price))}</strong></div>
      <div class="project-overview-stat"><span>Restbetrag</span><strong data-overview-rest>${esc(euro(rest))}</strong></div>
    </div>
    <div class="project-overview-body">
      <section class="project-overview-card"><h3>Projekt</h3><p class="muted">${esc(project.description||'Noch keine Beschreibung hinterlegt.')}</p></section>
      <section class="project-overview-card"><h3>Auf einen Blick</h3><div class="project-overview-list">
        <div><span>Größe</span><strong>${esc(project.size||'—')}</strong></div>
        <div><span>Artist</span><strong>${esc(project.artist||'—')}</strong></div>
        <div><span>Status</span><strong>${esc(project.status||'Entwurf')}</strong></div>
        <div><span>Kunde</span><button class="text-btn" id="openLinkedCustomer">${esc(customerName(project.customerId))} →</button></div>
      </div></section>
    </div>`;
  }

  function designHtml(project){
    const versions=project.versions||[];
    return `<section class="detail-card"><div class="panel-head"><div><span class="eyebrow">Design</span><h3>Entwürfe & Versionen</h3></div><button class="btn ghost" id="addVersionBtn">+ Version</button></div>
      <div class="design-area">${versions.map((version,index)=>`<div class="design-tile"><span class="version-badge">${version.type==='procreate'?'Procreate':'Datei'} · ${index+1}</span><strong>${esc(version.name)}</strong><span class="muted">In Tattoo-Akte gespeichert</span></div>`).join('')}
        <label class="design-tile"><span class="version-badge">Upload</span><strong>Datei hinzufügen</strong><input type="file" accept="image/*,.psd,.pdf,.procreate" data-design-upload="${project.id}"><span class="muted">Referenz, PNG, PSD, PDF oder Procreate-Datei</span></label>
      </div></section>`;
  }

  function installFocusedProjectView(){
    openProject=function(id){
      const project=state.projects.find(p=>p.id===id);if(!project)return;
      const detail=document.getElementById('projectDetail');if(!detail)return;
      navigate('project-detail');
      detail.dataset.projectId=id;
      detail.innerHTML=`${projectHeaderHtml(project)}
        <div class="project-tabs" role="tablist">
          <button class="project-tab-btn active" data-project-tab="overview">Übersicht</button>
          <button class="project-tab-btn" data-project-tab="design">Design</button>
          <button class="project-tab-btn" data-project-tab="documents">Dokumente</button>
          <button class="project-tab-btn" data-project-tab="payments">Zahlung</button>
          <button class="project-tab-btn" data-project-tab="aftercare">Nachsorge</button>
        </div>
        <div class="project-tab-pane active" data-project-pane="overview">${overviewHtml(project)}</div>
        <div class="project-tab-pane" data-project-pane="design">${designHtml(project)}</div>
        <div class="project-tab-pane" data-project-pane="documents"><section class="detail-card"><span class="eyebrow">Ink Passport</span><h3>Verwendete Farben</h3><p class="muted">Noch keine Farben / Chargen geladen.</p></section></div>
        <div class="project-tab-pane" data-project-pane="payments"><div class="project-tab-empty">Zahlungen werden geladen …</div></div>
        <div class="project-tab-pane" data-project-pane="aftercare"><div class="project-tab-empty">Nachsorge wird geladen …</div></div>`;

      detail.querySelectorAll('[data-project-tab]').forEach(btn=>btn.addEventListener('click',()=>activateProjectTab(btn.dataset.projectTab)));
      detail.querySelector('#openLinkedCustomer')?.addEventListener('click',()=>openCustomer(project.customerId));
      detail.querySelector('#addVersionBtn')?.addEventListener('click',()=>addVersion(project.id));
      detail.querySelector(`[data-design-upload="${project.id}"]`)?.addEventListener('change',event=>{if(event.target.files?.[0])addVersion(project.id,event.target.files[0].name)});
      scheduleProjectOrganize();
    };
  }

  function activateProjectTab(name){
    const detail=document.getElementById('projectDetail');if(!detail)return;
    detail.querySelectorAll('[data-project-tab]').forEach(btn=>btn.classList.toggle('active',btn.dataset.projectTab===name));
    detail.querySelectorAll('[data-project-pane]').forEach(pane=>pane.classList.toggle('active',pane.dataset.projectPane===name));
  }

  function refreshProjectSummary(){
    const detail=document.getElementById('projectDetail');
    const id=detail?.dataset.projectId;const project=state.projects.find(p=>p.id===id);if(!project)return;
    const event=nextProjectEvent(id);const rest=Math.max(0,Number(project.price||0)-paymentTotal(project));const consentOk=['Unterschrieben','Vorhanden'].includes(project.consent);const depOpen=depositOpen(project);
    const next=detail.querySelector('[data-focus-next]');if(next){next.textContent=event?`Termin · ${formatDate(event.date)} · ${event.start}`:'Kein Termin';next.classList.toggle('good',Boolean(event));}
    const consent=detail.querySelector('[data-focus-consent]');if(consent){consent.textContent=`Einwilligung ${consentOk?'✓':'offen'}`;consent.classList.toggle('good',consentOk);consent.classList.toggle('warn',!consentOk);}
    const deposit=detail.querySelector('[data-focus-deposit]');if(deposit){deposit.textContent=Number(project.deposit||0)>0?(depOpen<=0?'Anzahlung ✓':`Anzahlung ${euro(depOpen)} offen`):'Keine Anzahlung';deposit.classList.toggle('good',depOpen<=0);deposit.classList.toggle('warn',depOpen>0);}
    const restBadge=detail.querySelector('[data-focus-rest]');if(restBadge)restBadge.textContent=`Rest ${euro(rest)}`;
    const nextOverview=detail.querySelector('[data-overview-next]');if(nextOverview)nextOverview.textContent=nextLabel(event);
    const restOverview=detail.querySelector('[data-overview-rest]');if(restOverview)restOverview.textContent=euro(rest);
  }

  function scheduleProjectOrganize(){
    if(projectOrganizeQueued)return;
    projectOrganizeQueued=true;
    requestAnimationFrame(()=>{projectOrganizeQueued=false;organizeProjectModules();});
  }

  function organizeProjectModules(){
    if(projectOrganizeRunning)return;
    const detail=document.getElementById('projectDetail');if(!detail?.dataset.projectId)return;
    projectOrganizeRunning=true;
    try{
      const docs=detail.querySelector('[data-project-pane="documents"]');
      const pay=detail.querySelector('[data-project-pane="payments"]');
      const after=detail.querySelector('[data-project-pane="aftercare"]');
      const consent=detail.querySelector('.consent-card');
      const ink=detail.querySelector('.ink-project-panel');
      const payment=detail.querySelector('.payment-card');
      const aftercare=detail.querySelector('.aftercare-card');
      if(consent&&docs&&!docs.contains(consent))docs.prepend(consent);
      if(ink&&docs&&!docs.contains(ink))docs.append(ink);
      if(payment&&pay&&!pay.contains(payment)){pay.innerHTML='';pay.append(payment);}
      if(aftercare&&after&&!after.contains(aftercare)){after.innerHTML='';after.append(aftercare);}
      refreshProjectSummary();
      refreshFocusDashboard();
    }finally{projectOrganizeRunning=false;}
  }

  function installProjectObserver(){
    const detail=document.getElementById('projectDetail');if(!detail)return;
    new MutationObserver(()=>scheduleProjectOrganize()).observe(detail,{childList:true,subtree:true});
  }

  function projectDialogHtml(){
    return `<form id="projectForm" class="focus-project-form">
      <div class="dialog-head"><div><span class="eyebrow">Tattoo starten</span><h2>Neues Tattoo</h2><p class="muted">Kunde, Projekt und auf Wunsch direkt den ersten Termin in einem Schritt anlegen.</p></div><button type="button" class="close-btn" data-close-project>×</button></div>
      <div class="project-form-scroll">
        <section class="project-form-section">
          <div class="project-form-section-head"><div><h3>Kunde</h3><p>Bestehenden Kunden wählen oder direkt neu anlegen.</p></div><div class="customer-mode"><button type="button" class="active" data-customer-mode="existing">Bestehend</button><button type="button" data-customer-mode="new">+ Neuer Kunde</button></div></div>
          <div class="customer-block" data-customer-block="existing"><label>Kunde<select name="customerId" id="projectCustomerSelect" required></select></label></div>
          <div class="customer-block" data-customer-block="new" hidden><div class="form-grid">
            <label>Vorname<input name="newFirstName" autocomplete="given-name"></label><label>Nachname<input name="newLastName" autocomplete="family-name"></label>
            <label>E-Mail<input type="email" name="newEmail" autocomplete="email"></label><label>Telefon<input name="newPhone" autocomplete="tel"></label>
          </div></div>
        </section>
        <section class="project-form-section">
          <div class="project-form-section-head"><div><h3>Tattoo</h3><p>Nur die Informationen, die für den Start wirklich nötig sind.</p></div></div>
          <div class="form-grid three">
            <label>Motiv<input required name="title" placeholder="z. B. Löwe"></label>
            <label>Körperstelle<input required name="placement" placeholder="rechter Unterarm"></label>
            <label>Größe<input name="size" placeholder="18 × 12 cm"></label>
            <label>Artist<select name="artist"><option>Sven</option><option>Mara</option></select></label>
            <label>Preis (€)<input name="price" type="number" min="0" step="10"></label>
            <label>Anzahlung (€)<input name="deposit" type="number" min="0" step="10"></label>
            <label class="full">Beschreibung<textarea name="description" rows="2" placeholder="Stil, Idee, Besonderheiten …"></textarea></label>
          </div>
        </section>
        <section class="project-form-section">
          <div class="project-form-section-head"><div><h3>Erster Termin</h3><p>Optional direkt mit dem Tattoo anlegen.</p></div></div>
          <label class="project-appointment-toggle"><input type="checkbox" name="scheduleAppointment"><span>Termin direkt einplanen</span></label>
          <div class="appointment-project-fields" data-project-appointment-fields hidden>
            <div class="form-grid three" style="margin-top:11px">
              <label>Datum<input type="date" name="appointmentDate"></label>
              <label>Start<input type="time" name="appointmentStart" value="10:00"></label>
              <label>Dauer (Min.)<input type="number" min="15" step="15" name="appointmentDuration" value="120"></label>
              <label>Status<select name="appointmentStatus"><option>Bestätigt</option><option>Angefragt</option></select></label>
            </div>
            <div class="project-inline-note">Der Artist wird aus dem Tattoo übernommen. Bei einer Überschneidung mit einem bestehenden Termin warnt TATNERA vor dem Speichern.</div>
          </div>
        </section>
      </div>
      <div class="focus-project-actions"><button type="button" class="btn ghost" data-close-project>Abbrechen</button><button type="submit" class="btn primary">Tattoo anlegen</button></div>
    </form>`;
  }

  function installProjectDialog(){
    const dialog=document.getElementById('projectDialog');if(!dialog)return;
    dialog.classList.add('focus-project-dialog');
    dialog.innerHTML=projectDialogHtml();
    dialog.querySelectorAll('[data-close-project]').forEach(btn=>btn.addEventListener('click',()=>dialog.close()));
    dialog.querySelectorAll('[data-customer-mode]').forEach(btn=>btn.addEventListener('click',()=>setCustomerMode(btn.dataset.customerMode)));
    dialog.querySelector('[name="scheduleAppointment"]').addEventListener('change',event=>toggleProjectAppointment(event.target.checked));
    dialog.querySelector('#projectForm').addEventListener('submit',saveFocusedProject);

    updateCustomerSelect=function(selected=''){
      const select=document.getElementById('projectCustomerSelect');if(!select)return;
      select.innerHTML='<option value="">Kunde auswählen …</option>'+state.customers.map(c=>`<option value="${c.id}" ${c.id===selected?'selected':''}>${esc(c.firstName)} ${esc(c.lastName)}</option>`).join('');
    };

    openProjectDialog=function(customerId=''){
      const form=document.getElementById('projectForm');
      form.reset();
      form.elements.artist.value='Sven';form.elements.appointmentStart.value='10:00';form.elements.appointmentDuration.value=120;form.elements.appointmentStatus.value='Bestätigt';form.elements.appointmentDate.value=todayISO();
      updateCustomerSelect(customerId);
      setCustomerMode(customerId?'existing':'existing');
      toggleProjectAppointment(false);
      dialog.showModal();
    };
    updateCustomerSelect();
  }

  function setCustomerMode(mode){
    const form=document.getElementById('projectForm');if(!form)return;
    form.dataset.customerMode=mode;
    form.querySelectorAll('[data-customer-mode]').forEach(btn=>btn.classList.toggle('active',btn.dataset.customerMode===mode));
    form.querySelectorAll('[data-customer-block]').forEach(block=>block.hidden=block.dataset.customerBlock!==mode);
    const existing=form.elements.customerId;
    const first=form.elements.newFirstName;const last=form.elements.newLastName;
    existing.required=mode==='existing';first.required=mode==='new';last.required=mode==='new';
  }

  function toggleProjectAppointment(enabled){
    const form=document.getElementById('projectForm');if(!form)return;
    form.elements.scheduleAppointment.checked=enabled;
    const fields=form.querySelector('[data-project-appointment-fields]');fields.hidden=!enabled;
    form.elements.appointmentDate.required=enabled;form.elements.appointmentStart.required=enabled;form.elements.appointmentDuration.required=enabled;
  }

  function minutes(time){const [h,m]=String(time||'00:00').split(':').map(Number);return (h||0)*60+(m||0)}
  function projectAppointmentConflicts(payload){
    const start=minutes(payload.start),end=start+Number(payload.duration||0);
    return (state.calendarEvents||[]).filter(event=>event.date===payload.date&&event.artist===payload.artist).filter(event=>start<minutes(event.start)+Number(event.duration||0)&&minutes(event.start)<end).sort((a,b)=>a.start.localeCompare(b.start));
  }

  function ensureProjectConflictDialog(){
    let dialog=document.getElementById('projectConflictDialog');if(dialog)return dialog;
    dialog=document.createElement('dialog');dialog.id='projectConflictDialog';dialog.className='dialog';
    dialog.innerHTML=`<div style="padding:22px"><div class="dialog-head"><div><span class="eyebrow">Terminkonflikt</span><h2>Artist bereits belegt</h2><p class="muted" id="projectConflictIntro"></p></div><button type="button" class="close-btn" data-project-conflict-cancel>×</button></div><div id="projectConflictList" class="project-conflict-list"></div><div class="dialog-actions"><button type="button" class="btn ghost" data-project-conflict-cancel>Zurück</button><button type="button" class="btn primary" data-project-conflict-confirm>Trotzdem anlegen</button></div></div>`;
    document.body.appendChild(dialog);return dialog;
  }

  function confirmProjectConflict(payload,conflicts){
    const dialog=ensureProjectConflictDialog();
    const end=minutes(payload.start)+Number(payload.duration||0);const endText=`${String(Math.floor(end/60)%24).padStart(2,'0')}:${String(end%60).padStart(2,'0')}`;
    dialog.querySelector('#projectConflictIntro').textContent=`${payload.artist} ist am ${formatDate(payload.date)} während ${payload.start}–${endText} bereits belegt.`;
    dialog.querySelector('#projectConflictList').innerHTML=conflicts.map(event=>`<div class="project-conflict-row"><strong>${esc(event.start)}–${esc(eventEnd(event.start,event.duration))}</strong><div><strong>${esc(event.projectId?projectName(event.projectId):(event.customerId?customerName(event.customerId):eventTypeLabel(event.type)))}</strong><br><span>${esc(eventTypeLabel(event.type))}${event.notes?' · '+esc(event.notes):''}</span></div></div>`).join('');
    return new Promise(resolve=>{
      let done=false;const finish=value=>{if(done)return;done=true;dialog.close();resolve(value)};
      dialog.querySelectorAll('[data-project-conflict-cancel]').forEach(btn=>btn.onclick=()=>finish(false));
      dialog.querySelector('[data-project-conflict-confirm]').onclick=()=>finish(true);
      dialog.oncancel=event=>{event.preventDefault();finish(false)};
      dialog.showModal();
    });
  }

  async function saveFocusedProject(event){
    event.preventDefault();
    const form=event.currentTarget;const data=Object.fromEntries(new FormData(form).entries());
    const mode=form.dataset.customerMode||'existing';const schedule=form.elements.scheduleAppointment.checked;
    const appointment=schedule?{date:data.appointmentDate,start:data.appointmentStart,duration:Number(data.appointmentDuration||120),artist:data.artist}:null;
    if(schedule){
      const conflicts=projectAppointmentConflicts(appointment);
      if(conflicts.length&&!(await confirmProjectConflict(appointment,conflicts)))return;
    }

    const stamp=Date.now();let customerId=data.customerId;
    if(mode==='new'){
      const customer={id:'c'+stamp,firstName:data.newFirstName.trim(),lastName:data.newLastName.trim(),email:data.newEmail.trim(),phone:data.newPhone.trim(),notes:'',lastProject:'—',next:'—',status:'Neu'};
      state.customers.unshift(customer);customerId=customer.id;
    }
    if(!customerId)return;

    const project={id:'p'+(stamp+1),customerId,title:data.title.trim(),placement:data.placement.trim(),size:data.size.trim(),artist:data.artist,price:Number(data.price||0),deposit:Number(data.deposit||0),status:schedule?'Termin geplant':'Entwurf',description:data.description.trim(),consent:'Fehlt',colors:[],inkIds:[],versions:[],payments:[],aftercare:{status:'Offen',tattooDate:'',followupDate:'',instructionsGiven:false,records:[]}};
    state.projects.unshift(project);

    const customer=state.customers.find(c=>c.id===customerId);
    if(customer){customer.lastProject=project.title;customer.status='Aktiv';}

    if(schedule){
      const calendarEvent={id:'e'+(stamp+2),date:data.appointmentDate,start:data.appointmentStart,duration:Number(data.appointmentDuration||120),customerId,projectId:project.id,artist:project.artist,type:'tattoo',status:data.appointmentStatus||'Bestätigt',notes:'Erster Tattoo-Termin'};
      state.calendarEvents.push(calendarEvent);
      if(customer)customer.next=`${formatDate(calendarEvent.date)} · ${calendarEvent.start}`;
    }

    persist();renderCustomers();renderProjects();renderAppointments();renderCalendar();updateCustomerSelect(customerId);refreshFocusDashboard();
    document.getElementById('projectDialog').close();form.reset();openProject(project.id);
  }

  function install(){
    installStyle();
    simplifyNavigation();
    rebuildDashboard();
    installFocusedProjectView();
    installProjectObserver();
    installProjectDialog();
  }

  install();
})();
