/* TATNERA — session completion -> payment -> invoice flow
   Reuses the existing payment dialog and invoice offer. */
(function(){
  'use strict';
  const Core=window.TatneraCore;if(!Core)return;

  function signed(tx){return tx?.type==='Erstattung'?-Math.abs(Number(tx?.amount)||0):Math.abs(Number(tx?.amount)||0);}
  function paid(project){return Math.max(0,(project?.payments||[]).reduce((sum,tx)=>sum+signed(tx),0));}
  function remaining(project){return Math.max(0,Math.round((Number(project?.price||0)-paid(project))*100)/100);}

  function openFinalPayment(projectId){
    const project=Core.getProject(projectId);if(!project)return;
    const due=remaining(project);if(due<=0||Number(project.price||0)<=0)return;

    try{Core.activateProjectTab('payments',{emit:false});}catch(_error){}

    const button=[...document.querySelectorAll('[data-add-payment]')].find(item=>item.dataset.addPayment===projectId);
    if(!button)return;
    button.click();

    const dialog=document.getElementById('paymentDialog'),form=document.getElementById('paymentForm');
    if(!dialog?.open||!form)return;
    form.elements.type.value='Restzahlung';
    form.elements.amount.value=due.toFixed(2);
    const hint=document.getElementById('paymentDialogHint');
    if(hint)hint.textContent=`Sitzung abgeschlossen · Restzahlung ${new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:2}).format(due)} · nach vollständiger Zahlung kann direkt die Rechnung erstellt werden.`;
  }

  document.addEventListener('tatnera:data-changed',event=>{
    if(event.detail?.type!=='session-complete'||!event.detail?.projectId)return;
    const projectId=event.detail.projectId;
    setTimeout(()=>openFinalPayment(projectId),160);
  });
})();