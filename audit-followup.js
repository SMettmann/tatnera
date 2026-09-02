/* TATNERA — final audit follow-up */
(function(){
  function updateCurrentDate(){
    const label=document.querySelector('.topbar .eyebrow');if(!label)return;
    const text=new Intl.DateTimeFormat('de-DE',{weekday:'long',day:'numeric',month:'long'}).format(new Date());
    label.textContent=text.charAt(0).toUpperCase()+text.slice(1);
  }

  function removeOpenRequest(request){
    if(!request||!state.requests?.some(item=>item.id===request.id))return;
    const archive=JSON.parse(localStorage.getItem('tatnera_request_archive')||'[]');
    archive.unshift({...request,stage:'done',completedAt:new Date().toISOString()});
    localStorage.setItem('tatnera_request_archive',JSON.stringify(archive.slice(0,250)));
    state.requests=state.requests.filter(item=>item.id!==request.id);
    localStorage.setItem('tatnera_requests',JSON.stringify(state.requests));

    const card=document.querySelector(`[data-open-request="${request.id}"]`)?.closest('.request-card');
    const column=card?.closest('.request-column');
    card?.remove();
    if(column){
      const count=column.querySelectorAll('.request-card').length;
      const badge=column.querySelector('.column-head span');if(badge)badge.textContent=String(count);
      if(!count&&!column.querySelector('.request-empty-column'))column.insertAdjacentHTML('beforeend','<div class="request-empty-column">Keine Anfragen</div>');
    }
    document.querySelectorAll('.nav-item[data-view="requests"] .badge').forEach(badge=>badge.textContent=String(state.requests.length));
  }

  function installCalendarRequestCompletion(){
    const form=document.getElementById('appointmentForm');if(!form)return;
    form.addEventListener('submit',()=>{
      // Wird der Termin direkt aus dem Anfrage-Dialog geplant, übernimmt audit-fixes.js den Abschluss.
      // Dadurch wird dieselbe Anfrage nicht doppelt archiviert.
      if(document.getElementById('requestDetailDialog')?.open)return;
      const projectId=form.elements.projectId.value;
      if(!projectId)return;
      const linked=state.requests?.find(request=>request.projectId===projectId);
      if(!linked)return;
      setTimeout(()=>removeOpenRequest(linked),0);
    },true);
  }

  updateCurrentDate();
  installCalendarRequestCompletion();
})();