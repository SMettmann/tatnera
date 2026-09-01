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

const appointments = [
  {time:'11:30', customer:'Max Mustermann', project:'Löwe Unterarm · Sitzung 1', artist:'Sven', status:'Bestätigt'},
  {time:'14:00', customer:'Lea Wagner', project:'Botanical Fine Line', artist:'Sven', status:'Einwilligung fehlt'},
  {time:'17:30', customer:'Mia Keller', project:'Beratung · Lettering', artist:'Mara', status:'Beratung'}
];

const state = {
  customers: JSON.parse(localStorage.getItem('tatnera_customers') || 'null') || seedCustomers,
  projects: JSON.parse(localStorage.getItem('tatnera_projects') || 'null') || seedProjects,
  currentView: 'dashboard'
};

function persist(){
  localStorage.setItem('tatnera_customers', JSON.stringify(state.customers));
  localStorage.setItem('tatnera_projects', JSON.stringify(state.projects));
}

const pageTitles = {dashboard:'Dashboard',customers:'Kunden',projects:'Tattoo-Akten',calendar:'Kalender',requests:'Anfragen',settings:'Einstellungen','customer-detail':'Kundenakte','project-detail':'Tattoo-Akte'};
function navigate(view){
  state.currentView=view;
  document.querySelectorAll('.view').forEach(el=>el.classList.remove('active-view'));
  const target=document.getElementById(view); if(target) target.classList.add('active-view');
  document.querySelectorAll('.nav-item').forEach(el=>el.classList.toggle('active',el.dataset.view===view));
  document.getElementById('pageTitle').textContent=pageTitles[view]||'TATNERA';
  window.scrollTo({top:0,behavior:'smooth'});
}

document.querySelectorAll('[data-view]').forEach(btn=>btn.addEventListener('click',()=>navigate(btn.dataset.view)));
document.querySelectorAll('[data-view-target]').forEach(btn=>btn.addEventListener('click',()=>navigate(btn.dataset.viewTarget)));

function initials(c){return `${c.firstName?.[0]||''}${c.lastName?.[0]||''}`.toUpperCase()}
function customerName(id){const c=state.customers.find(x=>x.id===id);return c?`${c.firstName} ${c.lastName}`:'Unbekannt'}
function formatEuro(v){return new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(v)||0)}

function renderAppointments(){
  document.getElementById('todayAppointments').innerHTML=appointments.map(a=>`<div class="appointment"><div class="time">${a.time}</div><div class="main-info"><strong>${a.customer}</strong><span>${a.project} · ${a.artist}</span></div><span class="status-pill">${a.status}</span></div>`).join('');
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
document.getElementById('calendarDemoBtn').addEventListener('click',()=>alert('Als nächstes bauen wir den echten Kalender mit Artist-Zuordnung und Terminstatus.'));

renderAppointments(); renderCustomers(); renderProjects(); updateCustomerSelect();
