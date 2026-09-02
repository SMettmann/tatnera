/* TATNERA — consent & anamnesis v2, project-ID based */
(function(){
  'use strict';
  const Core=window.TatneraCore;
  let activeProjectId='',signatureDirty=false,drawing=false,ctx=null,resizeCanvas=()=>{};
  const esc=Core.esc;
  const questions=['bloodThinners','allergies','skinConditions','diabetes','immuneSystem','fainting','pregnancy','infection'];
  const checks=['truthful','risks','aftercare','privacy','photoConsent'];

  function project(id){return Core.getProject(id);}
  function statusClass(value){return value==='Unterschrieben'?'signed':value==='Angefordert'?'requested':value==='Vorhanden'?'existing':'missing';}
  function signedDate(p){return p?.consentData?.signedAt?new Intl.DateTimeFormat('de-DE',{dateStyle:'medium',timeStyle:'short'}).format(new Date(p.consentData.signedAt)):'—';}
  function healthQuestion(name,label){return `<div class="health-question"><label>${label}<select name="${name}" required><option value="">Bitte wählen …</option><option value="Nein">Nein</option><option value="Ja">Ja</option></select></label></div>`;}

  function installAssets(){
    if(!document.querySelector('link[href="consent.css"]')){const link=document.createElement('link');link.rel='stylesheet';link.href='consent.css';document.head.appendChild(link);}
    if(document.getElementById('consentDialog'))return;
    const dialog=document.createElement('dialog');dialog.id='consentDialog';dialog.className='dialog consent-dialog';
    dialog.innerHTML=`<form id="consentForm"><div class="consent-dialog-inner">
      <div class="dialog-head"><div><span class="eyebrow">Einwilligung & Anamnese</span><h2 id="consentDialogTitle">Kundenformular</h2><p class="muted" id="consentDialogMeta"></p></div><button type="button" class="close-btn" data-close-consent>×</button></div>
      <section class="consent-section"><h3>Persönliche Angaben</h3><p>Die Kundendaten werden aus der Kundenakte übernommen.</p><div class="form-grid"><label>Geburtsdatum<input type="date" name="birthDate" required></label><label>Telefon<input name="phone" autocomplete="tel"></label><label class="full">Anschrift<input name="address" placeholder="Straße, Hausnummer, PLZ, Ort"></label></div></section>
      <section class="consent-section"><h3>Gesundheitsangaben</h3><p>Die Angaben dienen der Dokumentation. Medizinische Entscheidungen trifft nicht die Software.</p><div class="health-grid">${healthQuestion('bloodThinners','Blutverdünnende Medikamente?')}${healthQuestion('allergies','Bekannte Allergien oder Unverträglichkeiten?')}${healthQuestion('skinConditions','Hauterkrankungen / akute Hautprobleme?')}${healthQuestion('diabetes','Diabetes?')}${healthQuestion('immuneSystem','Immunsystem-Erkrankung / Immunsuppression?')}${healthQuestion('fainting','Neigung zu Kreislaufproblemen / Ohnmacht?')}${healthQuestion('pregnancy','Schwangerschaft / Stillzeit (falls relevant)?')}${healthQuestion('infection','Aktuelle Infektion, Fieber oder starke Erkrankung?')}</div><label style="margin-top:12px">Weitere relevante Angaben<textarea name="otherHealth" rows="3"></textarea></label></section>
      <section class="consent-section"><h3>Einwilligung</h3><div class="consent-checks"><label class="consent-check"><input type="checkbox" name="truthful" required><span>Ich bestätige, dass meine Angaben vollständig und nach bestem Wissen richtig sind.</span></label><label class="consent-check"><input type="checkbox" name="risks" required><span>Ich wurde über typische Risiken und mögliche Reaktionen informiert und konnte Fragen stellen.</span></label><label class="consent-check"><input type="checkbox" name="aftercare" required><span>Ich habe Hinweise zur Vorbereitung und Nachsorge erhalten bzw. werde diese erhalten.</span></label><label class="consent-check"><input type="checkbox" name="privacy" required><span>Ich willige in die für Durchführung und Dokumentation erforderliche Datenspeicherung ein.</span></label><label class="consent-check"><input type="checkbox" name="photoConsent"><span>Optional: Fotos dürfen für Portfolio / Social Media verwendet werden.</span></label></div></section>
      <section class="consent-section"><h3>Unterschrift</h3><p>Mit Finger, Apple Pencil oder Maus unterschreiben.</p><div class="signature-wrap" id="signatureWrap"><canvas id="signatureCanvas"></canvas><div class="signature-tools"><span>Unterschrift des Kunden</span><button type="button" id="clearSignatureBtn">Neu zeichnen</button></div></div></section>
      <div class="consent-note">MVP: Die Daten liegen derzeit lokal im Browser. Für den Produktivbetrieb werden sichere Speicherung, PDF-Versionierung und Datenschutzprozesse angebunden.</div>
      <div class="dialog-actions"><button type="button" class="btn ghost" data-close-consent>Abbrechen</button><button type="submit" class="btn primary">Unterschreiben & speichern</button></div>
    </div></form>`;
    document.body.appendChild(dialog);
    dialog.querySelectorAll('[data-close-consent]').forEach(btn=>btn.addEventListener('click',()=>dialog.close()));
    document.getElementById('clearSignatureBtn').addEventListener('click',clearSignature);
    document.getElementById('consentForm').addEventListener('submit',saveConsent);
    setupCanvas();
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

  function clearSignature(){const canvas=document.getElementById('signatureCanvas');if(!canvas||!ctx)return;ctx.clearRect(0,0,canvas.width,canvas.height);signatureDirty=false;document.getElementById('signatureWrap')?.classList.remove('has-signature');}
  function loadSignature(src){if(!src)return;const canvas=document.getElementById('signatureCanvas'),img=new Image();img.onload=()=>{const r=canvas.getBoundingClientRect();ctx.drawImage(img,0,0,r.width,r.height);signatureDirty=true;document.getElementById('signatureWrap')?.classList.add('has-signature');};img.src=src;}

  function cardHtml(p){const status=p.consent||'Fehlt';return `<div class="consent-card-head"><div><span class="eyebrow">Dokumentation</span><h3>Einwilligung & Anamnese</h3><p>Gesundheitsangaben, Aufklärung, Datenschutz und Unterschrift sind eindeutig mit dieser Tattoo-Akte verknüpft.</p></div><span class="consent-status ${statusClass(status)}">${esc(status)}</span></div><div class="consent-summary"><div><span>Kunde</span><strong>${esc(customerName(p.customerId))}</strong></div><div><span>Projekt</span><strong>${esc(p.title)}</strong></div><div><span>Unterschrieben</span><strong>${esc(signedDate(p))}</strong></div></div>${p.consentData?.signature?`<div class="consent-signed-preview"><img src="${p.consentData.signature}" alt="Gespeicherte Unterschrift"><small>Mit dieser Tattoo-Akte gespeichert.</small></div>`:''}<div class="consent-actions"><button class="btn primary" data-open-consent="${esc(p.id)}">${p.consentData?'Formular ansehen / bearbeiten':'Formular ausfüllen'}</button>${status!=='Unterschrieben'?`<button class="btn ghost" data-request-consent="${esc(p.id)}">Als angefordert markieren</button>`:''}</div>`;}

  function inject(){
    const id=Core.projectIdFromDetail(),p=project(id),detail=document.getElementById('projectDetail');if(!id||!p||!detail)return;
    let card=detail.querySelector(`.consent-card[data-consent-project="${CSS.escape(id)}"]`);
    if(!card){card=document.createElement('section');card.className='consent-card';card.dataset.consentProject=id;const pane=detail.querySelector('[data-project-pane="documents"]');if(pane)pane.prepend(card);else detail.appendChild(card);}
    card.innerHTML=cardHtml(p);
  }

  function openConsent(id){
    activeProjectId=id;const p=project(id),customer=Core.getCustomer(p?.customerId);if(!p)return;const form=document.getElementById('consentForm'),data=p.consentData||{};form.reset();
    document.getElementById('consentDialogTitle').textContent=`${customerName(p.customerId)} · ${p.title}`;document.getElementById('consentDialogMeta').textContent=`${p.placement||'—'}${p.size?' · '+p.size:''} · Artist: ${p.artist||'—'}`;
    form.elements.birthDate.value=data.birthDate||'';form.elements.phone.value=data.phone||customer?.phone||'';form.elements.address.value=data.address||'';form.elements.otherHealth.value=data.otherHealth||'';questions.forEach(key=>form.elements[key].value=data.health?.[key]||'');checks.forEach(key=>form.elements[key].checked=Boolean(data.consents?.[key]));clearSignature();
    document.getElementById('consentDialog').showModal();requestAnimationFrame(()=>{resizeCanvas();if(data.signature)loadSignature(data.signature);});
  }

  function saveConsent(event){
    event.preventDefault();const p=project(activeProjectId);if(!p)return;if(!signatureDirty){alert('Bitte unterschreiben, bevor das Formular gespeichert wird.');return;}
    const form=event.currentTarget,health={},consents={};questions.forEach(key=>health[key]=form.elements[key].value);checks.forEach(key=>consents[key]=form.elements[key].checked);
    p.consentData={birthDate:form.elements.birthDate.value,phone:form.elements.phone.value,address:form.elements.address.value,otherHealth:form.elements.otherHealth.value,health,consents,signature:document.getElementById('signatureCanvas').toDataURL('image/png'),signedAt:new Date().toISOString()};p.consent='Unterschrieben';persist();document.getElementById('consentDialog').close();inject();document.dispatchEvent(new CustomEvent('tatnera:data-changed',{detail:{type:'consent',projectId:p.id}}));
  }

  document.addEventListener('click',event=>{const open=event.target.closest('[data-open-consent]');if(open){event.preventDefault();openConsent(open.dataset.openConsent);return;}const requested=event.target.closest('[data-request-consent]');if(requested){event.preventDefault();const p=project(requested.dataset.requestConsent);if(p){p.consent='Angefordert';persist();inject();document.dispatchEvent(new CustomEvent('tatnera:data-changed',{detail:{type:'consent',projectId:p.id}}));}}});
  installAssets();
  const detail=document.getElementById('projectDetail');if(detail)new MutationObserver(()=>queueMicrotask(inject)).observe(detail,{childList:true,subtree:true});
  document.addEventListener('tatnera:project-opened',inject);inject();
})();
