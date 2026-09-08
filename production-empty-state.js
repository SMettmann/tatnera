/* TATNERA — production-safe empty state for new studios
   Keeps existing real local/cloud data untouched, but prevents demo seed records
   and fake dashboard values from appearing in a genuinely new studio/browser. */
(function(){
  'use strict';

  const KEYS={customers:'tatnera_customers',projects:'tatnera_projects',calendarEvents:'tatnera_calendar',inks:'tatnera_inks'};
  const LEGACY_DEMO_INKS=new Map([
    ['ink1','DB-2608'],
    ['ink2','PG-0726'],
    ['ink3','PB-1125'],
    ['ink4','DR-0124']
  ]);

  function hasStored(key){
    try{return localStorage.getItem(key)!==null;}catch(_error){return true;}
  }

  function removeLegacyDemoInks(){
    try{
      const raw=localStorage.getItem(KEYS.inks);
      if(raw===null)return;
      const parsed=JSON.parse(raw);
      if(!Array.isArray(parsed))return;
      const cleaned=parsed.filter(item=>{
        const expectedBatch=LEGACY_DEMO_INKS.get(String(item?.id||''));
        return !(expectedBatch&&String(item?.batch||'')===expectedBatch);
      });
      if(cleaned.length!==parsed.length)localStorage.setItem(KEYS.inks,JSON.stringify(cleaned));
    }catch(_error){}
  }

  /* The piercing compatibility layer briefly used the generic label "+ Neue Akte"
     before the service-specific UI replaced it with "+ Neues Tattoo". On slower
     phones that intermediate state became visible during reload. Keep the two
     tattoo entry points stable from the first paint onward. */
  function lockTattooCreateLabels(){
    const entries=[
      [document.getElementById('quickProjectBtn'),'+ Neues Tattoo'],
      [document.getElementById('addProjectBtn'),'+ Neues Tattoo']
    ];
    entries.forEach(([button,label])=>{
      if(!button)return;
      if(button.textContent!==label)button.textContent=label;
      const observer=new MutationObserver(()=>{
        if(button.textContent!==label)button.textContent=label;
      });
      observer.observe(button,{childList:true,subtree:true,characterData:true});
    });
  }

  function neutralizeInitialDemoUi(){
    try{
      const dateNode=document.querySelector('.topbar .eyebrow');
      if(dateNode){
        dateNode.textContent=new Intl.DateTimeFormat('de-DE',{weekday:'long',day:'2-digit',month:'long'}).format(new Date());
      }

      const requestBadge=document.querySelector('.nav-item[data-view="requests"] .badge');
      if(requestBadge)requestBadge.textContent='0';

      const hero=document.querySelector('#dashboard .hero-card p');
      if(hero)hero.textContent='Termine, Anfragen und offene Aufgaben erscheinen hier automatisch.';

      const revenue=document.querySelector('#dashboard .metric-card.accent');
      if(revenue){
        const strong=revenue.querySelector('strong');
        const small=revenue.querySelector('small');
        if(strong)strong.textContent='0 €';
        if(small)small.textContent='Noch keine Zahlungen erfasst';
      }

      const metrics=document.querySelectorAll('#dashboard .metrics-grid .metric-card');
      const emptyLabels=[
        ['0','Heute noch keine Termine'],
        ['0','Keine offenen Anfragen'],
        ['0','Keine fehlenden Einwilligungen'],
        ['0 €','Keine offenen Anzahlungen']
      ];
      metrics.forEach((card,index)=>{
        const values=emptyLabels[index];if(!values)return;
        const strong=card.querySelector('strong');
        const small=card.querySelector('small');
        if(strong)strong.textContent=values[0];
        if(small)small.textContent=values[1];
      });

      const todo=document.querySelector('#dashboard .todo-list');
      if(todo)todo.innerHTML='<div class="muted" style="padding:12px 4px">Aktuell ist nichts offen.</div>';

      const demoButton=document.getElementById('calendarDemoBtn');
      if(demoButton)demoButton.hidden=true;
    }catch(error){
      console.warn('TATNERA initial UI cleanup:',error);
    }
  }

  function initializeEmptyLocalData(){
    try{
      const freshCustomers=!hasStored(KEYS.customers);
      const freshProjects=!hasStored(KEYS.projects);
      const freshCalendar=!hasStored(KEYS.calendarEvents);
      const freshRequests=!hasStored('tatnera_requests');
      const freshInks=!hasStored(KEYS.inks);

      if(typeof state==='object'&&state){
        if(freshCustomers){
          state.customers=[];
          localStorage.setItem(KEYS.customers,'[]');
        }
        if(freshProjects){
          state.projects=[];
          localStorage.setItem(KEYS.projects,'[]');
        }
        if(freshCalendar){
          state.calendarEvents=[];
          localStorage.setItem(KEYS.calendarEvents,'[]');
        }
      }

      /* requests.js and ink-v2.js still contain old development examples.
         Create real production keys before those modules load, so new studios
         start empty. Existing genuine entries remain untouched. */
      if(freshRequests)localStorage.setItem('tatnera_requests','[]');
      if(freshInks)localStorage.setItem(KEYS.inks,'[]');
      else removeLegacyDemoInks();

      /* The HTML shell still contains old visual placeholders. Neutralize them
         on every boot; later dashboard rendering replaces these zero values
         with real studio data when such data exists. */
      neutralizeInitialDemoUi();
    }catch(error){
      console.warn('TATNERA production empty-state guard:',error);
    }
  }

  lockTattooCreateLabels();
  initializeEmptyLocalData();
})();
