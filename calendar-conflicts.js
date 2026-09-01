/* TATNERA — Kalender-Konfliktprüfung */
(function(){
  let bypassOnce=false;
  let pendingForm=null;

  function minutes(time){
    const [h,m]=String(time||'00:00').split(':').map(Number);
    return (h||0)*60+(m||0);
  }

  function endMinutes(event){
    return minutes(event.start)+Number(event.duration||0);
  }

  function eventLabel(event){
    const project=event.projectId&&typeof projectName==='function'?projectName(event.projectId):'';
    const customer=event.customerId&&typeof customerName==='function'?customerName(event.customerId):'';
    const type=typeof eventTypeLabel==='function'?eventTypeLabel(event.type):event.type;
    return project||customer||type||'Termin';
  }

  function conflictsFor(payload){
    const start=minutes(payload.start);
    const end=start+Number(payload.duration||0);
    return (state.calendarEvents||[])
      .filter(event=>event.id!==payload.id)
      .filter(event=>event.date===payload.date&&event.artist===payload.artist)
      .filter(event=>start<endMinutes(event)&&minutes(event.start)<end)
      .sort((a,b)=>a.start.localeCompare(b.start));
  }

  function ensureDialog(){
    if(document.getElementById('calendarConflictDialog'))return;
    const dialog=document.createElement('dialog');
    dialog.id='calendarConflictDialog';
    dialog.className='dialog';
    dialog.innerHTML=`<div style="padding:22px">
      <div class="dialog-head">
        <div><span class="eyebrow">Terminkonflikt</span><h2>Artist bereits belegt</h2><p class="muted" id="calendarConflictIntro"></p></div>
        <button type="button" class="close-btn" id="calendarConflictClose">×</button>
      </div>
      <div id="calendarConflictList" style="display:flex;flex-direction:column;gap:9px"></div>
      <div style="margin-top:16px;padding:12px;border:1px solid #5a4632;background:#1b1712;border-radius:12px;color:#d8d0c5;font-size:12px;line-height:1.55">Du kannst die Doppelbelegung bewusst trotzdem speichern. TATNERA verhindert nur, dass sie unbemerkt entsteht.</div>
      <div class="dialog-actions"><button type="button" class="btn ghost" id="calendarConflictBack">Zurück</button><button type="button" class="btn primary" id="calendarConflictSave">Trotzdem speichern</button></div>
    </div>`;
    document.body.appendChild(dialog);

    const close=()=>{pendingForm=null;dialog.close();};
    document.getElementById('calendarConflictClose').addEventListener('click',close);
    document.getElementById('calendarConflictBack').addEventListener('click',close);
    document.getElementById('calendarConflictSave').addEventListener('click',()=>{
      const form=pendingForm;
      pendingForm=null;
      dialog.close();
      if(!form)return;
      bypassOnce=true;
      form.requestSubmit();
    });
  }

  function install(){
    ensureDialog();
    const form=document.getElementById('appointmentForm');
    if(!form)return;

    form.addEventListener('submit',event=>{
      if(bypassOnce){bypassOnce=false;return;}

      const data=Object.fromEntries(new FormData(form).entries());
      const payload={
        id:data.eventId||'',
        date:data.date,
        start:data.start,
        duration:Number(data.duration||0),
        artist:data.artist
      };
      const conflicts=conflictsFor(payload);
      if(!conflicts.length)return;

      event.preventDefault();
      event.stopImmediatePropagation();
      pendingForm=form;

      const newEnd=minutes(payload.start)+payload.duration;
      const endText=`${String(Math.floor(newEnd/60)%24).padStart(2,'0')}:${String(newEnd%60).padStart(2,'0')}`;
      document.getElementById('calendarConflictIntro').textContent=`${payload.artist} ist am ${new Intl.DateTimeFormat('de-DE').format(new Date(payload.date+'T12:00:00'))} während ${payload.start}–${endText} bereits belegt.`;
      document.getElementById('calendarConflictList').innerHTML=conflicts.map(conflict=>`<div style="display:grid;grid-template-columns:100px 1fr auto;gap:12px;align-items:center;padding:13px;border:1px solid var(--line);border-radius:12px;background:#19191c"><strong>${conflict.start}–${typeof eventEnd==='function'?eventEnd(conflict.start,conflict.duration):''}</strong><div><strong style="display:block">${eventLabel(conflict)}</strong><span class="muted" style="font-size:11px">${conflict.notes||conflict.status||''}</span></div><span class="status-pill">${conflict.type==='block'?'Blockzeit':(typeof eventTypeLabel==='function'?eventTypeLabel(conflict.type):conflict.type)}</span></div>`).join('');
      document.getElementById('calendarConflictDialog').showModal();
    },true);
  }

  install();
})();
