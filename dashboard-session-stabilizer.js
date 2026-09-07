/* TATNERA — keep dashboard session actions stable after every dashboard rerender */
(function(){
  'use strict';
  if(window.__tatneraDashboardSessionStabilizer)return;
  window.__tatneraDashboardSessionStabilizer=true;

  let queued=false;

  function eligibleEvent(item){
    return Boolean(item&&item.projectId&&['tattoo','touchup'].includes(item.type));
  }

  function runningForEvent(eventId){
    const sessions=window.TatneraSessions?.getSessions?.()||window.state?.sessions||[];
    return sessions.find(item=>String(item.eventId)===String(eventId)&&item.status==='running')||null;
  }

  function sync(){
    queued=false;
    const root=document.getElementById('todayAppointments');
    if(!root)return;

    root.querySelectorAll('[data-dashboard-event]').forEach(row=>{
      const event=(window.state?.calendarEvents||[]).find(item=>String(item.id)===String(row.dataset.dashboardEvent));
      const existing=row.querySelector('[data-dashboard-session-action]');

      if(!eligibleEvent(event)){
        existing?.remove();
        return;
      }

      const running=runningForEvent(event.id);
      const desiredType=running?'finish':'start';
      const desiredId=running?.id||event.id;

      if(existing&&existing.dataset.sessionActionType===desiredType&&String(existing.dataset.sessionActionId||'')===String(desiredId))return;
      existing?.remove();

      const action=document.createElement('span');
      action.setAttribute('role','button');
      action.tabIndex=0;
      action.className=`btn ${running?'session-finish-btn':'session-btn'} dashboard-session-action`;
      action.dataset.dashboardSessionAction='';
      action.dataset.sessionActionType=desiredType;
      action.dataset.sessionActionId=String(desiredId);
      if(running)action.dataset.finishSession=String(running.id);
      else action.dataset.startSession=String(event.id);
      action.textContent=running?'Sitzung abschließen':'Sitzung starten';
      row.appendChild(action);
    });
  }

  function schedule(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(sync);
  }

  const root=document.getElementById('todayAppointments');
  if(root)new MutationObserver(schedule).observe(root,{childList:true,subtree:true});

  document.addEventListener('tatnera:runtime-refresh',schedule);
  document.addEventListener('tatnera:data-changed',schedule);
  document.addEventListener('tatnera:auth-ready',schedule);
  window.addEventListener('pageshow',schedule);

  schedule();
  setTimeout(schedule,100);
  setTimeout(schedule,500);
})();
