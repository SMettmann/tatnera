/* TATNERA — monthly calendar overview */
(function(){
  'use strict';

  if(window.__tatneraMonthCalendarInstalled)return;
  if(typeof window.renderCalendar!=='function'||typeof window.changeCalendarDate!=='function')return;
  window.__tatneraMonthCalendarInstalled=true;

  const Core=window.TatneraCore;
  const esc=Core?.esc||((value)=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])));
  const previousRender=window.renderCalendar;
  const previousChangeDate=window.changeCalendarDate;

  function installStyle(){
    if(document.getElementById('calendarMonthViewStyle'))return;
    const style=document.createElement('style');
    style.id='calendarMonthViewStyle';
    style.textContent=`
      .calendar-month-scroll{overflow-x:auto;background:#111113}
      .calendar-month-wrap{min-width:980px}
      .calendar-month-weekdays{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));border-bottom:1px solid var(--line);background:#101012}
      .calendar-month-weekdays div{padding:10px 12px;font-size:10px;font-weight:850;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);border-right:1px solid var(--line)}
      .calendar-month-weekdays div:last-child{border-right:0}
      .calendar-month-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));grid-template-rows:repeat(6,minmax(132px,1fr))}
      .calendar-month-day{position:relative;min-height:132px;padding:8px;border-right:1px solid var(--line);border-bottom:1px solid var(--line);background:#131315;overflow:hidden}
      .calendar-month-day:nth-child(7n){border-right:0}
      .calendar-month-day:nth-last-child(-n+7){border-bottom:0}
      .calendar-month-day.outside{background:#101012;color:#66666d}
      .calendar-month-day.today{background:#161812}
      .calendar-month-head{display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:7px}
      .calendar-month-date{appearance:none;border:0;background:transparent;color:inherit;font:inherit;font-size:12px;font-weight:900;padding:0;cursor:pointer}
      .calendar-month-day.today .calendar-month-date{display:grid;place-items:center;width:27px;height:27px;border-radius:9px;background:var(--accent);color:var(--accent-ink)}
      .calendar-month-add{appearance:none;display:grid;place-items:center;width:24px;height:24px;border:1px solid transparent;border-radius:8px;background:transparent;color:var(--muted);font-size:16px;line-height:1;cursor:pointer;opacity:0;transition:.15s opacity,.15s background,.15s border-color}
      .calendar-month-day:hover .calendar-month-add,.calendar-month-add:focus-visible{opacity:1}
      .calendar-month-add:hover{border-color:var(--line);background:#1a1a1e;color:var(--text)}
      .calendar-month-events{display:flex;flex-direction:column;gap:4px}
      .calendar-month-event{appearance:none;width:100%;display:grid;grid-template-columns:35px minmax(0,1fr);gap:5px;align-items:center;text-align:left;border:1px solid #303036;border-left-width:3px;border-radius:8px;background:#1a1a1e;color:var(--text);padding:5px 6px;cursor:pointer;min-width:0}
      .calendar-month-event:hover{border-color:#4c4c53}
      .calendar-month-event.tattoo{border-left-color:var(--accent)}
      .calendar-month-event.piercing{border-left-color:#8b78a8}
      .calendar-month-event.consultation{border-left-color:#8db8ff}
      .calendar-month-event.touchup{border-left-color:#ffb45f}
      .calendar-month-event.block{border-left-color:#7f7f86;background:#171719}
      .calendar-month-event-time{font-size:9px;font-weight:900;color:var(--muted)}
      .calendar-month-event-title{font-size:10px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .calendar-month-more{appearance:none;width:100%;border:0;background:transparent;color:var(--muted);font:inherit;font-size:9px;font-weight:800;text-align:left;padding:3px 2px;cursor:pointer}
      .calendar-month-more:hover{color:var(--text)}
      .calendar-month-day.outside .calendar-month-event{opacity:.62}
      html[data-theme="light"] .calendar-month-scroll{background:#fff!important}
      html[data-theme="light"] .calendar-month-wrap{background:#fff!important}
      html[data-theme="light"] .calendar-month-weekdays{background:#f7f8fa!important;border-color:#dfe3e7!important}
      html[data-theme="light"] .calendar-month-weekdays div{color:#7f878f!important;border-color:#e1e5e8!important}
      html[data-theme="light"] .calendar-month-day{background:#fff!important;border-color:#e2e6e9!important;color:#252a2f!important}
      html[data-theme="light"] .calendar-month-day.outside{background:#f7f8fa!important;color:#9aa0a6!important}
      html[data-theme="light"] .calendar-month-day.today{background:#f7faf5!important}
      html[data-theme="light"] .calendar-month-add:hover{background:#f0f2f4!important;border-color:#d8dde1!important;color:#252a2f!important}
      html[data-theme="light"] .calendar-month-event{background:#f8f9fa!important;color:#20252a!important;border-color:#dce0e4!important}
      html[data-theme="light"] .calendar-month-event.tattoo{border-left-color:#3f5943!important}
      html[data-theme="light"] .calendar-month-event.piercing{border-left-color:#76628f!important}
      html[data-theme="light"] .calendar-month-event.consultation{border-left-color:#6e9fe6!important}
      html[data-theme="light"] .calendar-month-event.touchup{border-left-color:#e59a42!important}
      html[data-theme="light"] .calendar-month-event.block{border-left-color:#8d9399!important;background:#f0f2f4!important}
      html[data-theme="light"] .calendar-month-event-time,html[data-theme="light"] .calendar-month-more{color:#7b8289!important}
      html[data-theme="light"] .calendar-month-more:hover{color:#20252a!important}
      @media(max-width:760px){
        .calendar-month-wrap{min-width:900px}
        .calendar-month-grid{grid-template-rows:repeat(6,minmax(118px,1fr))}
        .calendar-month-day{min-height:118px}
        .calendar-month-add{opacity:1}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureMonthButton(){
    const toggle=document.getElementById('calendarToggle');
    if(!toggle||toggle.querySelector('[data-cal-view="month"]'))return;
    const button=document.createElement('button');
    button.type='button';
    button.dataset.calView='month';
    button.textContent='Monat';
    toggle.appendChild(button);
  }

  function eventTitle(event){
    try{return calendarEventTitle(event);}catch(_error){
      if(event.projectId&&typeof projectName==='function')return projectName(event.projectId);
      if(event.customerId&&typeof customerName==='function')return customerName(event.customerId);
      if(typeof eventTypeLabel==='function')return eventTypeLabel(event.type);
      return event.type||'Termin';
    }
  }

  function renderMonthCalendar(board){
    const anchor=parseISO(state.calendar.anchor);
    const year=anchor.getFullYear();
    const month=anchor.getMonth();
    const first=new Date(year,month,1);
    const start=mondayOf(first);
    const events=filteredCalendarEvents();
    const grouped=new Map();
    events.forEach(event=>{
      if(!grouped.has(event.date))grouped.set(event.date,[]);
      grouped.get(event.date).push(event);
    });
    grouped.forEach(list=>list.sort((a,b)=>String(a.start).localeCompare(String(b.start))));

    const label=document.getElementById('calendarDateLabel');
    if(label)label.textContent=formatDay(first,{month:'long',year:'numeric'});

    const weekdays=['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'];
    const days=Array.from({length:42},(_,index)=>addDays(start,index));
    board.innerHTML=`<div class="calendar-month-scroll"><div class="calendar-month-wrap"><div class="calendar-month-weekdays">${weekdays.map(day=>`<div>${day}</div>`).join('')}</div><div class="calendar-month-grid">${days.map(day=>{
      const iso=dateToISO(day);
      const dayEvents=grouped.get(iso)||[];
      const outside=day.getMonth()!==month;
      const visible=dayEvents.slice(0,3);
      const more=dayEvents.length-visible.length;
      return `<section class="calendar-month-day ${outside?'outside':''} ${iso===todayISO()?'today':''}">
        <div class="calendar-month-head">
          <button type="button" class="calendar-month-date" data-open-day="${esc(iso)}" title="Tag öffnen">${day.getDate()}</button>
          <button type="button" class="calendar-month-add" data-add-date="${esc(iso)}" title="Termin anlegen">+</button>
        </div>
        <div class="calendar-month-events">
          ${visible.map(event=>`<button type="button" class="calendar-month-event ${esc(event.type||'')}" data-event-id="${esc(event.id)}"><span class="calendar-month-event-time">${esc(event.start||'')}</span><span class="calendar-month-event-title">${esc(eventTitle(event))}</span></button>`).join('')}
          ${more>0?`<button type="button" class="calendar-month-more" data-open-day="${esc(iso)}">+ ${more} weitere${more===1?'r':''}</button>`:''}
        </div>
      </section>`;
    }).join('')}</div></div></div>`;
    bindCalendarCards();
  }

  function patchedRenderCalendar(){
    ensureMonthButton();
    if(state.calendar?.view!=='month')return previousRender.apply(this,arguments);
    const board=document.getElementById('calendarBoard');if(!board)return;
    document.querySelectorAll('[data-cal-view]').forEach(button=>button.classList.toggle('active',button.dataset.calView==='month'));
    document.querySelectorAll('[data-artist]').forEach(button=>button.classList.toggle('active',button.dataset.artist===state.calendar.artist));
    renderMonthCalendar(board);
  }

  function patchedChangeCalendarDate(action){
    if(state.calendar?.view!=='month')return previousChangeDate.apply(this,arguments);
    if(action==='today')state.calendar.anchor=todayISO();
    else{
      const anchor=parseISO(state.calendar.anchor);
      const direction=action==='next'?1:-1;
      state.calendar.anchor=dateToISO(new Date(anchor.getFullYear(),anchor.getMonth()+direction,1));
    }
    patchedRenderCalendar();
  }

  installStyle();
  ensureMonthButton();
  window.renderCalendar=patchedRenderCalendar;
  window.changeCalendarDate=patchedChangeCalendarDate;
  try{renderCalendar=patchedRenderCalendar;}catch(_error){}
  try{changeCalendarDate=patchedChangeCalendarDate;}catch(_error){}

  document.addEventListener('tatnera:runtime-refresh',()=>setTimeout(()=>{ensureMonthButton();if(state.currentView==='calendar'&&state.calendar.view==='month')patchedRenderCalendar();},0));
  document.addEventListener('tatnera:artists-changed',()=>setTimeout(()=>{if(state.currentView==='calendar'&&state.calendar.view==='month')patchedRenderCalendar();},0));
  document.addEventListener('tatnera:data-changed',()=>setTimeout(()=>{if(state.currentView==='calendar'&&state.calendar.view==='month')patchedRenderCalendar();},0));
})();
