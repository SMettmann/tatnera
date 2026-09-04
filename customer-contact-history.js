/* TATNERA — customer contact history
   Combines manual contact notes with appointment confirmations/reminders.
   Manual notes live inside the customer payload and therefore sync with the customer cloud record. */
(function(){
  'use strict';
  if(window.__tatneraCustomerContactHistoryInstalled)return;
  window.__tatneraCustomerContactHistoryInstalled=true;

  const Core=window.TatneraCore;
  const esc=Core?.esc||((value)=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])));

  function currentRoot(){return document.getElementById('customerDetail');}
  function currentCustomerId(){return currentRoot()?.dataset.customerId||'';}
  function customer(id){return (state.customers||[]).find(item=>item.id===id)||null;}
  function appointment(id){return (state.calendarEvents||[]).find(item=>item.id===id)||null;}
  function project(id){return (state.projects||[]).find(item=>item.id===id)||null;}
  function serviceLabel(event){
    const p=event?.projectId?project(event.projectId):null;
    if(p?.serviceType==='piercing'||event?.type==='piercing')return 'Piercing';
    if(event?.type==='consultation')return 'Beratung';
    if(event?.type==='touchup')return 'Nachstechen';
    return 'Tattoo';
  }
  function timestamp(value){
    if(!value)return '—';
    const date=new Date(value);if(Number.isNaN(date.getTime()))return String(value);
    return new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(date);
  }
  function appointmentLabel(event){
    if(!event?.date)return serviceLabel(event);
    const date=new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(`${event.date}T12:00:00`));
    return `${serviceLabel(event)} · ${date}${event.start?' · '+event.start+' Uhr':''}`;
  }
  function manualHistory(c){
    if(!Array.isArray(c.contactHistory))c.contactHistory=[];
    return c.contactHistory;
  }
  function authorLabel(){
    const auth=window.TatneraAuth;
    const user=auth?.user?.();
    const membership=auth?.membership?.();
    return String(membership?.profile?.display_name||user?.user_metadata?.display_name||user?.email||'').trim();
  }

  function itemsFor(customerId){
    const c=customer(customerId);if(!c)return [];
    const manual=manualHistory(c).map(entry=>({
      id:entry.id||'',kind:'manual',when:entry.createdAt||'',channel:entry.channel||'Kontakt',status:entry.status||'',note:entry.note||'',author:entry.author||''
    }));
    const automatic=[];
    for(const event of (state.calendarEvents||[]).filter(item=>item.customerId===customerId)){
      const comm=event.communication&&typeof event.communication==='object'?event.communication:null;
      if(comm?.confirmationSentAt)automatic.push({id:`confirmation-${event.id}`,kind:'confirmation',when:comm.confirmationSentAt,eventId:event.id,channel:'Terminbestätigung',status:'Gesendet',note:appointmentLabel(event),author:''});
      if(comm?.reminderSentAt)automatic.push({id:`reminder-${event.id}`,kind:'reminder',when:comm.reminderSentAt,eventId:event.id,channel:'Termin-Erinnerung',status:'Gesendet',note:appointmentLabel(event),author:''});
    }
    return [...manual,...automatic].sort((a,b)=>String(b.when||'').localeCompare(String(a.when||'')));
  }

  function installStyle(){
    if(document.getElementById('customerContactHistoryStyle'))return;
    const style=document.createElement('style');style.id='customerContactHistoryStyle';style.textContent=`
      .customer-contact-history{margin-top:14px}.customer-contact-history .panel-head{align-items:flex-start}
      .customer-contact-list{display:flex;flex-direction:column;gap:8px;margin-top:11px}
      .customer-contact-row{display:grid;grid-template-columns:34px minmax(0,1fr) auto;gap:10px;align-items:start;padding:11px 12px;border:1px solid var(--line);border-radius:11px;background:var(--panel-2)}
      .customer-contact-icon{width:34px;height:34px;display:grid;place-items:center;border:1px solid var(--line);border-radius:10px;background:var(--panel);font-size:14px}
      .customer-contact-main strong,.customer-contact-main span,.customer-contact-main small{display:block}.customer-contact-main strong{font-size:11px}.customer-contact-main span{font-size:10px;color:var(--muted);margin-top:3px;line-height:1.45}.customer-contact-main small{font-size:8.5px;color:var(--muted);margin-top:5px}
      .customer-contact-side{display:flex;align-items:center;gap:6px;justify-content:flex-end;flex-wrap:wrap}.customer-contact-status{font-size:8.5px;padding:4px 7px;border:1px solid var(--line);border-radius:999px;color:var(--muted);white-space:nowrap}
      .customer-contact-side .btn{padding:6px 8px;font-size:9px}.customer-contact-empty{padding:14px;border:1px dashed var(--line);border-radius:11px;color:var(--muted);font-size:10px}
      .customer-contact-dialog{width:min(600px,calc(100vw - 28px))}.customer-contact-form{padding:0 22px 22px}.customer-contact-form .form-grid{margin-top:10px}.customer-contact-form textarea{min-height:110px}
      @media(max-width:650px){.customer-contact-row{grid-template-columns:34px 1fr}.customer-contact-side{grid-column:2;justify-content:flex-start}.customer-contact-history .panel-head{display:block}.customer-contact-history .panel-head .btn{width:100%;margin-top:10px}}
    `;document.head.appendChild(style);
  }

  function iconFor(item){
    if(item.kind==='confirmation')return '✓';
    if(item.kind==='reminder')return '↻';
    return ({WhatsApp:'◉',Telefon:'☎','E-Mail':'@',Persönlich:'●',Instagram:'◎',Sonstiges:'•'})[item.channel]||'•';
  }

  function render(customerId=currentCustomerId()){
    const root=currentRoot();if(!root||!customerId||root.dataset.customerId!==customerId)return;
    root.querySelector('[data-customer-contact-history]')?.remove();
    const c=customer(customerId);if(!c)return;
    const items=itemsFor(customerId);
    const section=document.createElement('section');section.className='detail-card customer-contact-history';section.dataset.customerContactHistory=customerId;
    section.innerHTML=`<div class="panel-head"><div><span class="eyebrow">Kommunikation</span><h3>Kontaktverlauf</h3><p class="muted">Terminbestätigungen, Erinnerungen und persönliche Kontakt-Notizen an einem Ort.</p></div><button type="button" class="btn primary" data-add-customer-contact="${esc(customerId)}">+ Kontakt notieren</button></div><div class="customer-contact-list">${items.length?items.map(item=>`<div class="customer-contact-row"><div class="customer-contact-icon">${esc(iconFor(item))}</div><div class="customer-contact-main"><strong>${esc(item.channel||'Kontakt')}</strong><span>${esc(item.note||'Keine Notiz')}</span><small>${esc(timestamp(item.when))}${item.author?' · '+esc(item.author):''}</small></div><div class="customer-contact-side">${item.status?`<span class="customer-contact-status">${esc(item.status)}</span>`:''}${item.eventId?`<button type="button" class="btn ghost" data-open-contact-event="${esc(item.eventId)}">Termin öffnen</button>`:''}${item.kind==='manual'?`<button type="button" class="btn ghost" data-delete-customer-contact="${esc(item.id)}" data-customer-id="${esc(customerId)}">Löschen</button>`:''}</div></div>`).join(''):'<div class="customer-contact-empty">Noch kein Kontakt dokumentiert. Terminbestätigungen und Erinnerungen erscheinen hier automatisch.</div>'}</div>`;
    root.appendChild(section);
  }

  function ensureDialog(){
    let dialog=document.getElementById('customerContactDialog');if(dialog)return dialog;
    dialog=document.createElement('dialog');dialog.id='customerContactDialog';dialog.className='dialog customer-contact-dialog';
    dialog.innerHTML=`<div><div class="dialog-head"><div><span class="eyebrow">Kundenkontakt</span><h2>Kontakt notieren</h2><p class="muted" data-contact-customer-name></p></div><button type="button" class="close-btn" data-close-customer-contact>×</button></div><form class="customer-contact-form" id="customerContactForm"><input type="hidden" name="customerId"><div class="form-grid"><label>Kontaktweg<select name="channel"><option>WhatsApp</option><option>Telefon</option><option>E-Mail</option><option>Persönlich</option><option>Instagram</option><option>Sonstiges</option></select></label><label>Ergebnis<select name="status"><option>Info gesendet</option><option>Erreicht</option><option>Keine Antwort</option><option>Rückruf offen</option><option>Termin besprochen</option><option>Erledigt</option></select></label><label class="full">Notiz<textarea name="note" required placeholder="Kurz festhalten, was besprochen oder verschickt wurde …"></textarea></label></div><div class="dialog-actions"><button type="button" class="btn ghost" data-close-customer-contact>Abbrechen</button><button type="submit" class="btn primary">Kontakt speichern</button></div></form></div>`;
    document.body.appendChild(dialog);
    dialog.querySelectorAll('[data-close-customer-contact]').forEach(button=>button.addEventListener('click',()=>dialog.close()));
    dialog.querySelector('#customerContactForm').addEventListener('submit',saveManualContact);
    return dialog;
  }

  function openDialog(customerId){
    const c=customer(customerId);if(!c)return;
    const dialog=ensureDialog(),form=dialog.querySelector('#customerContactForm');form.reset();form.elements.customerId.value=customerId;
    dialog.querySelector('[data-contact-customer-name]').textContent=`${c.firstName||''} ${c.lastName||''}`.trim();
    if(!dialog.open)dialog.showModal();
    setTimeout(()=>form.elements.note?.focus(),0);
  }

  function saveManualContact(event){
    event.preventDefault();const form=event.currentTarget,data=Object.fromEntries(new FormData(form).entries()),c=customer(data.customerId);if(!c)return;
    const note=String(data.note||'').trim();if(!note){form.elements.note.reportValidity();return;}
    manualHistory(c).unshift({id:`contact-${Date.now()}`,channel:String(data.channel||'Sonstiges'),status:String(data.status||''),note,createdAt:new Date().toISOString(),author:authorLabel()});
    persist();
    document.dispatchEvent(new CustomEvent('tatnera:data-changed',{detail:{type:'customer-contact',customerId:c.id}}));
    document.getElementById('customerContactDialog')?.close();
    setTimeout(()=>render(c.id),0);
  }

  function deleteManualContact(customerId,entryId){
    const c=customer(customerId);if(!c)return;
    const history=manualHistory(c),entry=history.find(item=>item.id===entryId);if(!entry)return;
    if(!confirm('Diese Kontakt-Notiz wirklich löschen?'))return;
    c.contactHistory=history.filter(item=>item.id!==entryId);
    persist();
    document.dispatchEvent(new CustomEvent('tatnera:data-changed',{detail:{type:'customer-contact-delete',customerId}}));
    setTimeout(()=>render(customerId),0);
  }

  document.addEventListener('click',event=>{
    const add=event.target.closest('[data-add-customer-contact]');if(add){event.preventDefault();openDialog(add.dataset.addCustomerContact);return;}
    const open=event.target.closest('[data-open-contact-event]');if(open){event.preventDefault();if(typeof openAppointmentDialog==='function')openAppointmentDialog(open.dataset.openContactEvent);return;}
    const remove=event.target.closest('[data-delete-customer-contact]');if(remove){event.preventDefault();deleteManualContact(remove.dataset.customerId,remove.dataset.deleteCustomerContact);}
  });

  document.addEventListener('tatnera:customer-opened',event=>setTimeout(()=>render(event.detail?.customerId||currentCustomerId()),0));
  document.addEventListener('tatnera:data-changed',event=>{
    const id=currentCustomerId();if(!id||state?.currentView!=='customer-detail')return;
    if(event.detail?.customerId&&event.detail.customerId!==id)return;
    setTimeout(()=>render(id),0);
  });
  document.addEventListener('tatnera:runtime-refresh',()=>{const id=currentCustomerId();if(id&&state?.currentView==='customer-detail')setTimeout(()=>render(id),0);});

  installStyle();
  ensureDialog();
  setTimeout(()=>{const id=currentCustomerId();if(id&&state?.currentView==='customer-detail')render(id);},350);
  window.TatneraCustomerContact={render,open:openDialog};
})();