/* TATNERA — accounting integrity guard
   Keeps payment history auditable, prevents duplicate active invoices and protects invoiced records. */
(function(){
  'use strict';
  const Core=window.TatneraCore;
  if(!Core||!window.TatneraInvoices)return;
  const ARCHIVE_KEY='tatnera_archive_v1';
  const euro=value=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(value)||0);
  const today=()=>new Date().toISOString().slice(0,10);
  const dateLabel=value=>value?new Intl.DateTimeFormat('de-DE').format(new Date(value+'T12:00:00')):'—';

  function invoices(){return Array.isArray(state.invoices)?state.invoices:[];}
  function activeInvoice(projectId){
    return [...invoices()].filter(item=>item.projectId===projectId&&item.type==='invoice'&&item.status!=='cancelled').sort((a,b)=>String(b.invoiceDate||b.createdAt||'').localeCompare(String(a.invoiceDate||a.createdAt||'')))[0]||null;
  }
  function projectInvoices(projectId){return invoices().filter(item=>item.projectId===projectId);}
  function customerInvoices(customerId,projectIds=[]){
    const ids=new Set(projectIds);
    return invoices().filter(item=>item.customerId===customerId||ids.has(item.projectId));
  }
  function findPayment(paymentId){
    for(const project of state.projects||[]){
      const tx=(project.payments||[]).find(item=>item.id===paymentId);
      if(tx)return {project,tx};
    }
    return null;
  }
  function loadArchive(){
    try{const parsed=JSON.parse(localStorage.getItem(ARCHIVE_KEY)||'null');return parsed&&typeof parsed==='object'?parsed:{customers:[],projects:[]};}
    catch(_error){return {customers:[],projects:[]};}
  }

  function openExistingInvoice(invoice){
    if(!invoice)return false;
    alert(`Für dieses Tattoo existiert bereits die aktive Rechnung ${invoice.number}. Eine zweite normale Rechnung wird nicht erstellt.`);
    window.TatneraInvoices.openView?.(invoice.id);
    return false;
  }

  const originalOpenCreate=window.TatneraInvoices.openCreate;
  window.TatneraInvoices.openCreate=function(projectId){
    const existing=activeInvoice(projectId);
    if(existing)return openExistingInvoice(existing);
    return originalOpenCreate(projectId);
  };

  function reversePayment(paymentId){
    const found=findPayment(paymentId);if(!found)return;
    const {project,tx}=found;
    if(tx.correctionOf){alert('Diese Gegenbuchung bleibt als Teil der Zahlungshistorie erhalten.');return;}
    if(tx.reversedBy){alert('Diese Buchung wurde bereits storniert.');return;}
    if(!confirm(`${tx.type} über ${euro(tx.amount)} nicht löschen, sondern nachvollziehbar stornieren?\n\nTATNERA erstellt eine Gegenbuchung. Beide Einträge bleiben in der Historie erhalten.`))return;

    const id='pay'+Date.now();
    const reversingRefund=tx.type==='Erstattung';
    const correction={
      id,
      type:reversingRefund?'Korrekturbuchung':'Erstattung',
      amount:Math.abs(Number(tx.amount)||0),
      date:today(),
      method:tx.method||'Sonstiges',
      note:`Korrektur zu ${tx.type} vom ${dateLabel(tx.date)}${tx.note?' · '+tx.note:''}`,
      createdAt:new Date().toISOString(),
      correctionOf:tx.id
    };
    tx.reversedBy=id;
    tx.reversedAt=correction.createdAt;
    project.payments=Array.isArray(project.payments)?project.payments:[];
    project.payments.push(correction);
    persist();
    document.dispatchEvent(new CustomEvent('tatnera:data-changed',{detail:{type:'payment-correction',projectId:project.id,paymentId:tx.id,correctionId:id}}));
    requestAnimationFrame(patchUi);
  }

  function patchPaymentRows(){
    const projectId=Core.projectIdFromDetail?.()||document.getElementById('projectDetail')?.dataset.projectId||'';
    const project=Core.getProject(projectId);if(!project)return;
    document.querySelectorAll('#projectDetail [data-delete-payment]').forEach(button=>{
      const tx=(project.payments||[]).find(item=>item.id===button.dataset.deletePayment);if(!tx)return;
      const row=button.closest('.payment-row');
      const typeNode=row?.querySelector('.payment-type');
      if(typeNode)typeNode.textContent=tx.correctionOf?'Korrektur':tx.reversedBy?`${tx.type} · storniert`:tx.type;
      if(tx.correctionOf||tx.reversedBy){
        button.disabled=true;button.textContent='✓';button.title=tx.correctionOf?'Gegenbuchung – bleibt erhalten':'Bereits storniert';button.setAttribute('aria-label',button.title);
      }else{
        button.disabled=false;button.textContent='↶';button.title='Buchung stornieren';button.setAttribute('aria-label','Buchung stornieren');
      }
    });
  }

  function patchInvoiceButton(){
    const projectId=Core.projectIdFromDetail?.()||document.getElementById('projectDetail')?.dataset.projectId||'';
    if(!projectId)return;
    const existing=activeInvoice(projectId),button=document.querySelector(`#projectDetail [data-create-invoice="${CSS.escape(projectId)}"]`);
    if(!existing||!button)return;
    button.removeAttribute('data-create-invoice');
    button.dataset.viewInvoice=existing.id;
    button.textContent='Rechnung ansehen';
  }

  function lockProjectPriceFields(projectId){
    const form=document.getElementById('projectEditForm'),project=Core.getProject(projectId),invoice=activeInvoice(projectId);if(!form||!project)return;
    const price=form.elements.price,deposit=form.elements.deposit;
    const old=form.querySelector('[data-accounting-lock-note]');old?.remove();
    if(price)price.readOnly=Boolean(invoice);
    if(deposit)deposit.readOnly=Boolean(invoice);
    if(invoice){
      price?.setAttribute('title',`Gesperrt durch Rechnung ${invoice.number}`);deposit?.setAttribute('title',`Gesperrt durch Rechnung ${invoice.number}`);
      const note=document.createElement('div');note.dataset.accountingLockNote='true';note.className='payment-dialog-note';note.style.marginTop='10px';note.textContent=`Preis und Anzahlung sind gesperrt, solange Rechnung ${invoice.number} aktiv ist. Für eine Preisänderung muss die Rechnung zuerst storniert werden.`;
      form.querySelector('.dialog-actions')?.before(note);
    }else{
      price?.removeAttribute('title');deposit?.removeAttribute('title');
    }
  }

  function blockPermanentDelete(target){
    const projectButton=target.closest('[data-delete-project]');
    if(projectButton){
      const linked=projectInvoices(projectButton.dataset.deleteProject);
      if(linked.length){alert(`Diese Tattoo-Akte hat ${linked.length} ausgestellte${linked.length===1?' Rechnung':' Rechnungen/Stornorechnungen'} und kann deshalb nicht endgültig gelöscht werden.\n\nBitte archiviere die Akte stattdessen.`);return true;}
    }
    const customerButton=target.closest('[data-delete-customer]');
    if(customerButton){
      const id=customerButton.dataset.deleteCustomer,projectIds=(state.projects||[]).filter(item=>item.customerId===id).map(item=>item.id),linked=customerInvoices(id,projectIds);
      if(linked.length){alert(`Zu diesem Kunden existieren ${linked.length} ausgestellte Rechnungsdokument${linked.length===1?'':'e'}. Der Kunde kann deshalb nicht endgültig gelöscht werden.\n\nBitte archiviere den Kunden stattdessen.`);return true;}
    }
    const purgeProject=target.closest('[data-purge-archive-project]');
    if(purgeProject){
      const entry=loadArchive().projects?.[Number(purgeProject.dataset.purgeArchiveProject)],id=entry?.project?.id,linked=id?projectInvoices(id):[];
      if(linked.length){alert('Diese archivierte Tattoo-Akte ist mit Rechnungsdokumenten verknüpft und darf nicht endgültig gelöscht werden.');return true;}
    }
    const purgeCustomer=target.closest('[data-purge-archive-customer]');
    if(purgeCustomer){
      const entry=loadArchive().customers?.[Number(purgeCustomer.dataset.purgeArchiveCustomer)],id=entry?.customer?.id,projectIds=(entry?.projects||[]).map(item=>item.id),linked=id?customerInvoices(id,projectIds):[];
      if(linked.length){alert('Dieser archivierte Kunde ist mit Rechnungsdokumenten verknüpft und darf nicht endgültig gelöscht werden.');return true;}
    }
    return false;
  }

  function patchUi(){requestAnimationFrame(()=>{patchPaymentRows();patchInvoiceButton();});}

  document.addEventListener('click',event=>{
    const deletePayment=event.target.closest('[data-delete-payment]');
    if(deletePayment){event.preventDefault();event.stopImmediatePropagation();reversePayment(deletePayment.dataset.deletePayment);return;}

    const editPrice=event.target.closest('[data-edit-price]');
    if(editPrice){
      const invoice=activeInvoice(editPrice.dataset.editPrice);
      if(invoice){event.preventDefault();event.stopImmediatePropagation();alert(`Preis und Anzahlung sind durch Rechnung ${invoice.number} gesperrt. Storniere die Rechnung zuerst, wenn der Rechnungsbetrag geändert werden muss.`);return;}
    }

    const editProject=event.target.closest('[data-edit-project]');
    if(editProject)setTimeout(()=>lockProjectPriceFields(editProject.dataset.editProject),0);

    if(blockPermanentDelete(event.target)){event.preventDefault();event.stopImmediatePropagation();return;}
  },true);

  document.addEventListener('submit',event=>{
    if(event.target.id==='priceForm'){
      const projectId=Core.projectIdFromDetail?.()||document.getElementById('projectDetail')?.dataset.projectId||'',invoice=activeInvoice(projectId);
      if(invoice){event.preventDefault();event.stopImmediatePropagation();alert(`Preis und Anzahlung sind durch Rechnung ${invoice.number} gesperrt.`);}
      return;
    }
    if(event.target.id==='projectEditForm'){
      const projectId=Core.projectIdFromDetail?.()||document.getElementById('projectDetail')?.dataset.projectId||'',project=Core.getProject(projectId),invoice=activeInvoice(projectId);if(!project||!invoice)return;
      const nextPrice=Math.max(0,Number(event.target.elements.price?.value)||0),nextDeposit=Math.max(0,Number(event.target.elements.deposit?.value)||0);
      if(nextPrice!==Math.max(0,Number(project.price)||0)||nextDeposit!==Math.max(0,Number(project.deposit)||0)){
        event.preventDefault();event.stopImmediatePropagation();alert(`Preis und Anzahlung sind durch Rechnung ${invoice.number} gesperrt. Andere Tattoo-Daten kannst du weiterhin bearbeiten.`);
      }
    }
  },true);

  document.addEventListener('tatnera:project-opened',patchUi);
  document.addEventListener('tatnera:data-changed',patchUi);
  document.addEventListener('tatnera:runtime-refresh',patchUi);
  patchUi();

  window.TatneraAccountingIntegrity={activeInvoice,projectInvoices,customerInvoices};
})();