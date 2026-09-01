/* TATNERA — Ink Passport / Farben & Chargen */
(function(){
  const seedInks=[
    {id:'ink1',manufacturer:'Dynamic',name:'Black',code:'BLK',batch:'DB-2608',purchaseDate:'2026-08-12',expiryDate:'2027-05-31',notes:'Standard Black',photo:''},
    {id:'ink2',manufacturer:'Panthera',name:'Grey',code:'GREY',batch:'PG-0726',purchaseDate:'2026-07-20',expiryDate:'2026-10-10',notes:'Für Greywash / Schattierung',photo:''},
    {id:'ink3',manufacturer:'Panthera',name:'Black',code:'BLACK',batch:'PB-1125',purchaseDate:'2026-01-18',expiryDate:'2027-01-31',notes:'',photo:''},
    {id:'ink4',manufacturer:'Demo Ink',name:'Red',code:'RED01',batch:'DR-0124',purchaseDate:'2025-01-10',expiryDate:'2026-08-15',notes:'Demo einer abgelaufenen Charge',photo:''}
  ];
  state.inks=JSON.parse(localStorage.getItem('tatnera_inks')||'null')||seedInks;
  let activeInkId='';
  let activeProjectId='';
  let selectedPhoto='';

  function esc(v){return String(v??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));}
  function persistAll(){localStorage.setItem('tatnera_inks',JSON.stringify(state.inks));persist();}
  function projectById(id){return state.projects.find(p=>p.id===id);}
  function inkById(id){return state.inks.find(i=>i.id===id);}
  function formatDate(v){if(!v)return'—';return new Intl.DateTimeFormat('de-DE').format(new Date(v+'T12:00:00'));}
  function daysUntil(v){if(!v)return Infinity;const now=new Date();now.setHours(0,0,0,0);const d=new Date(v+'T23:59:59');return Math.ceil((d-now)/86400000);}
  function inkStatus(ink){const days=daysUntil(ink.expiryDate);if(days<0)return{key:'expired',label:'Abgelaufen',days};if(days<=60)return{key:'soon',label:`Läuft in ${days} Tagen ab`,days};return{key:'active',label:'Aktiv',days};}
  function usageFor(id){return state.projects.filter(p=>(p.inkIds||[]).includes(id));}
  function findCurrentProject(){
    const detail=document.getElementById('projectDetail');if(!detail)return null;
    const title=detail.querySelector('h2')?.textContent?.trim();if(!title)return null;
    return state.projects.find(p=>p.title===title)||null;
  }

  function migrateLegacyColors(){
    let changed=false;
    state.projects.forEach(p=>{
      if(!Array.isArray(p.inkIds)){p.inkIds=[];changed=true;}
      (p.colors||[]).forEach(label=>{
        const match=String(label).match(/Charge\s+(.+)$/i);if(!match)return;
        const batch=match[1].trim();const ink=state.inks.find(i=>i.batch===batch);
        if(ink&&!p.inkIds.includes(ink.id)){p.inkIds.push(ink.id);changed=true;}
      });
    });
    if(changed)persistAll();
  }

  function install(){
    buildSettings();
    buildDialogs();
    migrateLegacyColors();
    renderInkSettings();
    injectProjectInkPanel();
    const detail=document.getElementById('projectDetail');
    new MutationObserver(()=>injectProjectInkPanel()).observe(detail,{childList:true,subtree:true});
  }

  function buildSettings(){
    const settings=document.getElementById('settings');
    settings.innerHTML=`<div class="ink-settings">
      <div class="ink-head"><div><span class="eyebrow">Studioverwaltung</span><h2>Farben & Chargen</h2><p class="muted">Jede Flasche bzw. Charge einmal erfassen und anschließend den Tattoo-Akten zuordnen.</p></div><button class="btn primary" id="addInkBtn">+ Farbe / Charge</button></div>
      <div class="ink-stats" id="inkStats"></div>
      <div class="ink-table-wrap"><table class="ink-table"><thead><tr><th>Farbe</th><th>Charge</th><th>Gekauft</th><th>Ablauf</th><th>Status</th><th>Verwendet</th><th></th></tr></thead><tbody id="inkTableBody"></tbody></table></div>
    </div>`;
    document.getElementById('addInkBtn').addEventListener('click',()=>openInkDialog());
  }

  function buildDialogs(){
    if(document.getElementById('inkDialog'))return;
    const inkDialog=document.createElement('dialog');inkDialog.id='inkDialog';inkDialog.className='dialog ink-dialog';
    inkDialog.innerHTML=`<form id="inkForm">
      <div class="dialog-head"><div><span class="eyebrow">Ink Passport</span><h2 id="inkDialogTitle">Farbe / Charge anlegen</h2></div><button type="button" class="close-btn" data-close-ink>×</button></div>
      <div class="form-grid three">
        <label>Hersteller<input required name="manufacturer" placeholder="z. B. Dynamic"></label>
        <label>Farbname<input required name="name" placeholder="z. B. Black"></label>
        <label>Farb-/Produktcode<input name="code" placeholder="optional"></label>
        <label>Charge / Lot<input required name="batch" placeholder="z. B. DB-2608"></label>
        <label>Kaufdatum<input type="date" name="purchaseDate"></label>
        <label>Ablaufdatum<input type="date" name="expiryDate"></label>
        <label class="full">Notizen<textarea name="notes" rows="2" placeholder="Lieferant, Besonderheiten …"></textarea></label>
      </div>
      <div class="ink-photo-row" style="margin-top:14px"><label>Foto vom Etikett<input type="file" id="inkPhotoInput" accept="image/*"><span class="muted">Optional. Für den Prototyp verkleinert und lokal gespeichert.</span></label><div class="ink-photo-preview" id="inkPhotoPreview">Kein Foto</div></div>
      <div class="ink-dialog-note">Eine Charge wird als eigener Datensatz geführt. So bleibt später nachvollziehbar, welche konkrete Charge bei welchem Tattoo verwendet wurde.</div>
      <div class="ink-dialog-tools"><button type="button" class="ink-delete" id="deleteInkBtn" hidden>Charge entfernen</button><div class="dialog-actions"><button type="button" class="btn ghost" data-close-ink>Abbrechen</button><button type="submit" class="btn primary">Speichern</button></div></div>
    </form>`;
    document.body.appendChild(inkDialog);

    const picker=document.createElement('dialog');picker.id='inkPickerDialog';picker.className='dialog ink-dialog';
    picker.innerHTML=`<form id="inkPickerForm"><div class="dialog-head"><div><span class="eyebrow">Tattoo-Akte</span><h2>Verwendete Farben auswählen</h2><p class="muted" id="inkPickerMeta"></p></div><button type="button" class="close-btn" data-close-picker>×</button></div><div class="ink-picker-list" id="inkPickerList"></div><div class="dialog-actions"><button type="button" class="btn ghost" data-close-picker>Abbrechen</button><button type="submit" class="btn primary">Auswahl speichern</button></div></form>`;
    document.body.appendChild(picker);

    const usage=document.createElement('dialog');usage.id='inkUsageDialog';usage.className='dialog';
    usage.innerHTML=`<div style="padding:22px"><div class="dialog-head"><div><span class="eyebrow">Rückverfolgung</span><h2 id="inkUsageTitle">Verwendung</h2></div><button type="button" class="close-btn" data-close-usage>×</button></div><div id="inkUsageBody"></div><div class="dialog-actions"><button type="button" class="btn ghost" data-close-usage>Schließen</button></div></div>`;
    document.body.appendChild(usage);

    document.querySelectorAll('[data-close-ink]').forEach(b=>b.addEventListener('click',()=>inkDialog.close()));
    document.querySelectorAll('[data-close-picker]').forEach(b=>b.addEventListener('click',()=>picker.close()));
    document.querySelectorAll('[data-close-usage]').forEach(b=>b.addEventListener('click',()=>usage.close()));
    document.getElementById('inkForm').addEventListener('submit',saveInk);
    document.getElementById('inkPickerForm').addEventListener('submit',saveProjectInks);
    document.getElementById('inkPhotoInput').addEventListener('change',handlePhoto);
    document.getElementById('deleteInkBtn').addEventListener('click',deleteInk);
  }

  function renderInkSettings(){
    const stats=document.getElementById('inkStats');const body=document.getElementById('inkTableBody');if(!stats||!body)return;
    const statuses=state.inks.map(inkStatus);const active=statuses.filter(s=>s.key==='active').length;const soon=statuses.filter(s=>s.key==='soon').length;const expired=statuses.filter(s=>s.key==='expired').length;
    stats.innerHTML=`<div class="ink-stat"><span>Chargen gesamt</span><strong>${state.inks.length}</strong><small>im Studio erfasst</small></div><div class="ink-stat"><span>Aktiv</span><strong>${active}</strong><small>ohne aktuelle Warnung</small></div><div class="ink-stat warn"><span>Läuft bald ab</span><strong>${soon}</strong><small>innerhalb 60 Tagen</small></div><div class="ink-stat danger"><span>Abgelaufen</span><strong>${expired}</strong><small>nicht neu verwenden</small></div>`;
    body.innerHTML=state.inks.length?state.inks.map(ink=>{
      const st=inkStatus(ink);const used=usageFor(ink.id).length;
      return `<tr><td><div class="ink-name-cell"><div class="ink-swatch">${ink.photo?`<img src="${ink.photo}" alt="Etikett">`:'INK'}</div><div><strong>${esc(ink.name)}</strong><small>${esc(ink.manufacturer)}${ink.code?' · '+esc(ink.code):''}</small></div></div></td><td><strong>${esc(ink.batch)}</strong></td><td>${formatDate(ink.purchaseDate)}</td><td>${formatDate(ink.expiryDate)}</td><td><span class="ink-status ${st.key}">${esc(st.label)}</span></td><td><button class="ink-action" data-usage-id="${ink.id}">${used} Tattoo${used===1?'':'s'} →</button></td><td><button class="ink-action" data-edit-ink="${ink.id}">Bearbeiten</button></td></tr>`;
    }).join(''):`<tr><td colspan="7"><div class="ink-empty">Noch keine Farben oder Chargen erfasst.</div></td></tr>`;
    document.querySelectorAll('[data-edit-ink]').forEach(b=>b.addEventListener('click',()=>openInkDialog(b.dataset.editInk)));
    document.querySelectorAll('[data-usage-id]').forEach(b=>b.addEventListener('click',()=>openUsage(b.dataset.usageId)));
  }

  function openInkDialog(id=''){
    activeInkId=id;const ink=inkById(id);const form=document.getElementById('inkForm');form.reset();selectedPhoto=ink?.photo||'';
    form.elements.manufacturer.value=ink?.manufacturer||'';form.elements.name.value=ink?.name||'';form.elements.code.value=ink?.code||'';form.elements.batch.value=ink?.batch||'';form.elements.purchaseDate.value=ink?.purchaseDate||'';form.elements.expiryDate.value=ink?.expiryDate||'';form.elements.notes.value=ink?.notes||'';
    document.getElementById('inkDialogTitle').textContent=ink?'Farbe / Charge bearbeiten':'Farbe / Charge anlegen';
    const del=document.getElementById('deleteInkBtn');del.hidden=!ink;del.textContent=ink&&usageFor(ink.id).length?`In ${usageFor(ink.id).length} Tattoo(s) verwendet`:'Charge entfernen';del.disabled=Boolean(ink&&usageFor(ink.id).length);
    renderPhotoPreview();document.getElementById('inkDialog').showModal();
  }

  async function handlePhoto(e){const file=e.target.files?.[0];if(!file)return;try{selectedPhoto=await compressImage(file);renderPhotoPreview();}catch{alert('Das Bild konnte nicht verarbeitet werden.');}}
  function compressImage(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=reject;reader.onload=()=>{const img=new Image();img.onerror=reject;img.onload=()=>{const max=640;const scale=Math.min(1,max/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext('2d').drawImage(img,0,0,c.width,c.height);resolve(c.toDataURL('image/jpeg',.72));};img.src=reader.result;};reader.readAsDataURL(file);});}
  function renderPhotoPreview(){document.getElementById('inkPhotoPreview').innerHTML=selectedPhoto?`<img src="${selectedPhoto}" alt="Etikettvorschau">`:'Kein Foto';}

  function saveInk(e){
    e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget).entries());const payload={id:activeInkId||'ink'+Date.now(),manufacturer:d.manufacturer.trim(),name:d.name.trim(),code:d.code.trim(),batch:d.batch.trim(),purchaseDate:d.purchaseDate,expiryDate:d.expiryDate,notes:d.notes.trim(),photo:selectedPhoto};
    const duplicate=state.inks.find(i=>i.batch.toLowerCase()===payload.batch.toLowerCase()&&i.id!==payload.id);if(duplicate&&!confirm(`Die Charge ${payload.batch} existiert bereits. Trotzdem speichern?`))return;
    const idx=state.inks.findIndex(i=>i.id===payload.id);if(idx>=0)state.inks[idx]=payload;else state.inks.unshift(payload);
    persistAll();renderInkSettings();document.getElementById('inkDialog').close();
  }
  function deleteInk(){const ink=inkById(activeInkId);if(!ink)return;const uses=usageFor(ink.id);if(uses.length){alert('Diese Charge ist bereits Tattoo-Akten zugeordnet und kann deshalb nicht entfernt werden.');return;}if(!confirm(`Charge ${ink.batch} wirklich entfernen?`))return;state.inks=state.inks.filter(i=>i.id!==ink.id);persistAll();renderInkSettings();document.getElementById('inkDialog').close();}

  function injectProjectInkPanel(){
    const p=findCurrentProject();if(!p)return;const detail=document.getElementById('projectDetail');
    const target=[...detail.querySelectorAll('.detail-card')].find(card=>card.querySelector('h3')?.textContent?.includes('Verwendete Farben'));
    if(!target)return;
    target.classList.add('ink-project-panel');target.innerHTML=projectInkHtml(p);
    target.querySelector('[data-pick-project-inks]')?.addEventListener('click',()=>openPicker(p.id));
    target.querySelectorAll('[data-project-ink-usage]').forEach(b=>b.addEventListener('click',()=>openUsage(b.dataset.projectInkUsage)));
  }

  function projectInkHtml(p){
    const ids=p.inkIds||[];const inks=ids.map(inkById).filter(Boolean);const legacy=(p.colors||[]).filter(label=>{const m=String(label).match(/Charge\s+(.+)$/i);return !m||!state.inks.some(i=>i.batch===m[1].trim());});
    return `<span class="eyebrow">Ink Passport</span><h3>Farben & Chargen</h3><p class="muted">Konkrete Chargen für dieses Tattoo dokumentieren und später rückverfolgen.</p>
      ${inks.length?`<div class="ink-project-list">${inks.map(ink=>{const st=inkStatus(ink);return `<div class="ink-project-item"><div><strong>${esc(ink.manufacturer)} · ${esc(ink.name)}</strong><small>Charge ${esc(ink.batch)}${ink.code?' · '+esc(ink.code):''}</small>${st.key!=='active'?`<div class="ink-warning-line">⚠ ${esc(st.label)}</div>`:''}</div><div class="right"><span class="ink-status ${st.key}">${esc(st.key==='active'?'Dokumentiert':st.label)}</span><br><button class="ink-action" data-project-ink-usage="${ink.id}">Rückverfolgung</button></div></div>`;}).join('')}</div>`:`<div class="ink-project-empty">Noch keine konkrete Farbe / Charge für dieses Tattoo hinterlegt.</div>`}
      ${legacy.length?`<div class="ink-legacy">Ältere Demo-Angaben: ${legacy.map(esc).join(' · ')}</div>`:''}
      <div class="ink-project-actions"><button class="btn ghost" data-pick-project-inks="${p.id}">+ Farben / Chargen auswählen</button></div>`;
  }

  function openPicker(projectId){
    activeProjectId=projectId;const p=projectById(projectId);if(!p)return;const selected=new Set(p.inkIds||[]);document.getElementById('inkPickerMeta').textContent=`${customerName(p.customerId)} · ${p.title}`;
    const list=document.getElementById('inkPickerList');list.innerHTML=state.inks.length?state.inks.map(ink=>{const st=inkStatus(ink);const checked=selected.has(ink.id);const disabled=st.key==='expired'&&!checked;return `<label class="ink-pick ${disabled?'disabled':''}"><input type="checkbox" name="inkIds" value="${ink.id}" ${checked?'checked':''} ${disabled?'disabled':''}><div><strong>${esc(ink.manufacturer)} · ${esc(ink.name)}</strong><small>Charge ${esc(ink.batch)} · Ablauf ${formatDate(ink.expiryDate)}</small></div><div class="pick-right"><span class="ink-status ${st.key}">${esc(st.label)}</span></div></label>`;}).join(''):'<div class="ink-empty">Lege zuerst unter Einstellungen eine Farbe / Charge an.</div>';
    document.getElementById('inkPickerDialog').showModal();
  }
  function saveProjectInks(e){e.preventDefault();const p=projectById(activeProjectId);if(!p)return;const ids=[...e.currentTarget.querySelectorAll('input[name="inkIds"]:checked')].map(x=>x.value);p.inkIds=ids;persistAll();document.getElementById('inkPickerDialog').close();renderInkSettings();openProject(p.id);}

  function openUsage(id){
    const ink=inkById(id);if(!ink)return;const uses=usageFor(id);document.getElementById('inkUsageTitle').textContent=`${ink.manufacturer} ${ink.name} · ${ink.batch}`;
    document.getElementById('inkUsageBody').innerHTML=uses.length?`<p class="muted">Diese Charge ist in ${uses.length} Tattoo-Akte${uses.length===1?'':'n'} dokumentiert.</p><div class="ink-usage-list">${uses.map(p=>`<div class="ink-usage-row"><div><strong>${esc(p.title)}</strong><br><span>${esc(customerName(p.customerId))}</span></div><span>${esc(p.placement||'')}</span></div>`).join('')}</div>`:'<div class="ink-project-empty">Diese Charge wurde bislang keiner Tattoo-Akte zugeordnet.</div>';
    document.getElementById('inkUsageDialog').showModal();
  }

  install();
})();