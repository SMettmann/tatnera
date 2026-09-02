/* TATNERA — cursor selector */
(function(){
  const KEY='tatnera_cursor';
  const CURSORS=new Set(['needle','normal','hand']);

  function installCss(){
    if(document.querySelector('link[href="cursor-switcher.css"]'))return;
    const link=document.createElement('link');link.rel='stylesheet';link.href='cursor-switcher.css';document.head.appendChild(link);
  }

  function currentCursor(){
    const saved=localStorage.getItem(KEY);
    return CURSORS.has(saved)?saved:'needle';
  }

  function applyCursor(cursor,save=true){
    const value=CURSORS.has(cursor)?cursor:'needle';
    document.documentElement.dataset.cursor=value;
    if(save)localStorage.setItem(KEY,value);
    document.querySelectorAll('[data-cursor-choice]').forEach(button=>{
      const active=button.dataset.cursorChoice===value;
      button.classList.toggle('active',active);
      button.setAttribute('aria-pressed',active?'true':'false');
    });
  }

  function selectorHtml(){
    return `<section class="theme-settings-panel cursor-settings-panel" id="cursorSettingsPanel">
      <div class="theme-settings-head"><div><span class="eyebrow">Bedienung</span><h3>Cursor auswählen</h3><p>Wähle deinen Mauszeiger. Die Auswahl bleibt auch über Buttons, Karten und Menüs aktiv.</p></div></div>
      <div class="cursor-choice-grid">
        <button type="button" class="theme-choice cursor-choice" data-cursor-choice="needle" aria-pressed="false">
          <div class="cursor-choice-preview"><img src="tattoo-cursor.svg" alt="Tattoo-Nadel Cursor"></div>
          <strong>Tattoo-Nadel</strong><small>Der charakteristische TATNERA Cursor.</small>
        </button>
        <button type="button" class="theme-choice cursor-choice" data-cursor-choice="normal" aria-pressed="false">
          <div class="cursor-choice-preview"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 6v31l8-8 6 13 6-3-6-12h12L10 6Z" fill="#fff" stroke="#111318" stroke-width="3" stroke-linejoin="round"/></svg></div>
          <strong>Normaler Mauszeiger</strong><small>Klassischer Pfeil ohne Wechsel über Buttons.</small>
        </button>
        <button type="button" class="theme-choice cursor-choice" data-cursor-choice="hand" aria-pressed="false">
          <div class="cursor-choice-preview"><img src="rock-hand-cursor.svg" alt="Handzeichen Cursor"></div>
          <strong>Handzeichen</strong><small>Rock-Hand im Stil deiner Vorlage.</small>
        </button>
      </div>
      <div class="cursor-settings-note">Nur in Textfeldern bleibt der normale Text-Cursor, damit Eingaben eindeutig bleiben.</div>
    </section>`;
  }

  function installSelector(){
    const settings=document.getElementById('settings');if(!settings)return;
    if(!document.getElementById('cursorSettingsPanel')){
      const wrapper=document.createElement('div');wrapper.innerHTML=selectorHtml();
      const panel=wrapper.firstElementChild;
      const themePanel=document.getElementById('themeSettingsPanel');
      const ink=settings.querySelector('.ink-settings');
      if(themePanel)themePanel.insertAdjacentElement('afterend',panel);
      else if(ink)settings.insertBefore(panel,ink);
      else settings.prepend(panel);
    }
    settings.querySelectorAll('[data-cursor-choice]').forEach(button=>{
      if(button.dataset.cursorBound==='1')return;
      button.dataset.cursorBound='1';
      button.addEventListener('click',()=>applyCursor(button.dataset.cursorChoice));
    });
    applyCursor(currentCursor(),false);
  }

  installCss();
  applyCursor(currentCursor(),false);
  installSelector();

  const settings=document.getElementById('settings');
  if(settings)new MutationObserver(()=>{
    if(!document.getElementById('cursorSettingsPanel'))installSelector();
  }).observe(settings,{childList:true});
})();
