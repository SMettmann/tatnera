/* TATNERA — appearance selector */
(function(){
  'use strict';
  const KEY='tatnera_theme';
  const THEMES=new Set(['dark','light','pink']);

  function currentTheme(){
    const saved=localStorage.getItem(KEY);
    return THEMES.has(saved)?saved:'light';
  }

  function applyTheme(theme,save=true){
    const value=THEMES.has(theme)?theme:'light';
    document.documentElement.dataset.theme=value;
    if(save)localStorage.setItem(KEY,value);
    document.querySelectorAll('[data-theme-choice]').forEach(button=>{
      const active=button.dataset.themeChoice===value;
      button.classList.toggle('active',active);
      button.setAttribute('aria-pressed',active?'true':'false');
    });
  }

  function selectorHtml(){
    return `<section class="theme-settings-panel" id="themeSettingsPanel"><div class="theme-settings-head"><div><span class="eyebrow">Erscheinungsbild</span><h3>Layout auswählen</h3><p>Wähle den Look, der am besten zum Studio passt. Die Auswahl bleibt auf diesem Gerät gespeichert.</p></div></div><div class="theme-choice-grid"><button type="button" class="theme-choice" data-theme-choice="dark" aria-pressed="false"><div class="theme-choice-preview"><span class="theme-preview-sidebar"></span><span class="theme-preview-main"><i class="theme-preview-line"></i><i class="theme-preview-card"></i><i class="theme-preview-button"></i></span></div><strong>Dunkel</strong><small>Dunkler TATNERA Studio-Look mit Messing- und Bronze-Akzenten.</small></button><button type="button" class="theme-choice" data-theme-choice="light" aria-pressed="false"><div class="theme-choice-preview"><span class="theme-preview-sidebar"></span><span class="theme-preview-main"><i class="theme-preview-line"></i><i class="theme-preview-card"></i><i class="theme-preview-button"></i></span></div><strong>Hell · Standard</strong><small>Das Standard-Layout für TATNERA mit hellen Flächen und klaren Kontrasten.</small></button><button type="button" class="theme-choice" data-theme-choice="pink" aria-pressed="false"><div class="theme-choice-preview"><span class="theme-preview-sidebar"></span><span class="theme-preview-main"><i class="theme-preview-line"></i><i class="theme-preview-card"></i><i class="theme-preview-button"></i></span></div><strong>Pink</strong><small>Dunkler Studio-Look mit pinken Buttons und Highlights.</small></button></div></section>`;
  }

  function installSelector(){
    const settings=document.getElementById('settings');
    if(!settings)return;
    if(!document.getElementById('themeSettingsPanel')){
      const wrapper=document.createElement('div');
      wrapper.innerHTML=selectorHtml();
      const panel=wrapper.firstElementChild;
      const ink=settings.querySelector('.ink-settings');
      if(ink)settings.insertBefore(panel,ink);else settings.prepend(panel);
    }
    settings.querySelectorAll('[data-theme-choice]').forEach(button=>{
      if(button.dataset.themeBound==='1')return;
      button.dataset.themeBound='1';
      button.addEventListener('click',()=>applyTheme(button.dataset.themeChoice));
    });
    applyTheme(currentTheme(),false);
  }

  function loadOptionalScript(src){
    if(document.querySelector(`script[src="${src}"]`))return;
    const script=document.createElement('script');
    script.src=src;
    script.async=true;
    document.body.appendChild(script);
  }

  applyTheme(currentTheme(),false);
  installSelector();
  loadOptionalScript('ink-dashboard.js');
  loadOptionalScript('cursor-switcher.js');

  document.addEventListener('tatnera:runtime-refresh',installSelector);
  document.addEventListener('tatnera:auth-ready',installSelector);
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-view="settings"],[data-view-target="settings"]'))setTimeout(installSelector,0);
  });
})();