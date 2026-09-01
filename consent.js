/* TATNERA — Einwilligung & Anamnese
   MVP: Daten werden lokal im Browser in der jeweiligen Tattoo-Akte gespeichert. */
(function(){
  let activeProjectId='';
  let signatureDirty=false;
  let drawing=false;
  let ctx=null;

  function esc(value){return String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));}
  function projectById(id){return state.projects.find(p=>p.id===id);}
  function customerById(id){return state.customers.find(c=>c.id===id);}
  function statusClass(status){
    if(status==='Unterschrieben') return 'signed';
    if(status==='Angefordert') return 'requested';
    if(status==='Vorhanden') return 'existing';
    return 'missing';
  }
  function statusText(p){return p?.consent||'Fehlt';}
  function signedDate(p){
    if(!p?.consentData?.signedAt) return '—';
    return new Intl.DateTimeFormat('de-DE',{dateStyle:'medium',timeStyle:'short'}).format(new Date(p.consentData.signedAt));
  }

  function installConsentAssets(){
    if(!document.querySelector('link[href="consent.css"]')){
      const link=document.createElement('link');link.rel='stylesheet';link.href='consent.css';document.head.appendChild(link);
    }
    if(document.getElementById('consentDialog')) return;
    const dialog=document.createElement('dialog');
    dialog.id='consentDialog';dialog.className='dialog consent-dialog';
    dialog.innerHTML=`<form id="consentForm">
      <div class="consent-dialog-inner">
        <div class="dialog-head"><div><span class="eyebrow">Einwilligung & Anamnese</span><h2 id="consentDialogTitle">Kundenformular</h2><p class="muted" id="consentDialogMeta"></p></div><button type="button" class="close-btn" id="closeConsentDialog">×</button></div>
        <section class="consent-section">
          <h3>Persönliche Angaben</h3><p>Die Kundendaten werden aus der Kundenakte übernommen. Ergänzt werden nur die Angaben, die für dieses Formular benötigt werden.</p>
          <div class="form-grid">
            <label>Geburtsdatum<input type="date" name="birthDate" required></label>
            <label>Telefon<input name="phone" autocomplete="tel"></label>
            <label class="full">Anschrift<input name="address" placeholder="Straße, Hausnummer, PLZ, Ort"></label>
          </div>
        </section>
        <section class="consent-section">
          <h3>Gesundheitsangaben</h3><p>Die Angaben helfen dem Studio, mögliche Risiken vor dem Termin zu erkennen. Bei medizinischen Unsicherheiten entscheidet nicht die Software, sondern es sollte fachlicher Rat eingeholt werden.</p>
          <div class="health-grid">
            ${healthQuestion('bloodThinners','Blutverdünnende Medikamente?')}
            ${healthQuestion('allergies','Bekannte Allergien oder Unverträglichkeiten?')}
            ${healthQuestion('skinConditions','Hauterkrankungen / akute Hautprobleme?')}
            ${healthQuestion('diabetes','Diabetes?')}
            ${healthQuestion('immuneSystem','Immunsystem-Erkrankung / Immunsuppression?')}
            ${healthQuestion('fainting','Neigung zu Kreislaufproblemen / Ohnmacht?')}
            ${healthQuestion('pregnancy','Schwangerschaft / Stillzeit (falls relevant)?')}
            ${healthQuestion('infection','Aktuelle Infektion, Fieber oder starke Erkrankung?')}
          </div>
          <label style="margin-top:12px">Weitere relevante Angaben<textarea name="otherHealth" rows="3" placeholder="Weitere Medikamente, Erkrankungen, Hinweise …"></textarea></label>
        </section>
        <section class="consent-section">
          <h3>Einwilligung</h3><p>Diese Punkte werden für das konkrete Tattoo-Projekt dokumentiert.</p>
          <div class="consent-checks">
            <label class="consent-check"><input type="checkbox" name="truthful" required><span>Ich bestätige, dass meine Angaben vollständig und nach bestem Wissen richtig sind.</span></label>
            <label class="consent-check"><input type="checkbox" name="risks" required><span>Ich wurde über typische Risiken und mögliche Reaktionen im Zusammenhang mit dem Tätowieren informiert und hatte Gelegenheit, Fragen zu stellen.</span></label>
            <label class="consent-check"><input type="checkbox" name="aftercare" required><span>Ich habe Hinweise zur Vorbereitung und Nachsorge erhalten bzw. werde diese vom Studio erhalten und werde sie beachten.</span></label>
            <label class="consent-check"><input type="checkbox" name="privacy" required><span>Ich willige ein, dass die für Durchführung und Dokumentation erforderlichen Daten in der Studioakte gespeichert werden.</span></label>
            <label class="consent-check"><input type="checkbox" name="photoConsent"><span>Optional: Ich erlaube dem Studio, Fotos des fertigen Tattoos für Portfolio / Social Media zu verwenden. Diese Einwilligung kann separat widerrufen werden.</span></label>
          </div>
        </section>
        <section class="consent-section">
          <h3>Unterschrift</h3><p>Direkt mit Finger, Apple Pencil oder Maus unterschreiben.</p>
          <div class="signature-wrap" id="signatureWrap"><canvas id="signatureCanvas"></canvas><div class="signature-tools"><span>Unterschrift des Kunden</span><button type="button" id="clearSignatureBtn">Neu zeichnen</button></div></div>
          <div class="consent-signed-preview" id="existingSignaturePreview" hidden></div>
        </section>
        <div class="consent-note">MVP-Hinweis: Dieses Formular wird derzeit ausschließlich lokal in diesem Browser gespeichert. Für den späteren Produktivbetrieb bauen wir revisionssichere Speicherung, PDF-Erzeugung, Datenschutz-/Löschkonzept und den Versand eines Formularlinks ein.</div>
        <div class="dialog-actions"><button type="button" class="btn ghost" id="cancelConsentBtn">Abbrechen</button><button type="submit" class="btn primary">Unterschreiben & speichern</button></div>
      </div>
    </form>`;
    document.body.appendChild(dialog);
    document.getElementById('closeConsentDialog').addEventListener('click',()=>dialog.close());
    document.getElementById('cancelConsentBtn').addEventListener('click',()=>dialog.close());
    document.getElementById('clearSignatureBtn').addEventListener('click',clearSignature);
    document.getElementById('consentForm').addEventListener('submit',saveConsent);
    setupSignatureCanvas();
  }

  function healthQuestion(name,label){
    return `<div class="health-question"><label>${label}<select name="${name}" required><option value="">Bitte wählen …</option><option value="Nein">Nein</option><option value="Ja">Ja</option></select></label></div>`;
  }

  function setupSignatureCanvas(){
    const canvas=document.getElementById('signatureCanvas');
    ctx=canvas.getContext('2d');
    const resize=()=>{
      const ratio=Math.max(window.devicePixelRatio||1,1);
      const rect=canvas.getBoundingClientRect();
      const previous=signatureDirty?canvas.toDataURL():null;
      canvas.width=Math.max(1,Math.round(rect.width*ratio));
      canvas.height=Math.max(1,Math.round(rect.height*ratio));
      ctx=canvas.getContext('2d');
      ctx.scale(ratio,ratio);ctx.lineWidth=2.2;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#111';
      if(previous) loadSignature(previous);
    };
    window.addEventListener('resize',()=>{if(document.getElementById('consentDialog')?.open)resize();});
    canvas.addEventListener('pointerdown',e=>{drawing=true;signatureDirty=true;document.getElementById('signatureWrap').classList.add('has-signature');canvas.setPointerCapture(e.pointerId);const p=pointerPos(e,canvas);ctx.beginPath();ctx.moveTo(p.x,p.y);});
    canvas.addEventListener('pointermove',e=>{if(!drawing)return;const p=pointerPos(e,canvas);ctx.lineTo(p.x,p.y);ctx.stroke();});
    const end=()=>{drawing=false;};canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);canvas.addEventListener('pointerleave',end);
    dialogResize=resize;
  }
  let dialogResize=()=>{};
  function pointerPos(e,canvas){const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}
  function clearSignature(){
    const canvas=document.getElementById('signatureCanvas');ctx.clearRect(0,0,canvas.width,canvas.height);signatureDirty=false;document.getElementById('signatureWrap').classList.remove('has-signature');
  }
  function loadSignature(dataUrl){
    if(!dataUrl)return;const canvas=document.getElementById('signatureCanvas');const img=new Image();img.onload=()=>{const r=canvas.getBoundingClientRect();ctx.drawImage(img,0,0,r.width,r.height);signatureDirty=true;document.getElementById('signatureWrap').classList.add('has-signature');};img.src=dataUrl;
  }

  function injectConsentCard(){
    const detail=document.getElementById('projectDetail');
    if(!detail||!detail.offsetParent||detail.querySelector('.consent-card'))return;
    const title=detail.querySelector('h2')?.textContent;
    const p=state.projects.find(x=>x.title===title);
    if(!p)return;
    const status=statusText(p);
    const card=document.createElement('section');card.className='consent-card';card.dataset.consentProject=p.id;
    card.innerHTML=`<div class="consent-card-head"><div><span class="eyebrow">Dokumentation</span><h3>Einwilligung & Anamnese</h3><p>Gesundheitsangaben, Aufklärung, Datenschutz und Kundenunterschrift direkt mit dieser Tattoo-Akte verknüpfen.</p></div><span class="consent-status ${statusClass(status)}">${esc(status)}</span></div>
      <div class="consent-summary"><div><span>Kunde</span><strong>${esc(customerName(p.customerId))}</strong></div><div><span>Projekt</span><strong>${esc(p.title)}</strong></div><div><span>Unterschrieben</span><strong>${esc(signedDate(p))}</strong></div></div>
      ${p.consentData?.signature?`<div class="consent-signed-preview"><img src="${p.consentData.signature}" alt="Gespeicherte Unterschrift"><small>Unterschrift ist mit dieser Tattoo-Akte gespeichert.</small></div>`:''}
      <div class="consent-actions"><button class="btn primary" data-open-consent="${p.id}">${p.consentData?'Formular ansehen / bearbeiten':'Formular ausfüllen'}</button>${status!=='Unterschrieben'?`<button class="btn ghost" data-request-consent="${p.id}">Als angefordert markieren</button>`:''}</div>`;
    const hero=detail.querySelector('.detail-hero');if(hero)hero.insertAdjacentElement('afterend',card);else detail.prepend(card);
    card.querySelector('[data-open-consent]')?.addEventListener('click',()=>openConsent(p.id));
    card.querySelector('[data-request-consent]')?.addEventListener('click',()=>markRequested(p.id));
  }

  function markRequested(projectId){
    const p=projectById(projectId);if(!p)return;p.consent='Angefordert';persist();openProject(projectId);
  }

  function openConsent(projectId){
    installConsentAssets();activeProjectId=projectId;const p=projectById(projectId);const c=customerById(p.customerId);const data=p.consentData||{};const form=document.getElementById('consentForm');form.reset();
    document.getElementById('consentDialogTitle').textContent=`${customerName(p.customerId)} · ${p.title}`;
    document.getElementById('consentDialogMeta').textContent=`${p.placement}${p.size?' · '+p.size:''} · Artist: ${p.artist||'—'}`;
    form.elements.birthDate.value=data.birthDate||'';form.elements.phone.value=data.phone||c?.phone||'';form.elements.address.value=data.address||'';form.elements.otherHealth.value=data.otherHealth||'';
    ['bloodThinners','allergies','skinConditions','diabetes','immuneSystem','fainting','pregnancy','infection'].forEach(k=>form.elements[k].value=data.health?.[k]||'');
    ['truthful','risks','aftercare','privacy','photoConsent'].forEach(k=>form.elements[k].checked=Boolean(data.consents?.[k]));
    clearSignature();document.getElementById('existingSignaturePreview').hidden=true;
    document.getElementById('consentDialog').showModal();requestAnimationFrame(()=>{dialogResize();if(data.signature)loadSignature(data.signature);});
  }

  function saveConsent(e){
    e.preventDefault();const p=projectById(activeProjectId);if(!p)return;
    if(!signatureDirty){alert('Bitte unterschreiben, bevor das Formular gespeichert wird.');return;}
    const form=e.currentTarget;const health={};['bloodThinners','allergies','skinConditions','diabetes','immuneSystem','fainting','pregnancy','infection'].forEach(k=>health[k]=form.elements[k].value);
    const consents={};['truthful','risks','aftercare','privacy','photoConsent'].forEach(k=>consents[k]=form.elements[k].checked);
    p.consentData={birthDate:form.elements.birthDate.value,phone:form.elements.phone.value,address:form.elements.address.value,otherHealth:form.elements.otherHealth.value,health,consents,signature:document.getElementById('signatureCanvas').toDataURL('image/png'),signedAt:new Date().toISOString()};
    p.consent='Unterschrieben';persist();document.getElementById('consentDialog').close();openProject(p.id);refreshConsentDashboard();
  }

  function refreshConsentDashboard(){
    const missing=state.projects.filter(p=>!['Unterschrieben','Vorhanden'].includes(p.consent)).length;
    const cards=[...document.querySelectorAll('.metric-card')];const card=cards.find(x=>x.textContent.includes('Einwilligungen fehlen'));if(card){const strong=card.querySelector('strong');if(strong)strong.textContent=String(missing);}
  }

  const observer=new MutationObserver(()=>{injectConsentCard();refreshConsentDashboard();});
  observer.observe(document.getElementById('projectDetail'),{childList:true,subtree:true});
  installConsentAssets();refreshConsentDashboard();
})();
