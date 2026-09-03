/* TATNERA — studio profile settings
   Central studio identity for sidebar and future documents/invoices. */
(function(){
  'use strict';

  const STORAGE_KEY='tatnera_studio_profile_v1';
  const DEFAULT_PROFILE={name:''};

  function load(){
    try{
      const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
      return parsed&&typeof parsed==='object'?{...DEFAULT_PROFILE,...parsed}:{...DEFAULT_PROFILE};
    }catch(_error){return {...DEFAULT_PROFILE};}
  }

  let profile=load();

  function cleanName(value){return String(value||'').trim().replace(/\s+/g,' ');}
  function initials(name){
    const parts=cleanName(name).split(' ').filter(Boolean);
    if(!parts.length)return 'ST';
    if(parts.length===1)return parts[0].slice(0,2).toUpperCase();
    return `${parts[0][0]||''}${parts[parts.length-1][0]||''}`.toUpperCase();
  }
  function displayName(){return cleanName(profile.name)||'Studio einrichten';}

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
      .studio-settings-form{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:end;margin-top:15px}
      .studio-settings-form label{display:flex;flex-direction:column;gap:7px;font-size:11px;font-weight:700;color:var(--muted)}
      .studio-settings-form input{width:100%;min-height:42px;border:1px solid var(--line);border-radius:10px;background:var(--panel-2);color:var(--text);padding:0 12px;font:inherit;font-size:13px}
      .studio-settings-form input:focus{outline:2px solid rgba(216,255,99,.35);outline-offset:1px;border-color:#899c51}
      .studio-settings-help{margin:9px 0 0;font-size:10px;color:var(--muted);line-height:1.5}
      @media(max-width:720px){.studio-settings-form{grid-template-columns:1fr}.studio-settings-form .btn{width:100%}}
    `;document.head.appendChild(style);
  }

  function renderSettings(){
    const settings=document.getElementById('settings');if(!settings)return;
    document.getElementById('studioSettingsPanel')?.remove();
    const panel=document.createElement('section');panel.id='studioSettingsPanel';panel.className='theme-settings-panel studio-settings-panel';
    panel.innerHTML=`
      <div class="theme-settings-head"><div><span class="eyebrow">Studio</span><h3>Studio-Profil</h3><p>Diese Angaben gehören zu deinem Studio und werden später auch für Dokumente und Rechnungen verwendet.</p></div></div>
      <form class="studio-settings-form" id="studioSettingsForm">
        <label>Studio-Name<input name="studioName" maxlength="80" autocomplete="organization" placeholder="z. B. Ink District" value="${escapeHtml(profile.name)}"></label>
        <button type="submit" class="btn primary">Studio speichern</button>
      </form>
      <p class="studio-settings-help">Der Name erscheint direkt unten in der Seitenleiste. Es wird kein Demo-Studio mehr fest im Code angezeigt.</p>`;
    const firstPanel=settings.querySelector('.theme-settings-panel,.placeholder-page');
    if(firstPanel?.classList.contains('placeholder-page'))firstPanel.insertAdjacentElement('afterend',panel);else settings.prepend(panel);
    panel.querySelector('#studioSettingsForm')?.addEventListener('submit',save);
  }

  function escapeHtml(value){
    return String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  }

  function save(event){
    event.preventDefault();
    const form=event.currentTarget,name=cleanName(form.elements.studioName.value);
    if(!name){form.elements.studioName.setCustomValidity('Bitte einen Studio-Namen eingeben.');form.elements.studioName.reportValidity();return;}
    form.elements.studioName.setCustomValidity('');
    profile={...profile,name};
    localStorage.setItem(STORAGE_KEY,JSON.stringify(profile));
    applySidebar();renderSettings();
    document.dispatchEvent(new CustomEvent('tatnera:studio-changed',{detail:{profile:{...profile}}}));
  }

  installStyle();
  applySidebar();
  renderSettings();
  document.addEventListener('tatnera:runtime-refresh',()=>{applySidebar();renderSettings();});
  window.TatneraStudio={getProfile:()=>({...profile}),getName:()=>cleanName(profile.name),setName:name=>{profile={...profile,name:cleanName(name)};localStorage.setItem(STORAGE_KEY,JSON.stringify(profile));applySidebar();renderSettings();}};
})();