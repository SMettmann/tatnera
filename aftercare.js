/* TATNERA — Nachsorge & Nachstechen */
(function(){
  let activeProjectId='';
  let selectedHealingPhoto='';

  function esc(v){return String(v??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));}
  function projectById(id){return state.projects.find(p=>p.id===id);}
  function currentProject(){const detail=document.getElementById('projectDetail');const title=detail?.querySelector('h2')?.textContent?.trim();return title?state.projects.find(p=>p.title===title)||null:null;}
  function isoToday(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function addDaysISO(value,days){const d=new Date((value||isoToday())+'T12:00:00');d.setDate(d.getDate()+days);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function formatDate(v){if(!v)return'—';return new Intl.DateTimeFormat('de-DE').format(new Date(v+'T12:00:00'));}
  function records(p){return Array.isArray(p.aftercare?.records)?p.aftercare.records:[];}
  function lastTattooDate(p){
    const dates=(state.calendarEvents||[]).filter(e=>e.projectId===p.id&&e.type==='tattoo').map(e=>e.date).sort();
    return dates.at(-1)||p.aftercare?.tattooDate||'';
  }
  function status(p){
    const s=p.aftercare?.status||'Offen';
    if(s==='Gute Heilung')return{key:'good',label:s};
    if(s==='Nachstechen empfohlen')return{key:'warn',label:s};
    if(s==='Nachstechen geplant')return{key:'planned',label:s};
    if(s==='Abgeschlossen')return{key:'done',label:s};
    return{key:'open',label:'Offen'};
  }
  function followupDate(p){return p.aftercare?.followupDate||addDaysISO(lastTattooDate(p)||isoToday(),42);}

  function install(){
    if(!document.querySelector('link[href="aftercare.css"]')){const l=document.createElement('link');l.rel='stylesheet';l.href='aftercare.css';document.head.appendChild(l);}
    buildDialogs();migrate();injectCard();
    const detail=document.getElementById('projectDetail');if(detail)new MutationObserver(()=>{if(!detail.querySelector('.aftercare-card'))injectCard();}).observe(detail,{childList:true,subtree:true});
  }

  function migrate(){let changed=false;state.projects.forEach(p=>{if(!p.aftercare){p.aftercare={status:'Offen',tattooDate:lastTattooDate(p)||'',followupDate:'',instructionsGiven:false,records:[]};changed=true;}else if(!Array.isArray(p.aftercare.records)){p.aftercare.records=[];changed=true;}});if(changed)persist();}

  function buildDialogs(){
    if(document.getElementById('aftercareDialog'))return;
    const dlg=document.createElement('dialog');dlg.id='aftercareDialog';dlg.className='dialog wide-dialog';
    dlg.innerHTML=`<form id="aftercareForm" style="padding:22px"><div class="dialog-head"><div><span class="eyebrow">Nachsorge</span><h2>Heilung dokumentieren</h2><p class="muted" id="aftercareDialogMeta"></p></div><button type="button" class="close-btn" data-close-aftercare>×</button></div>
      <div class="form-grid three"><label>Kontrolldatum<input required type="date" name="date"></label><label>Heilungsstatus<select required name="status"><option>Gute Heilung</option><option>Beobachten</option><option>Nachstechen empfohlen</option><option>Nachstechen geplant</option><option>Abgeschlossen</option></select></label><label>Nächste Kontrolle<input type="date" name="nextCheck"></label><label class="full">Notiz<textarea name="note" rows="3" placeholder="Heilungsverlauf, Auffälligkeiten, Stellen zum Nacharbeiten …"></textarea></label></div>
      <div class="form-grid" style="margin-top:13px"><label>Foto vom Heilungsverlauf<input type="file" id="healingPhotoInput" accept="image/*"><span class="muted">Optional, wird im Prototyp verkleinert lokal gespeichert.</span></label><div class="healing-photo-preview" id="healingPhotoPreview">Kein Foto</div></div>
      <label class="aftercare-toggle"><input type="checkbox" name="instructionsGiven"><span>Pflege-/Nachsorgehinweise wurden dem Kunden erklärt bzw. übergeben.</span></label>
      <div class="aftercare-dialog-note">TATNERA dokumentiert den Verlauf. Medizinische Auffälligkeiten sollten nicht durch die Software bewertet werden; bei Unsicherheit ist fachlicher Rat sinnvoll.</div>
      <div class="dialog-actions"><button type="button" class="btn ghost" data-close-aftercare>Abbrechen</button><button type="submit" class="btn primary">Kontrolle speichern</button></div></form>`;
    document.body.appendChild(dlg);

    document.querySelectorAll('[data-close-aftercare]').forEach(b=>b.addEventListener('click',()=>dlg.close()));
    document.getElementById('aftercareForm').addEventListener('submit',saveRecord);
    document.getElementById('healingPhotoInput').addEventListener('change',handlePhoto);
  }

  function injectCard(){
    const p=currentProject(),detail=document.getElementById('projectDetail');if(!p||!detail||detail.querySelector('.aftercare-card'))return;
    const card=document.createElement('section');card.className='aftercare-card';card.dataset.aftercareProject=p.id;renderCard(card,p);
    const payment=detail.querySelector('.payment-card');if(payment)payment.insertAdjacentElement('afterend',card);else{const consent=detail.querySelector('.consent-card');if(consent)consent.insertAdjacentElement('afterend',card);else detail.appendChild(card);}
  }

  function renderCard(card,p){
    const s=status(p),tattooDate=lastTattooDate(p)||p.aftercare?.tattooDate||'',follow=followupDate(p),rows=[...records(p)].sort((a,b)=>(b.date||'').localeCompare(a.date||''));
    card.innerHTML=`<div class="aftercare-head"><div><span class="eyebrow">Nachsorge</span><h3>Heilung & Nachstechen</h3><p class="muted">Pflegehinweise, Heilungsverlauf und eventuelle Nacharbeiten direkt in der Tattoo-Akte dokumentieren.</p></div><span class="aftercare-status ${s.key}">${esc(s.label)}</span></div>
      <div class="aftercare-summary"><div><span>Tattoo-Termin</span><strong>${formatDate(tattooDate)}</strong><small>letzter Tattoo-Termin</small></div><div><span>Empfohlene Kontrolle</span><strong>${formatDate(follow)}</strong><small>standardmäßig nach 6 Wochen</small></div><div><span>Pflegehinweise</span><strong>${p.aftercare?.instructionsGiven?'Übergeben':'Offen'}</strong><small>${p.aftercare?.instructionsGiven?'dokumentiert':'noch bestätigen'}</small></div><div><span>Kontrollen</span><strong>${rows.length}</strong><small>im Heilungsverlauf</small></div></div>
      <div class="aftercare-guide"><div class="aftercare-tip"><strong>Sauber halten</strong><span>Sanfte Reinigung nach Studioanweisung, nicht unnötig berühren.</span></div><div class="aftercare-tip"><strong>Pflegen</strong><span>Empfohlene Pflege dünn anwenden und Haut nicht überpflegen.</span></div><div class="aftercare-tip"><strong>Schützen</strong><span>In der Heilphase Reibung, Schwimmen, Sauna und intensive Sonne vermeiden.</span></div><div class="aftercare-tip"><strong>Nicht kratzen</strong><span>Schorf und Hautschüppchen nicht abziehen; Heilung natürlich abwarten.</span></div></div>
      <div class="aftercare-actions"><button class="btn primary" data-add-healing="${p.id}">+ Heilung dokumentieren</button><button class="btn ghost" data-plan-touchup="${p.id}">Nachstech-Termin planen</button><button class="btn ghost" data-toggle-instructions="${p.id}">${p.aftercare?.instructionsGiven?'Pflegehinweise ✓':'Pflegehinweise als übergeben markieren'}</button></div>
      <div class="aftercare-history"><div class="aftercare-history-head"><h4>Heilungsverlauf</h4><span class="muted">${rows.length?`${rows.length} Einträge`:'Noch keine Kontrolle'}</span></div>${rows.length?rows.map(r=>recordRow(r)).join(''):'<div class="aftercare-empty">Noch kein Heilungsverlauf dokumentiert.</div>'}</div>`;
    card.querySelector('[data-add-healing]')?.addEventListener('click',()=>openDialog(p.id));
    card.querySelector('[data-plan-touchup]')?.addEventListener('click',()=>planTouchup(p.id));
    card.querySelector('[data-toggle-instructions]')?.addEventListener('click',()=>toggleInstructions(p.id));
    card.querySelectorAll('[data-delete-healing]').forEach(b=>b.addEventListener('click',()=>deleteRecord(p.id,b.dataset.deleteHealing)));
  }

  function recordRow(r){return `<div class="healing-entry"><div class="healing-date"><strong>${formatDate(r.date)}</strong><br><small>${esc(r.status)}</small></div><div>${r.photo?`<img class="healing-photo" src="${r.photo}" alt="Heilungsverlauf">`:''}<strong>${esc(r.note||'Keine Notiz')}</strong>${r.nextCheck?`<br><span>Nächste Kontrolle: ${formatDate(r.nextCheck)}</span>`:''}</div><button class="healing-delete" data-delete-healing="${r.id}" title="Eintrag löschen">×</button></div>`;}

  function openDialog(projectId){activeProjectId=projectId;selectedHealingPhoto='';const p=projectById(projectId),form=document.getElementById('aftercareForm');form.reset();form.elements.date.value=isoToday();form.elements.status.value='Gute Heilung';form.elements.nextCheck.value=followupDate(p);form.elements.instructionsGiven.checked=Boolean(p.aftercare?.instructionsGiven);document.getElementById('aftercareDialogMeta').textContent=`${customerName(p.customerId)} · ${p.title}`;renderPhoto();document.getElementById('aftercareDialog').showModal();}

  function saveRecord(e){e.preventDefault();const p=projectById(activeProjectId);if(!p)return;const d=Object.fromEntries(new FormData(e.currentTarget).entries());p.aftercare=p.aftercare||{records:[]};p.aftercare.records=p.aftercare.records||[];p.aftercare.records.push({id:'heal'+Date.now(),date:d.date,status:d.status,nextCheck:d.nextCheck||'',note:d.note?.trim()||'',photo:selectedHealingPhoto,createdAt:new Date().toISOString()});p.aftercare.status=d.status==='Beobachten'?'Offen':d.status;p.aftercare.followupDate=d.nextCheck||p.aftercare.followupDate||'';p.aftercare.instructionsGiven=e.currentTarget.elements.instructionsGiven.checked;persist();document.getElementById('aftercareDialog').close();refresh(p.id);}

  function deleteRecord(projectId,id){const p=projectById(projectId);if(!p||!confirm('Diesen Nachsorge-Eintrag wirklich löschen?'))return;p.aftercare.records=p.aftercare.records.filter(r=>r.id!==id);persist();refresh(projectId);}
  function toggleInstructions(projectId){const p=projectById(projectId);if(!p)return;p.aftercare.instructionsGiven=!p.aftercare.instructionsGiven;persist();refresh(projectId);}
  function refresh(projectId){const card=document.querySelector(`.aftercare-card[data-aftercare-project="${projectId}"]`),p=projectById(projectId);if(card&&p)renderCard(card,p);}

  function planTouchup(projectId){
    const p=projectById(projectId);if(!p)return;const date=p.aftercare?.followupDate||followupDate(p);p.aftercare.status='Nachstechen geplant';persist();refresh(projectId);
    state.calendar.anchor=date;state.calendar.view='day';navigate('calendar');
    setTimeout(()=>{
      if(typeof openAppointmentDialog==='function'){
        openAppointmentDialog('',date);
        const form=document.getElementById('appointmentForm');if(form){form.elements.type.value='touchup';form.elements.customerId.value=p.customerId;form.elements.projectId.value=p.id;form.elements.status.value='Angefragt';form.elements.duration.value=60;form.elements.notes.value='Nachstechen / Heilungskontrolle';}
      }
    },0);
  }

  async function handlePhoto(e){const file=e.target.files?.[0];if(!file)return;try{selectedHealingPhoto=await compress(file);renderPhoto();}catch{alert('Das Bild konnte nicht verarbeitet werden.');}}
  function renderPhoto(){document.getElementById('healingPhotoPreview').innerHTML=selectedHealingPhoto?`<img src="${selectedHealingPhoto}" alt="Vorschau">`:'Kein Foto';}
  function compress(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onerror=reject;r.onload=()=>{const img=new Image();img.onerror=reject;img.onload=()=>{const max=900,scale=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext('2d').drawImage(img,0,0,c.width,c.height);resolve(c.toDataURL('image/jpeg',.75));};img.src=r.result;};r.readAsDataURL(file);});}

  install();
})();
