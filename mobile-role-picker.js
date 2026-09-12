/* TATNERA — app-style role picker for mobile */
(function(){
  'use strict';
  if(window.__tatneraMobileRolePickerInstalled)return;
  window.__tatneraMobileRolePickerInstalled=true;

  const isMobile=()=>window.matchMedia?.('(max-width: 760px)')?.matches||false;
  const labelFor=select=>select.options[select.selectedIndex]?.textContent?.trim()||'Rolle wählen';

  function installStyle(){
    if(document.getElementById('tatneraMobileRolePickerStyle'))return;
    const style=document.createElement('style');
    style.id='tatneraMobileRolePickerStyle';
    style.textContent=`
      .tatnera-mobile-role-trigger,.tatnera-role-sheet{display:none}
      @media(max-width:760px){
        #studioTeamPanel select[data-team-role],#studioTeamPanel #studioInviteForm select[name="role"]{position:absolute!important;width:1px!important;height:1px!important;opacity:0!important;pointer-events:none!important;overflow:hidden!important;clip:rect(0 0 0 0)!important}
        .tatnera-mobile-role-trigger{display:flex!important;width:100%;min-height:44px;border:1px solid var(--line);border-radius:10px;background:var(--panel);color:var(--text);padding:0 12px;align-items:center;justify-content:space-between;gap:10px;font:inherit;font-size:13px;font-weight:750;text-align:left}
        .tatnera-mobile-role-trigger::after{content:'›';font-size:22px;color:var(--muted);transform:rotate(90deg)}
        .studio-team-actions .tatnera-mobile-role-trigger{min-width:170px;background:var(--panel-2)}
        .tatnera-role-sheet{position:fixed;inset:0;z-index:100500;background:rgba(0,0,0,.46);padding:16px;align-items:flex-end;justify-content:center}
        .tatnera-role-sheet.open{display:flex!important}
        .tatnera-role-sheet-card{width:min(100%,520px);background:var(--panel);border:1px solid var(--line);border-radius:20px;padding:14px;box-shadow:0 24px 70px rgba(0,0,0,.28)}
        .tatnera-role-sheet-handle{width:42px;height:4px;border-radius:999px;background:var(--line);margin:0 auto 12px}
        .tatnera-role-sheet-title{font-size:14px;font-weight:850;margin:0 0 10px;color:var(--text)}
        .tatnera-role-sheet-options{display:flex;flex-direction:column;gap:8px}
        .tatnera-role-sheet-option{appearance:none;width:100%;min-height:50px;border:1px solid var(--line);border-radius:12px;background:var(--panel-2);color:var(--text);padding:0 13px;text-align:left;font:inherit;font-size:14px;font-weight:750}
        .tatnera-role-sheet-option.active{outline:2px solid currentColor;outline-offset:-2px}
        .tatnera-role-sheet-cancel{appearance:none;width:100%;min-height:46px;margin-top:10px;border:0;border-radius:12px;background:transparent;color:var(--muted);font:inherit;font-weight:750}
      }
    `;
    document.head.appendChild(style);
  }

  let activeSelect=null;

  function ensureSheet(){
    let sheet=document.getElementById('tatneraRoleSheet');
    if(sheet)return sheet;
    sheet=document.createElement('div');
    sheet.id='tatneraRoleSheet';
    sheet.className='tatnera-role-sheet';
    sheet.innerHTML='<section class="tatnera-role-sheet-card"><div class="tatnera-role-sheet-handle"></div><h3 class="tatnera-role-sheet-title">Rolle auswählen</h3><div class="tatnera-role-sheet-options"></div><button type="button" class="tatnera-role-sheet-cancel">Abbrechen</button></section>';
    document.body.appendChild(sheet);
    sheet.addEventListener('click',event=>{if(event.target===sheet)closeSheet();});
    sheet.querySelector('.tatnera-role-sheet-cancel').addEventListener('click',closeSheet);
    return sheet;
  }

  function closeSheet(){
    const sheet=document.getElementById('tatneraRoleSheet');
    sheet?.classList.remove('open');
    activeSelect=null;
  }

  function openSheet(select){
    if(!isMobile()||!select?.isConnected)return;
    activeSelect=select;
    const sheet=ensureSheet();
    const box=sheet.querySelector('.tatnera-role-sheet-options');
    box.innerHTML='';
    [...select.options].forEach(option=>{
      const button=document.createElement('button');
      button.type='button';
      button.className='tatnera-role-sheet-option'+(option.value===select.value?' active':'');
      button.textContent=option.textContent;
      button.addEventListener('click',()=>{
        const changed=select.value!==option.value;
        select.value=option.value;
        updateTrigger(select);
        closeSheet();
        if(changed){
          select.dispatchEvent(new Event('change',{bubbles:true}));
          setTimeout(()=>updateTrigger(select),120);
        }
      });
      box.appendChild(button);
    });
    sheet.classList.add('open');
  }

  function updateTrigger(select){
    const trigger=select?._tatneraMobileRoleTrigger;
    if(trigger?.isConnected)trigger.querySelector('span').textContent=labelFor(select);
  }

  function enhance(select){
    if(!isMobile()||!select||select._tatneraMobileRoleTrigger?.isConnected)return;
    const trigger=document.createElement('button');
    trigger.type='button';
    trigger.className='tatnera-mobile-role-trigger';
    trigger.innerHTML='<span></span>';
    trigger.querySelector('span').textContent=labelFor(select);
    trigger.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();openSheet(select);});
    select.insertAdjacentElement('afterend',trigger);
    select._tatneraMobileRoleTrigger=trigger;
  }

  function scan(){
    if(!isMobile())return;
    document.querySelectorAll('#studioTeamPanel select[data-team-role],#studioTeamPanel #studioInviteForm select[name="role"]').forEach(enhance);
  }

  installStyle();
  ensureSheet();
  const observer=new MutationObserver(()=>queueMicrotask(scan));
  observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('tatnera:auth-ready',()=>setTimeout(scan,150));
  document.addEventListener('click',event=>{if(event.target.closest?.('[data-view="settings"],[data-view-target="settings"]'))setTimeout(scan,120);});
  window.addEventListener('resize',scan,{passive:true});
  setTimeout(scan,500);
})();
