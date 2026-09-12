/* TATNERA — studio invitation UI enabled */
(function(){
  'use strict';
  document.getElementById('tatneraInvitesDisabledStyle')?.remove();
  function patchTeamText(){
    const intro=document.querySelector('#studioTeamPanel .studio-team-head p');
    const text='Jeder bekommt einen eigenen TATNERA-Zugang. Rollen und Studio-Zugriff werden hier zentral verwaltet.';
    if(intro&&intro.textContent!==text)intro.textContent=text;
  }
  document.addEventListener('tatnera:auth-ready',()=>setTimeout(patchTeamText,250));
  document.addEventListener('tatnera:runtime-refresh',patchTeamText);
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-view="settings"],[data-view-target="settings"]'))setTimeout(patchTeamText,150);
  });
})();
