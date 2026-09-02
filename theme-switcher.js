/* TATNERA — appearance selector */
(function(){
  const KEY='tatnera_theme';
  const THEMES=new Set(['dark','light','pink']);

  function installCss(){
    if(!document.querySelector('link[href="theme-switcher.css"]')){
      const link=document.createElement('link');link.rel='stylesheet';link.href='theme-switcher.css';document.head.appendChild(link);
    }
    if(!document.querySelector('link[href="theme-light-fixes.css"]')){
      const fixes=document.createElement('link');fixes.rel='stylesheet';fixes.href='theme-light-fixes.css';document.head.appendChild(fixes);
    }
    if(!document.querySelector('link[href="calendar-light-theme.css"]')){
      const calendar=document.createElement('link');calendar.rel='stylesheet';calendar.href='calendar-light-theme.css';document.head.appendChild(calendar);
    }
  }

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
    return `<section class="theme-settings-panel" id="themeSettingsPanel">
      <div class="theme-settings-head"><div><span class="eyebrow">Erscheinungsbild</span><h3>Layout auswählen</h3><p>Wähle den Look, der am besten zum Studio passt. Die Auswahl bleibt auf diesem Gerät gespeichert.</p></div></div>
      <div class="theme-choice-grid">
        <button type="button" class="theme-choice" data-theme-choice="dark" aria-pressed="false">
          <div class="theme-choice-preview"><span class="theme-preview-sidebar"></span><span class="theme-preview-main"><i class="theme-preview-line"></i><i class="theme-preview-card"></i><i class="theme-preview-button"></i></span></div>
          <strong>Dunkel</strong><small>Dunkler TATNERA Look mit Lime-Akzenten.</small>
        </button>
        <button type="button" class="theme-choice" data-theme-choice="light" aria-pressed="false">
          <div class="theme-choice-preview"><span class="theme-preview-sidebar"></span><span class="theme-preview-main"><i class="theme-preview-line"></i><i class="theme-preview-card"></i><i class="theme-preview-button"></i></span></div>
          <strong>Hell · Standard</strong><small>Das Standard-Layout für TATNERA mit hellen Flächen und klaren Kontrasten.</small>
        </button>
        <button type="button" class="theme-choice" data-theme-choice="pink" aria-pressed="false">
          <div class="theme-choice-preview"><span class="theme-preview-sidebar"></span><span class="theme-preview-main"><i class="theme-preview-line"></i><i class="theme-preview-card"></i><i class="theme-preview-button"></i></span></div>
          <strong>Pink</strong><small>Dunkler Studio-Look mit pinken Buttons und Highlights.</small>
        </button>
      </div>
    </section>`;
  }

  function installSelector(){
    const settings=document.getElementById('settings');if(!settings)return;
    if(!document.getElementById('themeSettingsPanel')){
      const wrapper=document.createElement('div');wrapper.innerHTML=selectorHtml();
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

  function installInkDashboard(next){
    if(document.querySelector('script[src="ink-dashboard.js"]')){next?.();return;}
    const script=document.createElement('script');script.src='ink-dashboard.js';script.onload=()=>next?.();document.body.appendChild(script);
  }

  function installCursorSelector(){
    if(document.querySelector('script[src="cursor-switcher.js"]'))return;
    const script=document.createElement('script');script.src='cursor-switcher.js';document.body.appendChild(script);
  }

  function installDashboardUx(){
    if(document.querySelector('script[src="dashboard-ux.js"]'))return;
    const script=document.createElement('script');script.src='dashboard-ux.js';document.body.appendChild(script);
  }

  installCss();
  applyTheme(currentTheme(),false);
  installSelector();
  installInkDashboard(installDashboardUx);
  installCursorSelector();

  const settings=document.getElementById('settings');
  if(settings)new MutationObserver(()=>{
    if(!document.getElementById('themeSettingsPanel'))installSelector();
  }).observe(settings,{childList:true});
})();
