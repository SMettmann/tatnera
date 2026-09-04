/* TATNERA — dashboard finishing touches
   Keeps health warnings visually attached to the appointment and surfaces records
   that still need an appointment as an actionable dashboard task. */
(function(){
  'use strict';
  if(window.__tatneraDashboardFixesInstalled)return;
  window.__tatneraDashboardFixesInstalled=true;

  const Core=window.TatneraCore;
  if(!Core)return;
  const esc=Core.esc||((value)=>String(value??''));
  const today=()=>typeof todayISO==='function'?todayISO():new Date().toISOString().slice(0,10);
  const isPiercing=project=>project?.serviceType==='piercing';

  function installStyle(){
    if(document.getElementById('dashboardFixesStyle'))return;
    const style=document.createElement('style');
    style.id='dashboardFixesStyle';
    style.textContent=`
      #todayAppointments .dashboard-appointment .main-info{display:flex;flex-direction:column;align-items:flex-start;min-width:0}
      #todayAppointments .dashboard-appointment .main-info>.dashboard-health-state{margin:7px 0 0!important;align-self:flex-start!important}
      #todayAppointments .dashboard-appointment>.dashboard-health-state{display:none!important}
      .dashboard-schedule-row .dashboard-schedule-kind{font-size:9px!important;color:var(--muted)!important;text-align:right!important;margin-bottom:2px!important}
      .dashboard-schedule-row .dashboard-schedule-value{font-size:11px;font-weight:850;text-align:right;white-space:nowrap}
    `;
    document.head.appendChild(style);
  }

  function projectsWithoutAppointment(){
    const start=today();
    return (state.projects||[]).filter(project=>{
      if(project.status==='Abgeschlossen')return false;
      return !(state.calendarEvents||[]).some(event=>event.projectId===project.id&&event.date>=start);
    });
  }

  function fixHealthBadges(){
    document.querySelectorAll('#todayAppointments .dashboard-appointment').forEach(row=>{
      const badge=row.querySelector('.dashboard-health-state');
      const main=row.querySelector('.main-info');
      if(badge&&main&&badge.parentElement!==main)main.appendChild(badge);
    });
  }

  function observeTodayAppointments(){
    const root=document.getElementById('todayAppointments');
    if(!root||root.dataset.dashboardFixObserver==='1')return;
    root.dataset.dashboardFixObserver='1';
    new MutationObserver(()=>fixHealthBadges()).observe(root,{childList:true,subtree:true});
  }

  function ensureScheduleTask(){
    const grid=document.querySelector('#dashboard .cockpit-task-grid');
    if(!grid)return;
    let button=grid.querySelector('[data-dashboard-schedule-task]');
    if(!button){
      button=document.createElement('button');
      button.type='button';
      button.dataset.dashboardScheduleTask='true';
      button.innerHTML='<span>Termin vereinbaren</span><strong data-dash-schedule-count>0</strong><small>offene Akten ohne Termin</small>';
      grid.appendChild(button);
    }
    const count=projectsWithoutAppointment().length;
    const value=button.querySelector('[data-dash-schedule-count]');
    if(value)value.textContent=String(count);
    const small=button.querySelector('small');
    if(small)small.textContent=count===1?'1 offene Akte ohne Termin':'offene Akten ohne Termin';
  }

  function ensureScheduleDialog(){
    let dialog=document.getElementById('dashboardScheduleDialog');
    if(dialog)return dialog;
    dialog=document.createElement('dialog');
    dialog.id='dashboardScheduleDialog';
    dialog.className='dialog dashboard-action-dialog';
    dialog.innerHTML=`<div><div class="dialog-head"><div><span class="eyebrow">Dashboard</span><h2>Termin vereinbaren</h2><p class="muted" data-schedule-dialog-meta></p></div><button type="button" class="close-btn" data-close-schedule-dialog>×</button></div><div class="dashboard-action-list" data-schedule-dialog-list></div><div class="dialog-actions"><button type="button" class="btn ghost" data-close-schedule-dialog>Schließen</button></div></div>`;
    document.body.appendChild(dialog);
    dialog.querySelectorAll('[data-close-schedule-dialog]').forEach(button=>button.addEventListener('click',()=>dialog.close()));
    return dialog;
  }

  function renderScheduleDialog(){
    const dialog=ensureScheduleDialog();
    const projects=projectsWithoutAppointment();
    const meta=dialog.querySelector('[data-schedule-dialog-meta]');
    const list=dialog.querySelector('[data-schedule-dialog-list]');
    if(meta)meta.textContent=projects.length===1?'1 offene Akte braucht noch einen Termin.':`${projects.length} offene Akten brauchen noch einen Termin.`;
    if(list)list.innerHTML=projects.map(project=>`<button type="button" class="dashboard-action-row dashboard-schedule-row" data-dashboard-schedule-project="${esc(project.id)}"><div><strong>${esc(project.title||'Ohne Bezeichnung')}</strong><span>${esc(typeof customerName==='function'?customerName(project.customerId):'Kunde')} · ${esc(project.artist||'—')}</span></div><div><small class="dashboard-schedule-kind">${isPiercing(project)?'Piercing':'Tattoo'}</small><div class="dashboard-schedule-value">Termin fehlt</div></div><span>→</span></button>`).join('')||'<div class="dashboard-action-empty">Alle offenen Akten haben einen Termin.</div>';
    if(!dialog.open)dialog.showModal();
  }

  function prepareProjectAppointment(project){
    if(!project||typeof openAppointmentDialog!=='function')return;
    const customerProjects=(state.projects||[]).filter(item=>item.customerId===project.customerId);
    openAppointmentDialog('',today());
    const form=document.getElementById('appointmentForm');
    if(!form)return;

    if(form.elements.projectId){
      form.elements.projectId.innerHTML='<option value="">Keine Studio-Akte / Beratung</option>'+customerProjects.map(item=>`<option value="${esc(item.id)}">${isPiercing(item)?'Piercing':'Tattoo'} · ${esc(item.title||'Ohne Bezeichnung')}</option>`).join('');
      form.elements.projectId.value=project.id;
    }
    if(form.elements.customerId)form.elements.customerId.value=project.customerId||'';
    if(form.elements.type)form.elements.type.value=isPiercing(project)?'piercing':'tattoo';
    if(form.elements.artist)Core.populateArtistSelect(form.elements.artist,project.artist||Core.artistNameFallback());
    if(form.elements.status)form.elements.status.value='Angefragt';
    if(form.elements.duration)form.elements.duration.value=isPiercing(project)?45:120;
    if(form.elements.notes)form.elements.notes.value=`Termin für ${project.title|| (isPiercing(project)?'Piercing':'Tattoo')}`;
  }

  function refresh(){
    installStyle();
    ensureScheduleTask();
    observeTodayAppointments();
    requestAnimationFrame(()=>requestAnimationFrame(fixHealthBadges));
  }

  document.addEventListener('click',event=>{
    const task=event.target.closest('[data-dashboard-schedule-task]');
    if(task){event.preventDefault();renderScheduleDialog();return;}
    const row=event.target.closest('[data-dashboard-schedule-project]');
    if(row){
      event.preventDefault();
      const project=(state.projects||[]).find(item=>item.id===row.dataset.dashboardScheduleProject);
      document.getElementById('dashboardScheduleDialog')?.close();
      prepareProjectAppointment(project);
    }
  });

  document.addEventListener('tatnera:runtime-refresh',()=>setTimeout(refresh,0));
  document.addEventListener('tatnera:data-changed',()=>setTimeout(refresh,0));
  document.addEventListener('tatnera:auth-ready',()=>setTimeout(refresh,250));
  window.addEventListener('popstate',()=>setTimeout(refresh,0));

  refresh();
  setTimeout(refresh,300);
})();
