/* TATNERA — production-safe empty state for new studios
   Keeps existing local/cloud data untouched, but prevents demo seed records
   and fake dashboard values from appearing in a genuinely new studio/browser. */
(function(){
  'use strict';

  const KEYS={customers:'tatnera_customers',projects:'tatnera_projects',calendarEvents:'tatnera_calendar'};

  function hasStored(key){
    try{return localStorage.getItem(key)!==null;}catch(_error){return true;}
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
      const freshBrowser=freshCustomers&&freshProjects&&freshCalendar&&freshRequests;

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

      /* requests.js still contains old development examples. By creating the
         real production key before that module loads, new studios start empty
         without touching any browser that already has request data. */
      if(freshRequests)localStorage.setItem('tatnera_requests','[]');

      if(freshBrowser)neutralizeInitialDemoUi();
    }catch(error){
      console.warn('TATNERA production empty-state guard:',error);
    }
  }

  initializeEmptyLocalData();
})();
