/* TATNERA — marketing page auth entry helper */
(function(){
  'use strict';
  const LOGO_SRC='assets/tatnera-brand.png?v=20260904-1';
  const RECOVERY_KEY='tatnera_password_recovery_v1';
  function loadOnce(src){if(document.querySelector(`script[src^="${src.split('?')[0]}"]`))return;const s=document.createElement('script');s.src=src;s.async=true;document.body.appendChild(s);}
  loadOnce('role-access.js');
  loadOnce('subscription-guard.js?v=20260912-2');
  loadOnce('recovery-session-bridge.js?v=20260912-3');
  loadOnce('studio-invite-fix.js?v=20260912-1');
  loadOnce('mobile-role-picker.js?v=20260912-1');
  loadOnce('release-cleanup.js?v=20260912-1');
  function ensureAuthLogo(){const brand=document.querySelector('.tatnera-auth-brand');if(!brand)return false;let img=brand.querySelector('.tatnera-logo-img');if(!img){img=document.createElement('img');img.className='tatnera-logo-img';img.alt='TATNERA Studio Software';img.width=220;img.height=101;img.loading='eager';img.decoding='sync';try{img.fetchPriority='high';}catch(_){}brand.replaceChildren(img);}if(img.getAttribute('src')!==LOGO_SRC)img.src=LOGO_SRC;return true;}
  function installHomeLink(){const shell=document.getElementById('tatneraAuthShell');if(!shell)return false;ensureAuthLogo();if(shell.querySelector('.tatnera-auth-home'))return true;const a=document.createElement('a');a.className='tatnera-auth-home';a.href='./';a.textContent='← Zur Startseite';a.setAttribute('aria-label','Zur TATNERA Startseite');shell.prepend(a);return true;}
  function authIsVisible(){const shell=document.getElementById('tatneraAuthShell');return !!shell&&!shell.hidden&&document.body.classList.contains('tatnera-auth-locked');}
  function inviteSetupRequired(){try{return !!window.TatneraInviteSetup?.required?.();}catch(_){return false;}}
  function signal(){try{const q=new URLSearchParams(location.search),h=new URLSearchParams(location.hash.replace(/^#/,''));return q.get('mode')==='recovery'||q.get('type')==='recovery'||h.get('type')==='recovery';}catch(_){return false;}}
  function pending(){try{return sessionStorage.getItem(RECOVERY_KEY)==='1';}catch(_){return false;}}
  function mark(){try{sessionStorage.setItem(RECOVERY_KEY,'1');}catch(_){}}
  function clear(){try{sessionStorage.removeItem(RECOVERY_KEY);}catch(_){} }
  if(signal()&&!inviteSetupRequired())mark();
  function showRecoveryUi(){if(!pending()||inviteSetupRequired())return false;const shell=document.getElementById('tatneraAuthShell'),r=document.querySelector('[data-auth-recovery-area]');if(!shell||!r)return false;document.body.classList.add('tatnera-auth-locked');shell.hidden=false;document.querySelector('[data-auth-login-area]')?.setAttribute('hidden','');document.querySelector('[data-auth-studio-area]')?.setAttribute('hidden','');r.removeAttribute('hidden');ensureAuthLogo();installHomeLink();return true;}
  function reinforce(){[0,50,150,400,900].forEach(d=>setTimeout(showRecoveryUi,d));}
  function guard(){const c=window.TatneraAuth?.client;if(!c?.auth)return false;if(c.auth.__tatneraRecoveryGuardInstalled){if(pending())reinforce();return true;}c.auth.__tatneraRecoveryGuardInstalled=true;c.auth.onAuthStateChange((event)=>{if(event==='PASSWORD_RECOVERY'&&!inviteSetupRequired()){mark();reinforce();}else if(event==='SIGNED_OUT')clear();});if(signal()&&!inviteSetupRequired())mark();if(pending())reinforce();return true;}
  let back=false;function installBack(){if(back)return;back=true;let same=false;try{same=!!document.referrer&&new URL(document.referrer).origin===location.origin;}catch(_){}if(!same){try{const st=history.state||{};if(!st.tatneraAuthBoundary){history.replaceState({...st,tatneraAuthBoundary:true},document.title,location.href);history.pushState({tatneraAuthScreen:true},document.title,location.href);}}catch(_){}}addEventListener('popstate',()=>{if(authIsVisible())location.replace('./');});}installBack();
  const mode=new URLSearchParams(location.search).get('mode');
  function apply(){const shell=document.getElementById('tatneraAuthShell');if(!shell)return false;installHomeLink();ensureAuthLogo();if(pending()||mode==='recovery'){mark();showRecoveryUi();return true;}if(mode!=='signup'&&mode!=='login')return true;const b=document.querySelector(`[data-auth-mode="${mode}"]`);if(!b)return false;b.click();return true;}
  if(!guard()){let n=0;const t=setInterval(()=>{n++;if(guard()||n>120)clearInterval(t);},50);}if(!apply())setTimeout(()=>{if(!apply())setTimeout(apply,350);},60);
  document.addEventListener('tatnera:auth-ready',()=>{ensureAuthLogo();guard();if(pending())reinforce();});
})();
