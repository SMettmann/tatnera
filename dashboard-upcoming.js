/* TATNERA — dashboard upcoming appointments
   Replaces the low-value "Ohne Termin" list with the next scheduled studio appointments. */
(function(){
  'use strict';
  if(window.__tatneraDashboardUpcomingInstalled)return;
  window.__tatneraDashboardUpcomingInstalled=true;

  const Core=window.TatneraCore;
  const esc=Core?.esc||((value)=>String(value??''));
  let artistFilter='all';
  let serviceFilter='all';

  function today(){return typeof todayISO==='function'?todayISO():new Date().toISOString().slice(0,10);}
  function formatDate(value){
    if(!value)return '—';
    const date=new Date(value+'T12:00:00');
    const tomorrow=new Date();tomorrow.setHours(0,0,0,0);tomorrow.setDate(tomorrow.getDate()+1);
    if(value===tomorrow.toISOString().slice(0,10))return 'Morgen';
    return new Intl.DateTimeFormat('de-DE',{weekday:'short',day:'2-digit',month:'2-digit'}).format(date);
  }
  function typeLabel(type){
    if(type==='piercing')return 'Piercing';
    if(type==='touchup')return 'Nachstechen';
    if(type==='consultation')return 'Beratung';
    if(type==='tattoo')return 'Tattoo';
    return typeof eventTypeLabel==='function'?eventTypeLabel(type):String(type||'Termin');
  }
  function projectTitle(event){
    if(!event?.projectId)return '';
    return (state.projects||[]).find(project=>project.id===event.projectId)?.title||'';
  }
  function customerLabel(event){
    if(event?.customerId&&typeof customerName==='function')return customerName(event.customerId);
    return event?.notes||typeLabel(event?.type);
  }
  function upcomingEvents(){
    const date=today();
    const excluded=new Set(['Abgesagt','Storniert','No-Show','Blockiert','Abgeschlossen']);
    return (state.calendarEvents||[])
      .filter(event=>event.date>date&&event.type!=='block'&&!excluded.has(event.status))
      .sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.start||'').localeCompare(String(b.start||'')));
  }
  function serviceMatches(event){
    if(serviceFilter==='all')return true;
    if(serviceFilter==='piercing')return event.type==='piercing';
    return ['tattoo','touchup'].includes(event.type);
  }

  function installStyle(){
    if(document.getElementById('dashboardUpcomingStyle'))return;
    const style=document.createElement('style');style.id='dashboardUpcomingStyle';style.textContent=`
      .dashboard-upcoming-filters{margin:12px 0 13px}
      .dashboard-upcoming-label{display:block;margin-bottom:6px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:var(--muted)}
      .dashboard-upcoming-artists{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:11px}
      .dashboard-upcoming-chip{appearance:none;border:1px solid var(--line);border-radius:999px;background:var(--panel-2);color:var(--muted);padding:6px 10px;font:inherit;font-size:10px;font-weight:800;cursor:pointer}
      .dashboard-upcoming-chip.active{background:var(--text);border-color:var(--text);color:var(--panel)}
      .dashboard-upcoming-tabs{display:flex;gap:22px;border-bottom:1px solid var(--line);margin-bottom:12px}
      .dashboard-upcoming-tab{appearance:none;position:relative;border:0;background:transparent;color:var(--muted);padding:8px 1px 10px;font:inherit;font-size:11px;font-weight:850;cursor:pointer;white-space:nowrap}
      .dashboard-upcoming-tab:after{content:'';position:absolute;left:0;right:0;bottom:-1px;height:2px;background:transparent;border-radius:999px}
      .dashboard-upcoming-tab.active{color:var(--text)}.dashboard-upcoming-tab.active:after{background:var(--text)}
      .dashboard-upcoming-count{display:inline-grid;place-items:center;min-width:19px;height:19px;margin-left:6px;padding:0 5px;border:1px solid var(--line);border-radius:999px;font-size:9px;color:var(--muted);vertical-align:middle}
      .dashboard-upcoming-row{border-left:3px solid transparent!important}
      .dashboard-upcoming-row .appointment-status{display:block;margin-top:3px;font-size:9px;color:var(--muted)}
      @media(max-width:760px){.dashboard-upcoming-tabs{gap:14px;overflow-x:auto}}
    `;document.head.appendChild(style);
  }

  function ensurePanel(){
    const panel=document.querySelector('#dashboard .cockpit-requests, #dashboard .cockpit-unscheduled');
    if(!panel)return null;
    panel.classList.add('cockpit-upcoming');
    const head=panel.querySelector('.cockpit-head');
    if(head){
      const eyebrow=head.querySelector('.eyebrow'),title=head.querySelector('h3');
      if(eyebrow)eyebrow.textContent='Kommend';
      if(title)title.textContent='Nächste Termine';
      if(!head.querySelector('[data-upcoming-calendar]')){
        const button=document.createElement('button');button.type='button';button.className='text-btn';button.dataset.upcomingCalendar='true';button.textContent='Kalender →';button.addEventListener('click',()=>{if(typeof navigate==='function')navigate('calendar');});head.appendChild(button);
      }
    }
    panel.querySelector('[data-unscheduled-filters]')?.remove();
    let list=panel.querySelector('[data-upcoming-list]')||panel.querySelector('[data-unscheduled-list]');
    if(!list)return null;
    list.removeAttribute('data-unscheduled-list');list.dataset.upcomingList='true';
    let filters=panel.querySelector('[data-upcoming-filters]');
    if(!filters){filters=document.createElement('div');filters.className='dashboard-upcoming-filters';filters.dataset.upcomingFilters='true';head?.insertAdjacentElement('afterend',filters);}
    return {panel,list,filters};
  }

  function render(){
    installStyle();
    const parts=ensurePanel();if(!parts)return;
    const {list,filters}=parts,artists=Core?.getArtists?.(true)||[];
    if(artistFilter!=='all'&&!artists.some(artist=>artist.name===artistFilter))artistFilter='all';
    const all=upcomingEvents();
    const tattooCount=all.filter(event=>['tattoo','touchup'].includes(event.type)).length;
    const piercingCount=all.filter(event=>event.type==='piercing').length;

    filters.innerHTML=`<span class="dashboard-upcoming-label">Artist</span><div class="dashboard-upcoming-artists"><button type="button" class="dashboard-upcoming-chip ${artistFilter==='all'?'active':''}" data-upcoming-artist="all">Alle</button>${artists.map(artist=>`<button type="button" class="dashboard-upcoming-chip ${artistFilter===artist.name?'active':''}" data-upcoming-artist="${esc(artist.name)}">${esc(artist.name)}</button>`).join('')}</div><div class="dashboard-upcoming-tabs"><button type="button" class="dashboard-upcoming-tab ${serviceFilter==='all'?'active':''}" data-upcoming-service="all">Alle Termine <span class="dashboard-upcoming-count">${all.length}</span></button><button type="button" class="dashboard-upcoming-tab ${serviceFilter==='tattoo'?'active':''}" data-upcoming-service="tattoo">Tattoo <span class="dashboard-upcoming-count">${tattooCount}</span></button><button type="button" class="dashboard-upcoming-tab ${serviceFilter==='piercing'?'active':''}" data-upcoming-service="piercing">Piercing <span class="dashboard-upcoming-count">${piercingCount}</span></button></div>`;
    filters.querySelectorAll('[data-upcoming-artist]').forEach(button=>button.addEventListener('click',()=>{artistFilter=button.dataset.upcomingArtist;render();}));
    filters.querySelectorAll('[data-upcoming-service]').forEach(button=>button.addEventListener('click',()=>{serviceFilter=button.dataset.upcomingService;render();}));

    const events=all.filter(event=>(artistFilter==='all'||event.artist===artistFilter)&&serviceMatches(event)).slice(0,6);
    list.innerHTML=events.map(event=>{
      const project=projectTitle(event),sub=[typeLabel(event.type),project,event.artist||'—'].filter(Boolean).join(' · ');
      return `<button type="button" class="dashboard-work-row dashboard-upcoming-row" data-upcoming-event="${esc(event.id)}"><div><strong>${esc(customerLabel(event))}</strong><span>${esc(sub)}</span><small class="appointment-status">${esc(event.status||'')}</small></div><div><small>${esc(formatDate(event.date))}</small><div class="work-value">${esc(event.start||'—')} Uhr</div></div><span>→</span></button>`;
    }).join('')||'<div class="dashboard-action-empty">Keine kommenden Termine für diese Auswahl.</div>';
    list.querySelectorAll('[data-upcoming-event]').forEach(button=>button.addEventListener('click',()=>{const id=button.dataset.upcomingEvent;if(typeof openAppointmentDialog==='function')openAppointmentDialog(id);else if(typeof navigate==='function')navigate('calendar');}));
  }

  function later(){setTimeout(render,20);}
  render();
  document.addEventListener('tatnera:runtime-refresh',later);
  document.addEventListener('tatnera:data-changed',later);
  document.addEventListener('tatnera:artists-changed',later);
  document.addEventListener('tatnera:auth-ready',()=>setTimeout(render,350));
  window.addEventListener('popstate',later);
})();
