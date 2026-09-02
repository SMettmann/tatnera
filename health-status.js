/* TATNERA — central health-check state guard
   Distinguishes missing/incomplete anamnesis from a completed, unremarkable check. */
(function(){
  'use strict';
  const Core=window.TatneraCore;if(!Core)return;
  const KEYS=['bloodThinners','allergies','skinConditions','diabetes','immuneSystem','fainting','pregnancy','infection'];
  const LABELS={
    bloodThinners:'Blutverdünnende Medikamente',
    allergies:'Allergien / Unverträglichkeiten',
    skinConditions:'Hauterkrankungen / Hautprobleme',
    diabetes:'Diabetes',
    immuneSystem:'Immunsystem / Immunsuppression',
    fainting:'Kreislaufprobleme / Ohnmacht',
    pregnancy:'Schwangerschaft / Stillzeit',
    infection:'Infektion / Fieber / starke Erkrankung'
  };
  let activeEventId='';

  function healthState(project){
    const health=project?.consentData?.health;
    const values=health&&typeof health==='object'?health:{};
    const answered=KEYS.filter(key=>values[key]==='Ja'||values[key]==='Nein');
    const yes=KEYS.filter(key=>values[key]==='Ja').map(key=>({key,label:LABELS[key]}));
    const missing=KEYS.filter(key=>values[key]!=='Ja'&&values[key]!=='Nein');
    return {complete:answered.length===KEYS.length,answered:answered.length,total:KEYS.length,yes,missing};
  }

  function installStyle(){
    if(document.getElementById('tatneraHealthStateStyle'))return;
    const style=document.createElement('style');style.id='tatneraHealthStateStyle';style.textContent=`
      .dashboard-health-state{display:inline-flex!important;align-items:center!important;margin-left:7px!important;padding:3px 6px!important;border-radius:999px!important;font-size:9px!important;font-weight:800!important;white-space:nowrap!important}
      .dashboard-health-state.missing{background:#fff0f0!important;border:1px solid #d58d8d!important;color:#7c2e2e!important}
      .health-completeness-note{margin:12px 0;padding:10px 12px;border:1px solid #d58d8d;border-radius:10px;background:#fff0f0;color:#7c2e2e;font-size:11px;line-height:1.45}
      .health-completeness-note strong{display:block;margin-bottom:3px}
    `;document.head.appendChild(style);
  }

  function eventProject(eventId){
    const event=(state.calendarEvents||[]).find(item=>item.id===eventId);if(!event?.projectId)return {event:null,project:null};
    return {event,project:Core.getProject(event.projectId)};
  }

  function healthRow(){
    return [...document.querySelectorAll('#sessionPreflight .session-check')].find(row=>row.querySelector('strong')?.textContent.trim()==='Gesundheitscheck')||null;
  }

  function patchStartDialog(eventId){
    const {project}=eventProject(eventId);if(!project)return;
    const status=healthState(project),row=healthRow(),start=document.getElementById('confirmSessionStart');if(!row||!start)return;
    const icon=row.querySelector('.session-check-icon'),detail=row.querySelector('div:nth-child(2) span');
    if(!status.complete){
      row.classList.remove('warn');row.classList.add('missing');if(icon)icon.textContent='×';
      if(detail)detail.textContent=`Gesundheitscheck fehlt oder ist unvollständig · ${status.answered}/${status.total} Fragen beantwortet.`;
      row.querySelector('.session-health-ack')?.remove();
      if(!row.querySelector('[data-health-open-consent]'))row.insertAdjacentHTML('beforeend',`<button type="button" class="btn ghost" data-health-open-consent="${Core.esc(project.id)}">Gesundheitscheck öffnen</button>`);
      start.disabled=true;start.title='Gesundheitscheck muss vollständig ausgefüllt werden.';
      return;
    }
    row.querySelector('[data-health-open-consent]')?.remove();
    if(!status.yes.length){
      row.classList.remove('warn','missing');if(icon)icon.textContent='✓';
      if(detail)detail.textContent='Vollständig ausgefüllt · alle Gesundheitsfragen wurden mit „Nein“ beantwortet.';
    }else{
      row.classList.remove('missing');row.classList.add('warn');if(icon)icon.textContent='!';
      if(detail)detail.textContent=`${status.yes.length} Angabe${status.yes.length===1?'':'n'} prüfen: ${status.yes.map(item=>item.label).join(', ')}.`;
    }
  }

  function patchDashboard(){
    document.querySelectorAll('#todayAppointments [data-dashboard-event]').forEach(row=>{
      row.querySelectorAll('.dashboard-health-state').forEach(node=>node.remove());
      const {project}=eventProject(row.dataset.dashboardEvent);if(!project)return;
      const status=healthState(project);if(status.complete)return;
      const pill=row.querySelector('.status-pill');if(pill)pill.insertAdjacentHTML('afterend',`<span class="dashboard-health-state missing" title="${status.answered}/${status.total} Gesundheitsfragen beantwortet">⚠ Gesundheitscheck fehlt</span>`);
    });
  }

  function patchConsentCard(projectId=''){
    const id=projectId||Core.projectIdFromDetail(),project=Core.getProject(id),root=document.getElementById('projectDetail');if(!id||!project||!root||root.dataset.projectId!==id)return;
    const card=root.querySelector(`.consent-card[data-consent-project="${CSS.escape(id)}"]`);if(!card)return;
    card.querySelector('.health-completeness-note')?.remove();
    const status=healthState(project);if(status.complete)return;
    const actions=card.querySelector('.consent-actions'),note=document.createElement('div');note.className='health-completeness-note';note.innerHTML=`<strong>⚠ Gesundheitscheck unvollständig</strong>${status.answered} von ${status.total} Gesundheitsfragen wurden beantwortet. Vor einer Sitzung muss der Check vollständig sein.`;
    if(actions)card.insertBefore(note,actions);else card.appendChild(note);
  }

  function rerender(){requestAnimationFrame(()=>{patchDashboard();patchConsentCard();});}

  document.addEventListener('click',event=>{
    const start=event.target.closest('[data-start-session]');
    if(start){activeEventId=start.dataset.startSession||'';queueMicrotask(()=>patchStartDialog(activeEventId));return;}
    const open=event.target.closest('[data-health-open-consent]');
    if(open){event.preventDefault();event.stopPropagation();document.getElementById('sessionStartDialog')?.close();openProject(open.dataset.healthOpenConsent);setTimeout(()=>{Core.activateProjectTab('documents');document.querySelector(`[data-open-consent="${CSS.escape(open.dataset.healthOpenConsent)}"]`)?.click();},60);}
  },true);

  document.addEventListener('click',event=>{
    if(!event.target.closest('#confirmSessionStart')||!activeEventId)return;
    const {project}=eventProject(activeEventId);if(!project)return;
    const status=healthState(project);if(status.complete)return;
    event.preventDefault();event.stopImmediatePropagation();
    alert(`Der Gesundheitscheck ist noch nicht vollständig ausgefüllt (${status.answered}/${status.total}). Bitte zuerst alle Gesundheitsfragen beantworten.`);
  },true);

  document.addEventListener('tatnera:project-opened',event=>requestAnimationFrame(()=>patchConsentCard(event.detail?.projectId||'')));
  document.addEventListener('tatnera:data-changed',rerender);
  document.addEventListener('tatnera:runtime-refresh',rerender);

  installStyle();rerender();
  window.TatneraHealth={getStatus:projectOrId=>healthState(typeof projectOrId==='string'?Core.getProject(projectOrId):projectOrId)};
})();