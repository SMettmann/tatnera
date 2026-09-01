const seedCustomers = [
  { id: 'c1', firstName: 'Lea', lastName: 'Wagner', email: 'lea@example.de', phone: '0176 22334455', notes: 'Fine Line, eher minimalistisch.', lastProject: 'Botanical Fine Line', next: 'Heute · 14:00', status: 'Aktiv' },
  { id: 'c2', firstName: 'Max', lastName: 'Mustermann', email: 'max@example.de', phone: '0151 33445566', notes: 'Black & Grey. Projekt über zwei Sitzungen.', lastProject: 'Löwe Unterarm', next: '05. Sep. · 11:30', status: 'Aktiv' },
  { id: 'c3', firstName: 'Jonas', lastName: 'Fischer', email: 'jonas@example.de', phone: '0172 88776655', notes: 'Anzahlung noch offen.', lastProject: 'Japanische Welle', next: '12. Sep. · 10:00', status: 'Anzahlung offen' },
  { id: 'c4', firstName: 'Mia', lastName: 'Keller', email: 'mia@example.de', phone: '0160 12233445', notes: 'Erstes Tattoo.', lastProject: 'Lettering Rippe', next: '—', status: 'Neu' }
];

const seedProjects = [
  { id:'p1', customerId:'c2', title:'Löwe Unterarm', placement:'rechter Unterarm', size:'18 × 12 cm', artist:'Sven', price:650, deposit:100, status:'Entwurf', description:'Black & Grey Löwe, ruhig und realistisch. Zwei Sitzungen möglich.', consent:'Vorhanden', colors:['Dynamic Black · Charge DB-2608','Panthera Grey · Charge PG-0726'], versions:[{name:'Referenz',type:'image'},{name:'Entwurf V1',type:'procreate'},{name:'Final',type:'final'}] },
  { id:'p2', customerId:'c1', title:'Botanical Fine Line', placement:'linker Oberarm', size:'14 cm', artist:'Sven', price:320, deposit:80, status:'Termin geplant', description:'Feine florale Linie, wenig Schattierung.', consent:'Fehlt', colors:['Dynamic Black · Charge DB-2608'], versions:[{name:'Moodboard',type:'image'},{name:'Entwurf V2',type:'procreate'}] },
  { id:'p3', customerId:'c3', title:'Japanische Welle', placement:'Wade', size:'22 × 16 cm', artist:'Mara', price:780, deposit:150, status:'Anzahlung offen', description:'Japanisch inspirierte Welle, kräftige Flächen.', consent:'Vorhanden', colors:['Panthera Black · Charge PB-1125'], versions:[{name:'Skizze',type:'image'}] }
];

const seedCalendarEvents = [
  {id:'e1',date:'2026-09-01',start:'11:30',duration:120,customerId:'c2',projectId:'p1',artist:'Sven',type:'tattoo',status:'Bestätigt',notes:'Sitzung 1'},
  {id:'e2',date:'2026-09-01',start:'14:00',duration:120,customerId:'c1',projectId:'p2',artist:'Sven',type:'tattoo',status:'Einwilligung fehlt',notes:''},
  {id:'e3',date:'2026-09-01',start:'17:30',duration:45,customerId:'c4',projectId:'',artist:'Mara',type:'consultation',status:'Bestätigt',notes:'Lettering Beratung'},
  {id:'e4',date:'2026-09-02',start:'10:00',duration:60,customerId:'c3',projectId:'p3',artist:'Mara',type:'touchup',status:'Angefragt',notes:'Heilung kontrollieren'},
  {id:'e5',date:'2026-09-03',start:'13:00',duration:180,customerId:'',projectId:'',artist:'Mara',type:'block',status:'Blockiert',notes:'Zeichenzeit / keine Termine'},
  {id:'e6',date:'2026-09-04',start:'09:30',duration:180,customerId:'c3',projectId:'p3',artist:'Mara',type:'tattoo',status:'Bestätigt',notes:'Sitzung 1'},
  {id:'e7',date:'2026-09-05',start:'11:00',duration:90,customerId:'c4',projectId:'',artist:'Sven',type:'consultation',status:'Angefragt',notes:'Erstes Tattoo'}
];

const state = {
  customers: JSON.parse(localStorage.getItem('tatnera_customers') || 'null') || seedCustomers,
  projects: JSON.parse(localStorage.getItem('tatnera_projects') || 'null') || seedProjects,
  calendarEvents: JSON.parse(localStorage.getItem('tatnera_calendar') || 'null') || seedCalendarEvents,
  currentView: 'dashboard',
  calendar: { view:'week', anchor: todayISO(), artist:'all' }
};

function persist(){
  localStorage.setItem('tatnera_customers', JSON.stringify(state.customers));
  localStorage.setItem('tatnera_projects', JSON.stringify(state.projects));
  localStorage.setItem('tatnera_calendar', JSON.stringify(state.calendarEvents));
}

function todayISO(){ return dateToISO(new Date()); }
function dateToISO(date){
  const y=date.getFullYear();
  const m=String(date.getMonth()+1).padStart(2,'0');
  const d=String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}
function parseISO(value){
  const [y,m,d]=value.split('-').map(Number);
  return new Date(y,m-1,d);
}
function addDays(date,days){ const d=new Date(date); d.setDate(d.getDate()+days); return d; }
function mondayOf(date){ const d=new Date(date); const offset=(d.getDay()+6)%7; d.setDate(d.getDate()-offset); return d; }
function formatDay(date,options){ return new Intl.DateTimeFormat('de-DE',options).format(date); }

const pageTitles = {dashboard:'Dashboard',customers:'Kunden',projects:'Tattoo-Akten',calendar:'Kalender',requests:'Anfragen',settings:'Einstellungen','customer-detail':'Kundenakte','project-detail':'Tattoo-Akte'};
function navigate(view){
  state.currentView=view;
  document.querySelectorAll('.view').forEach(el=>el.classList.remove('active-view'));
  const target=document.getElementById(view); if(target) target.classList.add('active-view');
  document.querySelectorAll('.nav-item').forEach(el=>el.classList.toggle('active',el.dataset.view===view));
  document.getElementById('pageTitle').textContent=pageTitles[view]||'TATNERA';
  if(view==='calendar') renderCalendar();
  window.scrollTo({top:0,behavior:'smooth'});
}

document.querySelectorAll('[data-view]').forEach(btn=>btn.addEventListener('click',()=>navigate(btn.dataset.view)));
document.querySelectorAll('[data-view-target]').forEach(btn=>btn.addEventListener('click',()=>navigate(btn.dataset.viewTarget)));

function initials(c){return `${c.firstName?.[0]||''}${c.lastName?.[0]||''}`.toUpperCase()}
function customerName(id){const c=state.customers.find(x=>x.id===id);return c?`${c.firstName} ${c.lastName}`:'Unbekannt'}
function projectName(id){const p=state.projects.find(x=>x.id===id);return p?p.title:''}
function formatEuro(v){return new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(v)||0)}
function eventTypeLabel(type){return ({tattoo:'Tattoo',consultation:'Beratung',touchup:'Nachstechen',block:'Blockzeit'})[type]||type}
function eventEnd(start,duration){
  const [h,m]=start.split(':').map(Number); const total=h*60+m+Number(duration||0);
  return `${String(Math.floor(total/60)%24).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;
}

function renderAppointments(){
  const today=todayISO();
  const events=state.calendarEvents.filter(e=>e.date===today).sort((a,b)=>a.start.localeCompare(b.start));
  const html=events.slice(0,4).map(e=>{
    const customer=e.customerId?customerName(e.customerId):eventTypeLabel(e.type);
    const detail=e.projectId?projectName(e.projectId):(e.notes||eventTypeLabel(e.type));
    return `<div class="appointment"><div class="time">${e.start}</div><div class="main-info"><strong>${customer}</strong><span>${detail} · ${e.artist}</span></div><span class="status-pill">${e.status}</span></div>`;
  }).join('');
  document.getElementById('todayAppointments').innerHTML=html||'<p class="muted">Heute sind noch keine Termine eingetragen.</p>';
}

function projectCard(p){
  return `<article class="project-card" data-project-id="${p.id}"><div class="project-art"><span>${p.status}</span></div><div class="project-body"><h4>${p.title}</h4><p>${customerName(p.customerId)} · ${p.placement}</p><div class="project-meta"><span>${p.artist}</span><span>${formatEuro(p.price)}</span></div></div></article>`;
}
function bindProjectCards(){document.querySelectorAll('[data-project-id]').forEach(el=>el.addEventListener('click',()=>openProject(el.dataset.projectId)))}
function renderProjects(){
  document.getElementById('projectList').innerHTML=state.projects.map(projectCard).join('');
  document.getElementById('recentProjects').innerHTML=state.projects.slice(0,3).map(projectCard).join('');
  bindProjectCards();
}

function renderCustomers(filter=''){
  const q=filter.trim().toLowerCase();
  const rows=state.customers.filter(c=>`${c.firstName} ${c.lastName} ${c.email} ${c.phone}`.toLowerCase().includes(q)).map(c=>`
  <tr data-customer-id="${c.id}">
    <td><div class="customer-cell"><div class="customer-avatar">${initials(c)}</div><strong>${c.firstName} ${c.lastName}</strong></div></td>
    <td><span>${c.email||'—'}</span><br><span class="muted">${c.phone||'—'}</span></td>
    <td>${c.lastProject||'—'}</td><td>${c.next||'—'}</td><td><span class="status-pill">${c.status||'Aktiv'}</span></td><td>→</td>
  </tr>`).join('');
  document.getElementById('customerTableBody').innerHTML=rows||`<tr><td colspan="6" class="muted">Keine Kunden gefunden.</td></tr>`;
  document.querySelectorAll('[data-customer-id]').forEach(row=>row.addEventListener('click',()=>openCustomer(row.dataset.customerId)));
}

function openCustomer(id){
  const c=state.customers.find(x=>x.id===id); if(!c)return;
  const projects=state.projects.filter(p=>p.customerId===id);
  document.getElementById('customerDetail').innerHTML=`
    <div class="detail-hero">
      <section class="detail-card"><div class="detail-profile"><div class="big-avatar">${initials(c)}</div><div><span class="eyebrow">Kunde</span><h2>${c.firstName} ${c.lastName}</h2><div class="muted">${c.email||'Keine E-Mail'} · ${c.phone||'Keine Telefonnummer'}</div></div></div><div class="detail-stat-grid"><div class="mini-stat"><span>Tattoos</span><strong>${projects.length}</strong></div><div class="mini-stat"><span>Umsatz</span><strong>${formatEuro(projects.reduce((s,p)=>s+Number(p.price||0),0))}</strong></div><div class="mini-stat"><span>Nächster Termin</span><strong>${c.next||'—'}</strong></div></div></section>
      <section class="detail-card"><span class="eyebrow">Notizen</span><h3>Studio-Hinweise</h3><p class="muted">${c.notes||'Noch keine Notizen vorhanden.'}</p></section>
    </div>
    <section class="detail-card"><div class="panel-head"><div><span class="eyebrow">Historie</span><h3>Tattoo-Projekte</h3></div><button class="btn primary" id="detailNewProject">+ Projekt</button></div><div class="project-grid">${projects.length?projects.map(projectCard).join(''):'<p class="muted">Noch kein Tattoo-Projekt angelegt.</p>'}</div></section>`;
  navigate('customer-detail'); bindProjectCards();
  document.getElementById('detailNewProject')?.addEventListener('click',()=>openProjectDialog(id));
}

function openProject(id){
  const p=state.projects.find(x=>x.id===id); if(!p)return;
  const c=state.customers.find(x=>x.id===p.customerId);
  document.getElementById('projectDetail').innerHTML=`
    <div class="detail-hero">
      <section class="detail-card"><span class="eyebrow">${p.status}</span><h2>${p.title}</h2><p class="muted">${customerName(p.customerId)} · ${p.placement}${p.size?' · '+p.size:''}</p><div class="detail-stat-grid"><div class="mini-stat"><span>Artist</span><strong>${p.artist||'—'}</strong></div><div class="mini-stat"><span>Preis</span><strong>${formatEuro(p.price)}</strong></div><div class="mini-stat"><span>Anzahlung</span><strong>${formatEuro(p.deposit)}</strong></div></div></section>
      <section class="detail-card"><span class="eyebrow">Compliance</span><h3>Dokumentation</h3><div class="detail-row"><span>Einwilligung</span><strong>${p.consent||'Fehlt'}</strong></div><div class="detail-row"><span>Farben dokumentiert</span><strong>${p.colors?.length||0}</strong></div><div class="detail-row"><span>Fotos / Entwürfe</span><strong>${p.versions?.length||0}</strong></div></section>
    </div>
    <div class="detail-columns">
      <section class="detail-card"><span class="eyebrow">Projekt</span><h3>Beschreibung</h3><p class="muted">${p.description||'Keine Beschreibung.'}</p><div class="detail-list"><div class="detail-row"><span>Körperstelle</span><strong>${p.placement}</strong></div><div class="detail-row"><span>Größe</span><strong>${p.size||'—'}</strong></div><div class="detail-row"><span>Kunde</span><button class="text-btn" id="openLinkedCustomer">${c?c.firstName+' '+c.lastName:'—'} →</button></div></div></section>
      <section class="detail-card"><span class="eyebrow">Farben / Ink Passport</span><h3>Verwendete Farben</h3><div class="detail-list">${(p.colors||[]).map(x=>`<div class="detail-row"><span>${x}</span><strong>✓</strong></div>`).join('')||'<p class="muted">Noch keine Farben hinterlegt.</p>'}</div><button class="btn ghost" style="margin-top:10px">+ Farbe / Charge</button></section>
    </div>
    <section class="detail-card space-top"><div class="panel-head"><div><span class="eyebrow">Procreate Workflow</span><h3>Entwürfe & Versionen</h3></div><button class="btn ghost" id="addVersionBtn">+ Version</button></div><div class="design-area">${(p.versions||[]).map((v,i)=>`<div class="design-tile"><span class="version-badge">${v.type==='procreate'?'Procreate':'Datei'} · ${i+1}</span><strong>${v.name}</strong><span class="muted">Version in Tattoo-Akte gespeichert</span></div>`).join('')}<label class="design-tile"><span class="version-badge">Upload</span><strong>Datei hinzufügen</strong><input type="file" accept="image/*,.psd,.pdf,.procreate" data-design-upload="${p.id}"><span class="muted">Referenz, PNG, PSD, PDF oder Procreate-Datei</span></label></div></section>`;
  navigate('project-detail');
  document.getElementById('openLinkedCustomer')?.addEventListener('click',()=>openCustomer(p.customerId));
  document.getElementById('addVersionBtn')?.addEventListener('click',()=>addVersion(p.id));
  document.querySelector(`[data-design-upload="${p.id}"]`)?.addEventListener('change',e=>{if(e.target.files[0]) addVersion(p.id,e.target.files[0].name)});
}

function addVersion(projectId,name){
  const p=state.projects.find(x=>x.id===projectId); if(!p)return;
  const versionName=name||prompt('Name der neuen Entwurfsversion:',`Entwurf V${(p.versions?.length||0)+1}`); if(!versionName)return;
  p.versions=p.versions||[]; p.versions.push({name:versionName,type:'procreate'}); persist(); renderProjects(); openProject(projectId);
}

const customerDialog=document.getElementById('customerDialog');
const projectDialog=document.getElementById('projectDialog');
function openCustomerDialog(){customerDialog.showModal()}
function updateCustomerSelect(selected=''){
  const sel=document.getElementById('projectCustomerSelect');
  sel.innerHTML='<option value="">Kunde auswählen …</option>'+state.customers.map(c=>`<option value="${c.id}" ${c.id===selected?'selected':''}>${c.firstName} ${c.lastName}</option>`).join('');
}
function openProjectDialog(customerId=''){updateCustomerSelect(customerId); projectDialog.showModal()}

document.getElementById('addCustomerBtn').addEventListener('click',openCustomerDialog);
document.getElementById('quickCustomerBtn').addEventListener('click',openCustomerDialog);
document.getElementById('addProjectBtn').addEventListener('click',()=>openProjectDialog());
document.getElementById('quickProjectBtn').addEventListener('click',()=>openProjectDialog());

document.getElementById('customerForm').addEventListener('submit',e=>{
  e.preventDefault(); const fd=new FormData(e.currentTarget); const data=Object.fromEntries(fd.entries());
  const c={id:'c'+Date.now(),...data,lastProject:'—',next:'—',status:'Neu'}; state.customers.unshift(c); persist(); renderCustomers(); updateCustomerSelect(); customerDialog.close(); e.currentTarget.reset(); navigate('customers');
});

document.getElementById('projectForm').addEventListener('submit',e=>{
  e.preventDefault(); const fd=new FormData(e.currentTarget); const d=Object.fromEntries(fd.entries());
  const p={id:'p'+Date.now(),...d,price:Number(d.price||0),deposit:Number(d.deposit||0),status:'Entwurf',consent:'Fehlt',colors:[],versions:[]}; state.projects.unshift(p);
  const c=state.customers.find(x=>x.id===p.customerId); if(c)c.lastProject=p.title; persist(); renderCustomers(); renderProjects(); projectDialog.close(); e.currentTarget.reset(); openProject(p.id);
});

document.getElementById('customerSearch').addEventListener('input',e=>renderCustomers(e.target.value));

function installCalendarAssets(){
  if(!document.querySelector('link[href="calendar.css"]')){
    const link=document.createElement('link'); link.rel='stylesheet'; link.href='calendar.css'; document.head.appendChild(link);
  }
  const section=document.getElementById('calendar');
  section.innerHTML=`<div class="calendar-shell">
    <div class="calendar-toolbar">
      <div class="calendar-toolbar-left">
        <button class="calendar-nav-btn" data-cal-action="prev">←</button>
        <button class="calendar-nav-btn" data-cal-action="today">Heute</button>
        <button class="calendar-nav-btn" data-cal-action="next">→</button>
        <div class="calendar-date-label" id="calendarDateLabel"></div>
      </div>
      <div class="calendar-toolbar-right">
        <div class="artist-filter" id="artistFilter">
          <button data-artist="all" class="active">Alle</button><button data-artist="Sven">Sven</button><button data-artist="Mara">Mara</button>
        </div>
        <div class="calendar-toggle" id="calendarToggle">
          <button data-cal-view="day">Tag</button><button data-cal-view="week" class="active">Woche</button>
        </div>
        <button class="btn primary" id="newAppointmentBtn">+ Termin</button>
      </div>
    </div>
    <div class="calendar-legend"><span><i class="legend-dot"></i>Tattoo</span><span><i class="legend-dot consultation"></i>Beratung</span><span><i class="legend-dot touchup"></i>Nachstechen</span><span><i class="legend-dot block"></i>Blockzeit</span></div>
    <div class="calendar-board"><div id="calendarBoard"></div></div>
  </div>`;

  if(!document.getElementById('appointmentDialog')){
    const dialog=document.createElement('dialog'); dialog.id='appointmentDialog'; dialog.className='dialog wide-dialog';
    dialog.innerHTML=`<form id="appointmentForm">
      <div class="dialog-head"><div><span class="eyebrow">Studio-Kalender</span><h2 id="appointmentDialogTitle">Termin anlegen</h2></div><button type="button" class="close-btn" id="closeAppointmentDialog">×</button></div>
      <input type="hidden" name="eventId" />
      <div class="form-grid three">
        <label>Terminart<select name="type"><option value="tattoo">Tattoo</option><option value="consultation">Beratung</option><option value="touchup">Nachstechen</option><option value="block">Blockzeit</option></select></label>
        <label>Artist<select name="artist"><option>Sven</option><option>Mara</option></select></label>
        <label>Status<select name="status"><option>Bestätigt</option><option>Angefragt</option><option>Einwilligung fehlt</option><option>Blockiert</option></select></label>
        <label>Datum<input required type="date" name="date" /></label>
        <label>Start<input required type="time" name="start" /></label>
        <label>Dauer (Min.)<input required type="number" min="15" step="15" name="duration" value="120" /></label>
        <label class="full">Kunde<select name="customerId" id="appointmentCustomerSelect"></select></label>
        <label class="full">Tattoo-Projekt<select name="projectId" id="appointmentProjectSelect"></select></label>
        <label class="full">Notiz<textarea name="notes" rows="3" placeholder="Sitzung, Beratung, Besonderheiten …"></textarea></label>
      </div>
      <div class="appointment-dialog-tools"><button type="button" class="danger-btn" id="deleteAppointmentBtn" hidden>Termin löschen</button><div class="dialog-actions" style="margin-top:0"><button type="button" class="btn ghost" id="cancelAppointmentBtn">Abbrechen</button><button type="submit" class="btn primary">Termin speichern</button></div></div>
    </form>`;
    document.body.appendChild(dialog);
  }

  document.querySelectorAll('[data-cal-action]').forEach(btn=>btn.addEventListener('click',()=>changeCalendarDate(btn.dataset.calAction)));
  document.getElementById('calendarToggle').addEventListener('click',e=>{
    const btn=e.target.closest('[data-cal-view]'); if(!btn)return;
    state.calendar.view=btn.dataset.calView; renderCalendar();
  });
  document.getElementById('artistFilter').addEventListener('click',e=>{
    const btn=e.target.closest('[data-artist]'); if(!btn)return;
    state.calendar.artist=btn.dataset.artist; renderCalendar();
  });
  document.getElementById('newAppointmentBtn').addEventListener('click',()=>openAppointmentDialog());
  document.getElementById('closeAppointmentDialog').addEventListener('click',()=>document.getElementById('appointmentDialog').close());
  document.getElementById('cancelAppointmentBtn').addEventListener('click',()=>document.getElementById('appointmentDialog').close());
  document.getElementById('appointmentForm').addEventListener('submit',saveAppointment);
  document.getElementById('deleteAppointmentBtn').addEventListener('click',deleteAppointment);
}

function filteredCalendarEvents(){
  return state.calendarEvents.filter(e=>state.calendar.artist==='all'||e.artist===state.calendar.artist);
}
function renderCalendar(){
  const board=document.getElementById('calendarBoard'); if(!board)return;
  document.querySelectorAll('[data-cal-view]').forEach(b=>b.classList.toggle('active',b.dataset.calView===state.calendar.view));
  document.querySelectorAll('[data-artist]').forEach(b=>b.classList.toggle('active',b.dataset.artist===state.calendar.artist));
  if(state.calendar.view==='day') renderDayCalendar(board); else renderWeekCalendar(board);
}
function renderWeekCalendar(board){
  const anchor=parseISO(state.calendar.anchor); const monday=mondayOf(anchor); const sunday=addDays(monday,6);
  document.getElementById('calendarDateLabel').textContent=`${formatDay(monday,{day:'2-digit',month:'short'})} – ${formatDay(sunday,{day:'2-digit',month:'short',year:'numeric'})}`;
  const events=filteredCalendarEvents();
  const days=Array.from({length:7},(_,i)=>addDays(monday,i));
  board.innerHTML=`<div class="calendar-scroll"><div class="calendar-week">${days.map(day=>{
    const iso=dateToISO(day); const dayEvents=events.filter(e=>e.date===iso).sort((a,b)=>a.start.localeCompare(b.start));
    return `<section class="calendar-day ${iso===todayISO()?'today':''}">
      <div class="calendar-day-head" data-open-day="${iso}"><div><strong>${formatDay(day,{weekday:'short'})}</strong><span>${formatDay(day,{month:'long'})}</span></div><div class="calendar-day-number">${day.getDate()}</div></div>
      <div class="calendar-events">${dayEvents.length?dayEvents.map(eventCard).join(''):'<div class="calendar-empty">Noch frei</div>'}<button class="mini-add-btn" data-add-date="${iso}">+ Termin</button></div>
    </section>`;
  }).join('')}</div></div>`;
  bindCalendarCards();
}
function renderDayCalendar(board){
  const date=parseISO(state.calendar.anchor); const iso=dateToISO(date);
  document.getElementById('calendarDateLabel').textContent=formatDay(date,{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
  const events=filteredCalendarEvents().filter(e=>e.date===iso).sort((a,b)=>a.start.localeCompare(b.start));
  board.innerHTML=`<div class="calendar-day-view"><div class="day-time-rail">${Array.from({length:11},(_,i)=>`<div>${String(i+9).padStart(2,'0')}:00</div>`).join('')}</div><div class="day-agenda">${events.length?events.map(e=>`
    <button class="day-event-row calendar-event ${e.type}" data-event-id="${e.id}"><div class="day-time">${e.start}<br><span class="muted">${eventEnd(e.start,e.duration)}</span></div><div><span class="event-type-pill">${eventTypeLabel(e.type)}</span><h4>${calendarEventTitle(e)}</h4><p>${calendarEventDetail(e)}</p></div><div class="day-event-actions">${e.artist}<br>${e.status}</div></button>`).join(''):'<div class="calendar-empty">Für diesen Tag sind noch keine Termine eingetragen.</div>'}<button class="mini-add-btn" data-add-date="${iso}">+ Termin anlegen</button></div></div>`;
  bindCalendarCards();
}
function calendarEventTitle(e){
  if(e.type==='block') return e.notes||'Blockzeit';
  if(e.projectId) return projectName(e.projectId);
  if(e.customerId) return customerName(e.customerId);
  return eventTypeLabel(e.type);
}
function calendarEventDetail(e){
  const bits=[];
  if(e.customerId && e.projectId) bits.push(customerName(e.customerId));
  if(e.notes) bits.push(e.notes);
  return bits.join(' · ')||e.status;
}
function eventCard(e){
  return `<button class="calendar-event ${e.type}" data-event-id="${e.id}"><div class="event-time">${e.start} – ${eventEnd(e.start,e.duration)}</div><span class="event-type-pill">${eventTypeLabel(e.type)}</span><h4>${calendarEventTitle(e)}</h4><p>${calendarEventDetail(e)}</p><div class="event-foot"><span>${e.artist}</span><span>${e.status}</span></div></button>`;
}
function bindCalendarCards(){
  document.querySelectorAll('[data-event-id]').forEach(el=>el.addEventListener('click',()=>openAppointmentDialog(el.dataset.eventId)));
  document.querySelectorAll('[data-add-date]').forEach(el=>el.addEventListener('click',()=>openAppointmentDialog('',el.dataset.addDate)));
  document.querySelectorAll('[data-open-day]').forEach(el=>el.addEventListener('click',()=>{state.calendar.anchor=el.dataset.openDay;state.calendar.view='day';renderCalendar()}));
}
function changeCalendarDate(action){
  if(action==='today') state.calendar.anchor=todayISO();
  else {
    const step=state.calendar.view==='week'?7:1; const dir=action==='next'?1:-1;
    state.calendar.anchor=dateToISO(addDays(parseISO(state.calendar.anchor),step*dir));
  }
  renderCalendar();
}
function populateAppointmentSelects(customerId='',projectId=''){
  document.getElementById('appointmentCustomerSelect').innerHTML='<option value="">Kein Kunde / Blockzeit</option>'+state.customers.map(c=>`<option value="${c.id}" ${c.id===customerId?'selected':''}>${c.firstName} ${c.lastName}</option>`).join('');
  document.getElementById('appointmentProjectSelect').innerHTML='<option value="">Kein Tattoo-Projekt</option>'+state.projects.map(p=>`<option value="${p.id}" ${p.id===projectId?'selected':''}>${p.title} · ${customerName(p.customerId)}</option>`).join('');
}
function openAppointmentDialog(eventId='',date=''){
  const dialog=document.getElementById('appointmentDialog'); const form=document.getElementById('appointmentForm');
  form.reset();
  const event=state.calendarEvents.find(e=>e.id===eventId);
  const selectedDate=date||(event?.date)||state.calendar.anchor;
  populateAppointmentSelects(event?.customerId||'',event?.projectId||'');
  form.elements.eventId.value=event?.id||'';
  form.elements.type.value=event?.type||'tattoo';
  form.elements.artist.value=event?.artist||(state.calendar.artist==='all'?'Sven':state.calendar.artist);
  form.elements.status.value=event?.status||'Bestätigt';
  form.elements.date.value=selectedDate;
  form.elements.start.value=event?.start||'10:00';
  form.elements.duration.value=event?.duration||120;
  form.elements.customerId.value=event?.customerId||'';
  form.elements.projectId.value=event?.projectId||'';
  form.elements.notes.value=event?.notes||'';
  document.getElementById('appointmentDialogTitle').textContent=event?'Termin bearbeiten':'Termin anlegen';
  document.getElementById('deleteAppointmentBtn').hidden=!event;
  dialog.showModal();
}
function saveAppointment(e){
  e.preventDefault(); const form=e.currentTarget; const d=Object.fromEntries(new FormData(form).entries());
  const payload={id:d.eventId||'e'+Date.now(),date:d.date,start:d.start,duration:Number(d.duration||60),customerId:d.customerId,projectId:d.projectId,artist:d.artist,type:d.type,status:d.status,notes:d.notes};
  const index=state.calendarEvents.findIndex(x=>x.id===payload.id);
  if(index>=0) state.calendarEvents[index]=payload; else state.calendarEvents.push(payload);
  state.calendar.anchor=payload.date; persist(); renderAppointments(); renderCalendar(); document.getElementById('appointmentDialog').close();
}
function deleteAppointment(){
  const id=document.getElementById('appointmentForm').elements.eventId.value; if(!id)return;
  if(!confirm('Diesen Termin wirklich löschen?')) return;
  state.calendarEvents=state.calendarEvents.filter(e=>e.id!==id); persist(); renderAppointments(); renderCalendar(); document.getElementById('appointmentDialog').close();
}

installCalendarAssets();
renderAppointments(); renderCustomers(); renderProjects(); updateCustomerSelect(); renderCalendar();
