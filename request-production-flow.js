/* TATNERA — production workflow: Anfrage -> Kunde -> Akte -> Termin */
(function(){
  'use strict';
  if(window.__tatneraRequestProductionFlowInstalled)return;
  window.__tatneraRequestProductionFlowInstalled=true;

  let currentRequestId='';
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const typeOf=request=>request?.serviceType==='piercing'?'piercing':'tattoo';
  const labelOf=request=>typeOf(request)==='piercing'?'Piercing':'Tattoo';
  const subjectOf=request=>typeOf(request)==='piercing'?(request?.piercingType||request?.motif||'Piercing'):(request?.motif||'Tattoo');
  const nameOf=request=>`${request?.firstName||''} ${request?.lastName||''}`.trim()||'Kunde';
  const normalizePhone=value=>String(value||'').replace(/\D/g,'');

  function requestById(id){
    return Array.isArray(state?.requests)?state.requests.find(item=>item.id===id):null;
  }

  function saveRequests(){
    try{localStorage.setItem('tatnera_requests',JSON.stringify(state.requests||[]));}catch(_error){}
    document.dispatchEvent(new CustomEvent('tatnera:data-changed',{detail:{type:'request'}}));
    try{window.TatneraRequests?.render?.();}catch(_error){}
  }

  function ensureCustomer(request){
    if(request.customerId&&state.customers.some(customer=>customer.id===request.customerId)){
      return state.customers.find(customer=>customer.id===request.customerId);
    }

    const email=String(request.email||'').trim().toLowerCase();
    const phone=normalizePhone(request.phone);
    let customer=state.customers.find(item=>
      (email&&String(item.email||'').trim().toLowerCase()===email)||
      (phone&&normalizePhone(item.phone)===phone)
    );

    if(!customer){
      customer={
        id:'c'+Date.now(),
        firstName:request.firstName||'',
        lastName:request.lastName||'',
        email:request.email||'',
        phone:request.phone||'',
        notes:`Aus ${labelOf(request)}-Anfrage: ${subjectOf(request)}`,
        lastProject:'—',
        next:'—',
        status:'Neu'
      };
      state.customers.unshift(customer);
    }else{
      if(!customer.firstName&&request.firstName)customer.firstName=request.firstName;
      if(!customer.lastName&&request.lastName)customer.lastName=request.lastName;
      if(!customer.email&&request.email)customer.email=request.email;
      if(!customer.phone&&request.phone)customer.phone=request.phone;
    }

    request.customerId=customer.id;
    return customer;
  }

  function ensureProject(request,customer){
    if(request.projectId&&state.projects.some(project=>project.id===request.projectId)){
      return state.projects.find(project=>project.id===request.projectId);
    }

    const piercing=typeOf(request)==='piercing';
    const project={
      id:'p'+(Date.now()+1),
      serviceType:piercing?'piercing':'tattoo',
      customerId:customer.id,
      title:subjectOf(request),
      placement:request.placement||'—',
      size:piercing?'':(request.size||''),
      artist:request.artist||(window.TatneraCore?.artistNameFallback?.()||''),
      price:Math.max(0,Number(request.quotedPrice)||0),
      deposit:0,
      status:'Entwurf',
      description:request.description||'',
      consent:'Fehlt',
      colors:[],
      inkIds:[],
      versions:[],
      payments:[],
      requestId:request.id
    };

    if(request.references){
      project.requestReferences=request.references;
    }

    if(piercing){
      project.piercing={
        jewelryType:request.jewelryWish||'',
        material:request.materialWish||'',
        gauge:'',
        dimensions:'',
        manufacturer:'',
        lot:'',
        notes:request.piercingReason||''
      };
      project.aftercare={status:'Offen',tattooDate:'',followupDate:'',instructionsGiven:false,records:[]};
    }

    state.projects.unshift(project);
    request.projectId=project.id;
    customer.lastProject=project.title;
    return project;
  }

  function persistCore(){
    try{persist();}catch(_error){
      try{
        localStorage.setItem('tatnera_customers',JSON.stringify(state.customers||[]));
        localStorage.setItem('tatnera_projects',JSON.stringify(state.projects||[]));
        localStorage.setItem('tatnera_calendar',JSON.stringify(state.calendarEvents||[]));
      }catch(_storageError){}
    }
    try{renderCustomers();renderProjects();updateCustomerSelect();}catch(_error){}
    document.dispatchEvent(new CustomEvent('tatnera:data-changed',{detail:{type:'request-conversion'}}));
  }

  function ensureArtistOption(select,value){
    if(!select||!value)return;
    const exists=[...select.options].some(option=>option.value===value);
    if(!exists)select.add(new Option(value,value));
    select.value=value;
  }

  function addAppointmentContext(request,customer,project){
    const form=document.getElementById('appointmentForm');
    if(!form)return;
    let strip=form.querySelector('[data-request-appointment-context]');
    if(!strip){
      strip=document.createElement('div');
      strip.dataset.requestAppointmentContext='';
      strip.style.cssText='margin:0 0 14px;padding:12px 14px;border:1px solid var(--line);border-radius:12px;background:var(--panel-2);font-size:13px;line-height:1.45';
      form.querySelector('.dialog-head')?.after(strip);
    }
    strip.innerHTML=`<strong style="display:block;margin-bottom:3px">✓ Anfrage übernommen</strong><span style="color:var(--muted)">${esc(nameOf(request))} · ${esc(project.title)} · ${esc(labelOf(request))}</span>`;
    strip.hidden=false;
    form.dataset.requestSourceId=request.id;
    form.dataset.requestCustomerId=customer.id;
    form.dataset.requestProjectId=project.id;
  }

  function clearAppointmentContext(){
    const form=document.getElementById('appointmentForm');
    if(!form)return;
    delete form.dataset.requestSourceId;
    delete form.dataset.requestCustomerId;
    delete form.dataset.requestProjectId;
    const strip=form.querySelector('[data-request-appointment-context]');
    if(strip)strip.hidden=true;
  }

  function openPlanning(request){
    const customer=ensureCustomer(request);
    const project=ensureProject(request,customer);
    request.stage='ready';
    request.convertedAt=request.convertedAt||new Date().toISOString();
    persistCore();
    saveRequests();

    const detail=document.getElementById('requestDetailDialog');
    if(detail?.open)detail.close();

    if(typeof openAppointmentDialog!=='function'){
      alert('Der Kalender ist noch nicht bereit. Bitte die Seite neu laden.');
      return;
    }

    const date=typeof todayISO==='function'?todayISO():new Date().toISOString().slice(0,10);
    openAppointmentDialog('',date);
    const form=document.getElementById('appointmentForm');
    if(!form)return;

    const piercing=typeOf(request)==='piercing';
    form.elements.type.value=piercing?'piercing':'tattoo';
    ensureArtistOption(form.elements.artist,request.artist||project.artist||'');
    form.elements.status.value='Angefragt';
    form.elements.date.value=date;
    form.elements.duration.value=piercing?45:180;
    form.elements.customerId.value=customer.id;
    form.elements.projectId.value=project.id;
    form.elements.notes.value=`Aus ${labelOf(request)}-Anfrage: ${subjectOf(request)}${request.availability?` · Wunsch: ${request.availability}`:''}`;
    const title=document.getElementById('appointmentDialogTitle');
    if(title)title.textContent='Termin aus Anfrage planen';
    addAppointmentContext(request,customer,project);
  }

  function finishRequestAfterAppointment(form){
    const requestId=form.dataset.requestSourceId;
    if(!requestId)return;
    const request=requestById(requestId);
    if(!request)return;

    const snapshot={
      date:form.elements.date?.value||'',
      start:form.elements.start?.value||'',
      customerId:form.elements.customerId?.value||'',
      projectId:form.elements.projectId?.value||''
    };

    setTimeout(()=>{
      const event=[...(state.calendarEvents||[])].reverse().find(item=>
        item.date===snapshot.date&&item.start===snapshot.start&&
        item.customerId===snapshot.customerId&&item.projectId===snapshot.projectId
      );
      const customer=state.customers.find(item=>item.id===snapshot.customerId);
      const project=state.projects.find(item=>item.id===snapshot.projectId);

      request.stage='archived';
      request.closedReason='appointment_created';
      request.completedAt=new Date().toISOString();
      if(event)request.appointmentId=event.id;
      if(project)project.status='Termin geplant';
      if(customer&&snapshot.date){
        try{
          const date=new Date(`${snapshot.date}T12:00:00`);
          const label=new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'short'}).format(date);
          customer.next=`${label} · ${snapshot.start}`;
          customer.status='Aktiv';
        }catch(_error){}
      }

      persistCore();
      saveRequests();
      clearAppointmentContext();
      showToast('Anfrage übernommen · Kunde, Akte und Termin sind angelegt.');
    },0);
  }

  function showToast(text){
    let toast=document.getElementById('requestProductionToast');
    if(!toast){
      toast=document.createElement('div');
      toast.id='requestProductionToast';
      toast.style.cssText='position:fixed;right:18px;bottom:18px;z-index:100500;max-width:min(420px,calc(100vw - 36px));padding:13px 15px;border-radius:12px;background:#202822;color:#fff;box-shadow:0 16px 45px rgba(0,0,0,.24);font:700 13px/1.4 Arial,Helvetica,sans-serif;opacity:0;transform:translateY(8px);transition:.18s ease';
      document.body.appendChild(toast);
    }
    toast.textContent=text;
    requestAnimationFrame(()=>{toast.style.opacity='1';toast.style.transform='translateY(0)';});
    clearTimeout(toast._timer);
    toast._timer=setTimeout(()=>{toast.style.opacity='0';toast.style.transform='translateY(8px)';},2600);
  }

  function polishDetail(requestId){
    const request=requestById(requestId);
    const body=document.getElementById('requestDetailBody');
    if(!request||!body)return;
    const plan=body.querySelector('[data-plan-request]');
    const convert=body.querySelector('[data-convert-request]');
    if(plan){
      plan.textContent=request.customerId&&request.projectId?'Termin direkt planen':'Übernehmen & Termin planen';
      plan.classList.add('primary-flow');
      if(convert&&plan.previousElementSibling!==null){
        const workflow=plan.parentElement;
        if(workflow&&workflow.firstElementChild!==plan)workflow.insertBefore(plan,convert||workflow.firstElementChild);
      }
    }
    if(convert&&!request.projectId)convert.textContent=`Nur Kunde + ${labelOf(request)}-Akte anlegen`;
  }

  document.addEventListener('click',event=>{
    const open=event.target.closest('[data-open-request]');
    if(open){
      const id=open.dataset.openRequest||'';
      currentRequestId=id;
      const request=requestById(id);
      if(request?.stage==='ready'&&/Termin planen/i.test(open.textContent||'')){
        event.preventDefault();event.stopImmediatePropagation();
        openPlanning(request);
        return;
      }
      setTimeout(()=>polishDetail(id),0);
      return;
    }

    const plan=event.target.closest('#requestDetailBody [data-plan-request]');
    if(plan){
      event.preventDefault();event.stopImmediatePropagation();
      const request=requestById(currentRequestId);
      if(request)openPlanning(request);
      return;
    }

    const stage=event.target.closest('#requestDetailBody [data-request-stage]');
    if(stage&&currentRequestId)setTimeout(()=>polishDetail(currentRequestId),0);
  },true);

  document.addEventListener('submit',event=>{
    const form=event.target;
    if(form?.id==='appointmentForm'&&form.dataset.requestSourceId){
      finishRequestAfterAppointment(form);
    }
  },true);

  document.addEventListener('click',event=>{
    if(event.target.closest('#cancelAppointmentBtn,#closeAppointmentDialog'))clearAppointmentContext();
  });

  const originalOpen=window.TatneraRequests?.open;
  if(typeof originalOpen==='function'){
    window.TatneraRequests.open=id=>{currentRequestId=id;const result=originalOpen(id);setTimeout(()=>polishDetail(id),0);return result;};
  }
})();
