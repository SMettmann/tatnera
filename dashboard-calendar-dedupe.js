/* TATNERA — keep only one calendar shortcut in dashboard upcoming panel */
(function(){
  'use strict';
  if(window.__tatneraDashboardCalendarDedupeInstalled)return;
  window.__tatneraDashboardCalendarDedupeInstalled=true;

  function calendarLinks(root){return [...root.querySelectorAll('button,a')].filter(el=>/kalender\s*→?/i.test((el.textContent||'').trim()));}
  function clean(){
    document.querySelectorAll('#dashboard .cockpit-upcoming, #dashboard .cockpit-requests, #dashboard .cockpit-unscheduled').forEach(panel=>{
      const buttons=calendarLinks(panel);if(buttons.length<=1)return;
      buttons.slice(0,-1).forEach(el=>el.remove());
    });
    document.querySelectorAll('#dashboard .cockpit-head, #dashboard .panel-head').forEach(head=>{
      const buttons=calendarLinks(head);if(buttons.length<=1)return;
      buttons.slice(0,-1).forEach(el=>el.remove());
    });
  }

  let queued=false;
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;clean();});}
  const dashboard=document.getElementById('dashboard');
  if(dashboard)new MutationObserver(schedule).observe(dashboard,{childList:true,subtree:true});
  document.addEventListener('tatnera:runtime-refresh',schedule);
  document.addEventListener('tatnera:data-changed',schedule);
  document.addEventListener('tatnera:auth-ready',()=>setTimeout(schedule,100));
  window.addEventListener('pageshow',schedule);
  schedule();setTimeout(schedule,250);setTimeout(schedule,800);setTimeout(schedule,1400);
})();
