/* TATNERA — tattoo session workflow
   Start -> running -> finish. Completed sessions keep their own ink/consent snapshots. */
(function(){
  'use strict';
  const Core=window.TatneraCore;if(!Core)return;
  const esc=Core.esc;
  const SESSION_KEY='tatnera_sessions_v1';
  const HEALTH_LABELS={
    bloodThinners:'Blutverdünnende Medikamente',
    allergies:'Allergien / Unverträglichkeiten',
    skinConditions:'Hauterkrankungen / Hautprobleme',
    diabetes:'Diabetes',
    immuneSystem:'Immunsystem / Immunsuppression',
    fainting:'Kreislaufprobleme / Ohnmacht',
    pregnancy:'Schwangerschaft / Stillzeit',
    infection:'Infektion / Fieber / starke Erkrankung'
  };
  let activeStartEventId='',activeFinishSessionId='',finishPhoto='';

  function loadSessions(){
    try{const parsed=JSON.parse(localStorage.getItem(SESSION_KEY)||'null');return Array.isArray(parsed)?parsed:[];}
    catch(_error){return [];}
  }
  state.sessions=loadSessions();
  function saveSessions(){localStorage.setItem(SESSION_KEY,JSON.stringify(state.sessions||[]));}
  function sessionById(id){return (state.sessions||[]).find(item=>item.id===id)||null;}
  function runningSessionForEvent(eventId){return (state.sessions||[]).find(item=>item.eventId===eventId&&item.status==='running')||null;}
  function runningSessionForProject(projectId){return (state.sessions||[]).find(item=>item.projectId===projectId&&item.status==='running')||null;}
  function sessionsForProject(projectId){return (state.sessions||[]).filter(item=>item.projectId===projectId).sort((a,b)=>String(b.startedAt||'').localeCompare(String(a.startedAt||'')));}
  function eligibleEvent(event){return Boolean(event&&event.projectId&&['tattoo','touchup'].includes(event.type));}
  function consentReady(project){return ['Unterschrieben','Vorhanden'].includes(project?.consent);}
  function inkById(id){return (state.inks||[]).find(item=>item.id===id)||null;}
  function projectInks(project){return (project?.inkIds||[]).map(inkById).filter(Boolean);}
  function inkExpired(ink){return Boolean(ink?.expiryDate&&ink.expiryDate<todayISO());}
  function euro(value){return new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:2}).format(Number(value)||0);}
  function paid(project){return Math.max(0,(project?.payments||[]).reduce((sum,tx)=>sum+(tx.type==='Erstattung'?-1:1)*Math.abs(Number(tx.amount)||0),0));}
  function remaining(project){return Math.max(0,Number(project?.price||0)-paid(project));}
  function formatDate(value){return value?new Intl.DateTimeFormat('de-DE',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(value+'T12:00:00')):'—';}
  function formatDateTime(value){return value?new Intl.DateTimeFormat('de-DE',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)):'—';}
  function durationLabel(start,end){
    if(!start)return '—';const a=new Date(start),b=end?new Date(end):new Date();const mins=Math.max(0,Math.round((b-a)/60000));
    if(mins<60)return `${mins} Min.`;const h=Math.floor(mins/60),m=mins%60;return m?`${h} Std. ${m} Min.`:`${h} Std.`;
  }
  function parseBirthDate(value){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value||'')))return null;
    const [y,m,d]=value.split('-').map(Number),date=new Date(y,m-1,d);
    return date.getFullYear()===y&&date.getMonth()===m-1&&date.getDate()===d?date:null;
  }
  function ageFromBirthDate(value){
    const birth=parseBirthDate(value);if(!birth)return null;
    const now=new Date();let age=now.getFullYear()-birth.getFullYear();
    if(now.getMonth()<birth.getMonth()||(now.getMonth()===birth.getMonth()&&now.getDate()<birth.getDate()))age--;
    return age;
  }
  function healthFlags(project){
    const health=project?.consentData?.health||{};
    return Object.entries(HEALTH_LABELS).filter(([key])=>health[key]==='Ja').map(([key,label])=>({key,label}));
  }
  function guardianReady(project,age){
    if(age===null||age<0||age>=18)return age!==null&&age>=0;
    const guardian=project?.consentData?.guardian;
    return Boolean(guardian?.name&&guardian?.consent&&guardian?.idChecked&&guardian?.signature);
  }
  function inkSnapshot(project){
    return projectInks(project).map(ink=>({id:ink.id,manufacturer:ink.manufacturer||'',name:ink.name||'',code:ink.code||'',batch:ink.batch||'',expiryDate:ink.expiryDate||''}));
  }
  function consentSnapshot(project){
    const age=ageFromBirthDate(project?.consentData?.birthDate||''),guardian=project?.consentData?.guardian||null;
    return {
      status:project?.consent||'Fehlt',
      signedAt:project?.consentData?.signedAt||'',
      birthDate:project?.consentData?.birthDate||'',
      age,
      minor:age!==null&&age>=0&&age<18,
      guardian:guardian?{name:guardian.name||'',relation:guardian.relation||'',idChecked:Boolean(guardian.idChecked),consent:Boolean(guardian.consent)}:null,
      healthFlags:healthFlags(project).map(item=>item.label)
    };
  }

  function installStyle(){
    if(document.getElementById('sessionManagementStyle'))return;
    const style=document.createElement('style');style.id='sessionManagementStyle';style.textContent=`
      .session-btn{background:#202822!important;border:1px solid #202822!important;color:#fff!important;font-weight:800!important;box-shadow:none!important}
      .session-btn:hover{background:#111713!important;border-color:#111713!important;color:#fff!important}
      .session-finish-btn{background:#26321f!important;border:1px solid #26321f!important;color:#fff!important;font-weight:800!important}
      .session-finish-btn:hover{background:#172012!important;border-color:#172012!important;color:#fff!important}
      .session-panel{margin-bottom:14px;border:1px solid #586b2d!important;background:linear-gradient(135deg,rgba(216,255,99,.09),rgba(216,255,99,.025))!important}
      .session-panel.running{box-shadow:0 0 0 1px rgba(216,255,99,.07) inset}
      .session-panel-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}
      .session-panel-head h3{margin:3px 0 4px}
      .session-live{display:inline-flex;align-items:center;gap:7px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#47611d}
      .session-live:before{content:'';width:8px;height:8px;border-radius:50%;background:#6e8c2b;box-shadow:0 0 0 4px rgba(110,140,43,.14)}
      .session-facts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:13px}
      .session-fact{padding:10px;border:1px solid var(--line);border-radius:10px;background:var(--panel-2)}
      .session-fact span,.session-fact strong{display:block}.session-fact span{font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}.session-fact strong{font-size:12px;margin-top:4px}
      .session-history{margin-top:14px}.session-history-list{display:flex;flex-direction:column;gap:8px;margin-top:10px}
      .session-history-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:11px;border:1px solid var(--line);border-radius:11px;background:var(--panel-2)}
      .session-history-row strong,.session-history-row span{display:block}.session-history-row strong{font-size:12px}.session-history-row span{font-size:10px;color:var(--muted);margin-top:3px}
      .session-history-meta{text-align:right}.session-history-meta strong{color:#536d22}
      .session-preflight{display:flex;flex-direction:column;gap:9px;margin:15px 0}
      .session-check{display:grid;grid-template-columns:24px 1fr auto;gap:10px;align-items:center;padding:11px;border:1px solid var(--line);border-radius:11px;background:var(--panel-2)}
      .session-check-icon{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:#263019;color:#d8ff63;font-weight:800}.session-check.missing .session-check-icon{background:#391d1d;color:#ff9898}.session-check.warn .session-check-icon{background:#382c19;color:#efc27d}
      .session-check strong,.session-check span{display:block}.session-check strong{font-size:12px}.session-check span{font-size:10px;color:var(--muted);margin-top:2px}
      .session-health-ack{display:flex!important;align-items:flex-start;gap:8px!important;font-size:11px!important;color:#6d4617!important;cursor:pointer}
      .session-health-ack input{margin-top:2px}
      .session-dialog-note{padding:11px 12px;border:1px solid var(--line);border-radius:10px;background:var(--panel-2);font-size:11px;color:var(--muted);line-height:1.5}
      .session-ink-snapshot{display:flex;flex-direction:column;gap:7px;margin-top:9px}.session-ink-row{display:flex;justify-content:space-between;gap:12px;padding:8px 10px;border:1px solid var(--line);border-radius:9px;background:var(--panel-2);font-size:11px}.session-ink-row span{color:var(--muted)}
      .session-photo-preview{margin-top:8px;min-height:62px;border:1px dashed var(--line);border-radius:10px;display:grid;place-items:center;color:var(--muted);font-size:10px;overflow:hidden}.session-photo-preview img{display:block;width:100%;max-height:180px;object-fit:cover}
      .session-required{color:#ef9a9a;font-size:10px;margin-top:8px}
      .dashboard-session-action{margin-left:auto!important;white-space:nowrap!important;padding:7px 10px!important;font-size:10px!important;flex:0 0 auto!important}
      .dashboard-health-flag{display:inline-flex!important;align-items:center!important;margin-left:7px!important;padding:3px 6px!important;border-radius:999px!important;background:#fff1dc!important;border:1px solid #d7a45f!important;color:#744819!important;font-size:9px!important;font-weight:800!important;white-space:nowrap!important}
      @media(max-width:720px){.session-facts{grid-template-columns:1fr 1fr}.session-panel-head{flex-direction:column}.session-history-row{grid-template-columns:1fr}.session-history-meta{text-align:left}.dashboard-appointment{flex-wrap:wrap}.dashboard-session-action{margin-left:0!important}}
    `;document.head.appendChild(style);
  }

  function installDialogs(){
    if(!document.getElementById('sessionStartDialog')){
      const dialog=document.createElement('dialog');dialog.id='sessionStartDialog';dialog.className='dialog';dialog.innerHTML=`<div style="padding:22px"><div class="dialog-head"><div><span class="eyebrow">Sitzung</span><h2>Sitzung starten</h2><p class="muted" id="sessionStartMeta"></p></div><button type="button" class="close-btn" data-close-session-start>×</button></div><div class="session-preflight" id="sessionPreflight"></div><div class="session-dialog-note">Beim Start werden Einwilligungsstatus, Alter, Gesundheitswarnungen sowie die aktuell zugeordneten Farben und Chargen als eigener Sitzungsstand gespeichert.</div><div class="dialog-actions"><button type="button" class="btn ghost" data-close-session-start>Abbrechen</button><button type="button" class="btn primary" id="confirmSessionStart">Sitzung starten</button></div></div>`;document.body.appendChild(dialog);
      dialog.querySelectorAll('[data-close-session-start]').forEach(btn=>btn.addEventListener('click',()=>dialog.close()));
      document.getElementById('confirmSessionStart').addEventListener('click',confirmStart);
    }
    if(!document.getElementById('sessionFinishDialog')){
      const dialog=document.createElement('dialog');dialog.id='sessionFinishDialog';dialog.className='dialog wide-dialog';dialog.innerHTML=`<form id="sessionFinishForm" style="padding:22px"><div class="dialog-head"><div><span class="eyebrow">Sitzung</span><h2>Sitzung abschließen</h2><p class="muted" id="sessionFinishMeta"></p></div><button type="button" class="close-btn" data-close-session-finish>×</button></div><div class="session-facts" id="sessionFinishFacts"></div><section style="margin-top:16px"><span class="eyebrow">Dokumentierte Chargen</span><div class="session-ink-snapshot" id="sessionFinishInks"></div></section><div class="form-grid" style="margin-top:16px"><label class="full">Sitzungsnotiz<textarea name="note" rows="3" placeholder="Besonderheiten, Verlauf, Reaktion des Kunden …"></textarea></label><label class="full">Foto nach der Sitzung<input type="file" id="sessionPhotoInput" accept="image/*"><div class="session-photo-preview" id="sessionPhotoPreview">Optionales Abschlussfoto</div></label></div><div style="margin-top:14px;display:flex;flex-direction:column;gap:9px"><label class="consent-check"><input required type="checkbox" name="aftercareGiven"><span>Nachsorgehinweise wurden dem Kunden übergeben.</span></label><label class="consent-check"><input type="checkbox" name="projectComplete"><span>Das gesamte Tattoo-Projekt ist mit dieser Sitzung abgeschlossen.</span></label></div><div class="session-required">„Nachsorgehinweise übergeben“ ist zum Abschließen erforderlich.</div><div class="dialog-actions"><button type="button" class="btn ghost" data-close-session-finish>Zurück</button><button type="submit" class="btn primary">Sitzung abschließen</button></div></form>`;document.body.appendChild(dialog);
      dialog.querySelectorAll('[data-close-session-finish]').forEach(btn=>btn.addEventListener('click',()=>dialog.close()));
      document.getElementById('sessionFinishForm').addEventListener('submit',finishSession);
      document.getElementById('sessionPhotoInput').addEventListener('change',handleFinishPhoto);
    }
  }

  function preflight(event,project){
    const inks=projectInks(project),expired=inks.filter(inkExpired),consent=consentReady(project),age=ageFromBirthDate(project?.consentData?.birthDate||''),guardian=guardianReady(project,age),health=healthFlags(project);
    const ageReady=age!==null&&age>=0;
    return {inks,expired,consent,age,ageReady,guardian,health,ready:consent&&ageReady&&guardian&&inks.length>0&&!expired.length};
  }
  function checkHtml(kind,ok,title,detail,action=''){
    const cls=ok?'':kind==='warn'?'warn':'missing';
    return `<div class="session-check ${cls}"><div class="session-check-icon">${ok?'✓':kind==='warn'?'!':'×'}</div><div><strong>${esc(title)}</strong><span>${esc(detail)}</span></div>${action||''}</div>`;
  }
  function refreshStartButton(check){
    const start=document.getElementById('confirmSessionStart'),ack=document.getElementById('sessionHealthAcknowledge');
    if(!start)return;
    const healthOk=!check.health.length||Boolean(ack?.checked);
    start.disabled=!check.ready||!healthOk;
    start.title=!check.ready?'Einwilligung, gültiges Alter / Sorgeberechtigten-Zustimmung und gültige Charge erforderlich':!healthOk?'Gesundheitsangaben müssen geprüft und bestätigt werden':'';
  }

  function openStart(eventId){
    const event=(state.calendarEvents||[]).find(item=>item.id===eventId);if(!eligibleEvent(event))return;
    const project=Core.getProject(event.projectId);if(!project)return;
    const running=runningSessionForProject(project.id);if(running){openFinish(running.id);return;}
    activeStartEventId=eventId;
    const check=preflight(event,project),depOpen=Math.max(0,Number(project.deposit||0)-Math.min(paid(project),Number(project.deposit||0)));
    document.getElementById('sessionStartMeta').textContent=`${customerName(project.customerId)} · ${project.title} · ${formatDate(event.date)} · ${event.start} Uhr`;
    const consentAction=check.consent?'':`<button type="button" class="btn ghost" data-session-open-documents="${esc(project.id)}">Dokumente</button>`;
    const inkAction=check.inks.length&&!check.expired.length?'':`<button type="button" class="btn ghost" data-session-open-documents="${esc(project.id)}">Chargen</button>`;
    const ageAction=check.ageReady&&check.guardian?'':`<button type="button" class="btn ghost" data-session-open-documents="${esc(project.id)}">Einwilligung öffnen</button>`;
    const ageDetail=!check.ageReady?'Geburtsdatum fehlt oder ist ungültig.':check.age<18?(check.guardian?`${check.age} Jahre · Zustimmung und Unterschrift der sorgeberechtigten Person dokumentiert.`:`${check.age} Jahre · Zustimmung / Identitätsprüfung / Unterschrift der sorgeberechtigten Person fehlt.`):`${check.age} Jahre · volljährig.`;
    const healthDetail=check.health.length?`${check.health.length} Gesundheitsangabe${check.health.length===1?'':'n'} mit „Ja“: ${check.health.map(item=>item.label).join(', ')}.`:'Keine Gesundheitsangabe mit „Ja“.';
    const healthAction=check.health.length?`<label class="session-health-ack"><input type="checkbox" id="sessionHealthAcknowledge"><span>Vom Studio geprüft – Sitzung kann durchgeführt werden.</span></label>`:'';
    document.getElementById('sessionPreflight').innerHTML=
      checkHtml('missing',check.consent,'Einwilligung',check.consent?`Status: ${project.consent}`:'Vor Sitzungsstart muss eine Einwilligung vorhanden sein.',consentAction)+
      checkHtml('missing',check.ageReady&&check.guardian,'Alter / Sorgeberechtigung',ageDetail,ageAction)+
      checkHtml(check.health.length?'warn':'missing',!check.health.length,'Gesundheitscheck',healthDetail,healthAction)+
      checkHtml(check.expired.length?'warn':'missing',check.inks.length>0&&!check.expired.length,'Farben & Chargen',!check.inks.length?'Noch keine Charge der Tattoo-Akte zugeordnet.':check.expired.length?`${check.expired.length} zugeordnete Charge${check.expired.length===1?' ist':'n sind'} abgelaufen.`:`${check.inks.length} Charge${check.inks.length===1?'':'n'} bereit.`,inkAction)+
      checkHtml('warn',depOpen<=0,'Anzahlung',depOpen<=0?'Keine offene Anzahlung.':`${euro(depOpen)} Anzahlung noch offen. Der Sitzungsstart bleibt möglich.`);
    document.getElementById('sessionHealthAcknowledge')?.addEventListener('change',()=>refreshStartButton(check));
    refreshStartButton(check);
    document.getElementById('sessionStartDialog').showModal();
  }

  function confirmStart(){
    const event=(state.calendarEvents||[]).find(item=>item.id===activeStartEventId);if(!eligibleEvent(event))return;
    const project=Core.getProject(event.projectId);if(!project)return;
    const check=preflight(event,project);
    if(!check.ready){openStart(event.id);return;}
    if(check.health.length&&!document.getElementById('sessionHealthAcknowledge')?.checked){alert('Bitte die auffälligen Gesundheitsangaben bewusst prüfen und bestätigen.');return;}
    if(event.date!==todayISO()&&!confirm(`Der Termin ist für ${formatDate(event.date)} geplant. Sitzung trotzdem jetzt starten?`))return;
    const existing=runningSessionForProject(project.id);if(existing){document.getElementById('sessionStartDialog').close();openFinish(existing.id);return;}
    const startedAt=new Date().toISOString(),session={
      id:'ses'+Date.now(),eventId:event.id,projectId:project.id,customerId:project.customerId,artist:event.artist||project.artist||'',type:event.type,scheduledDate:event.date,scheduledStart:event.start,scheduledDuration:Number(event.duration||0),startedAt,endedAt:'',status:'running',consentSnapshot:consentSnapshot(project),inkSnapshot:inkSnapshot(project),healthReviewed:Boolean(check.health.length),note:'',aftercareGiven:false,projectComplete:false,photo:''
    };
    state.sessions.unshift(session);saveSessions();
    event.status='Sitzung läuft';event.sessionId=session.id;event.actualStartedAt=startedAt;
    project.currentSessionId=session.id;if(!Array.isArray(project.sessionIds))project.sessionIds=[];if(!project.sessionIds.includes(session.id))project.sessionIds.push(session.id);project.status='In Arbeit';
    persist();
    document.getElementById('sessionStartDialog').close();
    try{renderCalendar();renderAppointments();renderProjects();renderCustomers();}catch(_error){}
    document.dispatchEvent(new CustomEvent('tatnera:data-changed',{detail:{type:'session-start',sessionId:session.id,eventId:event.id,projectId:project.id,customerId:project.customerId}}));
    openProject(project.id);setTimeout(()=>Core.activateProjectTab('overview',{emit:false}),0);
  }

  function openFinish(sessionId){
    const session=sessionById(sessionId);if(!session||session.status!=='running')return;
    const project=Core.getProject(session.projectId);if(!project)return;
    activeFinishSessionId=session.id;finishPhoto=session.photo||'';
    const form=document.getElementById('sessionFinishForm');form.reset();
    document.getElementById('sessionFinishMeta').textContent=`${customerName(session.customerId)} · ${project.title} · gestartet ${formatDateTime(session.startedAt)}`;
    document.getElementById('sessionFinishFacts').innerHTML=`<div class="session-fact"><span>Artist</span><strong>${esc(session.artist||'—')}</strong></div><div class="session-fact"><span>Läuft seit</span><strong>${esc(durationLabel(session.startedAt,''))}</strong></div><div class="session-fact"><span>Chargen</span><strong>${session.inkSnapshot?.length||0}</strong></div><div class="session-fact"><span>Restbetrag</span><strong>${esc(euro(remaining(project)))}</strong></div>`;
    document.getElementById('sessionFinishInks').innerHTML=(session.inkSnapshot||[]).map(ink=>`<div class="session-ink-row"><strong>${esc(ink.manufacturer)} · ${esc(ink.name)}</strong><span>Charge ${esc(ink.batch)}${ink.code?' · '+esc(ink.code):''}</span></div>`).join('')||'<div class="session-dialog-note">Keine Charge im Sitzungs-Snapshot.</div>';
    renderFinishPhoto();document.getElementById('sessionFinishDialog').showModal();
  }

  function finishSession(event){
    event.preventDefault();const session=sessionById(activeFinishSessionId);if(!session||session.status!=='running')return;
    const project=Core.getProject(session.projectId),appointment=(state.calendarEvents||[]).find(item=>item.id===session.eventId);if(!project||!appointment){alert('Die laufende Sitzung ist nicht mehr vollständig mit Termin und Tattoo-Akte verknüpft.');return;}
    const form=event.currentTarget,endedAt=new Date().toISOString();
    session.status='completed';session.endedAt=endedAt;session.note=String(form.elements.note.value||'').trim();session.aftercareGiven=form.elements.aftercareGiven.checked;session.projectComplete=form.elements.projectComplete.checked;session.photo=finishPhoto;
    project.currentSessionId='';project.status=session.projectComplete?'Abgeschlossen':'In Arbeit';
    if(!project.aftercare||typeof project.aftercare!=='object')project.aftercare={status:'Offen',tattooDate:'',followupDate:'',instructionsGiven:false,records:[]};
    project.aftercare.instructionsGiven=true;
    saveSessions();
    const history=Core.completeAppointment?.(appointment.id,{sessionId:session.id,actualStartedAt:session.startedAt,actualEndedAt:endedAt,sessionNote:session.note,aftercareGiven:true,inkSnapshot:structuredClone(session.inkSnapshot||[])});
    if(!history){session.status='running';session.endedAt='';project.currentSessionId=session.id;saveSessions();alert('Der Termin konnte nicht abgeschlossen werden.');return;}
    persist();document.getElementById('sessionFinishDialog').close();
    document.dispatchEvent(new CustomEvent('tatnera:data-changed',{detail:{type:'session-complete',sessionId:session.id,eventId:appointment.id,projectId:project.id,customerId:project.customerId}}));
    openProject(project.id);
    const nextTab=remaining(project)>0?'payments':'aftercare';setTimeout(()=>Core.activateProjectTab(nextTab),0);
  }

  function renderProjectSession(projectId){
    const root=document.getElementById('projectDetail');if(!root||root.dataset.projectId!==projectId)return;
    root.querySelectorAll('[data-session-panel],[data-session-history]').forEach(node=>node.remove());
    const project=Core.getProject(projectId);if(!project)return;
    const pane=root.querySelector('[data-project-pane="overview"]');if(!pane)return;
    const running=runningSessionForProject(projectId),eligible=[...(state.calendarEvents||[])].filter(item=>item.projectId===projectId&&eligibleEvent(item)).sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.start).localeCompare(String(b.start)))[0]||null;
    if(running){
      const panel=document.createElement('section');panel.className='detail-card session-panel running';panel.dataset.sessionPanel=running.id;panel.innerHTML=`<div class="session-panel-head"><div><span class="session-live">Sitzung läuft</span><h3>${esc(project.title)}</h3><p class="muted">Gestartet ${esc(formatDateTime(running.startedAt))} · ${esc(running.artist||'—')}</p></div><button type="button" class="btn session-finish-btn" data-finish-session="${esc(running.id)}">Sitzung abschließen</button></div><div class="session-facts"><div class="session-fact"><span>Dauer</span><strong>${esc(durationLabel(running.startedAt,''))}</strong></div><div class="session-fact"><span>Chargen</span><strong>${running.inkSnapshot?.length||0}</strong></div><div class="session-fact"><span>Einwilligung</span><strong>${esc(running.consentSnapshot?.status||'—')}</strong></div><div class="session-fact"><span>Termin</span><strong>${esc(formatDate(running.scheduledDate))}</strong></div></div>`;pane.prepend(panel);
    }else if(eligible){
      const panel=document.createElement('section');panel.className='detail-card session-panel';panel.dataset.sessionPanel=eligible.id;panel.innerHTML=`<div class="session-panel-head"><div><span class="eyebrow">Nächste Sitzung</span><h3>${esc(formatDate(eligible.date))} · ${esc(eligible.start)} Uhr</h3><p class="muted">${esc(eligible.artist||project.artist||'—')} · ${esc(eligible.status||'')}</p></div><button type="button" class="btn session-btn" data-start-session="${esc(eligible.id)}">Sitzung starten</button></div>`;pane.prepend(panel);
    }
    const completed=sessionsForProject(projectId).filter(item=>item.status==='completed');if(completed.length){
      const history=document.createElement('section');history.className='detail-card session-history';history.dataset.sessionHistory=projectId;history.innerHTML=`<div class="panel-head"><div><span class="eyebrow">Sitzungen</span><h3>Sitzungsdokumentation</h3></div><span class="muted">${completed.length} abgeschlossen</span></div><div class="session-history-list">${completed.map(item=>`<div class="session-history-row"><div><strong>${esc(formatDateTime(item.startedAt))}</strong><span>${esc(item.artist||'—')} · ${item.inkSnapshot?.length||0} Charge${item.inkSnapshot?.length===1?'':'n'}${item.note?' · '+esc(item.note):''}</span></div><div class="session-history-meta"><strong>${esc(durationLabel(item.startedAt,item.endedAt))}</strong><span>${item.projectComplete?'Projekt abgeschlossen':'Sitzung abgeschlossen'}</span></div></div>`).join('')}</div>`;pane.appendChild(history);
    }
  }

  function enhanceAppointmentRows(){
    document.querySelectorAll('[data-record-event-row]').forEach(row=>{
      const event=(state.calendarEvents||[]).find(item=>item.id===row.dataset.recordEventRow);if(!eligibleEvent(event))return;
      const actions=row.querySelector('.record-appointment-actions');if(!actions||actions.querySelector('[data-start-session],[data-finish-session]'))return;
      const running=runningSessionForEvent(event.id);
      actions.insertAdjacentHTML('afterbegin',running?`<button type="button" class="btn session-finish-btn" data-finish-session="${esc(running.id)}">Sitzung abschließen</button>`:`<button type="button" class="btn session-btn" data-start-session="${esc(event.id)}">Sitzung starten</button>`);
    });
  }

  function enhanceDashboardAppointments(){
    document.querySelectorAll('#todayAppointments [data-dashboard-event]').forEach(row=>{
      row.querySelectorAll('[data-dashboard-session-action],.dashboard-health-flag').forEach(node=>node.remove());
      const event=(state.calendarEvents||[]).find(item=>item.id===row.dataset.dashboardEvent);if(!eligibleEvent(event))return;
      const project=Core.getProject(event.projectId);if(!project)return;
      const running=runningSessionForEvent(event.id),health=healthFlags(project);
      const status=row.querySelector('.status-pill');
      if(health.length&&status)status.insertAdjacentHTML('afterend',`<span class="dashboard-health-flag" title="${esc(health.map(item=>item.label).join(', '))}">⚠ Gesundheit</span>`);
      row.insertAdjacentHTML('beforeend',running?`<span role="button" tabindex="0" class="btn session-finish-btn dashboard-session-action" data-dashboard-session-action data-finish-session="${esc(running.id)}">Sitzung abschließen</span>`:`<span role="button" tabindex="0" class="btn session-btn dashboard-session-action" data-dashboard-session-action data-start-session="${esc(event.id)}">Sitzung starten</span>`);
    });
  }

  function rerenderOpen(){
    const projectId=document.getElementById('projectDetail')?.dataset.projectId||'';
    if(projectId&&document.getElementById('project-detail')?.classList.contains('active-view'))renderProjectSession(projectId);
    requestAnimationFrame(()=>{enhanceAppointmentRows();enhanceDashboardAppointments();});
  }

  function blockRunningRecordAction(event){
    const deleteRow=event.target.closest('[data-record-delete-event]');
    const dialogDelete=event.target.closest('#deleteAppointmentBtn');
    let eventId=deleteRow?.dataset.recordDeleteEvent||'';
    if(dialogDelete)eventId=document.getElementById('appointmentForm')?.elements.eventId?.value||'';
    if(eventId&&runningSessionForEvent(eventId)){
      event.preventDefault();event.stopImmediatePropagation();alert('Dieser Termin gehört zu einer laufenden Sitzung. Bitte die Sitzung zuerst abschließen.');return true;
    }
    const projectAction=event.target.closest('[data-archive-project],[data-delete-project]');
    if(projectAction){const id=projectAction.dataset.archiveProject||projectAction.dataset.deleteProject;if(runningSessionForProject(id)){event.preventDefault();event.stopImmediatePropagation();alert('Dieses Tattoo hat eine laufende Sitzung und kann jetzt nicht archiviert oder gelöscht werden.');return true;}}
    const customerAction=event.target.closest('[data-archive-customer],[data-delete-customer]');
    if(customerAction){const id=customerAction.dataset.archiveCustomer||customerAction.dataset.deleteCustomer;const running=(state.sessions||[]).find(item=>item.customerId===id&&item.status==='running');if(running){event.preventDefault();event.stopImmediatePropagation();alert('Für diesen Kunden läuft gerade eine Sitzung. Bitte diese zuerst abschließen.');return true;}}
    return false;
  }

  document.addEventListener('click',event=>{
    if(blockRunningRecordAction(event))return;
    const start=event.target.closest('[data-start-session]');if(start){event.preventDefault();event.stopPropagation();openStart(start.dataset.startSession);return;}
    const finish=event.target.closest('[data-finish-session]');if(finish){event.preventDefault();event.stopPropagation();openFinish(finish.dataset.finishSession);return;}
    const docs=event.target.closest('[data-session-open-documents]');if(docs){event.preventDefault();document.getElementById('sessionStartDialog')?.close();openProject(docs.dataset.sessionOpenDocuments);setTimeout(()=>Core.activateProjectTab('documents'),0);}
  },true);
  document.addEventListener('keydown',event=>{
    if(!['Enter',' '].includes(event.key))return;
    const action=event.target.closest('[data-dashboard-session-action]');if(!action)return;
    event.preventDefault();action.click();
  });
  document.addEventListener('tatnera:project-opened',event=>requestAnimationFrame(()=>{renderProjectSession(event.detail?.projectId||'');enhanceAppointmentRows();enhanceDashboardAppointments();}));
  document.addEventListener('tatnera:customer-opened',()=>requestAnimationFrame(()=>{enhanceAppointmentRows();enhanceDashboardAppointments();}));
  document.addEventListener('tatnera:data-changed',()=>requestAnimationFrame(rerenderOpen));
  document.addEventListener('tatnera:runtime-refresh',()=>requestAnimationFrame(rerenderOpen));

  async function handleFinishPhoto(event){const file=event.target.files?.[0];if(!file)return;try{finishPhoto=await compressPhoto(file);renderFinishPhoto();}catch(_error){alert('Das Foto konnte nicht verarbeitet werden.');}}
  function renderFinishPhoto(){const root=document.getElementById('sessionPhotoPreview');if(!root)return;root.innerHTML=finishPhoto?`<img src="${finishPhoto}" alt="Abschlussfoto">`:'Optionales Abschlussfoto';}
  function compressPhoto(file){
    return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=reject;reader.onload=()=>{const img=new Image();img.onerror=reject;img.onload=()=>{const max=1200,scale=Math.min(1,max/Math.max(img.width,img.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL('image/jpeg',.72));};img.src=reader.result;};reader.readAsDataURL(file);});
  }

  installStyle();installDialogs();
  rerenderOpen();
  window.TatneraSessions={openStart,openFinish,getSessions:()=>[...(state.sessions||[])]};
})();