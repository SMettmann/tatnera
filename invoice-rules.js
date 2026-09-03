/* TATNERA — invoice rule refinements
   Small-amount invoice handling and direct studio-address workflow. */
(function(){
  'use strict';

  const Core=window.TatneraCore;
  if(!Core||!window.TatneraInvoices||!window.TatneraStudio)return;
  const esc=Core.esc;
  const STORAGE_KEY='tatnera_invoices_v1';
  const originalOpenCreate=window.TatneraInvoices.openCreate;
  let activeProjectId='';

  const round2=value=>Math.round((Number(value)||0)*100)/100;
  const today=()=>new Date().toISOString().slice(0,10);
  const signedPayment=tx=>tx.type==='Erstattung'?-Math.abs(Number(tx.amount)||0):Math.abs(Number(tx.amount)||0);
  const projectPaid=project=>Math.max(0,(project?.payments||[]).reduce((sum,tx)=>sum+signedPayment(tx),0));
  const studio=()=>window.TatneraStudio?.getProfile?.()||{};
  const studioInvoiceName=profile=>String(profile?.businessName||profile?.name||'').trim();
  const customerName=customer=>`${customer?.firstName||''} ${customer?.lastName||''}`.trim();

  function taxBreakdown(gross,profile){
    gross=round2(gross);
    if(profile.taxMode!=='vat')return {net:gross,tax:0,gross,rate:0};
    const rate=Math.max(0,Number(profile.vatRate)||19);
    const net=round2(gross/(1+rate/100));
    return {net,tax:round2(gross-net),gross,rate};
  }

  function issuerMissing(profile,gross){
    const missing=[];
    if(!studioInvoiceName(profile))missing.push('Firmen-/Inhabername');
    if(!String(profile.street||'').trim())missing.push('deine Straße');
    if(!String(profile.zip||'').trim())missing.push('deine PLZ');
    if(!String(profile.city||'').trim())missing.push('deinen Ort');
    if(!profile.taxMode)missing.push('steuerliche Behandlung');
    if(Number(gross)>250&&!String(profile.taxNumber||'').trim()&&!String(profile.vatId||'').trim())missing.push('Steuernummer oder USt-IdNr.');
    return missing;
  }

  function nextNumber(invoiceDate){
    const year=String(invoiceDate||today()).slice(0,4);
    const re=new RegExp(`^${year}-(\\d{4,})$`);
    let max=0;
    (state.invoices||[]).forEach(item=>{
      const match=String(item.number||'').match(re);
      if(match)max=Math.max(max,Number(match[1])||0);
    });
    return `${year}-${String(max+1).padStart(4,'0')}`;
  }

  function saveInvoices(){
    localStorage.setItem(STORAGE_KEY,JSON.stringify(state.invoices||[]));
  }

  function formGross(){
    const form=document.getElementById('invoiceCreateForm');
    return Math.max(0,Number(form?.elements.gross?.value)||0);
  }

  function patchSettingsCopy(){
    const panel=document.getElementById('studioSettingsPanel');
    if(!panel)return;
    const sections=[...panel.querySelectorAll('.studio-settings-section')];
    const addressSection=sections.find(section=>section.querySelector('h4')?.textContent?.trim()==='Rechnungssteller');
    if(addressSection){
      const title=addressSection.querySelector('h4');
      const copy=addressSection.querySelector('p');
      if(title)title.textContent='Studio- & Rechnungsadresse';
      if(copy)copy.textContent='Deine Geschäftsadresse wird einmal hier gespeichert und automatisch in jede neue Rechnung übernommen.';
    }
  }

  function syncCreateForm(){
    const form=document.getElementById('invoiceCreateForm');
    if(!form)return;
    const gross=formGross(),small=gross>0&&gross<=250,profile=studio();
    const address=form.elements.customerAddress;
    const label=address?.closest('label');
    if(address){
      address.required=!small;
      address.setAttribute('aria-required',String(!small));
    }
    if(label){
      let hint=label.querySelector('.invoice-recipient-hint');
      if(!hint){hint=document.createElement('small');hint.className='invoice-recipient-hint';hint.style.cssText='font-weight:500;line-height:1.45;color:var(--muted)';label.appendChild(hint);}
      hint.textContent=small?'Bei Rechnungen bis 250 € optional.':'Bei Rechnungen über 250 € erforderlich.';
    }

    const missing=issuerMissing(profile,gross);
    const warning=document.getElementById('invoiceIssuerWarning');
    const button=document.getElementById('issueInvoiceBtn');
    if(warning){
      warning.innerHTML=missing.length
        ?`<div class="invoice-settings-warning"><strong>Deine Studio-Rechnungsdaten sind noch unvollständig.</strong><br>Fehlt: ${esc(missing.join(', '))}.<div style="margin-top:9px"><button type="button" class="btn ghost" data-open-studio-invoice-settings>Studio-Daten ergänzen</button></div></div>`
        :small
          ?'<div class="invoice-settings-warning" style="border-color:var(--line);background:var(--panel-2);color:var(--muted)"><strong style="color:var(--text)">Kleinbetragsrechnung bis 250 €</strong><br>Die Kundenanschrift ist hierfür optional. Deine Studioadresse wird automatisch aus den Einstellungen übernommen.</div>'
          :'';
    }
    if(button)button.disabled=missing.length>0;
  }

  function openCreate(projectId){
    activeProjectId=projectId;
    originalOpenCreate(projectId);
    requestAnimationFrame(syncCreateForm);
  }

  function issueInvoice(event){
    const form=event.currentTarget;
    const project=Core.getProject(activeProjectId);
    const customer=Core.getCustomer(project?.customerId);
    const profile=studio();
    if(!project||!customer)return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const gross=round2(Math.max(0,Number(form.elements.gross.value)||0));
    if(gross<=0)return;
    const small=gross<=250;
    const missing=issuerMissing(profile,gross);
    if(missing.length){
      alert('Bitte zuerst deine Studio-Rechnungsdaten ergänzen: '+missing.join(', '));
      return;
    }

    const address=String(form.elements.customerAddress.value||'').trim();
    form.elements.customerAddress.required=!small;
    if(!small&&!address){
      alert('Bei Rechnungen über 250 € bitte die vollständige Rechnungsanschrift des Kunden eintragen.');
      form.elements.customerAddress.focus();
      return;
    }
    if(!form.reportValidity())return;

    const invoiceDate=form.elements.invoiceDate.value;
    const breakdown=taxBreakdown(gross,profile);
    const payments=(project.payments||[])
      .filter(tx=>!tx.date||tx.date<=invoiceDate)
      .map(tx=>({id:tx.id,type:tx.type,amount:Number(tx.amount)||0,date:tx.date||'',method:tx.method||'',note:tx.note||''}));
    const paid=Math.max(0,round2(payments.reduce((sum,tx)=>sum+signedPayment(tx),0)));
    const paidApplied=Math.min(gross,paid);
    const number=nextNumber(invoiceDate);
    const invoice={
      id:'inv'+Date.now(),number,type:'invoice',status:'issued',projectId:project.id,customerId:customer.id,
      createdAt:new Date().toISOString(),invoiceDate,serviceDate:form.elements.serviceDate.value,dueDate:form.elements.dueDate.value,
      description:String(form.elements.description.value||'').trim(),quantity:1,
      net:breakdown.net,tax:breakdown.tax,gross:breakdown.gross,vatRate:breakdown.rate,
      paidAtIssue:paidApplied,balanceAtIssue:Math.max(0,round2(gross-paidApplied)),paymentSnapshot:payments,
      smallAmountInvoice:small,
      studioSnapshot:{
        name:profile.name||'',businessName:studioInvoiceName(profile),ownerName:profile.ownerName||'',street:profile.street||'',zip:profile.zip||'',city:profile.city||'',country:profile.country||'Deutschland',
        email:profile.email||'',phone:profile.phone||'',iban:profile.iban||'',taxMode:profile.taxMode||'',vatRate:Number(profile.vatRate)||0,taxNumber:profile.taxNumber||'',vatId:profile.vatId||''
      },
      customerSnapshot:{name:customerName(customer),email:customer.email||'',address}
    };

    state.invoices=Array.isArray(state.invoices)?state.invoices:[];
    state.invoices.push(invoice);
    saveInvoices();
    document.getElementById('invoiceCreateDialog')?.close();
    document.dispatchEvent(new CustomEvent('tatnera:data-changed',{detail:{type:'invoice',invoiceId:invoice.id,projectId:project.id,customerId:customer.id}}));
    window.TatneraInvoices?.openView?.(invoice.id);
  }

  window.TatneraInvoices.openCreate=openCreate;

  document.addEventListener('click',event=>{
    const direct=event.target.closest('[data-create-invoice]');
    if(direct){
      event.preventDefault();
      event.stopImmediatePropagation();
      openCreate(direct.dataset.createInvoice);
      return;
    }
    const settings=event.target.closest('[data-open-studio-invoice-settings]');
    if(settings){
      event.preventDefault();
      document.getElementById('invoiceCreateDialog')?.close();
      if(typeof window.navigate==='function')window.navigate('settings');else if(typeof navigate==='function')navigate('settings');
      requestAnimationFrame(()=>document.getElementById('studioSettingsPanel')?.scrollIntoView({behavior:'smooth',block:'start'}));
    }
  },true);

  const form=document.getElementById('invoiceCreateForm');
  if(form){
    form.addEventListener('submit',issueInvoice,true);
    form.elements.gross?.addEventListener('input',()=>requestAnimationFrame(syncCreateForm));
  }

  document.addEventListener('tatnera:runtime-refresh',()=>requestAnimationFrame(patchSettingsCopy));
  document.addEventListener('tatnera:studio-changed',()=>requestAnimationFrame(()=>{patchSettingsCopy();syncCreateForm();}));
  requestAnimationFrame(patchSettingsCopy);
})();