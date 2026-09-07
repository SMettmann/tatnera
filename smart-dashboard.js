/* TATNERA smart dashboard — real data, prioritized attention, customer-first access */
(function(){
  'use strict';
  if(window.__tatneraSmartDashboardInstalled)return;
  window.__tatneraSmartDashboardInstalled=true;

  const euro=value=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Number(value)||0);
  const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  const monthKey=()=>today().slice(0,7);
  const nameFor=id=>{const c=(window.state?.customers||[]).find(x=>String(x.id)===String(id));return c?`${c.firstName||''} ${c.lastName||''}`.trim():'Kunde';};
  const customerFor=id=>(window.state?.customers||[]).find(x=>String(x.id)===String(id));
  const openCustomerSafe=id=>{try{if(typeof window.openCustomer==='function')return window.openCustomer(id);if(typeof openCustomer==='function')return openCustomer(id);}catch(_error){}try{window.navigate?.('customers');}catch(_error){}};
  const nav=view=>{try{if(typeof window.navigate==='function')window.navigate(view);else document.querySelector(`[data-view="${view}"]`)?.click();}catch(_error){}};

  function projectPaid(project){
    return Math.max(0,(project?.payments||[]).reduce((sum,tx)=>{
      const amount=Math.abs(Number(tx.amount)||0),refund=String(tx.type||'').toLowerCase().includes('erstattung');
      return sum+(refund?-amount:amount);
    },0));
  }

  function paymentDate(tx){return String(tx?.date||tx?.paymentDate||tx?.createdAt||tx?.created_at||'').slice(0,10);}
  function monthlyRevenue(){
    const month=monthKey();
    return (window.state?.projects||[]).reduce((sum,project)=>sum+(project.payments||[]).reduce((inner,tx)=>{
      if(!paymentDate(tx).startsWith(month))return inner;
      const amount=Math.abs(Number(tx.amount)||0),refund=String(tx.type||'').toLowerCase().includes('erstattung');
      return inner+(refund?-amount:amount);
    },0),0);
  }

  function data(){
    const s=window.state||{},projects=s.projects||[],events=s.calendarEvents||[],requests=s.requests||[];
    const now=today();
    const todays=events.filter(e=>e.date===now&&e.type!=='block').sort((a,b)=>String(a.start||'').localeCompare(String(b.start||'')));
    const activeRequests=requests.filter(r=>!['archived','declined'].includes(r.stage));
    const newRequests=activeRequests.filter(r=>r.stage==='new');
    const missingConsent=projects.filter(p=>String(p.consent||'').toLowerCase().includes('fehlt'));
    const openDeposits=projects.map(p=>{
      const required=Math.max(0,Number(p.deposit)||0),paid=projectPaid(p),statusOpen=String(p.status||'').toLowerCase().includes('anzahlung offen');
      const open=statusOpen?Math.max(required-paid,required>0?required:0):0;
      return {project:p,open};
    }).filter(x=>x.open>0);
    return {todays,activeRequests,newRequests,missingConsent,openDeposits};
  }

  function metric(card,value,detail){if(!card)return;const strong=card.querySelector('strong'),small=card.querySelector('small');if(strong)strong.textContent=value;if(small)small.textContent=detail;}

  function renderMetrics(d){
    const dashboard=document.getElementById('dashboard');if(!dashboard)return;
    const cards=dashboard.querySelectorAll('.metrics-grid .metric-card');
    const next=d.todays.find(e=>String(e.start||'')>=new Intl.DateTimeFormat('de-DE',{hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date()))||d.todays[0];
    metric(cards[0],String(d.todays.length),next?`Nächster Termin um ${next.start}`:'Heute keine Termine');
    metric(cards[1],String(d.activeRequests.length),d.newRequests.length?`${d.newRequests.length} neu – bitte prüfen`:'Keine neuen Anfragen');
    metric(cards[2],String(d.missingConsent.length),d.missingConsent.length?'Vor Termin nachfassen':'Alles vollständig');
    const openSum=d.openDeposits.reduce((sum,x)=>sum+x.open,0);
    metric(cards[3],euro(openSum),d.openDeposits.length?`${d.openDeposits.length} Kunde${d.openDeposits.length===1?'':'n'}`:'Keine offenen Anzahlungen');

    const revenue=dashboard.querySelector('.metric-card.accent');
    if(revenue){const strong=revenue.querySelector('strong'),small=revenue.querySelector('small'),value=monthlyRevenue();if(strong)strong.textContent=euro(value);if(small)small.textContent=value?'Erfasste Zahlungen diesen Monat':'Noch keine Zahlungen diesen Monat';}

    const hero=dashboard.querySelector('.hero-card p');
    if(hero){
      const attention=d.newRequests.length+d.missingConsent.length+d.openDeposits.length;
      hero.textContent=attention?`${d.todays.length} Termin${d.todays.length===1?'':'e'} heute · ${attention} offene Aufgabe${attention===1?'':'n'} brauchen Aufmerksamkeit.`:`${d.todays.length} Termin${d.todays.length===1?'':'e'} heute · aktuell nichts Dringendes offen.`;
    }
  }

  function task(title,detail,view,customerId,warning=false){
    const button=document.createElement('button');button.type='button';button.className='todo-item';button.innerHTML=`<span class="dot${warning?' warning-dot':''}"></span><div><strong></strong><small></small></div><span>→</span>`;button.querySelector('strong').textContent=title;button.querySelector('small').textContent=detail;button.addEventListener('click',()=>customerId?openCustomerSafe(customerId):nav(view));return button;
  }

  function renderTasks(d){
    const root=document.querySelector('#dashboard .todo-list');if(!root)return;root.innerHTML='';
    d.missingConsent.slice(0,2).forEach(p=>root.appendChild(task('Einwilligung fehlt',`${nameFor(p.customerId)} · ${p.title||'Tattoo'}`,'customers',p.customerId,true)));
    d.openDeposits.slice(0,2).forEach(x=>root.appendChild(task('Anzahlung offen',`${nameFor(x.project.customerId)} · ${euro(x.open)}`,'customers',x.project.customerId,false)));
    if(d.newRequests.length)root.appendChild(task(`${d.newRequests.length} neue Anfrage${d.newRequests.length===1?'':'n'}`,'Noch nicht bearbeitet','requests','',false));
    if(!root.children.length){const empty=document.createElement('div');empty.className='muted';empty.style.padding='12px 4px';empty.textContent='Aktuell ist nichts offen.';root.appendChild(empty);}
  }

  function renderRecentCustomers(){
    const root=document.getElementById('recentProjects');if(!root)return;
    const section=root.closest('.panel');if(!section)return;
    const eyebrow=section.querySelector('.panel-head .eyebrow'),title=section.querySelector('.panel-head h3'),link=section.querySelector('.panel-head .text-btn');
    if(eyebrow)eyebrow.textContent='Schnellzugriff';if(title)title.textContent='Zuletzt aktive Kunden';if(link){link.textContent='Alle Kunden →';link.dataset.viewTarget='customers';link.onclick=()=>nav('customers');}
    const projects=[...(window.state?.projects||[])].reverse(),seen=new Set(),ids=[];
    projects.forEach(p=>{if(p.customerId&&!seen.has(String(p.customerId))){seen.add(String(p.customerId));ids.push(p.customerId);}});
    (window.state?.customers||[]).slice().reverse().forEach(c=>{if(!seen.has(String(c.id))){seen.add(String(c.id));ids.push(c.id);}});
    const customers=ids.slice(0,3).map(customerFor).filter(Boolean);
    root.innerHTML='';
    if(!customers.length){root.innerHTML='<p class="muted">Noch keine Kunden angelegt.</p>';return;}
    customers.forEach(c=>{
      const button=document.createElement('button');button.type='button';button.className='project-card';button.style.textAlign='left';button.style.cursor='pointer';
      const projectsFor=(window.state?.projects||[]).filter(p=>String(p.customerId)===String(c.id));const latest=projectsFor[projectsFor.length-1];
      button.innerHTML='<div class="project-body"><span class="eyebrow">Kunde</span><h4></h4><p></p><div class="project-meta"><span></span><span>Öffnen →</span></div></div>';
      button.querySelector('h4').textContent=`${c.firstName||''} ${c.lastName||''}`.trim()||'Kunde';button.querySelector('p').textContent=latest?latest.title||'Tattoo-Akte':'Noch keine Tattoo-Akte';button.querySelector('.project-meta span').textContent=c.status||'Aktiv';button.addEventListener('click',()=>openCustomerSafe(c.id));root.appendChild(button);
    });
  }

  let queued=false;
  function render(){queued=false;if(!document.getElementById('dashboard'))return;const d=data();renderMetrics(d);renderTasks(d);renderRecentCustomers();}
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(render);}

  document.addEventListener('tatnera:data-changed',schedule);
  document.addEventListener('tatnera:runtime-refresh',schedule);
  document.addEventListener('tatnera:auth-ready',()=>setTimeout(schedule,100));
  document.addEventListener('click',event=>{if(event.target.closest('[data-view="dashboard"],[data-view-target="dashboard"]'))setTimeout(schedule,30);});
  window.addEventListener('pageshow',schedule);
  schedule();setTimeout(schedule,300);setTimeout(schedule,900);
})();
