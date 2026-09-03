/* TATNERA — studio profile settings
   Central studio identity for sidebar, invoices and future documents. */
(function(){
  'use strict';

  const STORAGE_KEY='tatnera_studio_profile_v1';
  const DEFAULT_PROFILE={
    name:'',businessName:'',ownerName:'',street:'',zip:'',city:'',country:'Deutschland',
    email:'',phone:'',taxMode:'',vatRate:19,taxNumber:'',vatId:'',iban:''
  };

  function load(){
    try{
      const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
      return parsed&&typeof parsed==='object'?{...DEFAULT_PROFILE,...parsed}:{...DEFAULT_PROFILE};
    }catch(_error){return {...DEFAULT_PROFILE};}
  }

  let profile=load();

  function clean(value){return String(value||'').trim();}
  function cleanName(value){return clean(value).replace(/\s+/g,' ');}
  function initials(name){
    const parts=cleanName(name).split(' ').filter(Boolean);
    if(!parts.length)return 'ST';
    if(parts.length===1)return parts[0].slice(0,2).toUpperCase();
    return `${parts[0][0]||''}${parts[parts.length-1][0]||''}`.toUpperCase();
  }
  function displayName(){return cleanName(profile.name)||'Studio einrichten';}
  function invoiceName(){return cleanName(profile.businessName)||cleanName(profile.name);}

  function applySidebar(){
    const card=document.querySelector('.studio-card');if(!card)return;
    card.dataset.studioProfile='true';
    const avatar=card.querySelector('.avatar'),name=card.querySelector('strong'),meta=card.querySelector('span');
    if(avatar)avatar.textContent=initials(profile.name);
    if(name)name.textContent=displayName();
    if(meta)meta.textContent=profile.name?'Studio':'Name in Einstellungen festlegen';
  }

  function installStyle(){
    if(document.getElementById('studioSettingsStyle'))return;
    const style=document.createElement('style');style.id='studioSettingsStyle';style.textContent=`
      .studio-settings-panel{margin-top:18px}
      .studio-settings-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:15px}
      .studio-settings-form label{display:flex;flex-direction:column;gap:7px;font-size:11px;font-weight:700;color:var(--muted)}
      .studio-settings-form label.full{grid-column:1/-1}.studio-settings-form label.third{grid-column:auto}
      .studio-settings-form input,.studio-settings-form select{width:100%;min-height:42px;border:1px solid var(--line);border-radius:10px;background:var(--panel-2);color:var(--text);padding:0 12px;font:inherit;font-size:13px}
      .studio-settings-form input:focus,.studio-settings-form select:focus{outline:2px solid rgba(216,255,99,.35);outline-offset:1px;border-color:#899c51}
      .studio-settings-section{grid-column:1/-1;padding-top:4px;margin-top:5px;border-top:1px solid var(--line)}
      .studio-settings-section h4{margin:12px 0 2px;font-size:13px}.studio-settings-section p{margin:0;color:var(--muted);font-size:10px;line-height:1.5}
      .studio-settings-actions{grid-column:1/-1;display:flex;justify-content:flex-end;margin-top:4px}
      .studio-settings-help{margin:9px 0 0;font-size:10px;color:var(--muted);line-height:1.5}
      @media(max-width:720px){.studio-settings-form{grid-template-columns:1fr}.studio-settings-form label.full,.studio-settings-section,.studio-settings-actions{grid-column:1}.studio-settings-actions .btn{width:100%}}
    `;document.head.appendChild(style);
  }

  function renderSettings(){
    const settings=document.getElementById('settings');if(!settings)return;
    document.getElementById('studioSettingsPanel')?.remove();
    const panel=document.createElement('section');panel.id='studioSettingsPanel';panel.className='theme-settings-panel studio-settings-panel';
    panel.innerHTML=`
      <div class="theme-settings-head"><div><span class="eyebrow">Studio</span><h3>Studio-Profil</h3><p>Zentrale Studio- und Rechnungsdaten. Diese Angaben werden später auch für weitere Dokumente verwendet.</p></div></div>
      <form class="studio-settings-form" id="studioSettingsForm">
        <label class="full">Studio-Name<input name="studioName" maxlength="80" autocomplete="organization" placeholder="z. B. Ink District" value="${escapeHtml(profile.name)}"></label>

        <div class="studio-settings-section"><h4>Rechnungssteller</h4><p>Diese Angaben erscheinen auf Rechnungen. Firmen-/Inhabername kann vom sichtbaren Studio-Namen abweichen.</p></div>
        <label>Firmen-/Inhabername<input name="businessName" maxlength="100" placeholder="z. B. Max Mustermann" value="${escapeHtml(profile.businessName)}"></label>
        <label>Ansprechpartner / Inhaber<input name="ownerName" maxlength="100" value="${escapeHtml(profile.ownerName)}"></label>
        <label class="full">Straße & Hausnummer<input name="street" autocomplete="street-address" value="${escapeHtml(profile.street)}"></label>
        <label>PLZ<input name="zip" inputmode="numeric" autocomplete="postal-code" value="${escapeHtml(profile.zip)}"></label>
        <label>Ort<input name="city" autocomplete="address-level2" value="${escapeHtml(profile.city)}"></label>
        <label>Land<input name="country" autocomplete="country-name" value="${escapeHtml(profile.country)}"></label>
        <label>E-Mail<input type="email" name="email" autocomplete="email" value="${escapeHtml(profile.email)}"></label>
        <label>Telefon<input name="phone" autocomplete="tel" value="${escapeHtml(profile.phone)}"></label>
        <label>IBAN<input name="iban" autocomplete="off" placeholder="optional" value="${escapeHtml(profile.iban)}"></label>

        <div class="studio-settings-section"><h4>Steuern</h4><p>TATNERA nutzt diese Auswahl nur zur Rechnungsdarstellung. Sie ersetzt keine steuerliche Beratung.</p></div>
        <label>Steuerliche Behandlung<select name="taxMode"><option value="" ${!profile.taxMode?'selected':''}>Bitte wählen …</option><option value="small" ${profile.taxMode==='small'?'selected':''}>Kleinunternehmer (§ 19 UStG)</option><option value="vat" ${profile.taxMode==='vat'?'selected':''}>Umsatzsteuerpflichtig</option></select></label>
        <label>Umsatzsteuersatz (%)<input name="vatRate" type="number" min="0" max="100" step="0.01" value="${escapeHtml(profile.vatRate)}" ${profile.taxMode==='small'?'disabled':''}></label>
        <label>Steuernummer<input name="taxNumber" value="${escapeHtml(profile.taxNumber)}"></label>
        <label>USt-IdNr.<input name="vatId" placeholder="DE…" value="${escapeHtml(profile.vatId)}"></label>

        <div class="studio-settings-actions"><button type="submit" class="btn primary">Studio speichern</button></div>
      </form>
      <p class="studio-settings-help">Für eine Rechnung verlangt TATNERA vollständige Rechnungsstellerdaten. Bereits ausgestellte Rechnungen speichern einen unveränderlichen Snapshot dieser Angaben.</p>`;
    const firstPanel=settings.querySelector('.theme-settings-panel,.placeholder-page');
    if(firstPanel?.classList.contains('placeholder-page'))firstPanel.insertAdjacentElement('afterend',panel);else settings.prepend(panel);
    const form=panel.querySelector('#studioSettingsForm');form?.addEventListener('submit',save);
    form?.elements.taxMode?.addEventListener('change',()=>{form.elements.vatRate.disabled=form.elements.taxMode.value==='small';});
  }

  function escapeHtml(value){
    return String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  }

  function save(event){
    event.preventDefault();
    const form=event.currentTarget,name=cleanName(form.elements.studioName.value);
    if(!name){form.elements.studioName.setCustomValidity('Bitte einen Studio-Namen eingeben.');form.elements.studioName.reportValidity();return;}
    form.elements.studioName.setCustomValidity('');
    profile={
      ...profile,
      name,
      businessName:cleanName(form.elements.businessName.value),
      ownerName:cleanName(form.elements.ownerName.value),
      street:cleanName(form.elements.street.value),
      zip:clean(form.elements.zip.value),
      city:cleanName(form.elements.city.value),
      country:cleanName(form.elements.country.value)||'Deutschland',
      email:clean(form.elements.email.value),
      phone:clean(form.elements.phone.value),
      iban:clean(form.elements.iban.value).replace(/\s+/g,' ').toUpperCase(),
      taxMode:form.elements.taxMode.value||'',
      vatRate:Math.max(0,Number(form.elements.vatRate.value)||19),
      taxNumber:clean(form.elements.taxNumber.value),
      vatId:clean(form.elements.vatId.value).toUpperCase()
    };
    localStorage.setItem(STORAGE_KEY,JSON.stringify(profile));
    applySidebar();renderSettings();
    document.dispatchEvent(new CustomEvent('tatnera:studio-changed',{detail:{profile:{...profile}}}));
  }

  function setProfile(next){
    profile={...profile,...next};
    localStorage.setItem(STORAGE_KEY,JSON.stringify(profile));
    applySidebar();renderSettings();
    document.dispatchEvent(new CustomEvent('tatnera:studio-changed',{detail:{profile:{...profile}}}));
  }

  installStyle();
  applySidebar();
  renderSettings();
  document.addEventListener('tatnera:runtime-refresh',()=>{applySidebar();renderSettings();});
  window.TatneraStudio={
    getProfile:()=>({...profile}),
    getName:()=>cleanName(profile.name),
    getInvoiceName:invoiceName,
    setName:name=>setProfile({name:cleanName(name)}),
    setProfile
  };
})();