/* TATNERA — customer record split for Tattoo / Piercing */
(function(){
  'use strict';

  if(window.__tatneraCustomerServiceTabsInstalled)return;
  window.__tatneraCustomerServiceTabsInstalled=true;

  const Core=window.TatneraCore;
  if(!Core)return;
  const esc=Core.esc||((value)=>String(value??''));
  const activeByCustomer=new Map();

  function installStyle(){
    if(document.getElementById('customerServiceTabsStyle'))return;
    const style=document.createElement('style');
    style.id='customerServiceTabsStyle';
    style.textContent=`
      #customerDetail .detail-stat-grid.customer-service-stats{grid-template-columns:repeat(4,minmax(0,1fr))}
      .customer-service-history-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap}
      .customer-service-history-title h3{margin-bottom:3px}
      .customer-service-tabs{display:flex;align-items:center;gap:22px;border-bottom:1px solid var(--line);margin:15px 0 14px}
      .customer-service-tab{appearance:none;position:relative;border:0;background:transparent;color:var(--muted);padding:8px 1px 11px;font:inherit;font-size:11px;font-weight:850;cursor:pointer}
      .customer-service-tab:after{content:'';position:absolute;left:0;right:0;bottom:-1px;height:2px;border-radius:999px;background:transparent}
      .customer-service-tab.active{color:var(--text)}
      .customer-service-tab.active:after{background:var(--text)}
      .customer-service-count{display:inline-grid;place-items:center;min-width:20px;height:20px;margin-left:6px;padding:0 5px;border:1px solid var(--line);border-radius:999px;font-size:9px;color:var(--muted);vertical-align:middle}
      .customer-service-tab.active .customer-service-count{color:var(--text)}
      .customer-service-card .customer-service-badge{display:inline-flex;align-items:center;width:max-content;margin-bottom:7px;padding:3px 7px;border:1px solid var(--line);border-radius:999px;font-size:9px;font-weight:850;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
      .customer-service-card .customer-service-detail{font-size:10px;color:var(--muted);line-height:1.45;min-height:29px}
      .customer-service-card .customer-service-meta-label{font-size:9px;color:var(--muted);display:block;margin-bottom:2px}
      .customer-service-empty{padding:20px;border:1px dashed var(--line);border-radius:12px;background:var(--panel-2);color:var(--muted);font-size:11px}
      .customer-service-create{white-space:nowrap}
      @media(max-width:900px){#customerDetail .detail-stat-grid.customer-service-stats{grid-template-columns:1fr 1fr}}
      @media(max-width:620px){.customer-service-tabs{gap:14px;overflow-x:auto}.customer-service-tab{white-space:nowrap}.customer-service-history-head{align-items:flex-start}.customer-service-history-head .btn{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function isPiercing(project){return project?.serviceType==='piercing';}
  function money(value){
    try{return formatEuro(value);}catch(_error){return new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(value)||0);}
  }
  function paid(project){
    return Math.max(0,(project?.payments||[]).reduce((sum,tx)=>sum+(tx.type==='Erstattung'?-1:1)*Math.abs(Number(tx.amount)||0),0));
  }
  function nextEvent(customerId){
    const today=typeof todayISO==='function'?todayISO():new Date().toISOString().slice(0,10);
    return [...(state.calendarEvents||[])].filter(event=>event.customerId===customerId&&event.date>=today).sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.start||'').localeCompare(String(b.start||'')))[0]||null;
  }
  function shortDate(value){
    if(!value)return '—';
    return new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(value+'T12:00:00'));
  }

  function serviceCard(project,customerId){
    const piercing=isPiercing(project);
    const piercingData=project.piercing||{};
    const detail=piercing
      ? [project.placement,piercingData.jewelryType,piercingData.material].filter(Boolean).join(' · ')
      : [project.placement,project.size].filter(Boolean).join(' · ');
    const role=piercing?'Piercer':'Artist';
    return `<article class="project-card customer-service-card" data-project-id="${esc(project.id)}">
      <div class="project-art"><span>${esc(project.status||'Offen')}</span></div>
      <div class="project-body">
        <span class="customer-service-badge">${piercing?'Piercing':'Tattoo'}</span>
        <h4>${esc(project.title|| (piercing?'Piercing':'Tattoo'))}</h4>
        <p class="customer-service-detail">${esc(detail||'Noch keine Details hinterlegt.')}</p>
        <div class="project-meta">
          <span><small class="customer-service-meta-label">${role}</small>${esc(project.artist||'—')}</span>
          <span><small class="customer-service-meta-label">Preis</small>${esc(money(project.price))}</span>
        </div>
        <div class="customer-project-actions"><button type="button" class="btn ghost" data-project-schedule="${esc(project.id)}" data-project-customer="${esc(customerId)}">Termin planen</button></div>
      </div>
    </article>`;
  }

  function patchStats(customerId,projects){
    const root=document.getElementById('customerDetail');
    const stats=root?.querySelector('.detail-hero .detail-stat-grid');
    if(!stats)return;
    const tattoos=projects.filter(project=>!isPiercing(project));
    const piercings=projects.filter(isPiercing);
    const totalPaid=projects.reduce((sum,project)=>sum+paid(project),0);
    const event=nextEvent(customerId);
    stats.classList.add('customer-service-stats');
    stats.innerHTML=`
      <div class="mini-stat"><span>Tattoos</span><strong>${tattoos.length}</strong></div>
      <div class="mini-stat"><span>Piercings</span><strong>${piercings.length}</strong></div>
      <div class="mini-stat"><span>Bezahlt</span><strong>${esc(money(totalPaid))}</strong></div>
      <div class="mini-stat"><span>Nächster Termin</span><strong>${event?esc(shortDate(event.date)+' · '+event.start):'—'}</strong></div>`;
  }

  function historySection(root){
    let section=root.querySelector('[data-customer-service-history]');
    if(section)return section;
    section=[...root.querySelectorAll(':scope > section.detail-card')].find(node=>node.querySelector('h3')?.textContent?.trim()==='Tattoo-Projekte')||null;
    if(section)section.dataset.customerServiceHistory='true';
    return section;
  }

  function renderHistory(customerId,preferred=''){
    const root=document.getElementById('customerDetail');
    if(!root||root.dataset.customerId!==customerId)return;
    const section=historySection(root);if(!section)return;
    const all=(state.projects||[]).filter(project=>project.customerId===customerId);
    const tattoos=all.filter(project=>!isPiercing(project));
    const piercings=all.filter(isPiercing);
    let active=preferred||activeByCustomer.get(customerId)||'';
    if(!['tattoo','piercing'].includes(active))active=tattoos.length||!piercings.length?'tattoo':'piercing';
    activeByCustomer.set(customerId,active);
    const items=active==='piercing'?piercings:tattoos;
    const noun=active==='piercing'?'Piercing':'Tattoo';

    section.innerHTML=`
      <div class="customer-service-history-head">
        <div class="customer-service-history-title"><span class="eyebrow">Historie</span><h3>Tattoo & Piercing</h3><p class="muted">Beide Bereiche getrennt geführt, gemeinsam in einer Kundenakte.</p></div>
        <button type="button" class="btn primary customer-service-create" data-customer-service-create="${active}" data-customer-id="${esc(customerId)}">+ Neues ${noun}</button>
      </div>
      <div class="customer-service-tabs" role="tablist" aria-label="Kundenhistorie">
        <button type="button" class="customer-service-tab ${active==='tattoo'?'active':''}" data-customer-service-tab="tattoo" data-customer-id="${esc(customerId)}">Tattoo <span class="customer-service-count">${tattoos.length}</span></button>
        <button type="button" class="customer-service-tab ${active==='piercing'?'active':''}" data-customer-service-tab="piercing" data-customer-id="${esc(customerId)}">Piercing <span class="customer-service-count">${piercings.length}</span></button>
      </div>
      <div class="project-grid" data-customer-service-list="${active}">${items.length?items.map(project=>serviceCard(project,customerId)).join(''):`<div class="customer-service-empty">Für diesen Kunden ist noch kein ${noun} angelegt.</div>`}</div>`;

    try{bindProjectCards();}catch(_error){}
  }

  function patchCustomer(customerId,preferred=''){
    if(!customerId||!Core.getCustomer(customerId))return;
    const root=document.getElementById('customerDetail');if(!root||root.dataset.customerId!==customerId)return;
    const projects=(state.projects||[]).filter(project=>project.customerId===customerId);
    patchStats(customerId,projects);
    renderHistory(customerId,preferred);
  }

  document.addEventListener('click',event=>{
    const tab=event.target.closest('[data-customer-service-tab]');
    if(tab){
      event.preventDefault();event.stopPropagation();
      const customerId=tab.dataset.customerId,service=tab.dataset.customerServiceTab;
      activeByCustomer.set(customerId,service);renderHistory(customerId,service);return;
    }
    const create=event.target.closest('[data-customer-service-create]');
    if(create){
      event.preventDefault();event.stopPropagation();
      const customerId=create.dataset.customerId,service=create.dataset.customerServiceCreate;
      if(typeof openProjectDialog==='function')openProjectDialog(customerId,service==='piercing'?'piercing':'tattoo');
    }
  },true);

  document.addEventListener('tatnera:customer-opened',event=>{
    const customerId=event.detail?.customerId||document.getElementById('customerDetail')?.dataset.customerId||'';
    requestAnimationFrame(()=>patchCustomer(customerId));
  });
  document.addEventListener('tatnera:data-changed',event=>{
    const root=document.getElementById('customerDetail');
    if(!root||state.currentView!=='customer-detail')return;
    const customerId=root.dataset.customerId||'';
    if(event.detail?.customerId&&event.detail.customerId!==customerId)return;
    requestAnimationFrame(()=>patchCustomer(customerId));
  });
  document.addEventListener('tatnera:runtime-refresh',()=>{
    const root=document.getElementById('customerDetail');
    if(root&&state.currentView==='customer-detail')requestAnimationFrame(()=>patchCustomer(root.dataset.customerId||''));
  });

  installStyle();
  const current=document.getElementById('customerDetail')?.dataset.customerId||'';
  if(current&&state.currentView==='customer-detail')requestAnimationFrame(()=>patchCustomer(current));
  window.TatneraCustomerServices={render:patchCustomer};
})();
