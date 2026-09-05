/* TATNERA — studio invitations temporarily disabled until Strato integration */
(function(){
  'use strict';

  const style=document.createElement('style');
  style.id='tatneraInvitesDisabledStyle';
  style.textContent=`
    #studioTeamPanel .studio-team-grid{grid-template-columns:1fr!important}
    #studioTeamPanel .studio-team-grid>.studio-team-box:nth-child(2){display:none!important}
    #studioInviteForm,#studioInviteResult,.studio-pending{display:none!important}
  `;
  document.head.appendChild(style);

  function patchTeamText(){
    const panel=document.getElementById('studioTeamPanel');
    if(!panel)return;
    const intro=panel.querySelector('.studio-team-head p');
    if(intro)intro.textContent='Rollen und Studio-Zugriff werden hier zentral verwaltet.';
  }

  const observer=new MutationObserver(patchTeamText);
  if(document.body)observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('tatnera:auth-ready',patchTeamText);
  document.addEventListener('tatnera:runtime-refresh',patchTeamText);
  patchTeamText();
})();
