/* TATNERA — Anfrage-Workflow */
(function(){
  const seedRequests=[
    {id:'r1',createdLabel:'Heute, 09:12',stage:'new',firstName:'Nina',lastName:'Becker',email:'nina@example.de',phone:'0176 55443322',motif:'Fine Line Blumen',placement:'Unterarm',size:'ca. 15 cm',artist:'Sven',availability:'Werktags ab 16 Uhr',description:'Feine Blumenlinie, eher minimalistisch. Zwei Referenzbilder vorhanden.',quotedPrice:0,notes:'Erstanfrage über Website.',customerId:'',projectId:''},
    {id:'r2',createdLabel:'Gestern',stage:'new',firstName:'Tim',lastName:'Kramer',email:'tim@example.de',phone:'0151 44556677',motif:'Blackwork Sleeve',placement:'Oberarm',size:'mehrere Sitzungen',artist:'Sven',availability:'Freitag oder Samstag',description:'Blackwork Sleeve, vorhandene kleine Tattoos sollen integriert werden.',quotedPrice:0,notes:'Vorab Beratung sinnvoll.',customerId:'',projectId:''},
    {id:'r3',createdLabel:'28. Aug.',stage:'clarify',firstName:'Laura',lastName:'Schmitt',email:'laura@example.de',phone:'0172 11223344',motif:'Lettering Brust',placement:'Brust',size:'ca. 12 cm',artist:'Sven',availability:'Terminabstimmung offen',description:'Kurzes Lettering, Schriftstil noch nicht final.',quotedPrice:0,notes:'Rückfrage zur Schriftart geschickt.',customerId:'',projectId:''},
    {id:'r4',createdLabel:'27. Aug.',stage:'ready',firstName:'Daniel',lastName:'Weber',email:'daniel@example.de',phone:'0160 99887766',motif:'Mandala Rücken',placement:'Rücken',size:'ca. 25 cm',artist:'Sven',availability:'Flexibel',description:'Mandala mittig am oberen Rücken.',quotedPrice:750,notes:'Preis bestätigt · 750 €',customerId:'',projectId:''}
  ];

  state.requests=JSON.parse(localStorage.getItem('tatnera_requests')||'null')||seedRequests;
  let activeRequestId='';

  function esc(v){return String(v??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));}
  function persistRequests(){localStorage.setItem('tatnera_requests',JSON.stringify(state.requests));}
  function requestById(id){return state.requests.find(r=>r.id===id);}
  function stageLabel(stage){return ({new:'Neu',clarify:'In Klärung',ready:'Terminbereit'})[stage]||stage;}
  function fullName(r){return `${r.firstName||''} ${r.lastName||''}`.trim()||'Interessent/in';}
  function euro(v){return new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(v)||0);}

  function install(){
    if(!document.querySelector('link[href="requests.css"]')){const link=document.createElement('link');link.rel='stylesheet';link.href='requests.css';document.head.appendChild(link);}
    buildDialog();renderRequests();updateRequestDashboard();
  }

  function buildDialog(){
    if(document.getElementById('requestDetailDialog'))return;
    const dialog=document.createElement('dialog');dialog.id='requestDetailDialog';dialog.className='dialog request-detail-dialog';
    dialog.innerHTML=`<div><div class="dialog-head"><div><span class="eyebrow">Tattoo-Anfrage</span><h2 id="requestDetailTitle">Anfrage</h2><p class="muted" id="requestDetailMeta"></p></div><button type="button" class="close-btn" data-close-request>×</button></div><div id="requestDetailBody"></div></div>`;
    document.body.appendChild(dialog);
    dialog.querySelector('[data-close-request]').addEventListener('click',()=>dialog.close());
  }

  function renderRequests(){
    const section=document.getElementById('requests');if(!section)return;
    const stages=[['new','Neu'],['clarify','In Klärung'],['ready','Terminbereit']];
    section.innerHTML=`<div class="request-columns">${stages.map(([stage,label])=>{
      const items=state.requests.filter(r=>r.stage===stage);
      return `<div class="request-column"><div class="column-head"><strong>${label}</strong><span>${items.length}</span></div>${items.length?items.map(requestCard).join(''):'<div class="request-empty-column">Keine Anfragen</div>'}</div>`;
    }).join('')}</div>`;
    section.querySelectorAll('[data-open-request]').forEach(b=>b.addEventListener('click',()=>openRequest(b.dataset.openRequest)));
  }

  function requestCard(r){
    const second=r.stage==='ready'&&r.quotedPrice?`Preis bestätigt · ${euro(r.quotedPrice)}`:`${r.placement}${r.size?' · '+r.size:''}`;
    return `<div class="request-card"><small>${esc(r.createdLabel)}</small><strong>${esc(r.motif)}</strong><span>${esc(second)}</span><span class="request-customer">${esc(fullName(r))}</span><button data-open-request="${r.id}">${r.stage==='ready'?'Termin planen':'Anfrage öffnen'} →</button></div>`;
  }

  function openRequest(id){
    activeRequestId=id;const r=requestById(id);if(!r)return;
    document.getElementById('requestDetailTitle').textContent=r.motif;
    document.getElementById('requestDetailMeta').textContent=`${fullName(r)} · ${r.placement}${r.size?' · '+r.size:''}`;
    const converted=r.customerId||r.projectId;
    document.getElementById('requestDetailBody').innerHTML=`<div class="request-detail-grid">
      <section class="request-box"><span class="request-stage ${r.stage}">${stageLabel(r.stage)}</span><h3>Anfragedaten</h3><div class="request-data">
        <div><span>Name</span><strong>${esc(fullName(r))}</strong></div><div><span>Artist</span><strong>${esc(r.artist||'—')}</strong></div>
        <div><span>E-Mail</span><strong>${esc(r.email||'—')}</strong></div><div><span>Telefon</span><strong>${esc(r.phone||'—')}</strong></div>
        <div><span>Körperstelle</span><strong>${esc(r.placement||'—')}</strong></div><div><span>Größe</span><strong>${esc(r.size||'—')}</strong></div>
        <div><span>Verfügbarkeit</span><strong>${esc(r.availability||'—')}</strong></div><div><span>Preis</span><strong>${r.quotedPrice?euro(r.quotedPrice):'Noch offen'}</strong></div>
      </div><div class="request-detail-note"><span>Beschreibung</span><p>${esc(r.description||'Keine Beschreibung vorhanden.')}</p></div><div class="request-detail-note"><span>Studio-Notiz</span><p>${esc(r.notes||'Keine Notiz.')}</p></div></section>
      <section class="request-box"><span class="eyebrow">Workflow</span><h3>Was passiert als Nächstes?</h3><div class="request-workflow">
        <button data-request-stage="new" class="${r.stage==='new'?'active-stage':''}">Neu</button>
        <button data-request-stage="clarify" class="${r.stage==='clarify'?'active-stage':''}">In Klärung</button>
        <button data-request-stage="ready" class="${r.stage==='ready'?'active-stage':''}">Terminbereit</button>
        <button class="primary-flow" data-convert-request>${converted?'Kunde / Tattoo-Akte öffnen':'Kunde + Tattoo-Akte anlegen'}</button>
        <button class="primary-flow" data-plan-request>Termin planen</button>
      </div>${converted?`<div class="request-converted">✓ Diese Anfrage ist bereits mit ${r.customerId?'einem Kunden':''}${r.customerId&&r.projectId?' und ':''}${r.projectId?'einer Tattoo-Akte':''} verknüpft.</div>`:''}</section>
    </div><div class="request-footer"><button class="request-delete" data-delete-request>Anfrage löschen</button><button class="btn ghost" data-close-request-bottom>Schließen</button></div>`;
    const body=document.getElementById('requestDetailBody');
    body.querySelectorAll('[data-request-stage]').forEach(b=>b.addEventListener('click',()=>changeStage(id,b.dataset.requestStage)));
    body.querySelector('[data-convert-request]').addEventListener('click',()=>convertRequest(id,false));
    body.querySelector('[data-plan-request]').addEventListener('click',()=>planRequest(id));
    body.querySelector('[data-delete-request]').addEventListener('click',()=>deleteRequest(id));
    body.querySelector('[data-close-request-bottom]').addEventListener('click',()=>document.getElementById('requestDetailDialog').close());
    const dialog=document.getElementById('requestDetailDialog');if(!dialog.open)dialog.showModal();
  }

  function changeStage(id,stage){const r=requestById(id);if(!r)return;r.stage=stage;persistRequests();renderRequests();updateRequestDashboard();openRequest(id);}

  function ensureCustomer(r){
    if(r.customerId&&state.customers.some(c=>c.id===r.customerId))return r.customerId;
    let c=state.customers.find(c=>c.email&&r.email&&c.email.toLowerCase()===r.email.toLowerCase());
    if(!c){c={id:'c'+Date.now(),firstName:r.firstName||'',lastName:r.lastName||'',email:r.email||'',phone:r.phone||'',notes:`Aus Tattoo-Anfrage: ${r.motif}`,lastProject:'—',next:'—',status:'Neu'};state.customers.unshift(c);}
    r.customerId=c.id;return c.id;
  }

  function ensureProject(r){
    if(r.projectId&&state.projects.some(p=>p.id===r.projectId))return r.projectId;
    const customerId=ensureCustomer(r);
    const p={id:'p'+(Date.now()+1),customerId,title:r.motif,placement:r.placement||'—',size:r.size||'',artist:r.artist||'Sven',price:Number(r.quotedPrice||0),deposit:0,status:'Entwurf',description:r.description||'',consent:'Fehlt',colors:[],inkIds:[],versions:[],payments:[]};
    state.projects.unshift(p);r.projectId=p.id;
    const c=state.customers.find(x=>x.id===customerId);if(c)c.lastProject=p.title;
    return p.id;
  }

  function convertRequest(id,forPlanning){
    const r=requestById(id);if(!r)return null;
    ensureProject(r);r.stage='ready';persist();persistRequests();renderCustomers();renderProjects();updateCustomerSelect();renderRequests();updateRequestDashboard();
    if(!forPlanning){document.getElementById('requestDetailDialog').close();openProject(r.projectId);}
    return r;
  }

  function planRequest(id){
    const r=convertRequest(id,true);if(!r)return;
    document.getElementById('requestDetailDialog').close();
    navigate('calendar');
    if(typeof openAppointmentDialog==='function'){
      openAppointmentDialog('',state.calendar?.anchor||todayISO());
      const form=document.getElementById('appointmentForm');
      if(form){form.elements.type.value='tattoo';form.elements.artist.value=r.artist||'Sven';form.elements.customerId.value=r.customerId||'';form.elements.projectId.value=r.projectId||'';form.elements.duration.value=180;form.elements.notes.value=`Aus Anfrage: ${r.motif}`;}
    }
  }

  function deleteRequest(id){if(!confirm('Diese Anfrage wirklich löschen?'))return;state.requests=state.requests.filter(r=>r.id!==id);persistRequests();renderRequests();updateRequestDashboard();document.getElementById('requestDetailDialog').close();}

  function updateRequestDashboard(){
    const count=state.requests.length;const newCount=state.requests.filter(r=>r.stage==='new').length;
    document.querySelectorAll('.nav-item[data-view="requests"] .badge').forEach(b=>b.textContent=String(count));
    const cards=[...document.querySelectorAll('.metric-card')];const card=cards.find(c=>c.textContent.includes('Offene Anfragen'));if(card){const strong=card.querySelector('strong');const small=card.querySelector('small');if(strong)strong.textContent=String(count);if(small)small.textContent=`${newCount} neu`;}
  }

  install();
})();