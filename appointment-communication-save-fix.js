/* TATNERA — preserve appointment communication state when editing/saving an appointment */
(function(){
  'use strict';
  if(window.__tatneraAppointmentCommunicationSaveFix)return;
  window.__tatneraAppointmentCommunicationSaveFix=true;

  function clone(value){
    try{return structuredClone(value);}catch(_error){
      try{return JSON.parse(JSON.stringify(value));}catch(_error2){return value;}
    }
  }

  document.addEventListener('submit',event=>{
    const form=event.target;
    if(!(form instanceof HTMLFormElement)||form.id!=='appointmentForm')return;
    const eventId=form.elements?.eventId?.value||'';
    if(!eventId)return;

    const before=(window.state?.calendarEvents||state.calendarEvents||[]).find(item=>item.id===eventId);
    if(!before?.communication)return;
    const communication=clone(before.communication);

    setTimeout(()=>{
      const events=window.state?.calendarEvents||state.calendarEvents||[];
      const saved=events.find(item=>item.id===eventId);
      if(!saved)return;

      saved.communication=communication;
      try{persist();}catch(_error){}
      document.dispatchEvent(new CustomEvent('tatnera:data-changed',{detail:{type:'appointment-communication-preserved',eventId,projectId:saved.projectId||'',customerId:saved.customerId||''}}));
    },0);
  },true);
})();
