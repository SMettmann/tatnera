/* TATNERA — Anfrage-Workflow für Tattoo & Piercing */
(function(){
  'use strict';
  const Core=window.TatneraCore;
  const seedRequests=[
    {id:'r1',serviceType:'tattoo',createdLabel:'Heute, 09:12',createdAt:new Date().toISOString(),stage:'new',firstName:'Nina',lastName:'Becker',email:'nina@example.de',phone:'0176 55443322',motif:'Fine Line Blumen',placement:'Unterarm',size:'ca. 15 cm',style:'Fine Line',budget:'',artist:'Sven',availability:'Werktags ab 16 Uhr',source:'Website',description:'Feine Blumenlinie, eher minimalistisch. Zwei Referenzbilder vorhanden.',references:'',quotedPrice:0,notes:'Erstanfrage über Website.',customerId:'',projectId:''},
    {id:'r2',serviceType:'tattoo',createdLabel:'Gestern',createdAt:new Date(Date.now()-86400000).toISOString(),stage:'new',firstName:'Tim',lastName:'Kramer',email:'tim@example.de',phone:'0151 44556677',motif:'Blackwork Sleeve',placement:'Oberarm',size:'mehrere Sitzungen',style:'Blackwork',budget:'',artist:'Sven',availability:'Freitag oder Samstag',source:'Instagram',description:'Blackwork Sleeve, vorhandene kleine Tattoos sollen integriert werden.',references:'',quotedPrice:0,notes:'Vorab Beratung sinnvoll.',customerId:'',projectId:''},
    {id:'r3',serviceType:'tattoo',createdLabel:'28. Aug.',createdAt:new Date(Date.now()-5*86400000).toISOString(),stage:'clarify',firstName:'Laura',lastName:'Schmitt',email:'laura@example.de',phone:'0172 11223344',motif:'Lettering Brust',placement:'Brust',size:'ca. 12 cm',style:'Lettering',budget:'',artist:'Sven',availability:'Terminabstimmung offen',source:'Website',description:'Kurzes Lettering, Schriftstil noch nicht final.',references:'',quotedPrice:0,notes:'Rückfrage zur Schriftart geschickt.',customerId:'',projectId:''},
    {id:'r4',serviceType:'tattoo',createdLabel:'27. Aug.',createdAt:new Date(Date.now()-6*86400000).toISOString(),stage:'ready',firstName:'Daniel',lastName:'Weber',email:'daniel@example.de',phone:'0160 99887766',motif:'Mandala Rücken',placement:'Rücken',size:'ca. 25 cm',style:'Mandala',budget:'',artist:'Sven',availability:'Flexibel',source:'Empfehlung',description:'Mandala mittig am oberen Rücken.',references:'',quotedPrice:750,notes:'Preis bestätigt · 750 €',customerId:'',projectId:''}
  ];

  let loaded=null;
  try{loaded=JSON.parse(localStorage.getItem('tatnera_requests')||'null');}catch(_error){}
  state.requests=Array.isArray(loaded)?loaded:seedRequests;
  let activeRequestId='';
  let requestServiceFilter='all';
  let requestView='active';

  function esc(v){return String(v??'').replace(/[&<>'\"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[ch]));}
  function serviceType(r){return r?.serviceType==='piercing'?'piercing':'tattoo';}
  function serviceLabel(r){return serviceType(r)==='piercing'?'Piercing':'Tattoo';}
  function subject(r){return serviceType(r)==='piercing'?(r.piercingType||r.motif||'Piercing'):(r.motif||'Tattoo-Anfrage');}
  function persistRequests(){
    localStorage.setItem('tatnera_requests',JSON.stringify(state.requests));
    document.dispatchEvent(new CustomEvent('tatnera:data-changed',{detail:{type:'request'}}));
  }
  function requestById(id){return state.requests.find(r=>r.id===id);}
  function stageLabel(stage){return ({new:'Neu',clarify:'In Klärung',ready:'Terminbereit',declined:'Abgesagt',archived:'Archiviert'})[stage]||stage;}
  function fullName(r){return `${r.firstName||''} ${r.lastName||''}`.trim()||'Interessent/in';}
  function euro(v){return new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(v)||0);}
  function createdLabel(){return `Heute, ${new Intl.DateTimeFormat('de-DE',{hour:'2-digit',minute:'2-digit'}).format(new Date())}`;}
  function activeRequests(){return state.requests.filter(r=>!['archived','declined'].includes(r.stage));}
  function archivedRequests(){return state.requests.filter(r=>['archived','declined'].includes(r.stage));}
  function filtered(list){return requestServiceFilter==='all'?list:list.filter(r=>serviceType(r)===requestServiceFilter);}
  function artistOptions(selected=''){
    const artists=Core?.getArtists?.(true)||[];
    const names=artists.map(a=>a.name).filter(Boolean);
    if(selected&&!names.includes(selected))names.unshift(selected);
    if(!names.length)names.push('Sven');
    return names.map(name=>`<option value="${esc(name)}" ${name===selected?'selected':''}>${esc(name)}</option>`).join('');
  }

  function normalizeRequests(){
    let changed=false;
    state.requests.forEach(r=>{
      if(!r.serviceType){r.serviceType='tattoo';changed=true;}
      if(!r.createdAt){r.createdAt=new Date().toISOString();changed=true;}
      ['style','budget','source','references','piercingType','jewelryWish','materialWish','piercingReason'].forEach(key=>{if(r[key]===undefined){r[key]='';changed=true;}});
    });
    if(changed)localStorage.setItem('tatnera_requests',JSON.stringify(state.requests));
  }

  function install(){
    normalizeRequests();
    if(!document.querySelector('link[href="requests.css"]')){const link=document.createElement('link');link.rel='stylesheet';link.href='requests.css';document.head.appendChild(link);}
    buildDetailDialog();buildRequestForm();renderRequests();updateRequestDashboard();
  }

  function buildDetailDialog(){
    if(document.getElementById('requestDetailDialog'))return;
    const dialog=document.createElement('dialog');dialog.id='requestDetailDialog';dialog.className='dialog request-detail-dialog';
    dialog.innerHTML=`<div><div class="dialog-head"><div><span class="eyebrow" id="requestDetailEyebrow">Anfrage</span><h2 id="requestDetailTitle">Anfrage</h2><p class="muted" id="requestDetailMeta"></p></div><button type="button" class="close-btn" data-close-request>×</button></div><div id="requestDetailBody"></div></div>`;
    document.body.appendChild(dialog);
    dialog.querySelector('[data-close-request]').addEventListener('click',()=>dialog.close());
  }

  function buildRequestForm(){
    if(document.getElementById('requestFormDialog'))return;
    const dialog=document.createElement('dialog');dialog.id='requestFormDialog';dialog.className='dialog request-form-dialog';
    dialog.innerHTML=`<form id="requestForm"><input type="hidden" name="requestId"><div class="dialog-head"><div><span class="eyebrow">Anfrage</span><h2 id="requestFormTitle">Neue Anfrage</h2><p class="muted">Tattoo oder Piercing direkt vollständig erfassen.</p></div><button type="button" class="close-btn" data-close-request-form>×</button></div>
      <section class="request-form-section"><div class="request-service-picker"><label><input type="radio" name="serviceType" value="tattoo" checked><span>Tattoo</span></label><label><input type="radio" name="serviceType" value="piercing"><span>Piercing</span></label></div></section>
      <section class="request-form-section"><div class="request-form-section-head"><span class="eyebrow">Kunde</span><h3>Wer fragt an?</h3></div><div class="request-customer-mode"><button type="button" data-request-customer-mode="new" class="active">Neuer Kunde</button><button type="button" data-request-customer-mode="existing">Bestandskunde</button></div><div data-request-new-customer class="form-grid"><label>Vorname<input name="firstName"></label><label>Nachname<input name="lastName"></label><label>E-Mail<input type="email" name="email"></label><label>Telefon<input name="phone"></label></div><div data-request-existing-customer hidden><label>Bestandskunde<select name="customerId"></select></label></div></section>
      <section class="request-form-section"><div class="request-form-section-head"><span class="eyebrow">Wunsch</span><h3 id="requestServiceSectionTitle">Tattoo</h3></div><div class="form-grid three"><label data-tattoo-field>Motiv<input name="motif" placeholder="z. B. Löwe"></label><label data-piercing-field hidden>Piercing<input name="piercingType" placeholder="z. B. Helix, Nostril"></label><label>Körperstelle<input name="placement"></label><label data-tattoo-field>Größe<input name="size" placeholder="z. B. 15 cm"></label><label data-tattoo-field>Stil<input name="style" placeholder="z. B. Fine Line"></label><label data-tattoo-field>Budget<input name="budget" placeholder="z. B. bis 500 €"></label><label data-piercing-field hidden>Schmuckwunsch<input name="jewelryWish" placeholder="z. B. Ring, Labret"></label><label data-piercing-field hidden>Materialwunsch<select name="materialWish"><option value="">Offen</option><option>Titan</option><option>Gold</option><option>Stahl</option><option>Niob</option><option>PTFE / Bioplast</option><option>Sonstiges</option></select></label><label data-piercing-field hidden>Art des Termins<select name="piercingReason"><option>Erstpiercing</option><option>Schmuckwechsel</option><option>Kontrolle</option></select></label><label id="requestArtistLabel">Artist<select name="artist"></select></label><label>Verfügbarkeit<input name="availability" placeholder="z. B. freitags ab 15 Uhr"></label><label>Kontaktweg<select name="source"><option value="">Nicht angegeben</option><option>Website</option><option>Instagram</option><option>WhatsApp</option><option>Telefon</option><option>E-Mail</option><option>Empfehlung</option><option>Vor Ort</option><option>Sonstiges</option></select></label><label>Angebot / Preis (€)<input type="number" min="0" step="10" name="quotedPrice"></label><label class="full">Beschreibung<textarea rows="3" name="description" placeholder="Wunsch, Besonderheiten, wichtige Angaben …"></textarea></label><label class="full">Referenzen / Links<textarea rows="2" name="references" placeholder="Links zu Referenzbildern oder kurze Beschreibung der Vorlagen"></textarea></label><label class="full">Studio-Notiz<textarea rows="2" name="notes"></textarea></label></div></section>
      <div class="dialog-actions"><button type="button" class="btn ghost" data-close-request-form>Abbrechen</button><button type="submit" class="btn primary" id="requestFormSubmit">Anfrage speichern</button></div></form>`;
    document.body.appendChild(dialog);
    dialog.querySelectorAll('[data-close-request-form]').forEach(b=>b.addEventListener('click',()=>dialog.close()));
    const form=dialog.querySelector('#requestForm');
    form.dataset.customerMode='new';
    form.querySelectorAll('[name="serviceType"]').forEach(input=>input.addEventListener('change',()=>updateRequestFormMode(form)));
    form.querySelectorAll('[data-request-customer-mode]').forEach(button=>button.addEventListener('click',()=>setRequestCustomerMode(form,button.dataset.requestCustomerMode)));
    form.addEventListener('submit',saveRequestForm);
  }

  function setRequestCustomerMode(form,mode){
    form.dataset.customerMode=mode==='existing'?'existing':'new';
    form.querySelectorAll('[data-request-customer-mode]').forEach(b=>b.classList.toggle('active',b.dataset.requestCustomerMode===form.dataset.customerMode));
    const newFields=form.querySelector('[data-request-new-customer]'),existing=form.querySelector('[data-request-existing-customer]');
    if(newFields)newFields.hidden=form.dataset.customerMode==='existing';
    if(existing)existing.hidden=form.dataset.customerMode!=='existing';
  }

  function updateExistingCustomerSelect(form,selected=''){
    const select=form.elements.customerId;if(!select)return;
    const customers=[...(state.customers||[])].sort((a,b)=>`${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`,'de'));
    select.innerHTML='<option value="">Kunde auswählen …</option>'+customers.map(c=>`<option value="${esc(c.id)}" ${c.id===selected?'selected':''}>${esc(c.firstName)} ${esc(c.lastName)}${c.email?' · '+esc(c.email):''}</option>`).join('');
  }

  function updateRequestFormMode(form){
    const piercing=form.elements.serviceType.value==='piercing';
    form.querySelectorAll('[data-tattoo-field]').forEach(el=>el.hidden=piercing);
    form.querySelectorAll('[data-piercing-field]').forEach(el=>el.hidden=!piercing);
    const title=document.getElementById('requestServiceSectionTitle');if(title)title.textContent=piercing?'Piercing':'Tattoo';
    const artistLabel=document.getElementById('requestArtistLabel');if(artistLabel)artistLabel.childNodes[0].nodeValue=piercing?'Artist / Piercer':'Artist';
  }

  function openRequestForm(id=''){
    const form=document.getElementById('requestForm');if(!form)return;
    form.reset();form.elements.requestId.value=id||'';setRequestCustomerMode(form,'new');updateExistingCustomerSelect(form);
    const r=id?requestById(id):null;
    document.getElementById('requestFormTitle').textContent=r?'Anfrage bearbeiten':'Neue Anfrage';
    document.getElementById('requestFormSubmit').textContent=r?'Änderungen speichern':'Anfrage speichern';
    if(r){
      form.elements.serviceType.value=serviceType(r);form.elements.motif.value=r.motif||'';form.elements.piercingType.value=r.piercingType||'';form.elements.placement.value=r.placement||'';form.elements.size.value=r.size||'';form.elements.style.value=r.style||'';form.elements.budget.value=r.budget||'';form.elements.jewelryWish.value=r.jewelryWish||'';form.elements.materialWish.value=r.materialWish||'';form.elements.piercingReason.value=r.piercingReason||'Erstpiercing';form.elements.artist.innerHTML=artistOptions(r.artist||'');form.elements.artist.value=r.artist||form.elements.artist.value;form.elements.availability.value=r.availability||'';form.elements.source.value=r.source||'';form.elements.quotedPrice.value=Number(r.quotedPrice)||'';form.elements.description.value=r.description||'';form.elements.references.value=r.references||'';form.elements.notes.value=r.notes||'';
      if(r.customerId&&state.customers.some(c=>c.id===r.customerId)){setRequestCustomerMode(form,'existing');updateExistingCustomerSelect(form,r.customerId);}else{form.elements.firstName.value=r.firstName||'';form.elements.lastName.value=r.lastName||'';form.elements.email.value=r.email||'';form.elements.phone.value=r.phone||'';}
    }else{form.elements.artist.innerHTML=artistOptions(Core?.artistNameFallback?.()||'');}
    updateRequestFormMode(form);
    document.getElementById('requestFormDialog').showModal();
  }

  function saveRequestForm(event){
    event.preventDefault();const form=event.currentTarget,data=Object.fromEntries(new FormData(form).entries()),id=data.requestId||'',existing=id?requestById(id):null;
    let customer=null;
    if(form.dataset.customerMode==='existing'){
      customer=(state.customers||[]).find(c=>c.id===data.customerId);if(!customer){alert('Bitte einen Bestandskunden auswählen.');return;}
    }else if(!String(data.firstName||'').trim()&&!String(data.lastName||'').trim()){
      alert('Bitte mindestens einen Namen angeben.');return;
    }
    const type=data.serviceType==='piercing'?'piercing':'tattoo';
    if(type==='tattoo'&&!String(data.motif||'').trim()){alert('Bitte ein Motiv angeben.');return;}
    if(type==='piercing'&&!String(data.piercingType||'').trim()){alert('Bitte das gewünschte Piercing angeben.');return;}
    const base=existing||{id:'r'+Date.now(),createdAt:new Date().toISOString(),createdLabel:createdLabel(),stage:'new',customerId:'',projectId:''};
    base.serviceType=type;base.customerId=customer?.id||base.customerId||'';base.firstName=customer?.firstName||String(data.firstName||'').trim();base.lastName=customer?.lastName||String(data.lastName||'').trim();base.email=customer?.email||String(data.email||'').trim();base.phone=customer?.phone||String(data.phone||'').trim();base.motif=String(data.motif||'').trim();base.piercingType=String(data.piercingType||'').trim();base.placement=String(data.placement||'').trim();base.size=String(data.size||'').trim();base.style=String(data.style||'').trim();base.budget=String(data.budget||'').trim();base.jewelryWish=String(data.jewelryWish||'').trim();base.materialWish=String(data.materialWish||'').trim();base.piercingReason=String(data.piercingReason||'').trim();base.artist=String(data.artist||'').trim();base.availability=String(data.availability||'').trim();base.source=String(data.source||'').trim();base.quotedPrice=Math.max(0,Number(data.quotedPrice)||0);base.description=String(data.description||'').trim();base.references=String(data.references||'').trim();base.notes=String(data.notes||'').trim();
    if(!existing)state.requests.unshift(base);
    persistRequests();renderRequests();updateRequestDashboard();document.getElementById('requestFormDialog').close();
    if(existing&&document.getElementById('requestDetailDialog').open)openRequest(base.id);
  }

  function renderRequests(){
    const section=document.getElementById('requests');if(!section)return;
    const active=filtered(activeRequests()),archive=filtered(archivedRequests());
    section.innerHTML=`<div class="request-toolbar"><div><span class="eyebrow">Anfragen</span><h2>Tattoo & Piercing</h2><p class="muted">Neue Anfragen prüfen, klären und direkt in Akten oder Termine überführen.</p></div><div class="request-toolbar-actions"><button type="button" class="btn ghost ${requestView==='archive'?'active':''}" data-request-view="archive">Archiv ${archivedRequests().length?`(${archivedRequests().length})`:''}</button><button type="button" class="btn primary" data-new-request>+ Neue Anfrage</button></div></div><div class="request-filterbar"><button data-request-filter="all" class="${requestServiceFilter==='all'?'active':''}">Alle <span>${requestView==='archive'?archivedRequests().length:activeRequests().length}</span></button><button data-request-filter="tattoo" class="${requestServiceFilter==='tattoo'?'active':''}">Tattoo <span>${(requestView==='archive'?archivedRequests():activeRequests()).filter(r=>serviceType(r)==='tattoo').length}</span></button><button data-request-filter="piercing" class="${requestServiceFilter==='piercing'?'active':''}">Piercing <span>${(requestView==='archive'?archivedRequests():activeRequests()).filter(r=>serviceType(r)==='piercing').length}</span></button>${requestView==='archive'?'<button data-request-view="active" class="request-back-active">← Aktive Anfragen</button>':''}</div>`+
      (requestView==='archive'?renderArchiveRequests(archive):renderActiveColumns(active));
    section.querySelectorAll('[data-open-request]').forEach(b=>b.addEventListener('click',()=>openRequest(b.dataset.openRequest)));
    section.querySelector('[data-new-request]')?.addEventListener('click',()=>openRequestForm());
    section.querySelectorAll('[data-request-filter]').forEach(b=>b.addEventListener('click',()=>{requestServiceFilter=b.dataset.requestFilter;renderRequests();}));
    section.querySelectorAll('[data-request-view]').forEach(b=>b.addEventListener('click',()=>{requestView=b.dataset.requestView;renderRequests();}));
  }

  function renderActiveColumns(list){
    const stages=[['new','Neu'],['clarify','In Klärung'],['ready','Terminbereit']];
    return `<div class="request-columns">${stages.map(([stage,label])=>{const items=list.filter(r=>r.stage===stage);return `<div class="request-column"><div class="column-head"><strong>${label}</strong><span>${items.length}</span></div>${items.length?items.map(requestCard).join(''):'<div class="request-empty-column">Keine Anfragen</div>'}</div>`;}).join('')}</div>`;
  }

  function renderArchiveRequests(list){
    return `<div class="request-archive-grid">${list.length?list.map(requestCard).join(''):'<div class="request-empty-column">Keine archivierten oder abgesagten Anfragen.</div>'}</div>`;
  }

  function requestCard(r){
    const second=r.stage==='ready'&&r.quotedPrice?`Preis bestätigt · ${euro(r.quotedPrice)}`:`${r.placement||'Körperstelle offen'}${serviceType(r)==='tattoo'&&r.size?' · '+r.size:''}${serviceType(r)==='piercing'&&r.jewelryWish?' · '+r.jewelryWish:''}`;
    return `<div class="request-card"><div class="request-card-top"><small>${esc(r.createdLabel||'')}</small><span class="request-service-badge ${serviceType(r)}">${serviceLabel(r)}</span></div><strong>${esc(subject(r))}</strong><span>${esc(second)}</span><span class="request-customer">${esc(fullName(r))}${r.artist?' · '+esc(r.artist):''}</span><button data-open-request="${esc(r.id)}">${['archived','declined'].includes(r.stage)?'Anfrage öffnen':r.stage==='ready'?'Termin planen':'Anfrage öffnen'} →</button></div>`;
  }

  function openRequest(id){
    activeRequestId=id;const r=requestById(id);if(!r)return;
    document.getElementById('requestDetailEyebrow').textContent=`${serviceLabel(r)}-Anfrage`;
    document.getElementById('requestDetailTitle').textContent=subject(r);
    document.getElementById('requestDetailMeta').textContent=`${fullName(r)} · ${r.placement||'Körperstelle offen'}${serviceType(r)==='tattoo'&&r.size?' · '+r.size:''}`;
    const converted=r.customerId||r.projectId,isArchive=['archived','declined'].includes(r.stage),piercing=serviceType(r)==='piercing';
    const specific=piercing?`<div><span>Piercing</span><strong>${esc(r.piercingType||'—')}</strong></div><div><span>Schmuckwunsch</span><strong>${esc(r.jewelryWish||'—')}</strong></div><div><span>Material</span><strong>${esc(r.materialWish||'—')}</strong></div><div><span>Terminart</span><strong>${esc(r.piercingReason||'—')}</strong></div>`:`<div><span>Motiv</span><strong>${esc(r.motif||'—')}</strong></div><div><span>Größe</span><strong>${esc(r.size||'—')}</strong></div><div><span>Stil</span><strong>${esc(r.style||'—')}</strong></div><div><span>Budget</span><strong>${esc(r.budget||'—')}</strong></div>`;
    document.getElementById('requestDetailBody').innerHTML=`<div class="request-detail-grid"><section class="request-box"><div class="request-detail-titleline"><span class="request-stage ${r.stage}">${stageLabel(r.stage)}</span><span class="request-service-badge ${serviceType(r)}">${serviceLabel(r)}</span></div><h3>Anfragedaten</h3><div class="request-data"><div><span>Name</span><strong>${esc(fullName(r))}</strong></div><div><span>${piercing?'Artist / Piercer':'Artist'}</span><strong>${esc(r.artist||'—')}</strong></div><div><span>E-Mail</span><strong>${esc(r.email||'—')}</strong></div><div><span>Telefon</span><strong>${esc(r.phone||'—')}</strong></div>${specific}<div><span>Körperstelle</span><strong>${esc(r.placement||'—')}</strong></div><div><span>Verfügbarkeit</span><strong>${esc(r.availability||'—')}</strong></div><div><span>Kontaktweg</span><strong>${esc(r.source||'—')}</strong></div><div><span>Preis / Angebot</span><strong>${r.quotedPrice?euro(r.quotedPrice):'Noch offen'}</strong></div></div><div class="request-detail-note"><span>Beschreibung</span><p>${esc(r.description||'Keine Beschreibung vorhanden.')}</p></div>${r.references?`<div class="request-detail-note"><span>Referenzen / Links</span><p class="request-reference-text">${esc(r.references)}</p></div>`:''}<div class="request-detail-note"><span>Studio-Notiz</span><p>${esc(r.notes||'Keine Notiz.')}</p></div></section><section class="request-box"><span class="eyebrow">Workflow</span><h3>Was passiert als Nächstes?</h3><div class="request-workflow">${isArchive?`<button class="primary-flow" data-reopen-request>Wieder öffnen</button>`:`<button data-request-stage="new" class="${r.stage==='new'?'active-stage':''}">Neu</button><button data-request-stage="clarify" class="${r.stage==='clarify'?'active-stage':''}">In Klärung</button><button data-request-stage="ready" class="${r.stage==='ready'?'active-stage':''}">Terminbereit</button><button class="primary-flow" data-convert-request>${converted?`${serviceLabel(r)}-Akte öffnen`:`Kunde + ${serviceLabel(r)}-Akte anlegen`}</button><button class="primary-flow" data-plan-request>Termin planen</button><button data-edit-request>Bearbeiten</button><button data-decline-request>Absagen</button><button data-archive-request>Archivieren</button>`}</div>${converted?`<div class="request-converted">✓ Diese Anfrage ist bereits mit ${r.customerId?'einem Kunden':''}${r.customerId&&r.projectId?' und ':''}${r.projectId?`einer ${serviceLabel(r)}-Akte`:''} verknüpft.</div>`:''}</section></div><div class="request-footer"><button class="request-delete" data-delete-request>Endgültig löschen</button><button class="btn ghost" data-close-request-bottom>Schließen</button></div>`;
    const body=document.getElementById('requestDetailBody');
    body.querySelectorAll('[data-request-stage]').forEach(b=>b.addEventListener('click',()=>changeStage(id,b.dataset.requestStage)));
    body.querySelector('[data-convert-request]')?.addEventListener('click',()=>convertRequest(id,false));
    body.querySelector('[data-plan-request]')?.addEventListener('click',()=>planRequest(id));
    body.querySelector('[data-edit-request]')?.addEventListener('click',()=>{document.getElementById('requestDetailDialog').close();openRequestForm(id);});
    body.querySelector('[data-decline-request]')?.addEventListener('click',()=>archiveRequest(id,'declined'));
    body.querySelector('[data-archive-request]')?.addEventListener('click',()=>archiveRequest(id,'archived'));
    body.querySelector('[data-reopen-request]')?.addEventListener('click',()=>changeStage(id,'new'));
    body.querySelector('[data-delete-request]').addEventListener('click',()=>deleteRequest(id));
    body.querySelector('[data-close-request-bottom]').addEventListener('click',()=>document.getElementById('requestDetailDialog').close());
    const dialog=document.getElementById('requestDetailDialog');if(!dialog.open)dialog.showModal();
  }

  function changeStage(id,stage){const r=requestById(id);if(!r)return;r.stage=stage;persistRequests();renderRequests();updateRequestDashboard();openRequest(id);}
  function archiveRequest(id,stage){const r=requestById(id);if(!r)return;const verb=stage==='declined'?'absagen':'archivieren';if(!confirm(`Diese ${serviceLabel(r)}-Anfrage wirklich ${verb}?`))return;r.stage=stage;persistRequests();renderRequests();updateRequestDashboard();document.getElementById('requestDetailDialog').close();}

  function ensureCustomer(r){
    if(r.customerId&&state.customers.some(c=>c.id===r.customerId))return r.customerId;
    let c=state.customers.find(c=>(c.email&&r.email&&c.email.toLowerCase()===r.email.toLowerCase())||(c.phone&&r.phone&&String(c.phone).replace(/\D/g,'')===String(r.phone).replace(/\D/g,'')));
    if(!c){c={id:'c'+Date.now(),firstName:r.firstName||'',lastName:r.lastName||'',email:r.email||'',phone:r.phone||'',notes:`Aus ${serviceLabel(r)}-Anfrage: ${subject(r)}`,lastProject:'—',next:'—',status:'Neu'};state.customers.unshift(c);}
    r.customerId=c.id;return c.id;
  }

  function ensureProject(r){
    if(r.projectId&&state.projects.some(p=>p.id===r.projectId))return r.projectId;
    const customerId=ensureCustomer(r),piercing=serviceType(r)==='piercing';
    const p={id:'p'+(Date.now()+1),serviceType:piercing?'piercing':'tattoo',customerId,title:subject(r),placement:r.placement||'—',size:piercing?'':(r.size||''),artist:r.artist||(Core?.artistNameFallback?.()||'Sven'),price:Number(r.quotedPrice||0),deposit:0,status:'Entwurf',description:r.description||'',consent:'Fehlt',colors:[],inkIds:[],versions:[],payments:[]};
    if(piercing){p.piercing={jewelryType:r.jewelryWish||'',material:r.materialWish||'',gauge:'',dimensions:'',manufacturer:'',lot:'',notes:r.piercingReason||''};p.aftercare={status:'Offen',tattooDate:'',followupDate:'',instructionsGiven:false,records:[]};}
    state.projects.unshift(p);r.projectId=p.id;const c=state.customers.find(x=>x.id===customerId);if(c)c.lastProject=p.title;return p.id;
  }

  function convertRequest(id,forPlanning){
    const r=requestById(id);if(!r)return null;ensureProject(r);r.stage='ready';persist();persistRequests();try{renderCustomers();renderProjects();updateCustomerSelect();}catch(_error){}renderRequests();updateRequestDashboard();
    if(!forPlanning){document.getElementById('requestDetailDialog').close();openProject(r.projectId);}return r;
  }

  function planRequest(id){
    const r=convertRequest(id,true);if(!r)return;document.getElementById('requestDetailDialog').close();navigate('calendar');
    if(typeof openAppointmentDialog==='function'){
      openAppointmentDialog('',state.calendar?.anchor||todayISO());const form=document.getElementById('appointmentForm');if(form){const piercing=serviceType(r)==='piercing';form.elements.type.value=piercing?'piercing':'tattoo';if(form.elements.artist)form.elements.artist.value=r.artist||(Core?.artistNameFallback?.()||'Sven');form.elements.customerId.value=r.customerId||'';form.elements.projectId.value=r.projectId||'';form.elements.duration.value=piercing?45:180;form.elements.status.value='Angefragt';form.elements.notes.value=`Aus ${serviceLabel(r)}-Anfrage: ${subject(r)}`;}
    }
  }

  function deleteRequest(id){const r=requestById(id);if(!r||!confirm(`Diese ${serviceLabel(r)}-Anfrage endgültig löschen?\n\nDie verknüpfte Kunden- oder ${serviceLabel(r)}-Akte bleibt erhalten.`))return;state.requests=state.requests.filter(item=>item.id!==id);persistRequests();renderRequests();updateRequestDashboard();document.getElementById('requestDetailDialog').close();}

  function updateRequestDashboard(){
    const list=activeRequests(),count=list.length,newCount=list.filter(r=>r.stage==='new').length;
    document.querySelectorAll('.nav-item[data-view="requests"] .badge').forEach(b=>b.textContent=String(count));
    const cards=[...document.querySelectorAll('.metric-card')],card=cards.find(c=>c.textContent.includes('Offene Anfragen'));if(card){const strong=card.querySelector('strong'),small=card.querySelector('small');if(strong)strong.textContent=String(count);if(small)small.textContent=`${newCount} neu`;}
  }

  document.addEventListener('tatnera:studio-state-ready',()=>{try{const cloud=JSON.parse(localStorage.getItem('tatnera_requests')||'[]');if(Array.isArray(cloud)){state.requests=cloud;normalizeRequests();renderRequests();updateRequestDashboard();}}catch(_error){}});
  window.TatneraRequests={render:renderRequests,newRequest:()=>openRequestForm(),open:openRequest};
  install();
})();