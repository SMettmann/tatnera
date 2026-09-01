/* TATNERA — Nachstech-Termin: Dialog zuerst, Navigation erst nach Speichern */
(function(){
  function isoToday(){
    const d=new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function addDaysISO(value,days){
    const d=new Date((value||isoToday())+'T12:00:00');
    d.setDate(d.getDate()+days);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function suggestedTouchupDate(project){
    if(project.aftercare?.followupDate) return project.aftercare.followupDate;
    const tattooDates=(state.calendarEvents||[])
      .filter(e=>e.projectId===project.id&&e.type==='tattoo')
      .map(e=>e.date)
      .sort();
    return addDaysISO(tattooDates.at(-1)||isoToday(),42);
  }

  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-plan-touchup]');
    if(!button) return;

    // Verhindert den bisherigen aftercare.js-Handler, der sofort zum Kalender navigiert.
    event.preventDefault();
    event.stopImmediatePropagation();

    const projectId=button.dataset.planTouchup;
    const project=state.projects.find(p=>p.id===projectId);
    if(!project||typeof openAppointmentDialog!=='function') return;

    const date=suggestedTouchupDate(project);

    // Wichtig: Tattoo-Akte bleibt im Hintergrund geöffnet.
    openAppointmentDialog('',date);

    const dialog=document.getElementById('appointmentDialog');
    const form=document.getElementById('appointmentForm');
    if(!dialog||!form) return;

    form.elements.type.value='touchup';
    form.elements.artist.value=project.artist||form.elements.artist.value;
    form.elements.customerId.value=project.customerId||'';
    form.elements.projectId.value=project.id;
    form.elements.status.value='Angefragt';
    form.elements.duration.value=60;
    form.elements.notes.value='Nachstechen / Heilungskontrolle';

    let submitted=false;

    const handleSubmit=()=>{
      submitted=true;
      // Der normale Kalender-Handler speichert zuerst den Termin.
      setTimeout(()=>{
        const current=state.projects.find(p=>p.id===projectId);
        if(current){
          current.aftercare=current.aftercare||{records:[]};
          current.aftercare.status='Nachstechen geplant';
          current.aftercare.followupDate=date;
          persist();
        }
        state.calendar.anchor=date;
        state.calendar.view='day';
        navigate('calendar');
      },0);
    };

    const handleClose=()=>{
      // X / Abbrechen: keinerlei Statusänderung und keine Navigation.
      if(!submitted) form.removeEventListener('submit',handleSubmit);
    };

    form.addEventListener('submit',handleSubmit,{once:true});
    dialog.addEventListener('close',handleClose,{once:true});
  },true);
})();
