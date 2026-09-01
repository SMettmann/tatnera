/* TATNERA — UI polish: clearer customer start + useful dashboard + finance submenu */
(function(){
  const esc=v=>String(v??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const euro=v=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(v)||0);
  const formatDate=v=>v?new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'short'}).format(new Date(v+'T12:00:00')):'—';
  const paymentTotal=p=>(p.payments||[]).reduce((sum,tx)=>sum+(tx.type==='Erstattung'?-1:1)*Math.abs(Number(tx.amount)||0),0);
  const depositOpen=p=>Math.max(0,Number(p.deposit||0)-Math.min(Math.max(0,paymentTotal(p)),Number(p.deposit||0)));
  const restOpen=p=>Math.max(0,Number(p.price||0)-Math.max(0,paymentTotal(p)));
  let demoRevenue='8.640 €';

  function installStyle(){
    if(document.querySelector('link[href="ui-polish.css"]'))return;
    const link=document.createElement('link');link.rel='stylesheet';link.href='ui-polish.css';document.head.appendChild(link);
  }

  function installMoreMenu(){
    const bottom=document.querySelector('.sidebar-bottom');
    const settings=bottom?.querySelector('.nav-item[data-view="settings"]');
    if(!bottom||!settings||document.getElementById('moreNavToggle'))return;

    const wrap=document.createElement('div');wrap.className='more-nav-wrap';
    const toggle=document.createElement('button');toggle.type='button';toggle.id='moreNavToggle';toggle.className='nav-item more-nav-toggle';toggle.innerHTML='<span>•••</span> Mehr <b>⌄</b>';
    const menu=document.createElement('div');menu.className='more-nav-menu';menu.hidden=true;
    const finance=document.createElement('button');finance.type='button';finance.className='nav-item';finance.dataset.view='finance';finance.innerHTML='<span>€</span> Finanzen';

    settings.remove();
    menu.append(finance,settings);
    wrap.append(toggle,menu);
    bottom.prepend(wrap);

    toggle.addEventListener('click',()=>{menu.hidden=!menu.hidden;toggle.classList.toggle('open',!menu.hidden)});
    finance.addEventListener('click',()=>{menu.hidden=true;toggle.classList.remove('open');navigate('finance')});
    settings.addEventListener('click',()=>{menu.hidden=true;toggle.classList.remove('open')});

    document.addEventListener('click',event=>{
      if(!wrap.contains(event.target)){menu.hidden=true;toggle.classList.remove('open')}
    });
  }

  function installFinanceView(){
    if(document.getElementById('finance'))return;
    const main=document.querySelector('.main');if(!main)return;
    const section=document.createElement('section');section.id='finance';section.className='view';
    section.innerHTML='<div class="finance-view" id="financeView"></div>';
    main.appendChild(section);
    try{pageTitles.finance='Finanzen'}catch(_e){}
    renderFinance();
  }

  function monthlyPayments(){
    const now=new Date();const y=now.getFullYear(),m=now.getMonth();
    let total=0,count=0;
    state.projects.forEach(project=>(project.payments||[]).forEach(tx=>{
      if(!tx.date)return;const d=new Date(tx.date+'T12:00:00');if(d.getFullYear()!==y||d.getMonth()!==m)return;
      const amount=Math.abs(Number(tx.amount)||0);total+=tx.type==='Erstattung'?-amount:amount;count++;
    }));
    return {total:Math.max(0,total),count};
  }

  function renderFinance(){
    const root=document.getElementById('financeView');if(!root)return;
    const month=monthlyPayments();
    const openDeposits=state.projects.reduce((sum,p)=>sum+depositOpen(p),0);
    const openRest=state.projects.reduce((sum,p)=>sum+restOpen(p),0);
    const label=new Intl.DateTimeFormat('de-DE',{month:'long',year:'numeric'}).format(new Date());
    const revenueText=month.count?euro(month.total):demoRevenue;
    root.innerHTML=`<div class="finance-heading"><div><span class="eyebrow">Studio</span><h2>Finanzen</h2><p class="muted">Zahlungen und offene Beträge – bewusst außerhalb des täglichen Dashboards.</p></div></div>
      <div class="finance-stats">
        <article class="finance-main"><span>Monatsumsatz · ${esc(label)}</span><strong>${esc(revenueText)}</strong><small>${month.count?month.count+' erfasste Zahlung'+(month.count===1?'':'en'):'Demo-Wert, bis echte Zahlungen erfasst sind'}</small></article>
        <article><span>Offene Anzahlungen</span><strong>${esc(euro(openDeposits))}</strong><small>${state.projects.filter(p=>depositOpen(p)>0).length} Projekte</small></article>
        <article><span>Offene Restbeträge</span><strong>${esc(euro(openRest))}</strong><small>über alle Tattoo-Akten</small></article>
      </div>
      <section class="panel finance-list-panel"><div class="panel-head"><div><span class="eyebrow">Offen</span><h3>Zahlungen nach Tattoo</h3></div></div>
        <div class="finance-project-list">${state.projects.filter(p=>restOpen(p)>0).slice(0,8).map(p=>`<button data-finance-project="${p.id}"><div><strong>${esc(p.title)}</strong><span>${esc(customerName(p.customerId))}</span></div><div><small>Restbetrag</small><strong>${esc(euro(restOpen(p)))}</strong></div><span>→</span></button>`).join('')||'<p class="muted">Keine offenen Beträge.</p>'}</div>
      </section>`;
    root.querySelectorAll('[data-finance-project]').forEach(btn=>btn.addEventListener('click',()=>openProject(btn.dataset.financeProject)));
  }

  function nextEventForProject(id){
    return [...(state.calendarEvents||[])].filter(e=>e.projectId===id&&e.date>=todayISO()).sort((a,b)=>a.date.localeCompare(b.date)||a.start.localeCompare(b.start))[0]||null;
  }

  function rebuildDashboard(){
    const dashboard=document.getElementById('dashboard');if(!dashboard)return;
    const existingRevenue=dashboard.querySelector('.focus-revenue strong')?.textContent;if(existingRevenue)demoRevenue=existingRevenue;
    dashboard.innerHTML=`<div class="cockpit-grid">
      <section class="panel cockpit-today"><div class="cockpit-head"><div><span class="eyebrow">Heute</span><h2>Im Studio</h2></div><button class="text-btn" data-cockpit-view="calendar">Kalender →</button></div><div id="todayAppointments" class="timeline"></div></section>
      <section class="panel cockpit-tasks"><div class="cockpit-head"><div><span class="eyebrow">Offen</span><h3>Zu erledigen</h3></div></div><div class="cockpit-task-grid">
        <button data-cockpit-view="requests"><span>Neue Anfragen</span><strong data-dash-requests>0</strong><small>jetzt prüfen</small></button>
        <div><span>Einwilligungen</span><strong data-dash-consents>0</strong><small>noch offen</small></div>
        <div><span>Anzahlungen</span><strong data-dash-deposits>0 €</strong><small>noch offen</small></div>
      </div></section>
      <section class="panel cockpit-requests"><div class="cockpit-head"><div><span class="eyebrow">Neu</span><h3>Letzte Anfragen</h3></div><button class="text-btn" data-cockpit-view="requests">Alle →</button></div><div class="cockpit-request-list" data-dash-request-list></div></section>
      <section class="panel cockpit-projects"><div class="cockpit-head"><div><span class="eyebrow">In Arbeit</span><h3>Laufende Tattoos</h3></div></div><div class="cockpit-project-list" data-dash-project-list></div></section>
    </div>`;
    dashboard.querySelectorAll('[data-cockpit-view]').forEach(btn=>btn.addEventListener('click',()=>navigate(btn.dataset.cockpitView)));
    renderAppointments();refreshDashboard();
  }

  function refreshDashboard(){
    const dashboard=document.getElementById('dashboard');if(!dashboard)return;
    const requests=Array.isArray(state.requests)?state.requests:[];
    const fresh=requests.filter(r=>r.stage==='new');
    const missing=state.projects.filter(p=>!['Unterschrieben','Vorhanden'].includes(p.consent)).length;
    const deposits=state.projects.reduce((sum,p)=>sum+depositOpen(p),0);
    const r=dashboard.querySelector('[data-dash-requests]');if(r)r.textContent=String(fresh.length);
    const c=dashboard.querySelector('[data-dash-consents]');if(c)c.textContent=String(missing);
    const d=dashboard.querySelector('[data-dash-deposits]');if(d)d.textContent=euro(deposits);

    const requestList=dashboard.querySelector('[data-dash-request-list]');
    if(requestList)requestList.innerHTML=(fresh.length?fresh:requests).slice(0,3).map(req=>`<button data-dash-request="${req.id}"><div><strong>${esc(req.motif)}</strong><span>${esc((req.firstName||'')+' '+(req.lastName||''))} · ${esc(req.placement||'')}</span></div><span>→</span></button>`).join('')||'<p class="muted">Keine offenen Anfragen.</p>';
    dashboard.querySelectorAll('[data-dash-request]').forEach(btn=>btn.addEventListener('click',()=>{
      const id=btn.dataset.dashRequest;navigate('requests');setTimeout(()=>document.querySelector(`[data-open-request="${id}"]`)?.click(),0);
    }));

    const projectList=dashboard.querySelector('[data-dash-project-list]');
    if(projectList)projectList.innerHTML=state.projects.slice(0,4).map(project=>{
      const event=nextEventForProject(project.id);
      return `<button data-dash-project="${project.id}"><div><strong>${esc(project.title)}</strong><span>${esc(customerName(project.customerId))} · ${esc(project.artist||'—')}</span></div><div><small>${event?'Nächster Termin':'Status'}</small><strong>${event?formatDate(event.date)+' · '+event.start:esc(project.status||'Entwurf')}</strong></div><span>→</span></button>`;
    }).join('')||'<p class="muted">Noch keine Tattoos angelegt.</p>';
    dashboard.querySelectorAll('[data-dash-project]').forEach(btn=>btn.addEventListener('click',()=>openProject(btn.dataset.dashProject)));
  }

  function makeCustomerChoiceClear(){
    const form=document.getElementById('projectForm');if(!form)return;
    const mode=form.querySelector('.customer-mode');if(!mode)return;
    const existing=mode.querySelector('[data-customer-mode="existing"]');
    const fresh=mode.querySelector('[data-customer-mode="new"]');
    if(fresh){fresh.innerHTML='<strong>Neuer Kunde</strong><small>Daten direkt eingeben</small>';mode.prepend(fresh)}
    if(existing){existing.innerHTML='<strong>Bestehender Kunde</strong><small>Aus Kundenliste auswählen</small>';mode.append(existing)}
  }

  function switchCustomerMode(mode){
    const form=document.getElementById('projectForm');if(!form)return;
    form.dataset.customerMode=mode;
    form.querySelectorAll('[data-customer-mode]').forEach(btn=>btn.classList.toggle('active',btn.dataset.customerMode===mode));
    form.querySelectorAll('[data-customer-block]').forEach(block=>block.hidden=block.dataset.customerBlock!==mode);
    if(form.elements.customerId)form.elements.customerId.required=mode==='existing';
    if(form.elements.newFirstName)form.elements.newFirstName.required=mode==='new';
    if(form.elements.newLastName)form.elements.newLastName.required=mode==='new';
  }

  function installProjectDialogDefault(){
    makeCustomerChoiceClear();
    const previous=openProjectDialog;
    openProjectDialog=function(customerId=''){
      previous(customerId);
      makeCustomerChoiceClear();
      switchCustomerMode(customerId?'existing':'new');
    };
  }

  function wrapPersistenceAndNavigation(){
    const originalPersist=persist;
    persist=function(){originalPersist();queueMicrotask(()=>{refreshDashboard();renderFinance()})};
    const originalNavigate=navigate;
    navigate=function(view){originalNavigate(view);if(view==='dashboard')refreshDashboard();if(view==='finance')renderFinance()};
  }

  function install(){
    installStyle();installMoreMenu();installFinanceView();rebuildDashboard();makeCustomerChoiceClear();installProjectDialogDefault();wrapPersistenceAndNavigation();
  }
  install();
})();
