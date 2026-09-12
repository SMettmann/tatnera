/* TATNERA — marketing page auth entry helper */
(function(){
  'use strict';

  const LOGO_SRC='assets/tatnera-brand.png?v=20260904-1';
  const RECOVERY_KEY='tatnera_password_recovery_v1';

  function loadOnce(src){
    if(document.querySelector(`script[src^="${src}"]`))return;
    const script=document.createElement('script');
    script.src=src;
    script.async=true;
    document.body.appendChild(script);
  }

  loadOnce('role-access.js');
  loadOnce('subscription-guard.js');
  loadOnce('recovery-session-bridge.js?v=20260912-1');
  loadOnce('password-recovery-session-fix.js?v=20260912-1');

  function ensureAuthLogo(){
    const brand=document.querySelector('.tatnera-auth-brand');
    if(!brand)return false;
    let img=brand.querySelector('.tatnera-logo-img');
    if(!img){
      img=document.createElement('img');
      img.className='tatnera-logo-img';
      img.alt='TATNERA Studio Software';
      img.width=220;
      img.height=101;
      img.loading='eager';
      img.decoding='sync';
      try{img.fetchPriority='high';}catch(_error){}
      brand.replaceChildren(img);
    }
    if(img.getAttribute('src')!==LOGO_SRC)img.src=LOGO_SRC;
    return true;
  }

  function installHomeLink(){
    const shell=document.getElementById('tatneraAuthShell');
    if(!shell)return false;
    ensureAuthLogo();
    if(shell.querySelector('.tatnera-auth-home'))return true;
    const home=document.createElement('a');
    home.className='tatnera-auth-home';
    home.href='./';
    home.textContent='← Zur Startseite';
    home.setAttribute('aria-label','Zur TATNERA Startseite');
    shell.prepend(home);
    return true;
  }

  function authIsVisible(){
    const shell=document.getElementById('tatneraAuthShell');
    return !!shell&&!shell.hidden&&document.body.classList.contains('tatnera-auth-locked');
  }

  function inviteSetupRequired(){
    try{return !!window.TatneraInviteSetup?.required?.();}catch(_error){return false;}
  }

  function recoverySignalInUrl(){
    try{
      const query=new URLSearchParams(window.location.search);
      const hash=new URLSearchParams(window.location.hash.replace(/^#/,''));
      return query.get('mode')==='recovery'||query.get('type')==='recovery'||hash.get('type')==='recovery';
    }catch(_error){return false;}
  }

  function recoveryPending(){
    try{return sessionStorage.getItem(RECOVERY_KEY)==='1';}catch(_error){return false;}
  }

  function markRecovery(){
    try{sessionStorage.setItem(RECOVERY_KEY,'1');}catch(_error){}
  }

  function clearRecovery(){
    try{sessionStorage.removeItem(RECOVERY_KEY);}catch(_error){}
    try{
      const url=new URL(window.location.href);
      if(url.searchParams.get('mode')==='recovery')url.searchParams.delete('mode');
      if(url.searchParams.get('type')==='recovery')url.searchParams.delete('type');
      window.history.replaceState(window.history.state,document.title,url.pathname+url.search+url.hash);
    }catch(_error){}
  }

  /* Keep a durable recovery marker even if Supabase consumes the URL hash
     before this helper installs its auth-state listener. */
  if(recoverySignalInUrl()&&!inviteSetupRequired())markRecovery();

  function showRecoveryUi(){
    if(!recoveryPending()||inviteSetupRequired())return false;
    const shell=document.getElementById('tatneraAuthShell');
    const recovery=document.querySelector('[data-auth-recovery-area]');
    if(!shell||!recovery)return false;
    document.body.classList.add('tatnera-auth-locked');
    shell.hidden=false;
    document.querySelector('[data-auth-login-area]')?.setAttribute('hidden','');
    document.querySelector('[data-auth-studio-area]')?.setAttribute('hidden','');
    recovery.removeAttribute('hidden');
    const message=document.getElementById('tatneraAuthMessage');
    if(message){
      message.textContent='Der Link wurde bestätigt. Du kannst jetzt dein neues Passwort setzen.';
      message.className='tatnera-auth-message success';
    }
    ensureAuthLogo();
    installHomeLink();
    return true;
  }

  function reinforceRecovery(){
    [0,40,100,220,450,900,1500].forEach(delay=>setTimeout(showRecoveryUi,delay));
  }

  function installRecoveryGuard(){
    const client=window.TatneraAuth?.client;
    if(!client?.auth)return false;
    if(client.auth.__tatneraRecoveryGuardInstalled){
      if(recoveryPending())reinforceRecovery();
      return true;
    }
    client.auth.__tatneraRecoveryGuardInstalled=true;
    client.auth.onAuthStateChange((event)=>{
      if(event==='PASSWORD_RECOVERY'&&!inviteSetupRequired()){
        markRecovery();
        reinforceRecovery();
        return;
      }
      if(event==='USER_UPDATED'||event==='SIGNED_OUT')clearRecovery();
    });
    if(recoverySignalInUrl()&&!inviteSetupRequired())markRecovery();
    if(recoveryPending())reinforceRecovery();
    return true;
  }

  let backBoundaryInstalled=false;
  function installBackBoundary(){
    if(backBoundaryInstalled)return;
    backBoundaryInstalled=true;

    let sameSiteReferrer=false;
    try{
      sameSiteReferrer=!!document.referrer&&new URL(document.referrer).origin===window.location.origin;
    }catch(_error){}

    if(!sameSiteReferrer){
      try{
        const state=window.history.state||{};
        if(!state.tatneraAuthBoundary){
          window.history.replaceState({...state,tatneraAuthBoundary:true},document.title,window.location.href);
          window.history.pushState({tatneraAuthScreen:true},document.title,window.location.href);
        }
      }catch(_error){}
    }

    window.addEventListener('popstate',()=>{
      if(authIsVisible())window.location.replace('./');
    });
  }

  installBackBoundary();

  const params=new URLSearchParams(window.location.search);
  const mode=params.get('mode');

  function applyMode(){
    const shell=document.getElementById('tatneraAuthShell');
    if(!shell)return false;
    installHomeLink();
    ensureAuthLogo();
    if(recoveryPending()||mode==='recovery'){
      markRecovery();
      showRecoveryUi();
      return true;
    }
    if(mode!=='signup'&&mode!=='login')return true;
    const button=document.querySelector(`[data-auth-mode="${mode}"]`);
    if(!button)return false;
    button.click();
    try{
      const cleanUrl=window.location.pathname+window.location.hash;
      const state=window.history.state||{};
      window.history.replaceState(state,document.title,cleanUrl);
    }catch(_error){}
    return true;
  }

  if(!installRecoveryGuard()){
    let tries=0;
    const recoveryTimer=setInterval(()=>{
      tries++;
      if(installRecoveryGuard()||tries>120)clearInterval(recoveryTimer);
    },50);
  }

  if(!applyMode()){
    setTimeout(()=>{
      if(!applyMode())setTimeout(applyMode,350);
    },60);
  }

  document.addEventListener('tatnera:auth-ready',()=>{
    ensureAuthLogo();
    installRecoveryGuard();
    if(recoveryPending())reinforceRecovery();
  });
})();