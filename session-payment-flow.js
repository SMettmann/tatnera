/* TATNERA — session completion flow
   Finished tattoo -> payment/invoice.
   Unfinished tattoo -> direct follow-up appointment planning. */
(function(){
  'use strict';
  const Core=window.TatneraCore;if(!Core)return;

  function signed(tx){return tx?.type==='Erstattung'?-Math.abs(Number(tx?.amount)||0):Math.abs(Number(tx?.amount)||0);}
  function paid(project){return Math.max(0,(project?.payments||[]).reduce((sum,tx)=>sum+signed(tx),0));}
  function remaining(project){return Math.max(0,Math.round((Number(project?.price||0)-paid(project))*100)/100);}
  function sessionById(id){return (window.state?.sessions||[]).find(item=>String(item.id)===String(id))||null;}

  function openFinalPayment(projectId){
    const project=Core.getProject(projectId);if(!project||project.status!=='Abgeschlossen')return;
    const due=remaining(project);if(due<=0||Number(project.price||0)<=0)return;
    try{Core.activateProjectTab('payments',{emit:false});}catch(_error){}

    const opened=window.TatneraPayments?.open?.(projectId,'');
    if(!opened){
      const button=[...document.querySelectorAll('[data-add-payment]')].find(item=>item.dataset.addPayment===projectId);
      if(!button)return;button.click();
    }

    const dialog=document.getElementById('paymentDialog'),form=document.getElementById('paymentForm');
    if(!dialog?.open||!form)return;
    form.elements.type.value='Restzahlung';
    form.elements.amount.value=due.toFixed(2);
    const hint=document.getElementById('paymentDialogHint');
    if(hint)hint.textContent=`Tattoo abgeschlossen · Restzahlung ${new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:2}).format(due)} · nach vollständiger Zahlung kann direkt die Rechnung erstellt werden.`;
  }

  function installFollowupStyle(){
    if(document.getElementById('followupAppointmentStyle'))return;
    const style=document.createElement('style');style.id='followupAppointmentStyle';style.textContent=`
      #appointmentDialog .followup-appointment-note{margin:0 0 14px;padding:12px 14px;border:1px solid color-mix(in srgb,var(--accent) 45%,var(--line));border-radius:12px;background:color-mix(in srgb,var(--accent) 8%,var(--panel-2));line-height:1.45}
      #appointmentDialog .followup-appointment-note strong{display:block;font-size:14px;margin-bottom:3px;color:var(--text)}
      #appointmentDialog .followup-appointment-note span{font-size:12px;color:var(--muted)}
    `;document.head.appendChild(style);
  }

  function openFollowupAppointment(projectId,sessionId){
    const project=Core.getProject(projectId);if(!project||project.status==='Abgeschlossen')return;
    const opener=typeof window.openAppointmentDialog==='function'?window.openAppointmentDialog:(typeof openAppointmentDialog==='function'?openAppointmentDialog:null);
    if(!opener)return;

    try{opener('',todayISO());}catch(error){console.error('TATNERA follow-up appointment could not open',error);return;}
    const dialog=document.getElementById('appointmentDialog'),form=document.getElementById('appointmentForm');if(!dialog||!form)return;
    const session=sessionById(sessionId);

    document.getElementById('followupAppointmentNote')?.remove();
    const note=document.createElement('div');note.id='followupAppointmentNote';note.className='followup-appointment-note';
    note.innerHTML=`<strong>Tattoo noch nicht abgeschlossen</strong><span>Lege direkt die nächste Sitzung für ${Core.esc(customerName(project.customerId))} · ${Core.esc(project.title)} fest. Wenn ihr noch keinen Termin vereinbart, kannst du das Fenster einfach schließen.</span>`;
    form.querySelector('.dialog-head')?.insertAdjacentElement('afterend',note);

    const title=document.getElementById('appointmentDialogTitle');if(title)title.textContent='Folgetermin vereinbaren';
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
    if(form.elements.date)form.elements.date.value='';
    form.elements.notes.value=`Folgesitzung · ${project.title}`;
    setTimeout(()=>form.elements.date?.focus(),0);
  }

  document.addEventListener('tatnera:data-changed',event=>{
    if(event.detail?.type!=='session-complete'||!event.detail?.projectId)return;
    const project=Core.getProject(event.detail.projectId);if(!project)return;
    if(project.status==='Abgeschlossen')setTimeout(()=>openFinalPayment(project.id),240);
    else setTimeout(()=>openFollowupAppointment(project.id,event.detail.sessionId||''),280);
  });

  document.addEventListener('click',event=>{
    if(event.target?.closest?.('#closeAppointmentDialog,#cancelAppointmentBtn'))setTimeout(()=>document.getElementById('followupAppointmentNote')?.remove(),0);
  });

  installFollowupStyle();
})();