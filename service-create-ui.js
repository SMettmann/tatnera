/* TATNERA — separate Tattoo / Piercing entry points + dashboard service split */
(function(){
  'use strict';

  const Core=window.TatneraCore;
  if(!Core)return;
  const esc=Core.esc||((value)=>String(value??''));
  let unscheduledService='tattoo';
  let unscheduledArtist='all';

  function installStyle(){
    if(document.getElementById('serviceCreateUiStyle'))return;
    const style=document.createElement('style');
    style.id='serviceCreateUiStyle';
    style.textContent=`
      .service-type-picker{display:none!important}
      .service-create-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
      .service-create-piercing{white-space:nowrap}
      .today-service-split{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:2px 0 14px}
      .today-service-card{appearance:none;width:100%;text-align:left;border:1px solid var(--line);border-radius:11px;background:var(--panel-2);color:var(--text);padding:11px 12px;cursor:pointer}
      .today-service-card:hover{border-color:rgba(115,130,90,.48)}
      .today-service-card span,.today-service-card strong,.today-service-card small{display:block}
      .today-service-card span{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:var(--muted)}
      .today-service-card strong{font-size:20px;line-height:1;margin-top:6px}
      .today-service-card small{font-size:9px;color:var(--muted);margin-top:4px}
      .unscheduled-filters{margin:12px 0 13px}
      .unscheduled-filter-label{display:block;margin-bottom:6px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:var(--muted)}
      .unscheduled-artist-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:11px}
      .unscheduled-artist-tab{appearance:none;border:1px solid var(--line);border-radius:999px;background:var(--panel-2);color:var(--muted);padding:6px 10px;font:inherit;font-size:10px;font-weight:800;cursor:pointer}
      .unscheduled-artist-tab:hover{border-color:rgba(115,130,90,.5);color:var(--text)}
      .unscheduled-artist-tab.active{background:var(--text);border-color:var(--text);color:var(--panel)}
      .unscheduled-service-tabs{display:flex;gap:22px;border-bottom:1px solid var(--line);margin-bottom:12px}
      .unscheduled-service-tab{appearance:none;position:relative;border:0;background:transparent;color:var(--muted);padding:8px 1px 10px;font:inherit;font-size:11px;font-weight:850;cursor:pointer}
      .unscheduled-service-tab:after{content:'';position:absolute;left:0;right:0;bottom:-1px;height:2px;background:transparent;border-radius:999px}
      .unscheduled-service-tab.active{color:var(--text)}
      .unscheduled-service-tab.active:after{background:var(--text)}
      .unscheduled-service-count{display:inline-grid;place-items:center;min-width:19px;height:19px;margin-left:6px;padding:0 5px;border:1px solid var(--line);border-radius:999px;font-size:9px;color:var(--muted);vertical-align:middle}
      .unscheduled-service-tab.active .unscheduled-service-count{color:var(--text)}
      @media(max-width:760px){
        .service-create-actions{width:100%}.service-create-actions .btn{flex:1}
        .today-service-split{grid-template-columns:1fr 1fr}
        .unscheduled-service-tabs{gap:14px;overflow-x:auto}
        .unscheduled-service-tab{white-space:nowrap}
      }
    `;
    document.head.appendChild(style);
  }

  function selectService(serviceType){
    const form=document.getElementById('projectForm');
    if(!form)return;
    const target=form.querySelector(`[name="serviceType"][value="${serviceType==='piercing'?'piercing':'tattoo'}"]`);
    if(!target)return;
    target.checked=true;
    target.dispatchEvent(new Event('change',{bubbles:true}));
  }

  function wrapProjectDialog(){
    if(window.__tatneraServiceDialogWrapped||typeof openProjectDialog!=='function')return;
    window.__tatneraServiceDialogWrapped=true;
    const previous=openProjectDialog;
    openProjectDialog=function(customerId='',serviceType='tattoo'){
      previous(customerId);
      requestAnimationFrame(()=>selectService(serviceType));
    };
  }

  function wrapDashboardNavigation(){
    if(window.__tatneraServiceDashboardWrapped||typeof navigate!=='function')return;
    window.__tatneraServiceDashboardWrapped=true;
    const previous=navigate;
    navigate=function(view){
      previous(view);
      if(view==='dashboard')setTimeout(()=>{renderTodaySplit();renderUnscheduledOverview();},0);
    };
  }

  function ensureCreateButtons(){
    const quick=document.getElementById('quickProjectBtn');
    if(quick){
      quick.textContent='+ Neues Tattoo';
      if(!document.getElementById('quickPiercingBtn')){
        const piercing=document.createElement('button');
        piercing.type='button';piercing.id='quickPiercingBtn';piercing.className='btn primary service-create-piercing';piercing.textContent='+ Neues Piercing';
        quick.insertAdjacentElement('afterend',piercing);
        piercing.addEventListener('click',()=>openProjectDialog('','piercing'));
      }
    }

    const add=document.getElementById('addProjectBtn');
    if(add){
      add.textContent='+ Neues Tattoo';
      let actions=add.closest('.service-create-actions');
      if(!actions){
        actions=document.createElement('div');actions.className='service-create-actions';
        add.parentElement?.insertBefore(actions,add);actions.appendChild(add);
      }
      if(!document.getElementById('addPiercingBtn')){
        const piercing=document.createElement('button');
        piercing.type='button';piercing.id='addPiercingBtn';piercing.className='btn primary service-create-piercing';piercing.textContent='+ Neues Piercing';
        actions.appendChild(piercing);
        piercing.addEventListener('click',()=>openProjectDialog('','piercing'));
      }
    }
  }

  function ensureCustomerButtons(){
    document.querySelectorAll('[data-customer-new-tattoo]').forEach(tattoo=>{
      tattoo.textContent='+ Neues Tattoo';
      const actions=tattoo.closest('.customer-primary-actions');if(!actions)return;
      const customerId=tattoo.dataset.customerNewTattoo||document.getElementById('customerDetail')?.dataset.customerId||'';
      if(actions.querySelector('[data-customer-new-piercing]'))return;
      const piercing=document.createElement('button');
      piercing.type='button';piercing.className='btn ghost';piercing.dataset.customerNewPiercing=customerId;piercing.textContent='+ Neues Piercing';
      tattoo.insertAdjacentElement('afterend',piercing);
      piercing.addEventListener('click',()=>openProjectDialog(customerId,'piercing'));
    });
  }

  function uniqueCustomers(events){
    return new Set(events.map(event=>event.customerId).filter(Boolean)).size;
  }

  function renderTodaySplit(){
    const panel=document.querySelector('#dashboard .cockpit-today');
    const timeline=panel?.querySelector('#todayAppointments');
    if(!panel||!timeline)return;
    let split=panel.querySelector('.today-service-split');
    if(!split){split=document.createElement('div');split.className='today-service-split';timeline.insertAdjacentElement('beforebegin',split);}
    const today=typeof todayISO==='function'?todayISO():new Date().toISOString().slice(0,10);
    const events=(state.calendarEvents||[]).filter(event=>event.date===today);
    const tattooCount=uniqueCustomers(events.filter(event=>['tattoo','touchup'].includes(event.type)));
    const piercingCount=uniqueCustomers(events.filter(event=>event.type==='piercing'));
    split.innerHTML=`<button type="button" class="today-service-card tattoo" data-today-service="tattoo"><span>Tattoo heute</span><strong>${tattooCount}</strong><small>${tattooCount===1?'Kunde':'Kunden'}</small></button><button type="button" class="today-service-card piercing" data-today-service="piercing"><span>Piercing heute</span><strong>${piercingCount}</strong><small>${piercingCount===1?'Kunde':'Kunden'}</small></button>`;
    split.querySelectorAll('[data-today-service]').forEach(button=>button.addEventListener('click',()=>{if(typeof navigate==='function')navigate('calendar');}));
  }

  function isPiercing(project){return project?.serviceType==='piercing';}
  function hasFutureEvent(projectId){
    const today=typeof todayISO==='function'?todayISO():new Date().toISOString().slice(0,10);
    return (state.calendarEvents||[]).some(event=>event.projectId===projectId&&event.date>=today);
  }
  function openProjects(){return (state.projects||[]).filter(project=>project.status!=='Abgeschlossen'&&!hasFutureEvent(project.id));}

  function renderUnscheduledOverview(){
    const panel=document.querySelector('#dashboard .cockpit-unscheduled, #dashboard .cockpit-requests');
    const list=panel?.querySelector('[data-unscheduled-list]');
    if(!panel||!list)return;

    let filters=panel.querySelector('[data-unscheduled-filters]');
    if(!filters){
      filters=document.createElement('div');filters.className='unscheduled-filters';filters.dataset.unscheduledFilters='true';
      const head=panel.querySelector('.cockpit-head');head?.insertAdjacentElement('afterend',filters);
    }

    const artists=Core.getArtists(true);
    if(unscheduledArtist!=='all'&&!artists.some(artist=>artist.name===unscheduledArtist))unscheduledArtist='all';
    const all=openProjects();
    const tattooTotal=all.filter(project=>!isPiercing(project)).length;
    const piercingTotal=all.filter(isPiercing).length;

    filters.innerHTML=`
      <span class="unscheduled-filter-label">Artist</span>
      <div class="unscheduled-artist-tabs">
        <button type="button" class="unscheduled-artist-tab ${unscheduledArtist==='all'?'active':''}" data-unscheduled-artist="all">Alle</button>
        ${artists.map(artist=>`<button type="button" class="unscheduled-artist-tab ${unscheduledArtist===artist.name?'active':''}" data-unscheduled-artist="${esc(artist.name)}">${esc(artist.name)}</button>`).join('')}
      </div>
      <div class="unscheduled-service-tabs" role="tablist" aria-label="Tattoo oder Piercing">
        <button type="button" class="unscheduled-service-tab ${unscheduledService==='tattoo'?'active':''}" data-unscheduled-service="tattoo">Tattoo Übersicht <span class="unscheduled-service-count">${tattooTotal}</span></button>
        <button type="button" class="unscheduled-service-tab ${unscheduledService==='piercing'?'active':''}" data-unscheduled-service="piercing">Piercing Übersicht <span class="unscheduled-service-count">${piercingTotal}</span></button>
      </div>`;

    filters.querySelectorAll('[data-unscheduled-artist]').forEach(button=>button.addEventListener('click',()=>{unscheduledArtist=button.dataset.unscheduledArtist;renderUnscheduledOverview();}));
    filters.querySelectorAll('[data-unscheduled-service]').forEach(button=>button.addEventListener('click',()=>{unscheduledService=button.dataset.unscheduledService;renderUnscheduledOverview();}));

    const projects=all.filter(project=>{
      const serviceMatches=unscheduledService==='piercing'?isPiercing(project):!isPiercing(project);
      const artistMatches=unscheduledArtist==='all'||project.artist===unscheduledArtist;
      return serviceMatches&&artistMatches;
    });

    const noun=unscheduledService==='piercing'?'Piercings':'Tattoos';
    const empty=unscheduledArtist==='all'?`Alle offenen ${noun} haben einen Termin.`:`Für ${esc(unscheduledArtist)} gibt es keine offenen ${noun} ohne Termin.`;
    list.innerHTML=projects.map(project=>`<button class="dashboard-work-row warn" data-runtime-project="${esc(project.id)}"><div><strong>${esc(project.title)}</strong><span>${esc(customerName(project.customerId))} · ${esc(project.artist||'—')}</span></div><div><small>Planung</small><div class="work-value">Termin fehlt</div></div><span>→</span></button>`).join('')||`<div class="dashboard-action-empty">${empty}</div>`;
  }

  function refresh(){
    installStyle();
    wrapProjectDialog();
    wrapDashboardNavigation();
    ensureCreateButtons();
    ensureCustomerButtons();
    renderTodaySplit();
    renderUnscheduledOverview();
  }

  refresh();
  document.addEventListener('tatnera:runtime-refresh',()=>setTimeout(refresh,0));
  document.addEventListener('tatnera:customer-opened',()=>setTimeout(ensureCustomerButtons,0));
  document.addEventListener('tatnera:artists-changed',()=>setTimeout(renderUnscheduledOverview,0));
  document.addEventListener('tatnera:data-changed',()=>setTimeout(()=>{ensureCreateButtons();ensureCustomerButtons();renderTodaySplit();renderUnscheduledOverview();},0));
  document.addEventListener('tatnera:auth-ready',()=>setTimeout(refresh,300));
  window.addEventListener('popstate',()=>setTimeout(renderUnscheduledOverview,0));
})();
