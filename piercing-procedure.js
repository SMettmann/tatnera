/* TATNERA — Piercing procedure documentation
   Adds a dedicated, cloud-persisted procedure record for Piercing cases. */
(function(){
  'use strict';
  if(window.__tatneraPiercingProcedureInstalled)return;
  window.__tatneraPiercingProcedureInstalled=true;

  const Core=window.TatneraCore;
  if(!Core)return;
  const esc=Core.esc||((value)=>String(value??''));
  const isPiercing=project=>project?.serviceType==='piercing';
  const today=()=>typeof todayISO==='function'?todayISO():new Date().toISOString().slice(0,10);
  const persistState=()=>{try{if(typeof persist==='function')persist();}catch(_error){}};

  function customerLabel(project){
    const customer=Core.getCustomer?.(project?.customerId);
    return customer?`${customer.firstName||''} ${customer.lastName||''}`.trim():'Kunde';
  }

  function procedureOf(project){
    const jewelry=project?.piercing||{};
    if(!project.piercingProcedure||typeof project.piercingProcedure!=='object'){
      project.piercingProcedure={
        date:'',piercer:project?.artist||'',procedureType:'Neupiercing',
        disinfectant:'',disinfectantLot:'',instrumentType:'Piercingnadel',instrumentGauge:'',instrumentLot:'',
        jewelryType:jewelry.jewelryType||'',jewelryMaterial:jewelry.material||'',jewelryGauge:jewelry.gauge||'',jewelryDimensions:jewelry.dimensions||'',jewelryManufacturer:jewelry.manufacturer||'',jewelryLot:jewelry.lot||'',
        technique:'Freihand',placementChecked:false,sterileSetup:false,glovesChanged:false,
        result:'Ohne Besonderheiten',notes:'',aftercareGiven:false,followupDate:'',photo:null,completedAt:''
      };
    }
    return project.piercingProcedure;
  }

  function installStyle(){
    if(document.getElementById('piercingProcedureStyle'))return;
    const style=document.createElement('style');
    style.id='piercingProcedureStyle';
    style.textContent=`
      .piercing-procedure-card{padding:18px;border:1px solid var(--line);border-radius:14px;background:var(--panel)}
      .piercing-procedure-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:16px}
      .piercing-procedure-head h3{margin:3px 0 4px}.piercing-procedure-head p{margin:0}
      .piercing-procedure-status{padding:6px 10px;border:1px solid var(--line);border-radius:999px;font-size:10px;font-weight:850;white-space:nowrap}
      .piercing-procedure-status.done{border-color:#6f7f55;background:rgba(111,127,85,.12)}
      .piercing-procedure-section{padding:15px 0;border-top:1px solid var(--line)}
      .piercing-procedure-section:first-of-type{border-top:0;padding-top:0}
      .piercing-procedure-section h4{font-size:12px;margin:0 0 10px}
      .piercing-procedure-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
      .piercing-procedure-grid.two{grid-template-columns:repeat(2,minmax(0,1fr))}
      .piercing-procedure-grid label{display:flex;flex-direction:column;gap:6px;font-size:10px;font-weight:750;color:var(--muted)}
      .piercing-procedure-grid label.full{grid-column:1/-1}
      .piercing-procedure-grid input,.piercing-procedure-grid select,.piercing-procedure-grid textarea{width:100%;border:1px solid var(--line);border-radius:10px;background:var(--panel-2);color:var(--text);padding:9px 10px;font:inherit;font-size:11px}
      .piercing-procedure-grid textarea{resize:vertical;min-height:82px}
      .piercing-procedure-checks{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px}
      .piercing-procedure-checks label{display:flex;align-items:center;gap:8px;padding:10px;border:1px solid var(--line);border-radius:10px;background:var(--panel-2);font-size:10px;font-weight:700;cursor:pointer}
      .piercing-procedure-checks input{width:auto;margin:0}
      .piercing-procedure-actions{display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;padding-top:14px;border-top:1px solid var(--line)}
      .piercing-procedure-actions>div{display:flex;gap:8px;flex-wrap:wrap}
      .piercing-procedure-photo{margin-top:10px;padding:12px;border:1px dashed var(--line);border-radius:11px;background:var(--panel-2)}
      .piercing-procedure-photo img{display:block;max-width:260px;max-height:220px;border-radius:10px;object-fit:cover;margin-bottom:9px}
      .piercing-procedure-photo-meta{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:10px;color:var(--muted)}
      .piercing-procedure-photo-empty{font-size:10px;color:var(--muted)}
      @media(max-width:760px){.piercing-procedure-grid,.piercing-procedure-grid.two,.piercing-procedure-checks{grid-template-columns:1fr}.piercing-procedure-grid label.full{grid-column:1}.piercing-procedure-head{flex-direction:column}}
    `;
    document.head.appendChild(style);
  }

  function ensureTab(project){
    const root=document.getElementById('projectDetail');
    if(!root)return null;
    let tab=root.querySelector('[data-project-tab="procedure"]');
    let pane=root.querySelector('[data-project-pane="procedure"]');
    if(!isPiercing(project)){
      tab?.remove();pane?.remove();
      return null;
    }
    if(!tab){
      tab=document.createElement('button');tab.type='button';tab.className='project-tab-btn';tab.dataset.projectTab='procedure';tab.textContent='Durchführung';tab.setAttribute('role','tab');tab.setAttribute('aria-selected','false');tab.tabIndex=-1;
      const design=root.querySelector('[data-project-tab="design"]');
      design?.insertAdjacentElement('afterend',tab);
    }
    if(!pane){
      pane=document.createElement('section');pane.className='project-tab-pane';pane.dataset.projectPane='procedure';pane.setAttribute('hidden','');
      const designPane=root.querySelector('[data-project-pane="design"]');
      designPane?.insertAdjacentElement('afterend',pane);
    }
    return pane;
  }

  function render(project){
    const pane=ensureTab(project);if(!pane)return;
    const data=procedureOf(project),done=Boolean(data.completedAt);
    const jewelry=project.piercing||{};
    pane.innerHTML=`<section class="piercing-procedure-card">
      <div class="piercing-procedure-head"><div><span class="eyebrow">Piercing</span><h3>Durchführung dokumentieren</h3><p class="muted">Nadel/Kanüle, Desinfektion, Schmuckcharge, Ablauf und Besonderheiten nachvollziehbar festhalten.</p></div><span class="piercing-procedure-status ${done?'done':''}">${done?'Dokumentiert':'Noch offen'}</span></div>
      <form data-piercing-procedure="${esc(project.id)}">
        <div class="piercing-procedure-section"><h4>Termin & Durchführung</h4><div class="piercing-procedure-grid">
          <label>Datum<input required type="date" name="date" value="${esc(data.date||today())}"></label>
          <label>Piercer<input name="piercer" value="${esc(data.piercer||project.artist||'')}"></label>
          <label>Art<select name="procedureType"><option ${data.procedureType==='Neupiercing'?'selected':''}>Neupiercing</option><option ${data.procedureType==='Schmuckwechsel'?'selected':''}>Schmuckwechsel</option><option ${data.procedureType==='Downsizing'?'selected':''}>Downsizing</option><option ${data.procedureType==='Kontrolle / Korrektur'?'selected':''}>Kontrolle / Korrektur</option></select></label>
          <label class="full">Körperstelle<input value="${esc(project.placement||'')}" readonly></label>
        </div><div class="piercing-procedure-checks">
          <label><input type="checkbox" name="placementChecked" ${data.placementChecked?'checked':''}> Platzierung/Markierung kontrolliert</label>
          <label><input type="checkbox" name="sterileSetup" ${data.sterileSetup?'checked':''}> Steriles Setup dokumentiert</label>
          <label><input type="checkbox" name="glovesChanged" ${data.glovesChanged?'checked':''}> Handschuhe hygienisch gewechselt</label>
        </div></div>

        <div class="piercing-procedure-section"><h4>Desinfektion & Nadel/Kanüle</h4><div class="piercing-procedure-grid">
          <label>Desinfektionsmittel<input name="disinfectant" value="${esc(data.disinfectant||'')}" placeholder="Produkt / Hersteller"></label>
          <label>Charge / Lot Desinfektion<input name="disinfectantLot" value="${esc(data.disinfectantLot||'')}"></label>
          <label>Technik<select name="technique"><option ${data.technique==='Freihand'?'selected':''}>Freihand</option><option ${data.technique==='Mit Klemme'?'selected':''}>Mit Klemme</option><option ${data.technique==='Sonstige'?'selected':''}>Sonstige</option></select></label>
          <label>Nadel / Kanüle<input name="instrumentType" value="${esc(data.instrumentType||'')}" placeholder="z. B. Piercingnadel"></label>
          <label>Stärke / Größe<input name="instrumentGauge" value="${esc(data.instrumentGauge||'')}" placeholder="z. B. 1,2 mm"></label>
          <label>Charge / Lot Nadel<input name="instrumentLot" value="${esc(data.instrumentLot||'')}"></label>
        </div></div>

        <div class="piercing-procedure-section"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:10px"><h4 style="margin:0">Eingesetzter Schmuck</h4><button type="button" class="btn ghost" data-procedure-copy-jewelry="${esc(project.id)}">Aus Schmuck-Akte übernehmen</button></div><div class="piercing-procedure-grid">
          <label>Schmuckart<input name="jewelryType" value="${esc(data.jewelryType||jewelry.jewelryType||'')}"></label>
          <label>Material<input name="jewelryMaterial" value="${esc(data.jewelryMaterial||jewelry.material||'')}"></label>
          <label>Stärke<input name="jewelryGauge" value="${esc(data.jewelryGauge||jewelry.gauge||'')}"></label>
          <label>Maße / Länge / Ø<input name="jewelryDimensions" value="${esc(data.jewelryDimensions||jewelry.dimensions||'')}"></label>
          <label>Hersteller<input name="jewelryManufacturer" value="${esc(data.jewelryManufacturer||jewelry.manufacturer||'')}"></label>
          <label>Charge / Lot Schmuck<input name="jewelryLot" value="${esc(data.jewelryLot||jewelry.lot||'')}"></label>
        </div></div>

        <div class="piercing-procedure-section"><h4>Abschluss</h4><div class="piercing-procedure-grid two">
          <label>Verlauf<select name="result"><option ${data.result==='Ohne Besonderheiten'?'selected':''}>Ohne Besonderheiten</option><option ${data.result==='Leichte Blutung'?'selected':''}>Leichte Blutung</option><option ${data.result==='Kreislaufreaktion'?'selected':''}>Kreislaufreaktion</option><option ${data.result==='Besonderheit dokumentiert'?'selected':''}>Besonderheit dokumentiert</option></select></label>
          <label>Kontrolle empfohlen am<input type="date" name="followupDate" value="${esc(data.followupDate||'')}"></label>
          <label class="full">Besonderheiten / Komplikationen / Notiz<textarea name="notes" placeholder="Ablauf, Reaktion, Besonderheiten, Maßnahmen …">${esc(data.notes||'')}</textarea></label>
        </div><div class="piercing-procedure-checks"><label><input type="checkbox" name="aftercareGiven" ${data.aftercareGiven?'checked':''}> Pflege- und Nachsorgehinweise übergeben</label></div>
        <div class="piercing-procedure-photo" data-procedure-photo="${esc(project.id)}"><div class="piercing-procedure-photo-empty">${data.photo?'Abschlussfoto wird geladen …':'Noch kein Abschlussfoto hinterlegt.'}</div></div></div>

        <div class="piercing-procedure-actions"><div><label class="btn ghost" style="cursor:pointer">Abschlussfoto<input hidden type="file" accept="image/jpeg,image/png,image/webp" data-procedure-photo-input="${esc(project.id)}"></label>${data.photo?`<button type="button" class="btn ghost" data-procedure-photo-remove="${esc(project.id)}">Foto entfernen</button>`:''}</div><button type="submit" class="btn primary">Durchführung speichern</button></div>
      </form>
    </section>`;
    renderPhoto(project);
  }

  async function renderPhoto(project){
    const box=document.querySelector(`[data-procedure-photo="${CSS.escape(project.id)}"]`);if(!box)return;
    const photo=procedureOf(project).photo;if(!photo?.path){box.innerHTML='<div class="piercing-procedure-photo-empty">Noch kein Abschlussfoto hinterlegt.</div>';return;}
    try{
      const url=await window.TatneraFiles?.signedUrl(photo.path,3600);
      if(!url){box.innerHTML='<div class="piercing-procedure-photo-empty">Foto konnte nicht geladen werden.</div>';return;}
      box.innerHTML=`<img src="${esc(url)}" alt="Abschlussfoto"><div class="piercing-procedure-photo-meta"><span>${esc(photo.name||'Abschlussfoto')}</span><span>${esc(window.TatneraFiles?.formatSize(photo.size)||'')}</span></div>`;
    }catch(error){box.innerHTML=`<div class="piercing-procedure-photo-empty">Foto konnte nicht geladen werden: ${esc(error.message||'Fehler')}</div>`;}
  }

  function saveProcedure(form){
    const project=Core.getProject(form.dataset.piercingProcedure);if(!isPiercing(project))return;
    const d=Object.fromEntries(new FormData(form).entries()),current=procedureOf(project),photo=current.photo||null;
    project.piercingProcedure={
      date:d.date||'',piercer:String(d.piercer||'').trim(),procedureType:d.procedureType||'Neupiercing',
      disinfectant:String(d.disinfectant||'').trim(),disinfectantLot:String(d.disinfectantLot||'').trim(),instrumentType:String(d.instrumentType||'').trim(),instrumentGauge:String(d.instrumentGauge||'').trim(),instrumentLot:String(d.instrumentLot||'').trim(),
      jewelryType:String(d.jewelryType||'').trim(),jewelryMaterial:String(d.jewelryMaterial||'').trim(),jewelryGauge:String(d.jewelryGauge||'').trim(),jewelryDimensions:String(d.jewelryDimensions||'').trim(),jewelryManufacturer:String(d.jewelryManufacturer||'').trim(),jewelryLot:String(d.jewelryLot||'').trim(),
      technique:d.technique||'Freihand',placementChecked:form.elements.placementChecked.checked,sterileSetup:form.elements.sterileSetup.checked,glovesChanged:form.elements.glovesChanged.checked,
      result:d.result||'Ohne Besonderheiten',notes:String(d.notes||'').trim(),aftercareGiven:form.elements.aftercareGiven.checked,followupDate:d.followupDate||'',photo,completedAt:current.completedAt||new Date().toISOString()
    };
    if(!project.aftercare||typeof project.aftercare!=='object')project.aftercare={status:'Offen',tattooDate:'',followupDate:'',instructionsGiven:false,records:[]};
    if(project.piercingProcedure.aftercareGiven)project.aftercare.instructionsGiven=true;
    if(project.piercingProcedure.followupDate)project.aftercare.followupDate=project.piercingProcedure.followupDate;
    persistState();
    document.dispatchEvent(new CustomEvent('tatnera:data-changed',{detail:{type:'piercing-procedure',projectId:project.id}}));
    render(project);
  }

  function copyJewelry(projectId){
    const project=Core.getProject(projectId),form=document.querySelector(`[data-piercing-procedure="${CSS.escape(projectId)}"]`);if(!isPiercing(project)||!form)return;
    const jewelry=project.piercing||{};
    form.elements.jewelryType.value=jewelry.jewelryType||'';form.elements.jewelryMaterial.value=jewelry.material||'';form.elements.jewelryGauge.value=jewelry.gauge||'';form.elements.jewelryDimensions.value=jewelry.dimensions||'';form.elements.jewelryManufacturer.value=jewelry.manufacturer||'';form.elements.jewelryLot.value=jewelry.lot||'';
  }

  async function uploadPhoto(input){
    const project=Core.getProject(input.dataset.procedurePhotoInput);if(!isPiercing(project)||!input.files?.[0])return;
    const file=input.files[0];input.disabled=true;
    try{
      if(!window.TatneraFiles?.ready())throw new Error('Cloud-Dateispeicher ist noch nicht verbunden.');
      const old=procedureOf(project).photo;
      const uploaded=await window.TatneraFiles.upload(file,{kind:'piercing-procedure',recordId:project.id});
      procedureOf(project).photo=uploaded;
      if(old?.path){try{await window.TatneraFiles.remove(old.path);}catch(_error){}}
      persistState();
      document.dispatchEvent(new CustomEvent('tatnera:data-changed',{detail:{type:'piercing-procedure-photo',projectId:project.id}}));
      render(project);
    }catch(error){alert(error.message||'Foto konnte nicht hochgeladen werden.');}
    finally{input.disabled=false;input.value='';}
  }

  async function removePhoto(projectId){
    const project=Core.getProject(projectId);if(!isPiercing(project))return;const data=procedureOf(project),photo=data.photo;if(!photo)return;
    if(!confirm('Abschlussfoto wirklich entfernen?'))return;
    try{if(photo.path&&window.TatneraFiles?.ready())await window.TatneraFiles.remove(photo.path);}catch(error){alert('Cloud-Datei konnte nicht gelöscht werden: '+(error.message||'Fehler'));return;}
    data.photo=null;persistState();document.dispatchEvent(new CustomEvent('tatnera:data-changed',{detail:{type:'piercing-procedure-photo',projectId:project.id}}));render(project);
  }

  function patch(projectId=''){
    installStyle();
    const id=projectId||Core.projectIdFromDetail?.()||document.getElementById('projectDetail')?.dataset.projectId||'';
    const project=Core.getProject(id);if(!project)return;
    render(project);
    requestAnimationFrame(()=>window.TatneraProjectTabs?.restoreCurrent?.());
  }

  document.addEventListener('submit',event=>{
    const form=event.target.closest?.('[data-piercing-procedure]');if(!form)return;
    event.preventDefault();event.stopImmediatePropagation();saveProcedure(form);
  },true);
  document.addEventListener('click',event=>{
    const copy=event.target.closest('[data-procedure-copy-jewelry]');if(copy){event.preventDefault();copyJewelry(copy.dataset.procedureCopyJewelry);return;}
    const remove=event.target.closest('[data-procedure-photo-remove]');if(remove){event.preventDefault();removePhoto(remove.dataset.procedurePhotoRemove);}
  },true);
  document.addEventListener('change',event=>{const input=event.target.closest?.('[data-procedure-photo-input]');if(input)uploadPhoto(input);},true);
  document.addEventListener('tatnera:project-opened',event=>requestAnimationFrame(()=>patch(event.detail?.projectId||'')));
  document.addEventListener('tatnera:data-changed',event=>{if(event.detail?.projectId)requestAnimationFrame(()=>patch(event.detail.projectId));});
  document.addEventListener('tatnera:runtime-refresh',()=>requestAnimationFrame(()=>patch()));

  installStyle();requestAnimationFrame(()=>patch());
})();
