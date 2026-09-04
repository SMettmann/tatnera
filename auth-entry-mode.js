/* TATNERA — marketing page auth entry helper */
(function(){
  'use strict';

  if(!document.querySelector('script[src="subscription-guard.js"]')){
    const guard=document.createElement('script');
    guard.src='subscription-guard.js';
    guard.defer=true;
    document.head.appendChild(guard);
  }

  const params=new URLSearchParams(window.location.search);
  const mode=params.get('mode');
  if(mode!=='signup'&&mode!=='login')return;

  function applyMode(){
    const button=document.querySelector(`[data-auth-mode="${mode}"]`);
    if(!button)return false;
    button.click();
    try{
      const cleanUrl=window.location.pathname+window.location.hash;
      window.history.replaceState({},document.title,cleanUrl);
    }catch(_error){}
    return true;
  }

  let attempts=0;
  const timer=window.setInterval(()=>{
    attempts+=1;
    if(applyMode()||attempts>30)window.clearInterval(timer);
  },50);
})();