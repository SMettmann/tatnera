/* TATNERA — consent & anamnesis v2, project-ID based */
(function(){
  'use strict';
  const Core=window.TatneraCore;
  if(!Core)return;

  let activeProjectId='',signatureDirty=false,drawing=false,ctx=null,resizeCanvas=()=>{};
  let guardianSignatureDirty=false,guardianDrawing=false,guardianCtx=null,resizeGuardianCanvas=()=>{};
  const esc=Core.esc;
  const questions=['bloodThinners','allergies','skinConditions','diabetes','immuneSystem','fainting','pregnancy','infection'];
  const healthLabels={
    bloodThinners:'Blutverdünnende Medikamente',
    allergies:'Allergien / Unverträglichkeiten',
    skinConditions:'Hauterkrankungen / Hautprobleme',
    diabetes:'Diabetes',
    immuneSystem:'Immunsystem / Immunsuppression',
    fainting:'Kreislaufprobleme / Ohnmacht',
    pregnancy:'Schwangerschaft / Stillzeit',
    infection:'Infektion / Fieber / starke Erkrankung'
  };
  const checks=['truthful','risks','aftercare','privacy','photoConsent'];

  function project(id){return Core.getProject(id);}
  function statusClass(value){return value==='Unterschrieben'?'signed':value==='Angefordert'?'requested':value==='Vorhanden'?'existing':'missing';}
  function signedDate(p){return p?.consentData?.signedAt?new Intl.DateTimeFormat('de-DE',{dateStyle:'medium',timeStyle:'short'}).format(new Date(p.consentData.signedAt)):'—';}
  function healthQuestion(name,label){return `<div class="health-question"><label>${label}<select name="${name}" required><option value="">Bitte wählen …</option><option value="Nein">Nein</option><option value="Ja">Ja</option></select></label></div>`;}

  function parseBirthDate(value){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value||'')))return null;
    const [y,m,d]=value.split('-').map(Number),date=new Date(y,m-1,d);
    return date.getFullYear()===y&&date.getMonth()===m-1&&date.getDate()===d?date:null;
  }
  function ageFromBirthDate(value){
    const birth=parseBirthDate(value);if(!birth)return null;
    const now=new Date();let age=now.getFullYear()-birth.getFullYear();
    if(now.getMonth()<birth.getMonth()||(now.getMonth()===birth.getMonth()&&now.getDate()<birth.getDate()))age--;
    return age;
  }
  function healthYesFromData(data){
    const health=data?.health||{};
    return questions.filter(key=>health[key]==='Ja').map(key=>healthLabels[key]);
  }
  function healthYesFromForm(form){
    return questions.filter(key=>form.elements[key]?.value==='Ja').map(key=>healthLabels[key]);
  }

  function installAssets(){
    if(!document.querySelector('link[href="consent.css"]')){const link=document.createElement('link');link.rel='stylesheet';link.href='consent.css';document.head.appendChild(link);}
    if(document.getElementById('consentDialog'))return;
    const dialog=document.createElement('dialog');dialog.id='consentDialog';dialog.className='dialog consent-dialog';
    dialog.innerHTML=`<form id="consentForm"><div class="consent-dialog-inner">
      <div class="dialog-head"><div><span class="eyebrow">Einwilligung & Anamnese</span><h2 id="consentDialogTitle">Kundenformular</h2><p class="muted" id="consentDialogMeta"></p></div><button type="button" class="close-btn" data-close-consent>×</button></div>
      <section class="consent-section"><h3>Persönliche Angaben</h3><p>Die Kundendaten werden aus der Kundenakte übernommen.</p><div class="form-grid"><label>Geburtsdatum<input type="date" name="birthDate" required><small id="consentAgeHint" class="muted" style="display:block;margin-top:5px"></small></label><label>Telefon<input name="phone" autocomplete="tel"></label><label class="full">Anschrift<input name="address" placeholder="Straße, Hausnummer, PLZ, Ort"></label></div></section>
      <section class="consent-section" id="guardianConsentSection" hidden>
        <h3>Einwilligung Sorgeberechtigte/r</h3>
        <p>Bei einer minderjährigen Person dokumentiert TATNERA zusätzlich die Zustimmung einer sorgeberechtigten Person. Das Studio entscheidet weiterhin selbst, ob es Minderjährige tätowiert.</p>
        <div class="form-grid">
          <label>Name Sorgeberechtigte/r<input name="guardianName"></label>
          <label>Verhältnis<select name="guardianRelation"><option value="">Bitte wählen …</option><option>Mutter</option><option>Vater</option><option>Gesetzliche Vertretung</option><option>Sonstiges</option></select></label>
          <label>Telefon<input name="guardianPhone" autocomplete="tel"></label>
          <label class="full consent-check"><input type="checkbox" name="guardianIdChecked"><span>Identität / Sorgeberechtigung wurde vom Studio geprüft.</span></label>
          <label class="full consent-check"><input type="checkbox" name="guardianConsent"><span>Ich stimme als sorgeberechtigte Person der Durchführung dieses Tattoos nach erfolgter Aufklärung zu.</span></label>
        </div>
        <div class="signature-wrap" id="guardianSignatureWrap" style="margin-top:14px"><canvas id="guardianSignatureCanvas"></canvas><div class="signature-tools"><span>Unterschrift Sorgeberechtigte/r</span><button type="button" id="clearGuardianSignatureBtn">Neu zeichnen</button></div></div>
      </section>
      <section class="consent-section"><h3>Gesundheitsangaben</h3><p>Die Angaben dienen der Dokumentation. Medizinische Entscheidungen trifft nicht die Software.</p><div id="healthYesAlert" hidden style="margin:10px 0;padding:11px 12px;border:1px solid #c98933;border-radius:10px;background:#fff6e8;color:#6f4514;font-size:11px;line-height:1.45"></div><div class="health-grid">${healthQuestion('bloodThinners','Blutverdünnende Medikamente?')}${healthQuestion('allergies','Bekannte Allergien oder Unverträglichkeiten?')}${healthQuestion('skinConditions','Hauterkrankungen / akute Hautprobleme?')}${healthQuestion('diabetes','Diabetes?')}${healthQuestion('immuneSystem','Immunsystem-Erkrankung / Immunsuppression?')}${healthQuestion('fainting','Neigung zu Kreislaufproblemen / Ohnmacht?')}${healthQuestion('pregnancy','Schwangerschaft / Stillzeit (falls relevant)?')}${healthQuestion('infection','Aktuelle Infektion, Fieber oder starke Erkrankung?')}</div><label style="margin-top:12px">Weitere relevante Angaben<textarea name="otherHealth" rows="3"></textarea></label></section>
      <section class="consent-section"><h3>Einwilligung</h3><div class="consent-checks"><label class="consent-check"><input type="checkbox" name="truthful" required><span>Ich bestätige, dass meine Angaben vollständig und nach bestem Wissen richtig sind.</span></label><label class="consent-check"><input type="checkbox" name="risks" required><span>Ich wurde über typische Risiken und mögliche Reaktionen informiert und konnte Fragen stellen.</span></label><label class="consent-check"><input type="checkbox" name="aftercare" required><span>Ich habe Hinweise zur Vorbereitung und Nachsorge erhalten bzw. werde diese erhalten.</span></label><label class="consent-check"><input type="checkbox" name="privacy" required><span>Ich willige in die für Durchführung und Dokumentation erforderliche Datenspeicherung ein.</span></label><label class="consent-check"><input type="checkbox" name="photoConsent"><span>Optional: Fotos dürfen für Portfolio / Social Media verwendet werden.</span></label></div></section>
      <section class="consent-section"><h3>Unterschrift</h3><p>Mit Finger, Apple Pencil oder Maus unterschreiben.</p><div class="signature-wrap" id="signatureWrap"><canvas id="signatureCanvas"></canvas><div class="signature-tools"><span>Unterschrift des Kunden</span><button type="button" id="clearSignatureBtn">Neu zeichnen</button></div></div></section>
      <div class="consent-note">MVP: Die Daten liegen derzeit lokal im Browser. Für den Produktivbetrieb werden sichere Speicherung, PDF-Versionierung und Datenschutzprozesse angebunden.</div>
      <div class="dialog-actions"><button type="button" class="btn ghost" data-close-consent>Abbrechen</button><button type="submit" class="btn primary">Unterschreiben & speichern</button></div>
    </div></form>`;
    document.body.appendChild(dialog);
    dialog.querySelectorAll('[data-close-consent]').forEach(btn=>btn.addEventListener('click',()=>dialog.close()));
    document.getElementById('clearSignatureBtn').addEventListener('click',clearSignature);
    document.getElementById('clearGuardianSignatureBtn').addEventListener('click',clearGuardianSignature);
    document.getElementById('consentForm').addEventListener('submit',saveConsent);
    document.getElementById('consentForm').addEventListener('change',event=>{
      if(event.target?.name==='birthDate')updateMinorState();
      if(questions.includes(event.target?.name))updateHealthAlert();
    });
    document.getElementById('consentForm').elements.birthDate.addEventListener('input',updateMinorState);
    setupCanvas();
    setupGuardianCanvas();
  }

  function setupCanvas(){
    const canvas=document.getElementById('signatureCanvas');if(!canvas)return;
    const resize=()=>{const ratio=Math.max(window.devicePixelRatio||1,1),rect=canvas.getBoundingClientRect(),previous=signatureDirty?canvas.toDataURL():'';canvas.width=Math.max(1,Math.round(rect.width*ratio));canvas.height=Math.max(1,Math.round(rect.height*ratio));ctx=canvas.getContext('2d');ctx.scale(ratio,ratio);ctx.lineWidth=2.2;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#111';if(previous)loadSignature(previous);};
    resizeCanvas=resize;
    window.addEventListener('resize',()=>{if(document.getElementById('consentDialog')?.open)resize();});
    canvas.addEventListener('pointerdown',event=>{drawing=true;signatureDirty=true;canvas.setPointerCapture(event.pointerId);const r=canvas.getBoundingClientRect();ctx.beginPath();ctx.moveTo(event.clientX-r.left,event.clientY-r.top);document.getElementById('signatureWrap').classList.add('has-signature');});
    canvas.addEventListener('pointermove',event=>{if(!drawing)return;const r=canvas.getBoundingClientRect();ctx.lineTo(event.clientX-r.left,event.clientY-r.top);ctx.stroke();});
    ['pointerup','pointercancel','pointerleave'].forEach(type=>canvas.addEventListener(type,()=>drawing=false));
  }
  function setupGuardianCanvas(){
    const canvas=document.getElementById('guardianSignatureCanvas');if(!canvas)return;
    const resize=()=>{if(document.getElementById('guardianConsentSection')?.hidden)return;const ratio=Math.max(window.devicePixelRatio||1,1),rect=canvas.getBoundingClientRect(),previous=guardianSignatureDirty?canvas.toDataURL():'';canvas.width=Math.max(1,Math.round(rect.width*ratio));canvas.height=Math.max(1,Math.round(rect.height*ratio));guardianCtx=canvas.getContext('2d');guardianCtx.scale(ratio,ratio);guardianCtx.lineWidth=2.2;guardianCtx.lineCap='round';guardianCtx.lineJoin='round';guardianCtx.strokeStyle='#111';if(previous)loadGuardianSignature(previous);};
    resizeGuardianCanvas=resize;
    window.addEventListener('resize',()=>{if(document.getElementById('consentDialog')?.open&&!document.getElementById('guardianConsentSection')?.hidden)resize();});
    canvas.addEventListener('pointerdown',event=>{guardianDrawing=true;guardianSignatureDirty=true;canvas.setPointerCapture(event.pointerId);const r=canvas.getBoundingClientRect();guardianCtx.beginPath();guardianCtx.moveTo(event.clientX-r.left,event.clientY-r.top);document.getElementById('guardianSignatureWrap').classList.add('has-signature');});
    canvas.addEventListener('pointermove',event=>{if(!guardianDrawing)return;const r=canvas.getBoundingClientRect();guardianCtx.lineTo(event.clientX-r.left,event.clientY-r.top);guardianCtx.stroke();});
    ['pointerup','pointercancel','pointerleave'].forEach(type=>canvas.addEventListener(type,()=>guardianDrawing=false));
  }

  function clearSignature(){const canvas=document.getElementById('signatureCanvas');if(!canvas||!ctx)return;ctx.clearRect(0,0,canvas.width,canvas.height);signatureDirty=false;document.getElementById('signatureWrap')?.classList.remove('has-signature');}
  function loadSignature(src){if(!src)return;const canvas=document.getElementById('signatureCanvas'),img=new Image();img.onload=()=>{const r=canvas.getBoundingClientRect();ctx.drawImage(img,0,0,r.width,r.height);signatureDirty=true;document.getElementById('signatureWrap')?.classList.add('has-signature');};img.src=src;}
  function clearGuardianSignature(){const canvas=document.getElementById('guardianSignatureCanvas');if(!canvas||!guardianCtx)return;guardianCtx.clearRect(0,0,canvas.width,canvas.height);guardianSignatureDirty=false;document.getElementById('guardianSignatureWrap')?.classList.remove('has-signature');}
  function loadGuardianSignature(src){if(!src)return;const canvas=document.getElementById('guardianSignatureCanvas'),img=new Image();img.onload=()=>{const r=canvas.getBoundingClientRect();guardianCtx.drawImage(img,0,0,r.width,r.height);guardianSignatureDirty=true;document.getElementById('guardianSignatureWrap').classList.add('has-signature');};img.src=src;}

  function updateMinorState(){
    const form=document.getElementById('consentForm');if(!form)return;
    const birth=form.elements.birthDate.value,age=ageFromBirthDate(birth),section=document.getElementById('guardianConsentSection'),hint=document.getElementById('consentAgeHint');
    const invalid=age!==null&&age<0,minor=age!==null&&age>=0&&age<18;
    section.hidden=!minor;
    ['guardianName','guardianRelation','guardianIdChecked','guardianConsent'].forEach(name=>{if(form.elements[name])form.elements[name].required=minor;});
    form.elements.birthDate.setCustomValidity(invalid?'Geburtsdatum darf nicht in der Zukunft liegen.':'');
    if(hint){
      hint.textContent=age===null?'Alter wird aus dem Geburtsdatum berechnet.':invalid?'Geburtsdatum liegt in der Zukunft.':minor?`Minderjährig (${age} Jahre) · Zustimmung Sorgeberechtigte/r erforderlich.`:`${age} Jahre · volljährig.`;
      hint.style.color=(invalid||minor)?'#9a5a14':'';
      hint.style.fontWeight=(invalid||minor)?'700':'';
    }
    if(minor)requestAnimationFrame(()=>{resizeGuardianCanvas();});
  }

  function updateHealthAlert(){
    const form=document.getElementById('consentForm'),box=document.getElementById('healthYesAlert');if(!form||!box)return;
    const yes=healthYesFromForm(form);box.hidden=!yes.length;
    box.innerHTML=yes.length?`<strong style="display:block;margin-bottom:3px">⚠ Gesundheitsangaben prüfen</strong>${yes.length} Frage${yes.length===1?'':'n'} mit „Ja“ beantwortet: ${yes.map(esc).join(', ')}. Diese Angaben müssen vor der Sitzung bewusst geprüft werden.`:'';
  }

  function cardHtml(p){
    const status=p.consent||'Fehlt',age=ageFromBirthDate(p.consentData?.birthDate||''),healthYes=healthYesFromData(p.consentData),minor=age!==null&&age>=0&&age<18;
    const ageText=age===null?'—':age<0?'Ungültig':`${age} Jahre`;
    const warning=healthYes.length?`<div style="margin:12px 0;padding:10px 12px;border:1px solid #c98933;border-radius:10px;background:#fff6e8;color:#6f4514;font-size:11px"><strong>⚠ Gesundheitsangaben prüfen</strong><br>${healthYes.map(esc).join(', ')}</div>`:'';
    const minorInfo=minor?`<div style="margin:12px 0;padding:10px 12px;border:1px solid #7790a0;border-radius:10px;background:#eef5f8;color:#294653;font-size:11px"><strong>Minderjährige Person · ${esc(ageText)}</strong><br>Sorgeberechtigte/r: ${esc(p.consentData?.guardian?.name||'nicht dokumentiert')} · Zustimmung ${p.consentData?.guardian?.consent?'✓':'fehlt'}</div>`:'';
    return `<div class="consent-card-head"><div><span class="eyebrow">Dokumentation</span><h3>Einwilligung & Anamnese</h3><p>Gesundheitsangaben, Aufklärung, Datenschutz und Unterschrift sind eindeutig mit dieser Tattoo-Akte verknüpft.</p></div><span class="consent-status ${statusClass(status)}">${esc(status)}</span></div><div class="consent-summary"><div><span>Kunde</span><strong>${esc(customerName(p.customerId))}</strong></div><div><span>Alter</span><strong>${esc(ageText)}</strong></div><div><span>Unterschrieben</span><strong>${esc(signedDate(p))}</strong></div></div>${minorInfo}${warning}${p.consentData?.signature?`<div class="consent-signed-preview"><img src="${p.consentData.signature}" alt="Gespeicherte Unterschrift"><small>Mit dieser Tattoo-Akte gespeichert.</small></div>`:''}<div class="consent-actions"><button class="btn primary" data-open-consent="${esc(p.id)}">${p.consentData?'Formular ansehen / bearbeiten':'Formular ausfüllen'}</button>${status!=='Unterschrieben'?`<button class="btn ghost" data-request-consent="${esc(p.id)}">Als angefordert markieren</button>`:''}</div>`;
  }

  function inject(){
    const id=Core.projectIdFromDetail(),p=project(id),detail=document.getElementById('projectDetail');if(!id||!p||!detail)return;
    let card=detail.querySelector(`.consent-card[data-consent-project="${CSS.escape(id)}"]`);
    if(!card){card=document.createElement('section');card.className='consent-card';card.dataset.consentProject=id;const pane=detail.querySelector('[data-project-pane="documents"]');if(pane)pane.prepend(card);else detail.appendChild(card);}
    card.innerHTML=cardHtml(p);
  }

  function openConsent(id){
    activeProjectId=id;const p=project(id),customer=Core.getCustomer(p?.customerId);if(!p)return;const form=document.getElementById('consentForm'),data=p.consentData||{},guardian=data.guardian||{};form.reset();
    document.getElementById('consentDialogTitle').textContent=`${customerName(p.customerId)} · ${p.title}`;document.getElementById('consentDialogMeta').textContent=`${p.placement||'—'}${p.size?' · '+p.size:''} · Artist: ${p.artist||'—'}`;
    form.elements.birthDate.value=data.birthDate||'';form.elements.phone.value=data.phone||customer?.phone||'';form.elements.address.value=data.address||'';form.elements.otherHealth.value=data.otherHealth||'';questions.forEach(key=>form.elements[key].value=data.health?.[key]||'');checks.forEach(key=>form.elements[key].checked=Boolean(data.consents?.[key]));
    form.elements.guardianName.value=guardian.name||'';form.elements.guardianRelation.value=guardian.relation||'';form.elements.guardianPhone.value=guardian.phone||'';form.elements.guardianIdChecked.checked=Boolean(guardian.idChecked);form.elements.guardianConsent.checked=Boolean(guardian.consent);
    clearSignature();clearGuardianSignature();updateMinorState();updateHealthAlert();
    document.getElementById('consentDialog').showModal();
    requestAnimationFrame(()=>{resizeCanvas();if(data.signature)loadSignature(data.signature);if(!document.getElementById('guardianConsentSection').hidden){resizeGuardianCanvas();if(guardian.signature)loadGuardianSignature(guardian.signature);}});
  }

  function saveConsent(event){
    event.preventDefault();const p=project(activeProjectId);if(!p)return;
    const form=event.currentTarget,age=ageFromBirthDate(form.elements.birthDate.value),minor=age!==null&&age>=0&&age<18;
    if(age===null||age<0){alert('Bitte ein gültiges Geburtsdatum eintragen.');form.elements.birthDate.focus();return;}
    if(!form.reportValidity())return;
    if(!signatureDirty){alert('Bitte die Unterschrift des Kunden erfassen, bevor das Formular gespeichert wird.');return;}
    if(minor&&!guardianSignatureDirty){alert('Bei einer minderjährigen Person ist zusätzlich die Unterschrift der sorgeberechtigten Person erforderlich.');return;}
    const health={},consents={};questions.forEach(key=>health[key]=form.elements[key].value);checks.forEach(key=>consents[key]=form.elements[key].checked);
    const guardian=minor?{
      name:String(form.elements.guardianName.value||'').trim(),
      relation:form.elements.guardianRelation.value||'',
      phone:String(form.elements.guardianPhone.value||'').trim(),
      idChecked:form.elements.guardianIdChecked.checked,
      consent:form.elements.guardianConsent.checked,
      signature:document.getElementById('guardianSignatureCanvas').toDataURL('image/png')
    }:null;
    p.consentData={birthDate:form.elements.birthDate.value,ageAtSigning:age,phone:form.elements.phone.value,address:form.elements.address.value,otherHealth:form.elements.otherHealth.value,health,healthFlags:healthYesFromForm(form),consents,guardian,signature:document.getElementById('signatureCanvas').toDataURL('image/png'),signedAt:new Date().toISOString()};
    p.consent='Unterschrieben';persist();document.getElementById('consentDialog').close();inject();document.dispatchEvent(new CustomEvent('tatnera:data-changed',{detail:{type:'consent',projectId:p.id}}));
  }

  document.addEventListener('click',event=>{const open=event.target.closest('[data-open-consent]');if(open){event.preventDefault();openConsent(open.dataset.openConsent);return;}const requested=event.target.closest('[data-request-consent]');if(requested){event.preventDefault();const p=project(requested.dataset.requestConsent);if(p){p.consent='Angefordert';persist();inject();document.dispatchEvent(new CustomEvent('tatnera:data-changed',{detail:{type:'consent',projectId:p.id}}));}}});
  installAssets();
  document.addEventListener('tatnera:project-opened',inject);
  document.addEventListener('tatnera:runtime-refresh',inject);
  inject();
})();