/* TATNERA — integration audit fixes
   Final safety layer for the current frontend prototype. */
(function(){
  const esc=value=>String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const euro=value=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(value)||0);
  const formatDate=value=>value?new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(value+'T12:00:00')):'—';
  const minutes=time=>{const [h,m]=String(time||'00:00').split(':').map(Number);return (h||0)*60+(m||0)};
  const paidTotal=project=>Math.max(0,(project?.payments||[]).reduce((sum,tx)=>sum+(tx.type==='Erstattung'?-1:1)*Math.abs(Number(tx.amount)||0),0));
  const depositOpen=project=>Math.max(0,Math.max(0,Number(project?.deposit)||0)-Math.min(paidTotal(project),Math.max(0,Number(project?.deposit)||0)));
  let projectReturnView='customers';
  let activeRequestId='';
  let editingInkId='';

  function nextCustomerEvent(customerId){
    return [...(state.calendarEvents||[])]
      .filter(event=>event.customerId===customerId&&event.date>=todayISO())
      .sort((a,b)=>a.date.localeCompare(b.date)||a.start.localeCompare(b.start))[0]||null;
  }

  function customerNextLabel(customerId){
    const event=nextCustomerEvent(customerId);
    return event?`${formatDate(event.date)} · ${event.start}`:'—';
  }

  function installCoreRenderFixes(){
    projectCard=function(project){
      return `<article class="project-card" data-project-id="${esc(project.id)}"><div class="project-art"><span>${esc(project.status||'Entwurf')}</span></div><div class="project-body"><h4>${esc(project.title)}</h4><p>${esc(customerName(project.customerId))} · ${esc(project.placement||'—')}</p><div class="project-meta"><span>${esc(project.artist||'—')}</span><span>${esc(formatEuro(project.price))}</span></div></div></article>`;
    };

    bindProjectCards=function(){
      document.querySelectorAll('[data-project-id]').forEach(element=>{
        if(element.dataset.projectBound==='1')return;
        element.dataset.projectBound='1';
        element.addEventListener('click',()=>openProject(element.dataset.projectId));
      });
    };

    renderProjects=function(){
      const list=document.getElementById('projectList');
      const recent=document.getElementById('recentProjects');
      if(list)list.innerHTML=state.projects.map(projectCard).join('');
      if(recent)recent.innerHTML=state.projects.slice(0,3).map(projectCard).join('');
      bindProjectCards();
    };

    renderAppointments=function(){
      const root=document.getElementById('todayAppointments');if(!root)return;
      const events=(state.calendarEvents||[]).filter(event=>event.date===todayISO()).sort((a,b)=>a.start.localeCompare(b.start));
      root.innerHTML=events.slice(0,4).map(event=>{
        const customer=event.customerId?customerName(event.customerId):eventTypeLabel(event.type);
        const detail=event.projectId?projectName(event.projectId):(event.notes||eventTypeLabel(event.type));
        return `<div class="appointment"><div class="time">${esc(event.start)}</div><div class="main-info"><strong>${esc(customer)}</strong><span>${esc(detail)} · ${esc(event.artist||'—')}</span></div><span class="status-pill">${esc(event.status||'')}</span></div>`;
      }).join('')||'<p class="muted">Heute sind noch keine Termine eingetragen.</p>';
    };

    renderCustomers=function(filter=''){
      const body=document.getElementById('customerTableBody');if(!body)return;
      const query=String(filter||'').trim().toLowerCase();
      const rows=state.customers.filter(customer=>`${customer.firstName||''} ${customer.lastName||''} ${customer.email||''} ${customer.phone||''}`.toLowerCase().includes(query)).map(customer=>{
        const projects=state.projects.filter(project=>project.customerId===customer.id);
        const openDeposit=projects.reduce((sum,project)=>sum+depositOpen(project),0);
        const status=openDeposit>0?'Anzahlung offen':(customer.status||'Aktiv');
        return `<tr data-customer-id="${esc(customer.id)}"><td><div class="customer-cell"><div class="customer-avatar">${esc(initials(customer))}</div><strong>${esc(customer.firstName)} ${esc(customer.lastName)}</strong></div></td><td><span>${esc(customer.email||'—')}</span><br><span class="muted">${esc(customer.phone||'—')}</span></td><td>${esc(customer.lastProject||'—')}</td><td>${esc(customerNextLabel(customer.id))}</td><td><span class="status-pill">${esc(status)}</span></td><td>→</td></tr>`;
      }).join('');
      body.innerHTML=rows||'<tr><td colspan="6" class="muted">Keine Kunden gefunden.</td></tr>';
      body.querySelectorAll('[data-customer-id]').forEach(row=>row.addEventListener('click',()=>openCustomer(row.dataset.customerId)));
    };

    openCustomer=function(id){
      const customer=state.customers.find(item=>item.id===id);if(!customer)return;
      const projects=state.projects.filter(project=>project.customerId===id);
      const paid=projects.reduce((sum,project)=>sum+paidTotal(project),0);
      const root=document.getElementById('customerDetail');if(!root)return;
      root.innerHTML=`<div class="detail-hero"><section class="detail-card"><div class="detail-profile"><div class="big-avatar">${esc(initials(customer))}</div><div><span class="eyebrow">Kunde</span><h2>${esc(customer.firstName)} ${esc(customer.lastName)}</h2><div class="muted">${esc(customer.email||'Keine E-Mail')} · ${esc(customer.phone||'Keine Telefonnummer')}</div></div></div><div class="detail-stat-grid"><div class="mini-stat"><span>Tattoos</span><strong>${projects.length}</strong></div><div class="mini-stat"><span>Bezahlt</span><strong>${esc(euro(paid))}</strong></div><div class="mini-stat"><span>Nächster Termin</span><strong>${esc(customerNextLabel(id))}</strong></div></div></section><section class="detail-card"><span class="eyebrow">Notizen</span><h3>Studio-Hinweise</h3><p class="muted">${esc(customer.notes||'Noch keine Notizen vorhanden.')}</p></section></div><section class="detail-card"><div class="panel-head"><div><span class="eyebrow">Historie</span><h3>Tattoo-Projekte</h3></div><button class="btn primary" id="detailNewProject">+ Projekt</button></div><div class="project-grid">${projects.length?projects.map(projectCard).join(''):'<p class="muted">Noch kein Tattoo-Projekt angelegt.</p>'}</div></section>`;
      navigate('customer-detail');bindProjectCards();
      document.getElementById('detailNewProject')?.addEventListener('click',()=>openProjectDialog(id));
    };
  }

  function installProjectNavigationFix(){
    const previousOpenProject=openProject;
    openProject=function(id){
      const target=state.projects.find(project=>project.id===id);if(!target)return;
      const source=state.currentView;
      if(source&&source!=='project-detail')projectReturnView=source==='projects'?'customers':source;

      const targetIndex=state.projects.findIndex(project=>project.id===id);
      const firstSame=state.projects.findIndex(project=>project.title===target.title);
      if(targetIndex>firstSame&&firstSame>=0){
        state.projects.splice(targetIndex,1);
        state.projects.splice(firstSame,0,target);
      }

      previousOpenProject(id);
      const back=document.querySelector('#project-detail .back-btn');
      if(back)back.dataset.viewTarget=projectReturnView||'customers';
    };
  }

  function installNavigationRefresh(){
    const previousNavigate=navigate;
    navigate=function(view){
      previousNavigate(view);
      if(view==='customers')renderCustomers(document.getElementById('customerSearch')?.value||'');
      if(view==='dashboard')renderAppointments();
      const more=document.getElementById('moreNavToggle');
      if(more)more.classList.toggle('active',view==='finance'||view==='settings');
    };
  }

  function installAppointmentGuards(){
    const form=document.getElementById('appointmentForm');if(!form)return;
    form.addEventListener('submit',event=>{
      const type=form.elements.type.value;
      if(type==='block'){
        form.elements.customerId.value='';
        form.elements.projectId.value='';
        form.elements.status.value='Blockiert';
      }else if(form.elements.projectId.value){
        const project=state.projects.find(item=>item.id===form.elements.projectId.value);
        if(project)form.elements.customerId.value=project.customerId;
      }

      const end=minutes(form.elements.start.value)+Number(form.elements.duration.value||0);
      if(end>1440){
        event.preventDefault();event.stopImmediatePropagation();
        alert('Ein Termin darf im aktuellen Kalender nicht über Mitternacht hinausgehen. Bitte Uhrzeit oder Dauer anpassen.');
        return;
      }

      setTimeout(()=>renderCustomers(document.getElementById('customerSearch')?.value||''),0);
    },true);

    form.elements.projectId.addEventListener('change',()=>{
      const project=state.projects.find(item=>item.id===form.elements.projectId.value);
      if(project)form.elements.customerId.value=project.customerId;
    });
    form.elements.type.addEventListener('change',()=>{
      if(form.elements.type.value==='block'){
        form.elements.customerId.value='';form.elements.projectId.value='';form.elements.status.value='Blockiert';
      }
    });
  }

  function installProjectFormGuards(){
    const form=document.getElementById('projectForm');if(!form)return;
    form.addEventListener('submit',event=>{
      const price=Math.max(0,Number(form.elements.price?.value)||0);
      const deposit=Math.max(0,Number(form.elements.deposit?.value)||0);
      if(price>0&&deposit>price&&!confirm('Die Anzahlung ist höher als der Gesamtpreis. Tattoo trotzdem anlegen?')){
        event.preventDefault();event.stopImmediatePropagation();return;
      }
      if(form.elements.scheduleAppointment?.checked){
        const end=minutes(form.elements.appointmentStart.value)+Number(form.elements.appointmentDuration.value||0);
        if(end>1440){
          event.preventDefault();event.stopImmediatePropagation();
          alert('Der erste Termin darf nicht über Mitternacht hinausgehen. Bitte Uhrzeit oder Dauer anpassen.');
        }
      }
    },true);
  }

  function ensureRequestLinks(request){
    let customerId=request.customerId;
    if(!customerId||!state.customers.some(customer=>customer.id===customerId)){
      let customer=state.customers.find(item=>item.email&&request.email&&item.email.toLowerCase()===request.email.toLowerCase());
      if(!customer&&request.phone)customer=state.customers.find(item=>item.phone&&item.phone===request.phone);
      if(!customer){
        customer={id:'c'+Date.now(),firstName:request.firstName||'',lastName:request.lastName||'',email:request.email||'',phone:request.phone||'',notes:`Aus Tattoo-Anfrage: ${request.motif}`,lastProject:'—',next:'—',status:'Neu'};
        state.customers.unshift(customer);
      }
      customerId=customer.id;request.customerId=customerId;
    }

    let projectId=request.projectId;
    if(!projectId||!state.projects.some(project=>project.id===projectId)){
      const project={id:'p'+(Date.now()+1),customerId,title:request.motif,placement:request.placement||'—',size:request.size||'',artist:request.artist||'Sven',price:Number(request.quotedPrice||0),deposit:0,status:'Termin geplant',description:request.description||'',consent:'Fehlt',colors:[],inkIds:[],versions:[],payments:[],aftercare:{status:'Offen',tattooDate:'',followupDate:'',instructionsGiven:false,records:[]}};
      state.projects.unshift(project);projectId=project.id;request.projectId=projectId;
      const customer=state.customers.find(item=>item.id===customerId);if(customer){customer.lastProject=project.title;customer.status='Aktiv';}
    }
    return {customerId,projectId};
  }

  function archiveRequest(request){
    const archive=JSON.parse(localStorage.getItem('tatnera_request_archive')||'[]');
    archive.unshift({...request,stage:'done',completedAt:new Date().toISOString()});
    localStorage.setItem('tatnera_request_archive',JSON.stringify(archive.slice(0,250)));
    state.requests=state.requests.filter(item=>item.id!==request.id);
    localStorage.setItem('tatnera_requests',JSON.stringify(state.requests));

    const card=document.querySelector(`[data-open-request="${request.id}"]`)?.closest('.request-card');
    const column=card?.closest('.request-column');
    card?.remove();
    if(column){const count=column.querySelectorAll('.request-card').length;const badge=column.querySelector('.column-head span');if(badge)badge.textContent=String(count);if(!count&&!column.querySelector('.request-empty-column'))column.insertAdjacentHTML('beforeend','<div class="request-empty-column">Keine Anfragen</div>');}
    document.querySelectorAll('.nav-item[data-view="requests"] .badge').forEach(badge=>badge.textContent=String(state.requests.length));
  }

  function startRequestAppointment(request){
    const requestDialog=document.getElementById('requestDetailDialog');
    const date=state.calendar?.anchor||todayISO();
    openAppointmentDialog('',date);
    const dialog=document.getElementById('appointmentDialog');
    const form=document.getElementById('appointmentForm');if(!dialog||!form)return;

    form.elements.type.value='tattoo';
    form.elements.artist.value=request.artist||'Sven';
    form.elements.duration.value=180;
    form.elements.status.value='Angefragt';
    form.elements.notes.value=`Aus Anfrage: ${request.motif}`;
    if(request.customerId&&state.customers.some(customer=>customer.id===request.customerId))form.elements.customerId.value=request.customerId;
    if(request.projectId&&state.projects.some(project=>project.id===request.projectId))form.elements.projectId.value=request.projectId;

    let submitted=false;
    const prepare=()=>{
      const links=ensureRequestLinks(request);
      populateAppointmentSelects(links.customerId,links.projectId);
      form.elements.customerId.value=links.customerId;
      form.elements.projectId.value=links.projectId;
      persist();
      localStorage.setItem('tatnera_requests',JSON.stringify(state.requests));
      renderCustomers();renderProjects();updateCustomerSelect(links.customerId);
    };
    const complete=()=>{
      submitted=true;
      setTimeout(()=>{
        archiveRequest(request);
        requestDialog?.close();
        state.calendar.anchor=form.elements.date.value||date;
        state.calendar.view='day';
        navigate('calendar');
      },0);
    };
    const cancel=()=>{
      if(submitted)return;
      form.removeEventListener('submit',prepare,true);
      form.removeEventListener('submit',complete);
    };
    form.addEventListener('submit',prepare,{capture:true,once:true});
    form.addEventListener('submit',complete,{once:true});
    dialog.addEventListener('close',cancel,{once:true});
  }

  function installRequestFlowFix(){
    document.addEventListener('click',event=>{
      const opener=event.target.closest('[data-open-request]');
      if(opener)activeRequestId=opener.dataset.openRequest;

      const plan=event.target.closest('[data-plan-request]');
      if(!plan)return;
      const request=state.requests?.find(item=>item.id===activeRequestId);
      if(!request)return;
      event.preventDefault();event.stopImmediatePropagation();
      startRequestAppointment(request);
    },true);
  }

  function installAftercareDeleteFix(){
    document.addEventListener('click',event=>{
      const button=event.target.closest('[data-delete-healing]');if(!button)return;
      const card=button.closest('.aftercare-card');const projectId=card?.dataset.aftercareProject;
      const project=state.projects.find(item=>item.id===projectId);if(!project)return;
      event.preventDefault();event.stopImmediatePropagation();
      if(!confirm('Diesen Nachsorge-Eintrag wirklich löschen?'))return;
      project.aftercare=project.aftercare||{records:[]};
      project.aftercare.records=(project.aftercare.records||[]).filter(record=>record.id!==button.dataset.deleteHealing);
      const latest=[...project.aftercare.records].sort((a,b)=>(b.date||'').localeCompare(a.date||'')||String(b.createdAt||'').localeCompare(String(a.createdAt||'')))[0];
      const planned=(state.calendarEvents||[]).find(item=>item.projectId===project.id&&item.type==='touchup'&&item.date>=todayISO());
      project.aftercare.status=planned?'Nachstechen geplant':(latest?(latest.status==='Beobachten'?'Offen':latest.status):'Offen');
      project.aftercare.followupDate=latest?.nextCheck||planned?.date||'';
      persist();openProject(project.id);
      requestAnimationFrame(()=>document.querySelector('[data-project-tab="aftercare"]')?.click());
    },true);
  }

  function installPaymentGuards(){
    const paymentForm=document.getElementById('paymentForm');
    if(paymentForm)paymentForm.addEventListener('submit',event=>{
      const detail=document.getElementById('projectDetail');
      const project=state.projects.find(item=>item.id===detail?.dataset.projectId);if(!project)return;
      const type=paymentForm.elements.type.value;const amount=Math.abs(Number(paymentForm.elements.amount.value)||0);const remaining=Math.max(0,Number(project.price||0)-paidTotal(project));
      if(type!=='Erstattung'&&remaining<=0&&amount>0&&!confirm('Dieses Tattoo ist bereits vollständig bezahlt. Die Zahlung trotzdem als Überzahlung erfassen?')){
        event.preventDefault();event.stopImmediatePropagation();
      }
    },true);

    const priceForm=document.getElementById('priceForm');
    if(priceForm)priceForm.addEventListener('submit',event=>{
      const detail=document.getElementById('projectDetail');
      const project=state.projects.find(item=>item.id===detail?.dataset.projectId);if(!project)return;
      const price=Math.max(0,Number(priceForm.elements.price.value)||0);const paid=paidTotal(project);
      if(price<paid&&!confirm(`Es wurden bereits ${euro(paid)} bezahlt. Der neue Gesamtpreis liegt darunter. Trotzdem speichern?`)){
        event.preventDefault();event.stopImmediatePropagation();
      }
    },true);
  }

  function installInkHistoryGuard(){
    document.addEventListener('click',event=>{
      const edit=event.target.closest('[data-edit-ink]');if(edit)editingInkId=edit.dataset.editInk;
      if(event.target.closest('#addInkBtn'))editingInkId='';
    },true);
    document.getElementById('inkDialog')?.addEventListener('close',()=>{editingInkId=''});
    const form=document.getElementById('inkForm');if(!form)return;
    form.addEventListener('submit',event=>{
      if(!editingInkId)return;
      const ink=state.inks?.find(item=>item.id===editingInkId);if(!ink)return;
      const used=state.projects.some(project=>(project.inkIds||[]).includes(ink.id));
      const nextBatch=form.elements.batch.value.trim();
      if(used&&nextBatch.toLowerCase()!==String(ink.batch||'').toLowerCase()){
        event.preventDefault();event.stopImmediatePropagation();
        alert('Die Chargennummer kann nach der Verwendung in einer Tattoo-Akte nicht mehr geändert werden. Lege für eine andere Charge einen neuen Eintrag an.');
      }
    },true);
  }

  function installNotificationButton(){
    const button=document.querySelector('.icon-btn[title="Benachrichtigungen"]');if(!button)return;
    const style=document.createElement('style');style.textContent='.tatnera-toast{position:fixed;right:24px;top:78px;z-index:9999;padding:11px 14px;border:1px solid var(--line);border-radius:11px;background:#19191c;color:#eee;box-shadow:0 14px 35px rgba(0,0,0,.35);font-size:12px}.tatnera-toast[hidden]{display:none}';document.head.appendChild(style);
    const toast=document.createElement('div');toast.className='tatnera-toast';toast.hidden=true;toast.textContent='Aktuell keine neuen Benachrichtigungen.';document.body.appendChild(toast);
    let timer;
    button.addEventListener('click',()=>{clearTimeout(timer);toast.hidden=false;timer=setTimeout(()=>toast.hidden=true,2200)});
  }

  function install(){
    installCoreRenderFixes();
    installProjectNavigationFix();
    installNavigationRefresh();
    installAppointmentGuards();
    installProjectFormGuards();
    installRequestFlowFix();
    installAftercareDeleteFix();
    installPaymentGuards();
    installInkHistoryGuard();
    installNotificationButton();
    renderCustomers(document.getElementById('customerSearch')?.value||'');
    renderProjects();renderAppointments();
  }

  install();
})();