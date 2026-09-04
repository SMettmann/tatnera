/* TATNERA — keep team role selectors aligned with the real database role */
(function(){
  'use strict';
  if(window.__tatneraTeamRoleUiFixInstalled)return;
  window.__tatneraTeamRoleUiFixInstalled=true;

  const labels={owner:'Inhaber',admin:'Admin',artist:'Tattoo Artist',piercer:'Piercer',artist_piercer:'Artist & Piercer',staff:'Studio-Mitarbeiter'};
  let queued=false;

  function ensureOption(select,value){
    if(!select||!value)return;
    let option=[...select.options].find(item=>item.value===value);
    if(!option){option=document.createElement('option');option.value=value;select.appendChild(option);}
    option.textContent=labels[value]||value;
  }

  function sync(){
    queued=false;
    const panel=document.getElementById('studioTeamPanel');
    if(!panel||!window.TatneraTeam?.members)return;
    const members=window.TatneraTeam.members();
    panel.querySelectorAll('[data-team-role]').forEach(select=>{
      const member=members.find(item=>item.id===select.dataset.teamRole);
      if(!member?.role)return;
      ensureOption(select,member.role);
      [...select.options].forEach(option=>{if(labels[option.value])option.textContent=labels[option.value];});
      select.value=member.role;
    });
    const invite=panel.querySelector('#studioInviteForm select[name="role"]');
    if(invite)[...invite.options].forEach(option=>{if(labels[option.value])option.textContent=labels[option.value];});
  }

  function schedule(){if(queued)return;queued=true;requestAnimationFrame(sync);}
  const observer=new MutationObserver(schedule);observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('tatnera:auth-ready',()=>setTimeout(schedule,200));
  document.addEventListener('tatnera:runtime-refresh',schedule);
  document.addEventListener('tatnera:data-changed',schedule);
  setTimeout(schedule,700);
})();
