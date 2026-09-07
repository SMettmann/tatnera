/* TATNERA — primary session actions
   Session start must be immediately visible on today's dashboard rows and at the top of an opened appointment. */
(function(){
  'use strict';
  if(window.__tatneraDashboardSessionActionFinal)return;
  window.__tatneraDashboardSessionActionFinal=true;

  const norm=v=>String(v??'').trim().toLowerCase();
  const today=()=>typeof window.todayISO==='function'?window.todayISO():(()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;})();
  function eligible(event){return Boolean(event&&event.projectId&&['tattoo','touchup'].includes(norm(event.type)));}
  function running(eventId){
    const sessions=window.TatneraSessions?.getSessions?.()||window.state?.sessions||[];
    return sessions.find(item=>String(item.eventId)===String(eventId)&&item.status==='running')||null;
  }
  function customerLabel(event){
    try{if(event?.customerId&&typeof window.customerName==='function')return window.customerName(event.customerId);}catch(_error){}
    const c=(window.state?.customers||[]).find(item=>String(item.id)===String(event?.customerId));
    return c?`${c.firstName||''} ${c.lastName||''}`.trim():'';
  }
  function eventForRow(row){
    const events=(window.state?.calendarEvents||[]).filter(event=>event.date===today());
    const direct=events.find(event=>String(event.id)===String(row.dataset.dashboardEvent||''));
    if(direct)return direct;
    const time=String(row.querySelector('.time')?.textContent||'').trim().slice(0,5);
    const name=norm(row.querySelector('.main-info strong')?.textContent||'');
    const match=events.find(event=>String(event.start||'').slice(0,5)===time&&(!name||norm(customerLabel(event))===name));
    if(match)row.dataset.dashboardEvent=String(match.id);
    return match||null;
  }

  function installStyle(){
    if(document.getElementById('dashboardSessionFinalStyle'))return;
    const style=document.createElement('style');style.id='dashboardSessionFinalStyle';style.textContent=`
      #todayAppointments .dashboard-session-final{margin-left:auto!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;min-width:122px!important;padding:8px 12px!important;border-radius:9px!important;font-size:10px!important;font-weight:900!important;white-space:nowrap!important;cursor:pointer!important;position:relative!important;z-index:10!important;flex:0 0 auto!important;background:#202822!important;color:#fff!important;border:1px solid #202822!important}
      #todayAppointments .dashboard-session-final.session-finish-btn{background:#26321f!important;border-color:#26321f!important}
      #todayAppointments .appointment.dashboard-appointment{gap:10px!important}
      .appointment-session-primary{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 16px;padding:14px;border:1px solid rgba(79,104,69,.38);border-radius:13px;background:rgba(79,104,69,.08)}
      .appointment-session-primary>div strong,.appointment-session-primary>div span{display:block}.appointment-session-primary>div strong{font-size:13px}.appointment-session-primary>div span{font-size:10px;color:var(--muted);margin-top:3px}
      .appointment-session-primary .appointment-session-primary-btn{min-height:42px;padding:10px 16px!important;font-weight:900!important;white-space:nowrap!important;background:#202822!important;color:#fff!important;border-color:#202822!important}
      @media(max-width:760px){
        #todayAppointments .dashboard-session-final{width:auto!important;min-width:118px!important;margin-left:auto!important;padding:8px 10px!important}
        .appointment-session-primary{display:block;margin:0 0 14px;padding:13px}
        .appointment-session-primary .appointment-session-primary-btn{display:flex!important;width:100%!important;justify-content:center!important;margin-top:11px!important;min-height:50px!important;font-size:14px!important}
      }
    `;document.head.appendChild(style);
  }

  function buildAction(event,className){
    const active=running(event.id),action=document.createElement('span');
    action.setAttribute('role','button');action.tabIndex=0;
    action.className=`btn ${active?'session-finish-btn':'session-btn'} ${className}`;
    action.dataset.dashboardSessionAction='';
    action.dataset.sessionActionType=active?'finish':'start';
    action.dataset.sessionActionId=String(active?.id||event.id);
    if(active)action.dataset.finishSession=String(active.id);else action.dataset.startSession=String(event.id);
    action.textContent=active?'Sitzung abschließen':'Sitzung starten';
    return action;
  }

  function syncDashboard(){
    const root=document.getElementById('todayAppointments');if(!root)return;
    root.querySelectorAll('.appointment,[data-dashboard-event]').forEach(row=>{
      const event=eventForRow(row);
      const existing=row.querySelector('.dashboard-session-final');
      if(!eligible(event)){existing?.remove();return;}
      const active=running(event.id),wantedType=active?'finish':'start',wantedId=String(active?.id||event.id);
      if(existing&&existing.dataset.sessionActionType===wantedType&&String(existing.dataset.sessionActionId||'')===wantedId)return;
      row.querySelectorAll('[data-dashboard-session-action]').forEach(node=>node.remove());
      const action=buildAction(event,'dashboard-session-final');
      const status=row.querySelector('.status-pill');
      if(status)status.insertAdjacentElement('beforebegin',action);else row.appendChild(action);
    });
  }

  function openedAppointmentEvent(){
    const form=document.getElementById('appointmentForm');if(!form)return null;
    const id=form.elements?.eventId?.value||form.querySelector('[name="eventId"]')?.value||'';
    return (window.state?.calendarEvents||[]).find(event=>String(event.id)===String(id))||null;
  }
  function syncAppointmentDialog(){
    const form=document.getElementById('appointmentForm');if(!form)return;
    const dialog=form.closest('dialog');
    let bar=form.querySelector('[data-appointment-session-primary]');
    const event=openedAppointmentEvent();
    if(!eligible(event)){bar?.remove();return;}
    const active=running(event.id),wantedType=active?'finish':'start',wantedId=String(active?.id||event.id);
    if(bar&&bar.dataset.sessionActionType===wantedType&&bar.dataset.sessionActionId===wantedId)return;
    bar?.remove();
    bar=document.createElement('div');bar.className='appointment-session-primary';bar.dataset.appointmentSessionPrimary='';bar.dataset.sessionActionType=wantedType;bar.dataset.sessionActionId=wantedId;
    const info=document.createElement('div');info.innerHTML='<strong>Termin steht an</strong><span>Sitzung direkt von hier starten.</span>';
    const action=buildAction(event,'appointment-session-primary-btn');
    bar.append(info,action);
    const head=form.querySelector('.dialog-head');
    if(head)head.insertAdjacentElement('afterend',bar);else form.prepend(bar);
    if(dialog?.open)requestAnimationFrame(()=>{try{dialog.scrollTop=0;}catch(_error){}});
  }

  let queued=false;
  function syncAll(){queued=false;syncDashboard();syncAppointmentDialog();}
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(syncAll);}

  installStyle();
  const dashboard=document.getElementById('todayAppointments');if(dashboard)new MutationObserver(schedule).observe(dashboard,{childList:true,subtree:true});
  const bodyObserver=new MutationObserver(mutations=>{if(mutations.some(m=>[...m.addedNodes].some(n=>n.nodeType===1&&(n.id==='appointmentForm'||n.querySelector?.('#appointmentForm')||n.matches?.('dialog')))))schedule();});
  bodyObserver.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('tatnera:runtime-refresh',schedule);
  document.addEventListener('tatnera:data-changed',schedule);
  document.addEventListener('tatnera:auth-ready',()=>setTimeout(schedule,120));
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-event-id],[data-dashboard-event],[data-record-edit-event]'))setTimeout(syncAppointmentDialog,40);
  });
  document.addEventListener('keydown',event=>{if(!['Enter',' '].includes(event.key))return;const action=event.target.closest('.dashboard-session-final,.appointment-session-primary-btn');if(!action)return;event.preventDefault();action.click();});
  window.addEventListener('pageshow',schedule);
  schedule();setTimeout(schedule,250);setTimeout(schedule,700);setTimeout(schedule,1400);
})();
