/* TATNERA — Piercing support
   Adds Piercing as a first-class studio service without breaking existing Tattoo records. */
(function(){
  'use strict';

  const Core=window.TatneraCore;
  if(!Core)return;
  const esc=Core.esc;
  const euro=value=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:2}).format(Number(value)||0);
  const fmt=value=>value?new Intl.DateTimeFormat('de-DE').format(new Date(value+'T12:00:00')):'—';
  const isPiercing=project=>project?.serviceType==='piercing';
  const serviceLabel=project=>isPiercing(project)?'Piercing':'Tattoo';
  const careOf=project=>{
    if(!project.aftercare||typeof project.aftercare!=='object')project.aftercare={status:'Offen',tattooDate:'',followupDate:'',instructionsGiven:false,records:[]};
    if(!Array.isArray(project.aftercare.records))project.aftercare.records=[];
    return project.aftercare;
  };

  function installStyle(){
    if(document.getElementById('piercingSupportStyle'))return;
    const style=document.createElement('style');style.id='piercingSupportStyle';style.textContent=`
      .service-type-picker{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:10px 0 2px}
      .service-type-picker label{display:flex!important;align-items:center!important;gap:9px!important;padding:11px 12px;border:1px solid var(--line);border-radius:11px;background:var(--panel-2);cursor:pointer;color:var(--text)!important;font-size:11px!important}
      .service-type-picker label:has(input:checked){border-color:#77855d;box-shadow:0 0 0 1px rgba(120,140,90,.16) inset}
      .service-type-picker input{width:auto!important;min-height:0!important;margin:0}
      .piercing-create-fields{margin-top:11px;padding:12px;border:1px solid var(--line);border-radius:11px;background:var(--panel-2)}
      .piercing-create-fields[hidden]{display:none!important}
      .piercing-type-badge{display:inline-flex;align-items:center;width:max-content;margin-bottom:7px;padding:3px 7px;border:1px solid var(--line);border-radius:999px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
      .piercing-record{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-top:13px}
      .piercing-record label{display:flex;flex-direction:column;gap:6px;font-size:10px;font-weight:700;color:var(--muted)}
      .piercing-record label.full{grid-column:1/-1}.piercing-record input,.piercing-record select,.piercing-record textarea{width:100%;border:1px solid var(--line);border-radius:9px;background:var(--panel-2);color:var(--text);padding:9px 10px;font:inherit;font-size:11px}
      .piercing-record textarea{resize:vertical}.piercing-record-actions{display:flex;justify-content:flex-end;margin-top:10px}
      .piercing-care-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.piercing-care-head h3{margin:3px 0 4px}.piercing-care-status{padding:5px 9px;border:1px solid var(--line);border-radius:999px;font-size:10px;font-weight:800}
      .piercing-care-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:14px}.piercing-care-summary>div{padding:11px;border:1px solid var(--line);border-radius:10px;background:var(--panel-2)}.piercing-care-summary span,.piercing-care-summary strong,.piercing-care-summary small{display:block}.piercing-care-summary span{font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}.piercing-care-summary strong{font-size:12px;margin-top:4px}.piercing-care-summary small{font-size:9px;color:var(--muted);margin-top:3px}
      .piercing-care-tips{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:12px}.piercing-care-tips>div{padding:10px;border:1px solid var(--line);border-radius:10px}.piercing-care-tips strong,.piercing-care-tips span{display:block}.piercing-care-tips strong{font-size:11px}.piercing-care-tips span{margin-top:4px;font-size:9px;color:var(--muted);line-height:1.45}
      .piercing-care-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:13px}.piercing-care-history{margin-top:14px}.piercing-care-row{display:grid;grid-template-columns:110px minmax(0,1fr) auto;gap:11px;align-items:start;padding:10px 0;border-top:1px solid var(--line)}.piercing-care-row strong,.piercing-care-row span{display:block}.piercing-care-row span{font-size:10px;color:var(--muted);margin-top:3px}.piercing-care-delete{border:0;background:transparent;color:var(--muted);cursor:pointer;font-size:18px}
      .calendar-event.piercing .event-type-pill,.day-event-row.piercing .event-type-pill{font-weight:900}
      @media(max-width:760px){.piercing-record{grid-template-columns:1fr}.piercing-record label.full{grid-column:1}.piercing-care-summary,.piercing-care-tips{grid-template-columns:1fr 1fr}.service-type-picker{grid-template-columns:1fr}}
    `;document.head.appendChild(style);
  }

  function normalizeProjects(){
    let changed=false;
    for(const project of state.projects||[]){
      if(!project.serviceType){project.serviceType='tattoo';changed=true;}
      if(isPiercing(project)&&(!project.piercing||typeof project.piercing!=='object')){project.piercing={jewelryType:'',material:'Titan',gauge:'',dimensions:'',manufacturer:'',lot:'',notes:''};changed=true;}
    }
    if(changed){persist();document.dispatchEvent(new CustomEvent('tatnera:data-changed',{detail:{type:'service-migration'}}));}
  }

  function patchGlobalLabels(){
    try{pageTitles.projects='Tattoo & Piercing';pageTitles['project-detail']='Studio-Akte';}catch(_error){}
    const nav=document.querySelector('.nav-item[data-view="projects"]');if(nav){const icon=nav.querySelector('span')?.outerHTML||'<span>✦</span>';nav.innerHTML=`${icon} Tattoo & Piercing`;}
    const quick=document.getElementById('quickProjectBtn');if(quick)quick.textContent='+ Neue Akte';
    const add=document.getElementById('addProjectBtn');if(add)add.textContent='+ Neue Akte';
    const projectTitle=document.querySelector('#projects .section-toolbar .eyebrow');if(projectTitle)projectTitle.textContent='Tattoo & Piercing';
    document.querySelectorAll('#studioTeamPanel option,#studioTeamPanel .status-pill').forEach(node=>{if(node.textContent.trim()==='Tätowierer')node.textContent='Artist / Piercer';});
    document.querySelectorAll('#financeView small,#financeView h3').forEach(node=>{node.textContent=node.textContent.replace('Tattoo-Akten','Studio-Akten').replace('nach Tattoo','nach Akte');});
  }

  function patchEventType(){
    if(window.__tatneraPiercingEventLabel)return;window.__tatneraPiercingEventLabel=true;
    try{const previous=eventTypeLabel;eventTypeLabel=function(type){return type==='piercing'?'Piercing':previous(type);};}catch(_error){}
  }

  function ensureCalendarOption(){
    const select=document.querySelector('#appointmentForm select[name="type"]');
    if(select&&!select.querySelector('option[value="piercing"]')){
      const option=document.createElement('option');option.value='piercing';option.textContent='Piercing';
      const consultation=select.querySelector('option[value="consultation"]');consultation?select.insertBefore(option,consultation):select.append(option);
    }
    const legend=document.querySelector('.calendar-legend');
    if(legend&&!legend.querySelector('[data-piercing-legend]')){const item=document.createElement('span');item.dataset.piercingLegend='true';item.innerHTML='<i class="legend-dot piercing"></i>Piercing';legend.insertBefore(item,legend.children[1]||null);}
    const projectLabel=document.querySelector('#appointmentForm label.full select[name="projectId"]')?.parentElement;
    if(projectLabel&&projectLabel.childNodes[0]?.nodeType===Node.TEXT_NODE)projectLabel.childNodes[0].nodeValue='Studio-Akte';
  }

  function setLabel(form,name,text){
    const field=form?.elements?.[name];const label=field?.closest('label');if(label&&label.childNodes[0]?.nodeType===Node.TEXT_NODE)label.childNodes[0].nodeValue=text;
  }

  function installProjectForm(){
    const form=document.getElementById('projectForm');if(!form||form.dataset.piercingReady==='1')return;
    form.dataset.piercingReady='1';
    const projectSection=[...form.querySelectorAll('.project-form-section')].find(section=>section.querySelector('[name="title"]'));
    if(projectSection){
      const head=projectSection.querySelector('.project-form-section-head');
      const picker=document.createElement('div');picker.className='service-type-picker';picker.innerHTML='<label><input type="radio" name="serviceType" value="tattoo" checked><span><strong>Tattoo</strong><br><small>Motiv, Design, Farben & Sitzungen</small></span></label><label><input type="radio" name="serviceType" value="piercing"><span><strong>Piercing</strong><br><small>Schmuck, Material & Heilungsverlauf</small></span></label>';
      head?.insertAdjacentElement('afterend',picker);
      const extra=document.createElement('div');extra.className='piercing-create-fields';extra.dataset.piercingCreateFields='true';extra.hidden=true;extra.innerHTML='<div class="form-grid three"><label>Schmuckart<input name="piercingJewelryType" placeholder="z. B. Labret, Ring, Barbell"></label><label>Material<select name="piercingMaterial"><option>Titan</option><option>Gold</option><option>Stahl</option><option>Niob</option><option>PTFE / Bioplast</option><option>Sonstiges</option></select></label><label>Stärke<input name="piercingGauge" placeholder="z. B. 1,2 mm"></label><label>Maße / Länge / Ø<input name="piercingDimensions" placeholder="z. B. 8 mm"></label><label>Hersteller<input name="piercingManufacturer"></label><label>Charge / Lot<input name="piercingLot"></label></div>';
      picker.insertAdjacentElement('afterend',extra);
      picker.querySelectorAll('[name="serviceType"]').forEach(input=>input.addEventListener('change',()=>updateProjectMode(form)));
    }
    form.addEventListener('submit',savePiercingProject,true);
    updateProjectMode(form);
  }

  function updateProjectMode(form){
    if(!form)return;const piercing=form.querySelector('[name="serviceType"]:checked')?.value==='piercing';
    const head=form.querySelector('.dialog-head');if(head){const eyebrow=head.querySelector('.eyebrow'),h2=head.querySelector('h2'),p=head.querySelector('p');if(eyebrow)eyebrow.textContent=piercing?'Piercing-Akte':'Tattoo-Projekt';if(h2)h2.textContent=piercing?'Neues Piercing':'Neues Tattoo';if(p)p.textContent=piercing?'Kunde, Piercing und auf Wunsch direkt den ersten Termin in einem Schritt anlegen.':'Kunde, Tattoo und auf Wunsch direkt den ersten Termin in einem Schritt anlegen.';}
    const section=[...form.querySelectorAll('.project-form-section')].find(s=>s.querySelector('[name="title"]'));if(section){const h3=section.querySelector('.project-form-section-head h3'),p=section.querySelector('.project-form-section-head p');if(h3)h3.textContent=piercing?'Piercing':'Tattoo';if(p)p.textContent=piercing?'Piercingstelle, Schmuck und die wichtigsten Daten.':'Die wichtigsten Projektdaten.';}
    setLabel(form,'title',piercing?'Piercing':'Motiv');setLabel(form,'placement','Körperstelle');setLabel(form,'size',piercing?'Schmuckgröße / Maße':'Größe');setLabel(form,'artist',piercing?'Artist / Piercer':'Artist');
    const title=form.elements.title;if(title)title.placeholder=piercing?'z. B. Helix, Nostril, Bauchnabel':'z. B. Löwe';
    const placement=form.elements.placement;if(placement)placement.placeholder=piercing?'z. B. linkes Ohr, Nase':'rechter Unterarm';
    const size=form.elements.size;if(size)size.placeholder=piercing?'z. B. 1,2 × 8 mm':'18 × 12 cm';
    const description=form.elements.description;if(description)description.placeholder=piercing?'Schmuckwunsch, Besonderheiten, Platzierung …':'Stil, Idee, Besonderheiten …';
    const extra=form.querySelector('[data-piercing-create-fields]');if(extra)extra.hidden=!piercing;
    const appointmentSection=[...form.querySelectorAll('.project-form-section')].find(s=>s.querySelector('[name="scheduleAppointment"]'));if(appointmentSection){const p=appointmentSection.querySelector('.project-form-section-head p'),note=appointmentSection.querySelector('.project-inline-note');if(p)p.textContent=piercing?'Optional direkt mit dem Piercing anlegen.':'Optional direkt mit dem Tattoo anlegen.';if(note)note.textContent=piercing?'Artist / Piercer wird aus der Akte übernommen. Bei einer Überschneidung warnt TATNERA.':'Der Artist wird aus dem Tattoo übernommen. Bei einer Überschneidung warnt TATNERA.';}
    const submit=form.querySelector('[type="submit"]');if(submit)submit.textContent=piercing?'Piercing anlegen':'Tattoo anlegen';
    if(piercing&&form.elements.appointmentDuration&&(!form.elements.scheduleAppointment?.checked||Number(form.elements.appointmentDuration.value)===120))form.elements.appointmentDuration.value=45;
    if(!piercing&&form.elements.appointmentDuration&&Number(form.elements.appointmentDuration.value)===45)form.elements.appointmentDuration.value=120;
  }

  function conflicts(date,start,duration,artist){
    const mins=value=>{const [h,m]=String(value||'00:00').split(':').map(Number);return (h||0)*60+(m||0);};const a=mins(start),b=a+Number(duration||0);
    return (state.calendarEvents||[]).filter(e=>e.date===date&&e.artist===artist&&a<mins(e.start)+Number(e.duration||0)&&mins(e.start)<b);
  }

  function savePiercingProject(event){
    const form=event.currentTarget;if(form.querySelector('[name="serviceType"]:checked')?.value!=='piercing')return;
    event.preventDefault();event.stopImmediatePropagation();
    const data=Object.fromEntries(new FormData(form).entries()),mode=form.dataset.customerMode||'new',schedule=form.elements.scheduleAppointment?.checked;
    if(schedule&&conflicts(data.appointmentDate,data.appointmentStart,Number(data.appointmentDuration||45),data.artist).length&&!confirm('Der Artist / Piercer ist zu dieser Zeit bereits belegt. Piercing trotzdem anlegen?'))return;
    const stamp=Date.now();let customerId=data.customerId;
    if(mode==='new'){
      const customer={id:'c'+stamp,firstName:String(data.newFirstName||'').trim(),lastName:String(data.newLastName||'').trim(),email:String(data.newEmail||'').trim(),phone:String(data.newPhone||'').trim(),notes:'',lastProject:'—',next:'—',status:'Neu'};state.customers.unshift(customer);customerId=customer.id;
    }
    if(!customerId)return;
    const project={id:'p'+(stamp+1),serviceType:'piercing',customerId,title:String(data.title||'').trim(),placement:String(data.placement||'').trim(),size:String(data.size||'').trim(),artist:data.artist||Core.artistNameFallback(),price:Number(data.price||0),deposit:Number(data.deposit||0),status:schedule?'Termin geplant':'Entwurf',description:String(data.description||'').trim(),consent:'Fehlt',colors:[],inkIds:[],versions:[],payments:[],piercing:{jewelryType:String(data.piercingJewelryType||'').trim(),material:String(data.piercingMaterial||'Titan').trim(),gauge:String(data.piercingGauge||'').trim(),dimensions:String(data.piercingDimensions||'').trim(),manufacturer:String(data.piercingManufacturer||'').trim(),lot:String(data.piercingLot||'').trim(),notes:''},aftercare:{status:'Offen',tattooDate:'',followupDate:'',instructionsGiven:false,records:[]}};
    state.projects.unshift(project);const customer=state.customers.find(c=>c.id===customerId);if(customer){customer.lastProject=project.title;customer.status='Aktiv';}
    if(schedule)state.calendarEvents.push({id:'e'+(stamp+2),date:data.appointmentDate,start:data.appointmentStart,duration:Number(data.appointmentDuration||45),customerId,projectId:project.id,artist:project.artist,type:'piercing',status:data.appointmentStatus||'Bestätigt',notes:'Erster Piercing-Termin'});
    persist();try{renderCustomers();renderProjects();renderAppointments();renderCalendar();updateCustomerSelect(customerId);}catch(_error){}
    document.getElementById('projectDialog')?.close();form.reset();openProject(project.id);document.dispatchEvent(new CustomEvent('tatnera:data-changed',{detail:{type:'project',projectId:project.id}}));
  }

  function piercingRecordHtml(project){
    const data=project.piercing||{};
    return `<section class="detail-card"><div class="panel-head"><div><span class="eyebrow">Piercing</span><h3>Schmuck & Material</h3><p class="muted">Schmuckdaten und Charge direkt mit der Piercing-Akte dokumentieren.</p></div></div><form class="piercing-record" data-piercing-record="${esc(project.id)}"><label>Schmuckart<input name="jewelryType" value="${esc(data.jewelryType||'')}"></label><label>Material<select name="material">${['Titan','Gold','Stahl','Niob','PTFE / Bioplast','Sonstiges'].map(v=>`<option ${v===(data.material||'Titan')?'selected':''}>${esc(v)}</option>`).join('')}</select></label><label>Stärke<input name="gauge" value="${esc(data.gauge||'')}"></label><label>Maße / Länge / Ø<input name="dimensions" value="${esc(data.dimensions||'')}"></label><label>Hersteller<input name="manufacturer" value="${esc(data.manufacturer||'')}"></label><label>Charge / Lot<input name="lot" value="${esc(data.lot||'')}"></label><label class="full">Notizen<textarea name="notes" rows="3">${esc(data.notes||'')}</textarea></label><div class="piercing-record-actions full"><button type="submit" class="btn primary">Schmuckdaten speichern</button></div></form></section>`;
  }

  function latestPiercingDate(project){
    const all=[...(state.calendarEvents||[]),...(state.appointmentHistory||[])].filter(e=>e.projectId===project.id&&e.type==='piercing'&&e.date).sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(b.start||'').localeCompare(String(a.start||'')));
    return all[0]?.date||'';
  }

  function careStatusLabel(value){return ({Offen:'Offen','Gute Heilung':'Heilung gut',Beobachten:'Beobachten','Kontrolle empfohlen':'Kontrolle empfohlen','Kontrolle geplant':'Kontrolle geplant',Abgeschlossen:'Erledigt'})[value]||value||'Offen';}
  function renderPiercingCare(project){
    const pane=document.querySelector('#projectDetail [data-project-pane="aftercare"]');if(!pane)return;const care=careOf(project),records=[...care.records].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
    pane.innerHTML=`<section class="detail-card"><div class="piercing-care-head"><div><span class="eyebrow">Nachsorge</span><h3>Heilung & Kontrolle</h3><p class="muted">Heilungsverlauf, Pflegehinweise und Kontrollen dieser Piercing-Akte dokumentieren.</p></div><span class="piercing-care-status">${esc(careStatusLabel(care.status))}</span></div><div class="piercing-care-summary"><div><span>Piercing-Termin</span><strong>${fmt(latestPiercingDate(project))}</strong><small>letzter erfasster Termin</small></div><div><span>Nächste Kontrolle</span><strong>${fmt(care.followupDate)}</strong><small>${care.followupDate?'festgelegt':'noch offen'}</small></div><div><span>Pflegehinweise</span><strong>${care.instructionsGiven?'Übergeben':'Offen'}</strong><small>${care.instructionsGiven?'dokumentiert':'noch bestätigen'}</small></div><div><span>Kontrollen</span><strong>${records.length}</strong><small>im Heilungsverlauf</small></div></div><div class="piercing-care-tips"><div><strong>Hände sauber</strong><span>Nur mit sauberen Händen an das Piercing gehen.</span></div><div><strong>Nicht drehen</strong><span>Schmuck nicht unnötig bewegen oder herausnehmen.</span></div><div><strong>Reizung vermeiden</strong><span>Druck, Reibung und unnötige Belastung reduzieren.</span></div><div><strong>Studiohinweise</strong><span>Pflege nach den individuellen Hinweisen des Studios durchführen.</span></div></div><div class="piercing-care-actions"><button class="btn primary" data-piercing-care-add="${esc(project.id)}">+ Kontrolle dokumentieren</button><button class="btn ghost" data-piercing-care-plan="${esc(project.id)}">Kontrolltermin planen</button><button class="btn ghost" data-piercing-care-instructions="${esc(project.id)}">${care.instructionsGiven?'Pflegehinweise ✓':'Pflegehinweise als übergeben markieren'}</button></div><div class="piercing-care-history">${records.length?records.map(r=>`<div class="piercing-care-row"><div><strong>${fmt(r.date)}</strong><span>${esc(careStatusLabel(r.status))}</span></div><div><strong>${esc(r.note||'Keine Notiz')}</strong>${r.nextCheck?`<span>Nächste Kontrolle: ${fmt(r.nextCheck)}</span>`:''}</div><button class="piercing-care-delete" type="button" data-piercing-care-delete="${esc(r.id)}">×</button></div>`).join(''):'<p class="muted">Noch keine Kontrolle dokumentiert.</p>'}</div></section>`;
  }

  function patchProjectDetail(id){
    const project=Core.getProject(id);if(!project)return;const detail=document.getElementById('projectDetail');if(!detail)return;
    if(!project.serviceType){project.serviceType='tattoo';persist();}
    const eyebrow=detail.querySelector('.project-focus-title .eyebrow');if(eyebrow)eyebrow.textContent=serviceLabel(project);
    const designTab=detail.querySelector('[data-project-tab="design"]');if(designTab)designTab.textContent=isPiercing(project)?'Schmuck':'Design';
    if(isPiercing(project)){
      const designPane=detail.querySelector('[data-project-pane="design"]');if(designPane)designPane.innerHTML=piercingRecordHtml(project);
      detail.querySelectorAll('.ink-project-panel').forEach(node=>node.remove());
      const consent=detail.querySelector('.consent-card');if(consent)consent.innerHTML=consent.innerHTML.replaceAll('Tattoo-Akte','Piercing-Akte').replaceAll('Tattoo','Piercing');
      renderPiercingCare(project);
    }
  }

  function patchProjectCard(project){
    const card=document.querySelector(`[data-project-id="${CSS.escape(project.id)}"]`);if(!card||card.querySelector('.piercing-type-badge'))return;
    const body=card.querySelector('.project-body');if(body&&isPiercing(project))body.insertAdjacentHTML('afterbegin','<span class="piercing-type-badge">Piercing</span>');
  }
  function patchCards(){(state.projects||[]).forEach(patchProjectCard);}

  function installProjectWrapper(){
    if(window.__tatneraPiercingProjectWrapper)return;window.__tatneraPiercingProjectWrapper=true;
    const previous=openProject;openProject=function(id){previous(id);requestAnimationFrame(()=>requestAnimationFrame(()=>patchProjectDetail(id)));};
  }

  function patchAppointmentProject(){
    const form=document.getElementById('appointmentForm');if(!form)return;ensureCalendarOption();const id=form.elements.projectId?.value,project=Core.getProject(id);if(!project)return;
    if(isPiercing(project)){form.elements.customerId.value=project.customerId;Core.populateArtistSelect(form.elements.artist,project.artist);form.elements.type.value='piercing';if(Number(form.elements.duration.value)===120)form.elements.duration.value=45;}
  }

  function installAppointmentGuards(){
    const form=document.getElementById('appointmentForm');if(!form||form.dataset.piercingGuard==='1')return;form.dataset.piercingGuard='1';ensureCalendarOption();
    form.elements.projectId?.addEventListener('change',event=>{const project=Core.getProject(event.currentTarget.value);if(!isPiercing(project))return;event.stopImmediatePropagation();form.elements.customerId.value=project.customerId;Core.populateArtistSelect(form.elements.artist,project.artist);form.elements.type.value='piercing';form.elements.duration.value=45;},true);
    form.addEventListener('submit',()=>{const project=Core.getProject(form.elements.projectId?.value);if(isPiercing(project))form.elements.type.value='piercing';},true);
    window.addEventListener('click',event=>{if(event.target.closest('[data-project-schedule],[data-customer-schedule]'))setTimeout(patchAppointmentProject,0);},true);
  }

  function ensureCareDialog(){
    if(document.getElementById('piercingCareDialog'))return;const dialog=document.createElement('dialog');dialog.id='piercingCareDialog';dialog.className='dialog';dialog.innerHTML='<form id="piercingCareForm" style="padding:22px"><input type="hidden" name="projectId"><div class="dialog-head"><div><span class="eyebrow">Piercing-Nachsorge</span><h2>Kontrolle dokumentieren</h2><p class="muted" id="piercingCareMeta"></p></div><button type="button" class="close-btn" data-close-piercing-care>×</button></div><div class="form-grid"><label>Kontrolldatum<input required type="date" name="date"></label><label>Heilungsstatus<select required name="status"><option value="Gute Heilung">Heilung gut</option><option value="Beobachten">Beobachten</option><option value="Kontrolle empfohlen">Kontrolle empfohlen</option><option value="Abgeschlossen">Erledigt</option></select></label><label>Nächste Kontrolle<input type="date" name="nextCheck"></label><label class="full">Notiz<textarea name="note" rows="3" placeholder="Heilungsverlauf, Reizung, Schmuck, Empfehlung …"></textarea></label><label class="full consent-check"><input type="checkbox" name="instructionsGiven"><span>Pflegehinweise wurden erklärt bzw. übergeben.</span></label></div><div class="dialog-actions"><button type="button" class="btn ghost" data-close-piercing-care>Abbrechen</button><button type="submit" class="btn primary">Kontrolle speichern</button></div></form>';document.body.appendChild(dialog);dialog.querySelectorAll('[data-close-piercing-care]').forEach(btn=>btn.addEventListener('click',()=>dialog.close()));document.getElementById('piercingCareForm').addEventListener('submit',saveCare);
  }

  function openCare(projectId){ensureCareDialog();const project=Core.getProject(projectId),form=document.getElementById('piercingCareForm');if(!project||!form)return;const care=careOf(project);form.reset();form.elements.projectId.value=projectId;form.elements.date.value=typeof todayISO==='function'?todayISO():new Date().toISOString().slice(0,10);form.elements.status.value='Gute Heilung';form.elements.nextCheck.value=care.followupDate||'';form.elements.instructionsGiven.checked=Boolean(care.instructionsGiven);document.getElementById('piercingCareMeta').textContent=`${customerName(project.customerId)} · ${project.title}`;document.getElementById('piercingCareDialog').showModal();}
  function saveCare(event){
    event.preventDefault();const form=event.currentTarget,project=Core.getProject(form.elements.projectId.value);if(!project)return;const data=Object.fromEntries(new FormData(form).entries()),care=careOf(project);care.records.push({id:'pc'+Date.now(),date:data.date,status:data.status,nextCheck:data.nextCheck||'',note:String(data.note||'').trim(),createdAt:new Date().toISOString()});care.status=data.status;care.followupDate=data.status==='Abgeschlossen'?'':(data.nextCheck||care.followupDate||'');care.instructionsGiven=form.elements.instructionsGiven.checked;persist();document.getElementById('piercingCareDialog').close();renderPiercingCare(project);document.dispatchEvent(new CustomEvent('tatnera:data-changed',{detail:{type:'aftercare',projectId:project.id}}));if(data.status==='Kontrolle empfohlen')setTimeout(()=>{if(confirm('Eine weitere Kontrolle ist empfohlen. Jetzt direkt einen Kontrolltermin planen?'))planCare(project.id);},60);
  }
  function planCare(projectId){
    const project=Core.getProject(projectId);if(!project||typeof openAppointmentDialog!=='function')return;const care=careOf(project),date=care.followupDate||(typeof todayISO==='function'?todayISO():new Date().toISOString().slice(0,10));openAppointmentDialog('',date);const form=document.getElementById('appointmentForm');if(!form)return;Core.populateArtistSelect(form.elements.artist,project.artist);form.elements.customerId.value=project.customerId;form.elements.projectId.value=project.id;form.elements.type.value='consultation';form.elements.duration.value=30;form.elements.status.value='Angefragt';form.elements.notes.value='Piercing-Kontrolle / Heilungsverlauf';form.addEventListener('submit',()=>setTimeout(()=>{care.status='Kontrolle geplant';care.followupDate=form.elements.date.value||date;persist();document.dispatchEvent(new CustomEvent('tatnera:data-changed',{detail:{type:'aftercare',projectId:project.id}}));},0),{once:true});
  }

  function patchConsentDialog(projectId){
    const project=Core.getProject(projectId);if(!isPiercing(project))return;setTimeout(()=>{const dialog=document.getElementById('consentDialog');if(!dialog)return;dialog.querySelectorAll('p,span,.consent-note').forEach(node=>{node.textContent=node.textContent.replaceAll('dieses Tattoos','dieses Piercings').replaceAll('Tattoo-Akte','Piercing-Akte').replaceAll('tätowiert','pierct').replaceAll('Tattoo','Piercing');});},0);
  }

  function installInteractions(){
    document.addEventListener('submit',event=>{const form=event.target.closest?.('[data-piercing-record]');if(!form)return;event.preventDefault();const project=Core.getProject(form.dataset.piercingRecord);if(!project)return;const d=Object.fromEntries(new FormData(form).entries());project.piercing={jewelryType:String(d.jewelryType||'').trim(),material:String(d.material||'').trim(),gauge:String(d.gauge||'').trim(),dimensions:String(d.dimensions||'').trim(),manufacturer:String(d.manufacturer||'').trim(),lot:String(d.lot||'').trim(),notes:String(d.notes||'').trim()};persist();document.dispatchEvent(new CustomEvent('tatnera:data-changed',{detail:{type:'piercing',projectId:project.id}}));patchProjectDetail(project.id);},true);
    document.addEventListener('click',event=>{
      const add=event.target.closest('[data-piercing-care-add]');if(add){event.preventDefault();openCare(add.dataset.piercingCareAdd);return;}
      const plan=event.target.closest('[data-piercing-care-plan]');if(plan){event.preventDefault();planCare(plan.dataset.piercingCarePlan);return;}
      const instructions=event.target.closest('[data-piercing-care-instructions]');if(instructions){event.preventDefault();const project=Core.getProject(instructions.dataset.piercingCareInstructions);if(project){const care=careOf(project);care.instructionsGiven=!care.instructionsGiven;persist();renderPiercingCare(project);document.dispatchEvent(new CustomEvent('tatnera:data-changed',{detail:{type:'aftercare',projectId:project.id}}));}return;}
      const del=event.target.closest('[data-piercing-care-delete]');if(del){event.preventDefault();const project=Core.currentProject();if(!isPiercing(project)||!confirm('Diesen Kontroll-Eintrag wirklich löschen?'))return;const care=careOf(project);care.records=care.records.filter(r=>r.id!==del.dataset.piercingCareDelete);const latest=[...care.records].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')))[0];care.status=latest?.status||'Offen';care.followupDate=latest?.nextCheck||'';persist();renderPiercingCare(project);document.dispatchEvent(new CustomEvent('tatnera:data-changed',{detail:{type:'aftercare',projectId:project.id}}));return;}
      const consent=event.target.closest('[data-open-consent]');if(consent)patchConsentDialog(consent.dataset.openConsent);
    },true);
  }

  function refresh(){normalizeProjects();patchGlobalLabels();ensureCalendarOption();installProjectForm();installAppointmentGuards();patchCards();const id=Core.projectIdFromDetail();if(id)requestAnimationFrame(()=>patchProjectDetail(id));}

  installStyle();patchEventType();normalizeProjects();installProjectWrapper();installInteractions();ensureCareDialog();refresh();
  document.addEventListener('tatnera:runtime-refresh',refresh);
  document.addEventListener('tatnera:project-opened',event=>requestAnimationFrame(()=>requestAnimationFrame(()=>patchProjectDetail(event.detail?.projectId||Core.projectIdFromDetail()))));
  document.addEventListener('tatnera:data-changed',event=>{if(event.detail?.type==='project'){const p=Core.getProject(event.detail.projectId);if(p&&!p.serviceType){p.serviceType='tattoo';persist();}}setTimeout(()=>{patchCards();const id=Core.projectIdFromDetail();if(id)patchProjectDetail(id);},0);});
  document.addEventListener('tatnera:auth-ready',()=>setTimeout(refresh,250));
})();
