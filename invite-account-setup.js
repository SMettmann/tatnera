/* TATNERA — invitation account setup temporarily disabled until Strato integration */
(function(){
  'use strict';

  const PENDING_INVITE_KEY='tatnera_pending_studio_invite_v1';
  const GATE_TOKEN_KEY='tatnera_invite_gate_token_v1';

  try{
    localStorage.removeItem(PENDING_INVITE_KEY);
    sessionStorage.removeItem(GATE_TOKEN_KEY);
  }catch(_error){}

  try{
    const url=new URL(location.href);
    const hadInvite=url.searchParams.has('invite');
    if(hadInvite){
      url.searchParams.delete('invite');
      url.searchParams.delete('email');
      history.replaceState(history.state,'',url.pathname+url.search+url.hash);
    }
  }catch(_error){}

  const removeInviteScreen=()=>document.getElementById('tatneraInviteAccountSetup')?.remove();
  removeInviteScreen();
  if(document.body){
    new MutationObserver(removeInviteScreen).observe(document.body,{childList:true,subtree:true});
  }

  window.__tatneraInviteAccountSetupActive=false;
  window.TatneraInviteSetup={required:()=>false};
})();
