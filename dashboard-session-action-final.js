/* TATNERA — final dashboard session action guard
   Ensures every eligible tattoo/touchup appointment shown in "Heute" always exposes its session action. */
(function(){
  'use strict';
  if(window.__tatneraDashboardSessionActionFinal)return;
  window.__tatneraDashboardSessionActionFinal=true;

  function eligible(event){return Boolean(event&&event.projectId&&['tattoo','touchup'].includes(event.type));}
  function running(eventId){
    const sessions=window.TatneraSessions?.getSessions?.()||window.state?.sessions||[];
    return sessions.find(item=>String(item.eventId)===String(eventId)&&item.status==='running')||null;
  }
  function installStyle(){
    if(document.getElementById('dashboardSessionFinalStyle'))return;
    const style=document.createElement('style');style.id='dashboardSessionFinalStyle';style.textContent=`
      #todayAppointments .dashboard-session-final{margin-left:auto!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;min-width:104px!important;padding:7px 10px!important;border-radius:9px!important;font-size:10px!important;font-weight:850!important;white-space:nowrap!important;cursor:pointer!important;position:relative!important;z-index:3!important}
      #todayAppointments .appointment.dashboard-appointment{gap:10px!important}
      @media(max-width:760px){#todayAppointments .dashboard-session-final{width:100%!important;margin:8px 0 0!important}.dashboard-appointment{flex-wrap:wrap!important}}
    `;document.head.appendChild(style);
  }
  function sync(){
    const root=document.getElementById('todayAppointments');if(!root)return;
    root.querySelectorAll('[data-dashboard-event]').forEach(row=>{
      const event=(window.state?.calendarEvents||[]).find(item=>String(item.id)===String(row.dataset.dashboardEvent));
      row.querySelectorAll('[data-dashboard-session-action]').forEach(node=>node.remove());
      if(!eligible(event))return;
      const active=running(event.id);
      const button=document.createElement('button');button.type='button';button.className=`btn ${active?'session-finish-btn':'session-btn'} dashboard-session-final`;button.dataset.dashboardSessionAction='';
      if(active)button.dataset.finishSession=String(active.id);else button.dataset.startSession=String(event.id);
      button.textContent=active?'Sitzung abschließen':'Sitzung starten';
      const status=row.querySelector('.status-pill');
      if(status)status.insertAdjacentElement('beforebegin',button);else row.appendChild(button);
    });
  }
  let queued=false;
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;sync();});}
  installStyle();
  const observe=()=>{const root=document.getElementById('todayAppointments');if(root&&!root.dataset.sessionFinalObserver){root.dataset.sessionFinalObserver='1';new MutationObserver(schedule).observe(root,{childList:true,subtree:true});}schedule();};
  document.addEventListener('tatnera:runtime-refresh',observe);
  document.addEventListener('tatnera:data-changed',observe);
  document.addEventListener('tatnera:auth-ready',()=>setTimeout(observe,120));
  window.addEventListener('pageshow',observe);
  observe();setTimeout(observe,350);setTimeout(observe,900);
})();
