/* TATNERA — appointment communication workflow
   One-click WhatsApp / email / copy actions for appointment confirmations and reminders.
   Communication status is stored on each appointment and therefore travels with cloud payload sync. */
(function(){
  'use strict';
  if(window.__tatneraAppointmentCommunicationInstalled)return;
  window.__tatneraAppointmentCommunicationInstalled=true;

  const Core=window.TatneraCore;
  const esc=Core?.esc||((value)=>String(value??''));
  const today=()=>typeof todayISO==='function'?todayISO():new Date().toISOString().slice(0,10);

  function addDaysIso(iso,days){
    const date=new Date(`${iso}T12:00:00`);date.setDate(date.getDate()+days);
    const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  }
  function appointment(id){return (state.calendarEvents||[]).find(item=>item.id===id)||null;}
  function customer(event){return (state.customers||[]).find(item=>item.id===event?.customerId)||null;}
  function project(event){return (state.projects||[]).find(item=>item.id===event?.projectId)||null;}
  function isCancelled(event){return /abgesagt|storniert|block/i.test(String(event?.status||''))||event?.type==='block';}
  function communication(event){
    if(!event.communication||typeof event.communication!=='object')event.communication={confirmationSentAt:'',reminderSentAt:''};
    if(!('confirmationSentAt' in event.communication))event.communication.confirmationSentAt='';
    if(!('reminderSentAt' in event.communication))event.communication.reminderSentAt='';
    return event.communication;
  }
  function serviceLabel(event){
    const p=project(event);
    if(p?.serviceType==='piercing'||event?.type==='piercing')return 'Piercing';
    if(event?.type==='consultation')return 'Beratungs';
    if(event?.type==='touchup')return 'Nachstech';
    return 'Tattoo';
  }
  function dateLong(value){
    if(!value)return '—';
    return new Intl.DateTimeFormat('de-DE',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(`${value}T12:00:00`));
  }
  function dateShort(value){
    if(!value)return '—';
    return new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(`${value}T12:00:00`));
  }
  function timestamp(value){
    if(!value)return 'Noch nicht gesendet';
    const date=new Date(value);if(Number.isNaN(date.getTime()))return 'Gesendet';
    return `Gesendet · ${new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(date)}`;
  }
  function studioName(){return String(window.TatneraStudio?.getName?.()||'').trim()||'unserem Studio';}
  function displayCustomer(event){
    const c=customer(event);return c?`${c.firstName||''} ${c.lastName||''}`.trim():'Kunde';
  }
  function messageFor(event,kind){
    const c=customer(event),p=project(event),first=String(c?.firstName||'').trim()||'Hallo',studio=studioName(),service=serviceLabel(event),artist=String(event.artist||'').trim(),topic=String(p?.title||event.notes||'').trim();
    const greeting=c?.firstName?`Hallo ${first},`:'Hallo,';
    const artistPart=artist?` bei ${artist}`:'';
    const topicPart=topic?`\nThema: ${topic}.`:'';
    if(kind==='reminder')return `${greeting}\n\nkurze Erinnerung an deinen ${service}-Termin bei ${studio} am ${dateLong(event.date)} um ${event.start||'—'} Uhr${artistPart}.${topicPart}\n\nFalls sich etwas geändert hat, gib uns bitte kurz Bescheid. Wir freuen uns auf dich!\n\nLiebe Grüße\n${studio}`;
    return `${greeting}\n\nhiermit bestätigen wir deinen ${service}-Termin bei ${studio} am ${dateLong(event.date)} um ${event.start||'—'} Uhr${artistPart}.${topicPart}\n\nFalls du den Termin nicht wahrnehmen kannst, gib uns bitte möglichst früh Bescheid.\n\nLiebe Grüße\n${studio}`;
  }
  function subjectFor(event,kind){return `${kind==='reminder'?'Erinnerung':'Terminbestätigung'} · ${dateShort(event.date)} · ${event.start||''}`.trim();}
  function whatsappNumber(phone){
    let value=String(phone||'').replace(/[^\d+]/g,'');
    if(value.startsWith('00'))value='+'+value.slice(2);
    if(value.startsWith('0'))value='+49'+value.slice(1);
    return value.replace(/\D/g,'');
  }
  async function copyText(text){
    try{await navigator.clipboard.writeText(text);return true;}catch(_error){}
    const area=document.createElement('textarea');area.value=text;area.style.position='fixed';area.style.opacity='0';document.body.appendChild(area);area.select();
    let ok=false;try{ok=document.execCommand('copy');}catch(_error){}area.remove();return ok;
  }

  function markSent(eventId,kind){
    const event=appointment(eventId);if(!event)return;
    const comm=communication(event),key=kind==='reminder'?'reminderSentAt':'confirmationSentAt';
    comm[key]=new Date().toISOString();
    persist();
    document.dispatchEvent(new CustomEvent('tatnera:data-changed',{detail:{type:'appointment-communication',eventId,communicationKind:kind,projectId:event.projectId||'',customerId:event.customerId||''}}));
    refresh();
    renderEditPanel(eventId);
  }

  function pendingItems(){
    const start=today(),tomorrow=addDaysIso(start,1);
    return (state.calendarEvents||[]).filter(event=>event.customerId&&!isCancelled(event)&&event.date>start).sort((a,b)=>a.date.localeCompare(b.date)||String(a.start).localeCompare(String(b.start))).map(event=>{
      const comm=communication(event);
      if(!comm.confirmationSentAt)return {event,kind:'confirmation'};
      if(event.date===tomorrow&&!comm.reminderSentAt)return {event,kind:'reminder'};
      return null;
    }).filter(Boolean);
  }

  function installStyle(){
    if(document.getElementById('appointmentCommunicationStyle'))return;
    const style=document.createElement('style');style.id='appointmentCommunicationStyle';style.textContent=`
      .appointment-communication-panel{grid-column:1/-1;margin-top:4px;padding:14px;border:1px solid var(--line);border-radius:12px;background:var(--panel-2)}
      .appointment-communication-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:11px}.appointment-communication-head h3{margin:2px 0 3px;font-size:14px}.appointment-communication-head p{margin:0;font-size:10px;color:var(--muted)}
      .appointment-communication-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.appointment-communication-item{padding:11px;border:1px solid var(--line);border-radius:10px;background:var(--panel)}
      .appointment-communication-item strong,.appointment-communication-item small{display:block}.appointment-communication-item strong{font-size:11px}.appointment-communication-item small{margin-top:4px;color:var(--muted);font-size:9px}.appointment-communication-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}.appointment-communication-actions .btn{padding:7px 9px;font-size:10px}
      .communication-message-dialog{width:min(680px,calc(100vw - 28px))}.communication-message-body{padding:0 22px 22px}.communication-message-meta{display:flex;gap:7px;flex-wrap:wrap;margin:0 0 12px}.communication-message-meta span{padding:5px 8px;border:1px solid var(--line);border-radius:999px;font-size:9px;color:var(--muted)}
      .communication-message-text{width:100%;min-height:180px;resize:vertical;border:1px solid var(--line);border-radius:11px;background:var(--panel-2);color:var(--text);padding:12px;font:inherit;font-size:11px;line-height:1.55}.communication-message-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.communication-message-actions .btn[disabled]{opacity:.45;cursor:not-allowed}
      .dashboard-communication-row>div:first-child strong,.dashboard-communication-row>div:first-child span{display:block}.dashboard-communication-row>div:first-child span{margin-top:3px;font-size:9px;color:var(--muted)}.dashboard-communication-kind{text-align:right;font-size:9px;color:var(--muted)}.dashboard-communication-date{text-align:right;font-size:10px;font-weight:850;margin-top:3px;white-space:nowrap}
      @media(max-width:700px){.appointment-communication-grid{grid-template-columns:1fr}.communication-message-actions .btn{flex:1}.appointment-communication-head{display:block}}
    `;document.head.appendChild(style);
  }

  function ensureMessageDialog(){
    let dialog=document.getElementById('appointmentCommunicationDialog');if(dialog)return dialog;
    dialog=document.createElement('dialog');dialog.id='appointmentCommunicationDialog';dialog.className='dialog communication-message-dialog';
    dialog.innerHTML=`<div><div class="dialog-head"><div><span class="eyebrow" data-communication-eyebrow>Kundenkommunikation</span><h2 data-communication-title>Terminbestätigung</h2><p class="muted" data-communication-recipient></p></div><button type="button" class="close-btn" data-close-communication>×</button></div><div class="communication-message-body"><div class="communication-message-meta" data-communication-meta></div><textarea class="communication-message-text" data-communication-message></textarea><div class="communication-message-actions"><button type="button" class="btn ghost" data-communication-whatsapp>WhatsApp öffnen</button><button type="button" class="btn ghost" data-communication-email>E-Mail öffnen</button><button type="button" class="btn ghost" data-communication-copy>Text kopieren</button><button type="button" class="btn primary" data-communication-mark>Als gesendet markieren</button></div></div></div>`;
    document.body.appendChild(dialog);
    dialog.querySelector('[data-close-communication]').addEventListener('click',()=>dialog.close());
    return dialog;
  }

  function openMessage(eventId,kind='confirmation'){
    const event=appointment(eventId),c=customer(event);if(!event||!c)return;
    const dialog=ensureMessageDialog(),text=messageFor(event,kind),phone=whatsappNumber(c.phone),email=String(c.email||'').trim();
    dialog.dataset.eventId=eventId;dialog.dataset.kind=kind;
    dialog.querySelector('[data-communication-title]').textContent=kind==='reminder'?'Termin-Erinnerung':'Terminbestätigung';
    dialog.querySelector('[data-communication-recipient]').textContent=`${displayCustomer(event)} · ${c.phone||c.email||'Keine Kontaktdaten hinterlegt'}`;
    dialog.querySelector('[data-communication-meta]').innerHTML=`<span>${esc(serviceLabel(event))}</span><span>${esc(dateShort(event.date))} · ${esc(event.start||'—')} Uhr</span><span>${esc(event.artist||'Kein Artist')}</span>`;
    const textarea=dialog.querySelector('[data-communication-message]');textarea.value=text;
    const whatsapp=dialog.querySelector('[data-communication-whatsapp]'),mail=dialog.querySelector('[data-communication-email]');
    whatsapp.disabled=!phone;mail.disabled=!email;
    whatsapp.onclick=()=>{if(!phone)return;window.open(`https://wa.me/${phone}?text=${encodeURIComponent(textarea.value)}`,'_blank','noopener');};
    mail.onclick=()=>{if(!email)return;window.location.href=`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subjectFor(event,kind))}&body=${encodeURIComponent(textarea.value)}`;};
    dialog.querySelector('[data-communication-copy]').onclick=async eventClick=>{const ok=await copyText(textarea.value);const button=eventClick.currentTarget,old=button.textContent;button.textContent=ok?'Kopiert ✓':'Kopieren fehlgeschlagen';setTimeout(()=>button.textContent=old,1400);};
    dialog.querySelector('[data-communication-mark]').onclick=()=>{markSent(eventId,kind);dialog.close();document.getElementById('dashboardCommunicationListDialog')?.close();};
    if(!dialog.open)dialog.showModal();
  }

  function renderEditPanel(eventId){
    const form=document.getElementById('appointmentForm'),event=appointment(eventId);if(!form||!eventId||!event||event.type==='block')return;
    form.querySelector('[data-appointment-communication-panel]')?.remove();
    const c=customer(event);if(!c)return;
    const comm=communication(event),actions=form.querySelector('.dialog-actions');if(!actions)return;
    const panel=document.createElement('section');panel.className='appointment-communication-panel';panel.dataset.appointmentCommunicationPanel='true';
    panel.innerHTML=`<div class="appointment-communication-head"><div><span class="eyebrow">Kunde informieren</span><h3>Kundenkommunikation</h3><p>${esc(c.phone||'Keine Telefonnummer')} · ${esc(c.email||'Keine E-Mail')}</p></div></div><div class="appointment-communication-grid"><div class="appointment-communication-item"><strong>Terminbestätigung</strong><small>${esc(timestamp(comm.confirmationSentAt))}</small><div class="appointment-communication-actions"><button type="button" class="btn ghost" data-open-communication="confirmation">Nachricht öffnen</button>${comm.confirmationSentAt?'':'<button type="button" class="btn ghost" data-mark-communication="confirmation">Als gesendet</button>'}</div></div><div class="appointment-communication-item"><strong>Termin-Erinnerung</strong><small>${esc(timestamp(comm.reminderSentAt))}</small><div class="appointment-communication-actions"><button type="button" class="btn ghost" data-open-communication="reminder">Nachricht öffnen</button>${comm.reminderSentAt?'':'<button type="button" class="btn ghost" data-mark-communication="reminder">Als gesendet</button>'}</div></div></div>`;
    actions.insertAdjacentElement('beforebegin',panel);
    panel.querySelectorAll('[data-open-communication]').forEach(button=>button.addEventListener('click',()=>openMessage(eventId,button.dataset.openCommunication)));
    panel.querySelectorAll('[data-mark-communication]').forEach(button=>button.addEventListener('click',()=>markSent(eventId,button.dataset.markCommunication)));
  }

  function wrapAppointmentDialog(){
    if(typeof window.openAppointmentDialog!=='function')return;
    const current=window.openAppointmentDialog;if(current.__tatneraCommunicationWrapper)return;
    const wrapped=function(eventId='',date=''){
      const result=current.apply(this,arguments);
      if(eventId)requestAnimationFrame(()=>requestAnimationFrame(()=>renderEditPanel(eventId)));
      return result;
    };
    wrapped.__tatneraCommunicationWrapper=true;wrapped.__tatneraPrevious=current;
    window.openAppointmentDialog=wrapped;
    try{openAppointmentDialog=wrapped;}catch(_error){}
  }

  function ensureDashboardTask(){
    const grid=document.querySelector('#dashboard .cockpit-task-grid');if(!grid)return;
    let button=grid.querySelector('[data-dashboard-communication-task]');
    if(!button){button=document.createElement('button');button.type='button';button.dataset.dashboardCommunicationTask='true';button.innerHTML='<span>Termin-Nachrichten</span><strong data-dashboard-communication-count>0</strong><small>Bestätigungen & Erinnerungen</small>';grid.appendChild(button);}
    const items=pendingItems(),count=items.length,reminders=items.filter(item=>item.kind==='reminder').length;
    button.querySelector('[data-dashboard-communication-count]').textContent=String(count);
    const small=button.querySelector('small');if(small)small.textContent=!count?'alles erledigt':reminders?`${reminders} Erinnerung${reminders===1?'':'en'} fällig`:'Bestätigungen offen';
  }

  function ensureListDialog(){
    let dialog=document.getElementById('dashboardCommunicationListDialog');if(dialog)return dialog;
    dialog=document.createElement('dialog');dialog.id='dashboardCommunicationListDialog';dialog.className='dialog dashboard-action-dialog';
    dialog.innerHTML=`<div><div class="dialog-head"><div><span class="eyebrow">Dashboard</span><h2>Termin-Nachrichten</h2><p class="muted" data-dashboard-communication-meta></p></div><button type="button" class="close-btn" data-close-communication-list>×</button></div><div class="dashboard-action-list" data-dashboard-communication-list></div><div class="dialog-actions"><button type="button" class="btn ghost" data-close-communication-list>Schließen</button></div></div>`;
    document.body.appendChild(dialog);dialog.querySelectorAll('[data-close-communication-list]').forEach(button=>button.addEventListener('click',()=>dialog.close()));return dialog;
  }
  function openList(){
    const dialog=ensureListDialog(),items=pendingItems(),meta=dialog.querySelector('[data-dashboard-communication-meta]'),list=dialog.querySelector('[data-dashboard-communication-list]');
    if(meta)meta.textContent=items.length?`${items.length} Kundennachricht${items.length===1?'':'en'} warten auf dich.`:'Aktuell ist keine Kundennachricht offen.';
    if(list)list.innerHTML=items.map(item=>{const event=item.event,c=customer(event),p=project(event);return `<button type="button" class="dashboard-action-row dashboard-communication-row" data-dashboard-communication-event="${esc(event.id)}" data-dashboard-communication-kind="${item.kind}"><div><strong>${esc(c?`${c.firstName||''} ${c.lastName||''}`.trim():'Kunde')}</strong><span>${esc(p?.title||serviceLabel(event))} · ${esc(event.artist||'—')}</span></div><div><small class="dashboard-communication-kind">${item.kind==='reminder'?'Erinnerung':'Bestätigung'}</small><div class="dashboard-communication-date">${esc(dateShort(event.date))} · ${esc(event.start||'—')}</div></div><span>→</span></button>`;}).join('')||'<div class="dashboard-action-empty">Alles erledigt.</div>';
    if(!dialog.open)dialog.showModal();
  }

  function refresh(){installStyle();wrapAppointmentDialog();ensureDashboardTask();}

  document.addEventListener('click',event=>{
    const task=event.target.closest('[data-dashboard-communication-task]');if(task){event.preventDefault();openList();return;}
    const row=event.target.closest('[data-dashboard-communication-event]');if(row){event.preventDefault();openMessage(row.dataset.dashboardCommunicationEvent,row.dataset.dashboardCommunicationKind);return;}
  });
  document.addEventListener('tatnera:runtime-refresh',()=>setTimeout(refresh,0));
  document.addEventListener('tatnera:data-changed',()=>setTimeout(refresh,0));
  document.addEventListener('tatnera:auth-ready',()=>setTimeout(refresh,350));
  document.addEventListener('tatnera:studio-changed',()=>setTimeout(refresh,0));
  window.addEventListener('popstate',()=>setTimeout(refresh,0));

  refresh();setTimeout(refresh,500);setTimeout(wrapAppointmentDialog,1000);
  window.TatneraAppointmentCommunication={open:openMessage,pending:pendingItems,markSent};
})();
