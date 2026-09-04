/* TATNERA — marketing page auth entry helper */
(function(){
  'use strict';

  const LOGO_SRC='assets/tatnera-brand.png?v=20260904-1';
  const authStyles=[
    {match:'auth-marketing.css',href:'auth-marketing.css?v=20260904-2'},
    {match:'brand-entry-palette.css',href:'brand-entry-palette.css?v=20260904-1'},
    {match:'brand-logo.css',href:'brand-logo.css?v=20260904-5'}
  ];
  authStyles.forEach(item=>{
    if(document.querySelector(`link[href^="${item.match}"]`))return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href=item.href;
    document.head.appendChild(link);
  });

  if(!document.querySelector('script[src^="role-access.js"]')){
    const access=document.createElement('script');
    access.src='role-access.js?v=20260904-1';
    access.defer=true;
    document.head.appendChild(access);
  }

  if(!document.querySelector('script[src="subscription-guard.js"]')){
    const guard=document.createElement('script');
    guard.src='subscription-guard.js';
    guard.defer=true;
    document.head.appendChild(guard);
  }

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
    if(img.getAttribute('src')!==LOGO_SRC)img.setAttribute('src',LOGO_SRC);
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
    installHomeLink();
    ensureAuthLogo();
    if(mode!=='signup'&&mode!=='login')return !!document.getElementById('tatneraAuthShell');
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

  let attempts=0;
  const timer=window.setInterval(()=>{
    attempts+=1;
    if(applyMode()||attempts>40)window.clearInterval(timer);
  },50);
})();
