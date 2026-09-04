/* TATNERA — production-safe empty state for new studios
   Keeps existing local/cloud data untouched, but prevents demo seed records
   from appearing in a genuinely new studio/browser. */
(function(){
  'use strict';

  const KEYS={customers:'tatnera_customers',projects:'tatnera_projects',calendarEvents:'tatnera_calendar'};

  function hasStored(key){
    try{return localStorage.getItem(key)!==null;}catch(_error){return true;}
  }

  function initializeEmptyLocalData(){
    try{
      if(typeof state==='object'&&state){
        if(!hasStored(KEYS.customers)){
          state.customers=[];
          localStorage.setItem(KEYS.customers,'[]');
        }
        if(!hasStored(KEYS.projects)){
          state.projects=[];
          localStorage.setItem(KEYS.projects,'[]');
        }
        if(!hasStored(KEYS.calendarEvents)){
          state.calendarEvents=[];
          localStorage.setItem(KEYS.calendarEvents,'[]');
        }
      }

      /* requests.js still contains old development examples. By creating the
         real production key before that module loads, new studios start empty
         without touching any browser that already has request data. */
      if(!hasStored('tatnera_requests'))localStorage.setItem('tatnera_requests','[]');
    }catch(error){
      console.warn('TATNERA production empty-state guard:',error);
    }
  }

  initializeEmptyLocalData();
})();
