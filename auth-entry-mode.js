/* TATNERA — marketing page auth entry helper */
(function(){
  'use strict';

  const LOGO_SRC='assets/tatnera-brand.png?v=20260904-1';

  function loadOnce(src){
    if(document.querySelector(`script[src^="${src}"]`))return;
    const script=document.createElement('script');
    script.src=src;
    script.async=true;
    document.body.appendChild(script);
  }

  loadOnce('role-access.js');
  loadOnce('subscription-guard.js');

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

  if(!applyMode()){
    setTimeout(()=>{
      if(!applyMode())setTimeout(applyMode,350);
    },60);
  }

  document.addEventListener('tatnera:auth-ready',ensureAuthLogo);
})();