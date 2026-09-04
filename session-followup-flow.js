/* TATNERA — unfinished session -> direct follow-up appointment
   If a tattoo is not marked complete when the session is finished, open the
   existing appointment dialog immediately and preselect the same customer/project. */
(function(){
  'use strict';
  if(window.__tatneraSessionFollowupInstalled)return;
  window.__tatneraSessionFollowupInstalled=true;

  const Core=window.TatneraCore;if(!Core)return;
  let pendingProjectId='';
  let pendingSessionId='';

  function sessionById(id){return (window.state?.sessions||[]).find(item=>String(item.id)===String(id))||null;}

  function installStyle(){
    if(document.getElementById('followupAppointmentStyle'))return;
    const style=document.createElement('style');style.id='followupAppointmentStyle';style.textContent=`
      #appointmentDialog .followup-appointment-note{margin:0 0 14px;padding:12px 14px;border:1px solid color-mix(in srgb,var(--accent) 45%,var(--line));border-radius:12px;background:color-mix(in srgb,var(--accent) 8%,var(--panel-2));line-height:1.45}
      #appointmentDialog .followup-appointment-note strong{display:block;font-size:14px;margin-bottom:3px;color:var(--text)}
      #appointmentDialog .followup-appointment-note span{font-size:12px;color:var(--muted)}
    `;document.head.appendChild(style);
  }

  function clearFollowupNote(){document.getElementById('followupAppointmentNote')?.remove();}

  function openFollowup(projectId,sessionId){
    const project=Core.getProject(projectId);if(!project||project.status==='Abgeschlossen')return;
    if(typeof window.openAppointmentDialog!=='function'&&typeof openAppointmentDialog!=='function')return;

    const open=typeof window.openAppointmentDialog==='function'?window.openAppointmentDialog:openAppointmentDialog;
    try{open('',todayISO());}catch(error){console.error('TATNERA follow-up appointment could not open',error);return;}

    const dialog=document.getElementById('appointmentDialog'),form=document.getElementById('appointmentForm');
    if(!dialog||!form)return;
    const session=sessionById(sessionId);

    clearFollowupNote();
    const note=document.createElement('div');note.id='followupAppointmentNote';note.className='followup-appointment-note';
    note.innerHTML=`<strong>Tattoo noch nicht abgeschlossen</strong><span>Lege direkt die nächste Sitzung für ${Core.esc(customerName(project.customerId))} · ${Core.esc(project.title)} fest. Wenn ihr noch keinen Termin vereinbart, kannst du das Fenster einfach schließen.</span>`;
    form.querySelector('.dialog-head')?.insertAdjacentElement('afterend',note);

    document.getElementById('appointmentDialogTitle').textContent='Folgetermin vereinbaren';
    form.elements.eventId.value='';
    form.elements.type.value='tattoo';
    form.elements.customerId.value=project.customerId||'';
    form.elements.projectId.value=project.id;
    form.elements.status.value='Bestätigt';
    if(form.elements.artist){
      const preferred=session?.artist||project.artist||'';
      try{Core.populateArtistSelect(form.elements.artist,preferred||Core.artistNameFallback());}catch(_error){if(preferred)form.elements.artist.value=preferred;}
    }
    if(form.elements.start&&session?.scheduledStart)form.elements.start.value=session.scheduledStart;
    if(form.elements.duration)form.elements.duration.value=Number(session?.scheduledDuration||120);
    /* A follow-up must be consciously dated; do not silently create it for today. */
    if(form.elements.date)form.elements.date.value='';
    form.elements.notes.value=`Folgesitzung · ${project.title}`;
    form.elements.date?.focus();
  }

  document.addEventListener('tatnera:data-changed',event=>{
    if(event.detail?.type!=='session-complete'||!event.detail?.projectId)return;
    const project=Core.getProject(event.detail.projectId);if(!project||project.status==='Abgeschlossen')return;
    pendingProjectId=project.id;pendingSessionId=event.detail.sessionId||'';
    setTimeout(()=>{
      const id=pendingProjectId,sessionId=pendingSessionId;pendingProjectId='';pendingSessionId='';
      openFollowup(id,sessionId);
    },260);
  });

  document.getElementById('appointmentDialog')?.addEventListener('close',clearFollowupNote);
  document.addEventListener('click',event=>{
    if(event.target?.closest?.('#closeAppointmentDialog,#cancelAppointmentBtn'))setTimeout(clearFollowupNote,0);
  });

  installStyle();
})();