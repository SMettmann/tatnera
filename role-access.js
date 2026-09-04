/* TATNERA — role-aware UI guard
   Keeps visible UI aligned with the database permissions.
   Database RLS remains the actual security boundary. */
(function(){
  'use strict';
  if(window.__tatneraRoleAccessInstalled)return;
  window.__tatneraRoleAccessInstalled=true;

  const ROLE_LABELS={
    owner:'Inhaber',
    admin:'Admin',
    artist:'Tätowierer',
    piercer:'Piercer',
    artist_piercer:'Tätowierer & Piercer',
    staff:'Mitarbeiter'
  };
  const MANAGER_ROLES=new Set(['owner','admin']);
  const MANAGER_ONLY_SELECTORS=[
    '[data-view="invoices"]',
    '[data-view-target="invoices"]',
    '[data-open-record-archive]',
    '[data-delete-customer]',
    '[data-delete-project]',
    '[data-purge-archive-customer]',
    '[data-purge-archive-project]',
    '[data-restore-customer]',
    '[data-restore-project]'
  ];

  let role='';
  let applying=false;
  let observer=null;

  function membership(){return window.TatneraAuth?.membership?.()||null;}
  function currentRole(){return String(membership()?.role||role||'');}
  function isManager(){return MANAGER_ROLES.has(currentRole());}
  function roleLabel(value=currentRole()){return ROLE_LABELS[value]||value||'Mitarbeiter';}

  function installStyle(){
    if(document.getElementById('tatneraRoleAccessStyle'))return;
    const style=document.createElement('style');
    style.id='tatneraRoleAccessStyle';
    style.textContent=`
      [data-role-hidden="true"]{display:none!important}
      .tatnera-role-note{margin:0 0 14px;padding:12px 14px;border:1px solid var(--line);border-radius:12px;background:var(--panel-2);color:var(--muted);font-size:13px;line-height:1.45}
      .tatnera-role-note strong{color:var(--text)}
    `;
    document.head.appendChild(style);
  }

  function markHidden(node,hidden){
    if(!node)return;
    if(hidden)node.dataset.roleHidden='true';
    else delete node.dataset.roleHidden;
  }

  function applyManagerVisibility(){
    const hidden=!isManager();
    for(const selector of MANAGER_ONLY_SELECTORS){
      document.querySelectorAll(selector).forEach(node=>markHidden(node,hidden));
    }
    const invoiceView=document.getElementById('invoices');
    if(invoiceView)invoiceView.setAttribute('aria-hidden',hidden?'true':'false');
    if(hidden&&invoiceView?.classList.contains('active-view'))window.navigate?.('dashboard');
  }

  function applyStudioSettings(){
    const panel=document.getElementById('studioSettingsPanel');
    if(!panel)return;
    markHidden(panel,!isManager());

    const settings=document.getElementById('settings');
    if(!settings)return;
    let note=document.getElementById('tatneraRoleSettingsNote');
    if(isManager()){
      note?.remove();
      return;
    }
    if(!note){
      note=document.createElement('div');
      note.id='tatneraRoleSettingsNote';
      note.className='tatnera-role-note';
      const team=document.getElementById('studioTeamPanel');
      if(team)team.insertAdjacentElement('beforebegin',note);
      else settings.prepend(note);
    }
    note.innerHTML=`<strong>${roleLabel()}</strong>: Studio- und Rechnungsdaten können nur Inhaber oder Admins ändern. Deine persönlichen Einstellungen und dein Team-Zugang bleiben sichtbar.`;
  }

  function syncRoleLabel(){
    const meta=document.querySelector('.studio-card span');
    if(meta&&currentRole())meta.textContent=roleLabel();
  }

  function ensureObserver(){
    if(observer)return;
    observer=new MutationObserver(()=>requestAnimationFrame(apply));
    observer.observe(document.body,{childList:true,subtree:true});
  }

  function apply(){
    if(applying)return;
    const resolved=currentRole();
    if(!resolved)return;
    applying=true;
    try{
      role=resolved;
      document.body.dataset.tatneraRole=role;
      applyManagerVisibility();
      applyStudioSettings();
      syncRoleLabel();
      ensureObserver();
    }finally{applying=false;}
  }

  function guardManagerAction(event){
    if(!currentRole()||isManager())return;
    const target=event.target?.closest?.(MANAGER_ONLY_SELECTORS.join(','));
    if(!target)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    alert('Diese Funktion ist nur für Inhaber oder Admins verfügbar.');
  }

  document.addEventListener('click',guardManagerAction,true);
  document.addEventListener('tatnera:auth-ready',event=>{
    role=String(event.detail?.role||'');
    apply();
  });
  document.addEventListener('tatnera:runtime-refresh',()=>requestAnimationFrame(apply));
  document.addEventListener('tatnera:data-changed',()=>requestAnimationFrame(apply));

  window.TatneraAccess={
    role:()=>currentRole(),
    roleLabel,
    isManager,
    can:feature=>{
      if(['invoices','studio_profile','archive','permanent_delete','team_manage'].includes(String(feature||'')))return isManager();
      return true;
    },
    refresh:apply
  };

  installStyle();

  let tries=0;
  const timer=setInterval(()=>{
    tries+=1;
    if(currentRole()){
      apply();
      clearInterval(timer);
    }else if(tries>200){
      clearInterval(timer);
    }
  },50);
})();
