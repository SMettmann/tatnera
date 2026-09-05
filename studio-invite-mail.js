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
    const intro=document.querySelector('#studioTeamPanel .studio-team-head p');
    const text='Rollen und Studio-Zugriff werden hier zentral verwaltet.';
    if(intro&&intro.textContent!==text)intro.textContent=text;
  }

  document.addEventListener('tatnera:auth-ready',()=>setTimeout(patchTeamText,250));
  document.addEventListener('tatnera:runtime-refresh',patchTeamText);
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-view="settings"],[data-view-target="settings"]'))setTimeout(patchTeamText,150);
  });
})();
