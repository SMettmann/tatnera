/* TATNERA — invoices
   Immutable invoice snapshots, sequential numbers, cancellation invoices and print/PDF workflow. */
(function(){
  'use strict';
  const Core=window.TatneraCore;if(!Core)return;
  const esc=Core.esc;
  const STORAGE_KEY='tatnera_invoices_v1';
  let activeProjectId='',activeInvoiceId='';

  function load(){
    try{const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');return Array.isArray(parsed)?parsed:[];}
    catch(_error){return [];}
  }
  state.invoices=load();
  function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state.invoices||[]));}
  function invoiceById(id){return (state.invoices||[]).find(item=>item.id===id)||null;}
  function invoicesForProject(id){return (state.invoices||[]).filter(item=>item.projectId===id).sort(sortNewest);}
  function invoicesForCustomer(id){return (state.invoices||[]).filter(item=>item.customerId===id).sort(sortNewest);}
  function sortNewest(a,b){return String(b.invoiceDate||b.createdAt||'').localeCompare(String(a.invoiceDate||a.createdAt||''))||String(b.number||'').localeCompare(String(a.number||''));}
  function money(value){return new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(value)||0);}
  function dateLabel(value){return value?new Intl.DateTimeFormat('de-DE').format(new Date(value+'T12:00:00')):'—';}
  function today(){return new Date().toISOString().slice(0,10);}
  function addDays(value,days){const d=new Date(value+'T12:00:00');d.setDate(d.getDate()+days);return d.toISOString().slice(0,10);}
  function round2(value){return Math.round((Number(value)||0)*100)/100;}
  function signedPayment(tx){return tx.type==='Erstattung'?-Math.abs(Number(tx.amount)||0):Math.abs(Number(tx.amount)||0);}
  function projectPaid(project){return Math.max(0,(project?.payments||[]).reduce((sum,tx)=>sum+signedPayment(tx),0));}
  function studio(){return window.TatneraStudio?.getProfile?.()||{};}
  function studioInvoiceName(profile=studio()){return String(profile.businessName||profile.name||'').trim();}
  function customerName(customer){return `${customer?.firstName||''} ${customer?.lastName||''}`.trim();}
  function projectCustomerAddress(project){return String(project?.consentData?.address||'').trim();}
  function projectServiceDate(project){return Core.lastCompletedTattooDate?.(project?.id)||today();}
  function taxBreakdown(gross,profile){
    gross=round2(gross);
    if(profile.taxMode!=='vat')return {net:gross,tax:0,gross,rate:0};
    const rate=Math.max(0,Number(profile.vatRate)||19),net=round2(gross/(1+rate/100));
    return {net,tax:round2(gross-net),gross,rate};
  }
  function nextNumber(invoiceDate){
    const year=String(invoiceDate||today()).slice(0,4),re=new RegExp(`^${year}-(\\d{4,})$`);let max=0;
    (state.invoices||[]).forEach(item=>{const match=String(item.number||'').match(re);if(match)max=Math.max(max,Number(match[1])||0);});
    return `${year}-${String(max+1).padStart(4,'0')}`;
  }
  function currentBalance(invoice){
    if(invoice.type==='cancellation')return 0;
    const project=Core.getProject(invoice.projectId);if(!project)return Math.max(0,Number(invoice.balanceAtIssue)||0);
    return Math.max(0,round2(Number(invoice.gross)||0)-projectPaid(project));
  }
  function currentStatus(invoice){
    if(invoice.type==='cancellation')return ['cancel','Stornorechnung'];
    if(invoice.status==='cancelled')return ['cancel','Storniert'];
    return currentBalance(invoice)<=0?['paid','Bezahlt']:['open','Offen'];
  }
  function issuerComplete(profile=studio()){
    const missing=[];
    if(!studioInvoiceName(profile))missing.push('Firmen-/Inhabername');
    if(!String(profile.street||'').trim())missing.push('Straße');
    if(!String(profile.zip||'').trim())missing.push('PLZ');
    if(!String(profile.city||'').trim())missing.push('Ort');
    if(!profile.taxMode)missing.push('steuerliche Behandlung');
    if(!String(profile.taxNumber||'').trim()&&!String(profile.vatId||'').trim())missing.push('Steuernummer oder USt-IdNr.');
    return missing;
  }

  function installStyle(){
    if(document.getElementById('invoiceManagementStyle'))return;
    const style=document.createElement('style');style.id='invoiceManagementStyle';style.textContent=`
      .invoice-project-panel,.invoice-customer-panel,.invoice-finance-panel{margin-top:14px}
      .invoice-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px}.invoice-head h3{margin:3px 0 4px}.invoice-head p{margin:0}
      .invoice-list{display:flex;flex-direction:column;gap:8px}.invoice-row{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:12px;align-items:center;padding:11px 12px;border:1px solid var(--line);border-radius:11px;background:var(--panel-2)}
      .invoice-row-main strong,.invoice-row-main span{display:block}.invoice-row-main strong{font-size:12px}.invoice-row-main span{margin-top:3px;font-size:10px;color:var(--muted)}
      .invoice-row-amount{text-align:right}.invoice-row-amount strong,.invoice-row-amount span{display:block}.invoice-row-amount strong{font-size:12px}.invoice-row-amount span{font-size:9px;color:var(--muted);margin-top:3px}
      .invoice-state{display:inline-flex;align-items:center;border:1px solid var(--line);border-radius:999px;padding:4px 7px;font-size:9px;font-weight:800;white-space:nowrap}.invoice-state.paid{background:#eef7e8;color:#315b20;border-color:#a8c79a}.invoice-state.open{background:#fff5e7;color:#85531a;border-color:#d5b27c}.invoice-state.cancel{background:#f6eded;color:#843939;border-color:#d6aaaa}
      .invoice-empty{padding:13px;border:1px dashed var(--line);border-radius:11px;color:var(--muted);font-size:11px}
      .invoice-create-grid{display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-top:14px}.invoice-create-grid label{display:flex;flex-direction:column;gap:6px;font-size:11px;font-weight:700;color:var(--muted)}.invoice-create-grid label.full{grid-column:1/-1}.invoice-create-grid input,.invoice-create-grid textarea{width:100%;border:1px solid var(--line);border-radius:10px;background:var(--panel-2);color:var(--text);padding:10px 11px;font:inherit}.invoice-create-grid input{min-height:42px}
      .invoice-create-summary{margin-top:13px;padding:12px;border:1px solid var(--line);border-radius:11px;background:var(--panel-2);display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.invoice-create-summary span,.invoice-create-summary strong{display:block}.invoice-create-summary span{font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}.invoice-create-summary strong{font-size:12px;margin-top:4px}
      .invoice-settings-warning{margin-top:12px;padding:11px 12px;border:1px solid #d7a45f;border-radius:10px;background:#fff4df;color:#704512;font-size:11px;line-height:1.5}
      .invoice-preview{background:#fff;color:#171717;border-radius:12px;padding:28px;min-height:560px;max-height:68vh;overflow:auto}.invoice-preview *{box-sizing:border-box}.invoice-doc-head{display:flex;justify-content:space-between;gap:24px;border-bottom:2px solid #171717;padding-bottom:18px}.invoice-doc-head h2{margin:0 0 5px;font-size:24px}.invoice-doc-head p{margin:2px 0;font-size:11px;color:#555}.invoice-doc-number{text-align:right}.invoice-doc-number strong{display:block;font-size:18px}.invoice-doc-number span{display:block;font-size:10px;color:#666;margin-top:3px}.invoice-address-grid{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin:24px 0}.invoice-address-grid h4{font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#777;margin:0 0 6px}.invoice-address-grid p{font-size:11px;line-height:1.55;margin:0;white-space:pre-line}.invoice-table{width:100%;border-collapse:collapse;margin-top:18px}.invoice-table th,.invoice-table td{padding:10px 8px;border-bottom:1px solid #ddd;text-align:left;font-size:11px}.invoice-table th:last-child,.invoice-table td:last-child{text-align:right}.invoice-totals{margin:18px 0 0 auto;width:min(330px,100%)}.invoice-total-row{display:flex;justify-content:space-between;gap:15px;padding:5px 0;font-size:11px}.invoice-total-row.final{border-top:2px solid #171717;margin-top:5px;padding-top:9px;font-size:14px;font-weight:800}.invoice-payment-note{margin-top:22px;padding:12px;background:#f4f4f4;border-radius:8px;font-size:10px;line-height:1.55}.invoice-footer{margin-top:30px;padding-top:12px;border-top:1px solid #ddd;font-size:9px;color:#666;line-height:1.5}.invoice-finance-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:12px}.invoice-finance-stat{padding:12px;border:1px solid var(--line);border-radius:11px;background:var(--panel-2)}.invoice-finance-stat span,.invoice-finance-stat strong{display:block}.invoice-finance-stat span{font-size:9px;color:var(--muted);text-transform:uppercase}.invoice-finance-stat strong{font-size:16px;margin-top:4px}
      @media(max-width:720px){.invoice-row{grid-template-columns:1fr}.invoice-row-amount{text-align:left}.invoice-create-grid{grid-template-columns:1fr}.invoice-create-grid label.full{grid-column:1}.invoice-create-summary,.invoice-finance-stats{grid-template-columns:1fr}.invoice-address-grid{grid-template-columns:1fr}.invoice-preview{padding:18px}}
    `;document.head.appendChild(style);
  }

  function installDialogs(){
    if(!document.getElementById('invoiceCreateDialog')){
      const dialog=document.createElement('dialog');dialog.id='invoiceCreateDialog';dialog.className='dialog wide-dialog';dialog.innerHTML=`<form id="invoiceCreateForm" style="padding:22px"><div class="dialog-head"><div><span class="eyebrow">Finanzen</span><h2>Rechnung erstellen</h2><p class="muted" id="invoiceCreateMeta"></p></div><button type="button" class="close-btn" data-close-invoice-create>×</button></div><div id="invoiceIssuerWarning"></div><div class="invoice-create-grid"><label>Rechnungsdatum<input type="date" name="invoiceDate" required></label><label>Leistungsdatum<input type="date" name="serviceDate" required></label><label>Fällig am<input type="date" name="dueDate" required></label><label>Rechnungsbetrag brutto (€)<input type="number" min="0.01" step="0.01" name="gross" required></label><label class="full">Leistung<input name="description" maxlength="220" required></label><label class="full">Rechnungsanschrift Kunde<textarea name="customerAddress" rows="3" required placeholder="Straße, Hausnummer\nPLZ Ort"></textarea></label></div><div class="invoice-create-summary" id="invoiceCreateSummary"></div><div class="dialog-actions"><button type="button" class="btn ghost" data-close-invoice-create>Abbrechen</button><button type="submit" class="btn primary" id="issueInvoiceBtn">Rechnung verbindlich erstellen</button></div></form>`;document.body.appendChild(dialog);
      dialog.querySelectorAll('[data-close-invoice-create]').forEach(btn=>btn.addEventListener('click',()=>dialog.close()));
      const form=dialog.querySelector('#invoiceCreateForm');form.addEventListener('submit',issueInvoice);form.elements.gross.addEventListener('input',refreshCreateSummary);
    }
    if(!document.getElementById('invoiceViewDialog')){
      const dialog=document.createElement('dialog');dialog.id='invoiceViewDialog';dialog.className='dialog wide-dialog';dialog.innerHTML=`<div style="padding:18px"><div class="dialog-head"><div><span class="eyebrow">Rechnung</span><h2 id="invoiceViewTitle">Rechnung</h2><p class="muted" id="invoiceViewMeta"></p></div><button type="button" class="close-btn" data-close-invoice-view>×</button></div><div class="invoice-preview" id="invoicePreview"></div><div class="dialog-actions"><button type="button" class="btn ghost" data-close-invoice-view>Schließen</button><button type="button" class="btn ghost" id="cancelInvoiceBtn">Stornorechnung erstellen</button><button type="button" class="btn primary" id="printInvoiceBtn">PDF / Drucken</button></div></div>`;document.body.appendChild(dialog);
      dialog.querySelectorAll('[data-close-invoice-view]').forEach(btn=>btn.addEventListener('click',()=>dialog.close()));
      document.getElementById('printInvoiceBtn').addEventListener('click',()=>printInvoice(activeInvoiceId));
      document.getElementById('cancelInvoiceBtn').addEventListener('click',()=>cancelInvoice(activeInvoiceId));
    }
  }

  function openCreate(projectId){
    const project=Core.getProject(projectId),customer=Core.getCustomer(project?.customerId),form=document.getElementById('invoiceCreateForm');if(!project||!customer||!form)return;
    activeProjectId=projectId;form.reset();
    const now=today();form.elements.invoiceDate.value=now;form.elements.serviceDate.value=projectServiceDate(project);form.elements.dueDate.value=projectPaid(project)>=Number(project.price||0)?now:addDays(now,7);form.elements.gross.value=round2(project.price||0).toFixed(2);form.elements.description.value=`Tattoo – ${project.title}${project.placement?' · '+project.placement:''}`;form.elements.customerAddress.value=projectCustomerAddress(project);
    document.getElementById('invoiceCreateMeta').textContent=`${customerName(customer)} · ${project.title}`;
    const missing=issuerComplete(),warning=document.getElementById('invoiceIssuerWarning'),button=document.getElementById('issueInvoiceBtn');
    warning.innerHTML=missing.length?`<div class="invoice-settings-warning"><strong>Studio-Rechnungsdaten unvollständig.</strong><br>Fehlt: ${esc(missing.join(', '))}. Bitte zuerst unter Einstellungen → Studio-Profil ergänzen.</div>`:'';button.disabled=missing.length>0;
    refreshCreateSummary();document.getElementById('invoiceCreateDialog').showModal();
  }

  function refreshCreateSummary(){
    const form=document.getElementById('invoiceCreateForm'),project=Core.getProject(activeProjectId),profile=studio();if(!form||!project)return;
    const gross=Math.max(0,Number(form.elements.gross.value)||0),tax=taxBreakdown(gross,profile),paid=Math.min(gross,projectPaid(project)),balance=Math.max(0,round2(gross-paid));
    document.getElementById('invoiceCreateSummary').innerHTML=`<div><span>${profile.taxMode==='vat'?'Netto':'Rechnungsbetrag'}</span><strong>${esc(money(tax.net))}</strong></div><div><span>${profile.taxMode==='vat'?`USt. ${tax.rate}%`:'Bereits bezahlt'}</span><strong>${esc(money(profile.taxMode==='vat'?tax.tax:paid))}</strong></div><div><span>${profile.taxMode==='vat'?'Brutto / offen':'Noch offen'}</span><strong>${esc(profile.taxMode==='vat'?money(tax.gross)+' · '+money(balance):money(balance))}</strong></div>`;
  }

  function issueInvoice(event){
    event.preventDefault();const project=Core.getProject(activeProjectId),customer=Core.getCustomer(project?.customerId),form=event.currentTarget,profile=studio();if(!project||!customer)return;
    const missing=issuerComplete(profile);if(missing.length){alert('Bitte zuerst die Studio-Rechnungsdaten vollständig hinterlegen: '+missing.join(', '));return;}
    if(!form.reportValidity())return;
    const gross=round2(Math.max(0,Number(form.elements.gross.value)||0));if(gross<=0)return;
    const invoiceDate=form.elements.invoiceDate.value,breakdown=taxBreakdown(gross,profile),payments=(project.payments||[]).filter(tx=>!tx.date||tx.date<=invoiceDate).map(tx=>({id:tx.id,type:tx.type,amount:Number(tx.amount)||0,date:tx.date||'',method:tx.method||'',note:tx.note||''})),paid=Math.max(0,round2(payments.reduce((sum,tx)=>sum+signedPayment(tx),0))),paidApplied=Math.min(gross,paid),address=String(form.elements.customerAddress.value||'').trim();
    if(!address){alert('Bitte eine Rechnungsanschrift für den Kunden eintragen.');return;}
    const number=nextNumber(invoiceDate),invoice={
      id:'inv'+Date.now(),number,type:'invoice',status:'issued',projectId:project.id,customerId:customer.id,createdAt:new Date().toISOString(),invoiceDate,serviceDate:form.elements.serviceDate.value,dueDate:form.elements.dueDate.value,
      description:String(form.elements.description.value||'').trim(),quantity:1,net:breakdown.net,tax:breakdown.tax,gross:breakdown.gross,vatRate:breakdown.rate,paidAtIssue:paidApplied,balanceAtIssue:Math.max(0,round2(gross-paidApplied)),paymentSnapshot:payments,
      studioSnapshot:{name:profile.name||'',businessName:studioInvoiceName(profile),ownerName:profile.ownerName||'',street:profile.street||'',zip:profile.zip||'',city:profile.city||'',country:profile.country||'Deutschland',email:profile.email||'',phone:profile.phone||'',iban:profile.iban||'',taxMode:profile.taxMode||'',vatRate:Number(profile.vatRate)||0,taxNumber:profile.taxNumber||'',vatId:profile.vatId||''},
      customerSnapshot:{name:customerName(customer),email:customer.email||'',address}
    };
    state.invoices.push(invoice);save();document.getElementById('invoiceCreateDialog').close();
    document.dispatchEvent(new CustomEvent('tatnera:data-changed',{detail:{type:'invoice',invoiceId:invoice.id,projectId:project.id,customerId:customer.id}}));
    renderAll();openView(invoice.id);
  }

  function cancelInvoice(id){
    const original=invoiceById(id);if(!original||original.type!=='invoice'||original.status==='cancelled')return;
    if(!confirm(`Rechnung ${original.number} wirklich vollständig stornieren? TATNERA erstellt dafür eine eigene Stornorechnung; die Originalrechnung bleibt erhalten.`))return;
    const invoiceDate=today(),number=nextNumber(invoiceDate),cancel={
      id:'inv'+Date.now(),number,type:'cancellation',status:'issued',cancellationOf:original.id,projectId:original.projectId,customerId:original.customerId,createdAt:new Date().toISOString(),invoiceDate,serviceDate:original.serviceDate,dueDate:invoiceDate,
      description:`Storno zu Rechnung ${original.number}: ${original.description}`,quantity:1,net:-Math.abs(Number(original.net)||0),tax:-Math.abs(Number(original.tax)||0),gross:-Math.abs(Number(original.gross)||0),vatRate:original.vatRate||0,paidAtIssue:0,balanceAtIssue:0,paymentSnapshot:[],studioSnapshot:structuredClone(original.studioSnapshot),customerSnapshot:structuredClone(original.customerSnapshot)
    };
    original.status='cancelled';original.cancelledAt=new Date().toISOString();original.cancellationInvoiceId=cancel.id;state.invoices.push(cancel);save();
    document.dispatchEvent(new CustomEvent('tatnera:data-changed',{detail:{type:'invoice-cancel',invoiceId:original.id,cancellationInvoiceId:cancel.id,projectId:original.projectId,customerId:original.customerId}}));
    renderAll();openView(cancel.id);
  }

  function taxNote(invoice){
    return invoice.studioSnapshot?.taxMode==='small'?'Gemäß § 19 UStG wird keine Umsatzsteuer ausgewiesen.':'';
  }
  function documentHtml(invoice){
    const s=invoice.studioSnapshot||{},c=invoice.customerSnapshot||{},cancel=invoice.type==='cancellation',totalLabel=cancel?'Stornobetrag':'Gesamtbetrag',balance=invoice.type==='invoice'?currentBalance(invoice):0;
    const taxRows=s.taxMode==='vat'?`<div class="invoice-total-row"><span>Netto</span><strong>${esc(money(invoice.net))}</strong></div><div class="invoice-total-row"><span>Umsatzsteuer ${esc(invoice.vatRate)} %</span><strong>${esc(money(invoice.tax))}</strong></div>`:'';
    const paymentText=cancel?`Diese Stornorechnung hebt Rechnung ${esc(invoiceById(invoice.cancellationOf)?.number||'')} vollständig auf.`:invoice.status==='cancelled'?`Diese Rechnung wurde storniert. Zugehörige Stornorechnung: ${esc(invoiceById(invoice.cancellationInvoiceId)?.number||'—')}.`:invoice.paidAtIssue>0?`Zahlungsstand bei Ausstellung: ${money(invoice.paidAtIssue)} bereits bezahlt. ${invoice.balanceAtIssue>0?`Offener Betrag bei Ausstellung: ${money(invoice.balanceAtIssue)}.`:'Die Rechnung war bei Ausstellung vollständig bezahlt.'}`:`Zahlbar bis ${dateLabel(invoice.dueDate)}. Aktuell offen: ${money(balance)}.`;
    return `<div class="invoice-doc-head"><div><h2>${cancel?'Stornorechnung':'Rechnung'}</h2><p>${esc(s.businessName||s.name||'')}</p><p>${esc([s.street,[s.zip,s.city].filter(Boolean).join(' ')].filter(Boolean).join(' · '))}</p></div><div class="invoice-doc-number"><strong>${esc(invoice.number)}</strong><span>Rechnungsdatum ${esc(dateLabel(invoice.invoiceDate))}</span><span>Leistungsdatum ${esc(dateLabel(invoice.serviceDate))}</span></div></div><div class="invoice-address-grid"><div><h4>Rechnungssteller</h4><p>${esc(s.businessName||s.name||'')}\n${esc(s.street||'')}\n${esc(`${s.zip||''} ${s.city||''}`.trim())}\n${esc(s.country||'Deutschland')}${s.email?'\n'+esc(s.email):''}${s.phone?'\n'+esc(s.phone):''}</p></div><div><h4>Rechnung an</h4><p>${esc(c.name||'')}\n${esc(c.address||'')}${c.email?'\n'+esc(c.email):''}</p></div></div><table class="invoice-table"><thead><tr><th>Leistung</th><th>Menge</th><th>Betrag</th></tr></thead><tbody><tr><td>${esc(invoice.description||'')}</td><td>1</td><td>${esc(money(invoice.gross))}</td></tr></tbody></table><div class="invoice-totals">${taxRows}<div class="invoice-total-row final"><span>${totalLabel}</span><strong>${esc(money(invoice.gross))}</strong></div></div>${taxNote(invoice)?`<div class="invoice-payment-note">${esc(taxNote(invoice))}</div>`:''}<div class="invoice-payment-note">${paymentText}</div><div class="invoice-footer">${s.taxNumber?`Steuernummer: ${esc(s.taxNumber)} · `:''}${s.vatId?`USt-IdNr.: ${esc(s.vatId)} · `:''}${s.iban?`IBAN: ${esc(s.iban)} · `:''}${esc(s.name||s.businessName||'')}</div>`;
  }

  function openView(id){
    const invoice=invoiceById(id);if(!invoice)return;activeInvoiceId=id;
    const [key,label]=currentStatus(invoice);document.getElementById('invoiceViewTitle').textContent=`${invoice.type==='cancellation'?'Stornorechnung':'Rechnung'} ${invoice.number}`;document.getElementById('invoiceViewMeta').textContent=`${invoice.customerSnapshot?.name||'—'} · ${label}`;document.getElementById('invoicePreview').innerHTML=documentHtml(invoice);
    const cancel=document.getElementById('cancelInvoiceBtn');cancel.hidden=invoice.type!=='invoice'||invoice.status==='cancelled';cancel.disabled=invoice.type!=='invoice'||invoice.status==='cancelled';
    document.getElementById('invoiceViewDialog').showModal();
  }

  function printInvoice(id){
    const invoice=invoiceById(id);if(!invoice)return;const popup=window.open('','_blank');if(!popup){alert('Das Druckfenster wurde vom Browser blockiert. Bitte Pop-ups für TATNERA erlauben.');return;}
    popup.document.open();popup.document.write(`<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${invoice.type==='cancellation'?'Stornorechnung':'Rechnung'} ${esc(invoice.number)}</title><style>@page{size:A4;margin:16mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#171717;margin:0}.invoice-doc-head{display:flex;justify-content:space-between;gap:24px;border-bottom:2px solid #171717;padding-bottom:18px}.invoice-doc-head h2{margin:0 0 5px;font-size:24px}.invoice-doc-head p{margin:2px 0;font-size:11px;color:#555}.invoice-doc-number{text-align:right}.invoice-doc-number strong{display:block;font-size:18px}.invoice-doc-number span{display:block;font-size:10px;color:#666;margin-top:3px}.invoice-address-grid{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin:24px 0}.invoice-address-grid h4{font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#777;margin:0 0 6px}.invoice-address-grid p{font-size:11px;line-height:1.55;margin:0;white-space:pre-line}.invoice-table{width:100%;border-collapse:collapse;margin-top:18px}.invoice-table th,.invoice-table td{padding:10px 8px;border-bottom:1px solid #ddd;text-align:left;font-size:11px}.invoice-table th:last-child,.invoice-table td:last-child{text-align:right}.invoice-totals{margin:18px 0 0 auto;width:330px}.invoice-total-row{display:flex;justify-content:space-between;gap:15px;padding:5px 0;font-size:11px}.invoice-total-row.final{border-top:2px solid #171717;margin-top:5px;padding-top:9px;font-size:14px;font-weight:800}.invoice-payment-note{margin-top:22px;padding:12px;background:#f4f4f4;border-radius:8px;font-size:10px;line-height:1.55}.invoice-footer{margin-top:30px;padding-top:12px;border-top:1px solid #ddd;font-size:9px;color:#666;line-height:1.5}</style></head><body>${documentHtml(invoice)}</body></html>`);popup.document.close();popup.focus();setTimeout(()=>popup.print(),250);
  }

  function rowHtml(invoice){
    const [key,label]=currentStatus(invoice);return `<div class="invoice-row"><button type="button" class="text-btn invoice-row-main" data-view-invoice="${esc(invoice.id)}"><strong>${invoice.type==='cancellation'?'Storno ':''}${esc(invoice.number)}</strong><span>${esc(dateLabel(invoice.invoiceDate))} · ${esc(invoice.customerSnapshot?.name||'—')}</span></button><div class="invoice-row-amount"><strong>${esc(money(invoice.gross))}</strong><span>${invoice.type==='invoice'&&invoice.status!=='cancelled'?`offen ${esc(money(currentBalance(invoice)))}`:'Dokument'}</span></div><span class="invoice-state ${key}">${esc(label)}</span></div>`;
  }

  function renderProjectInvoices(projectId){
    const root=document.getElementById('projectDetail');if(!root||root.dataset.projectId!==projectId)return;const pane=root.querySelector('[data-project-pane="payments"]');if(!pane)return;
    pane.querySelector('[data-invoice-project-panel]')?.remove();const invoices=invoicesForProject(projectId),section=document.createElement('section');section.className='payment-card invoice-project-panel';section.dataset.invoiceProjectPanel=projectId;section.innerHTML=`<div class="invoice-head"><div><span class="eyebrow">Rechnungen</span><h3>Rechnungen & Storno</h3><p class="muted">Ausgestellte Dokumente bleiben unverändert erhalten.</p></div><button type="button" class="btn primary" data-create-invoice="${esc(projectId)}">+ Rechnung erstellen</button></div><div class="invoice-list">${invoices.length?invoices.map(rowHtml).join(''):'<div class="invoice-empty">Noch keine Rechnung für dieses Tattoo erstellt.</div>'}</div>`;pane.appendChild(section);
  }

  function renderCustomerInvoices(customerId){
    const root=document.getElementById('customerDetail');if(!root||root.dataset.customerId!==customerId)return;root.querySelector('[data-invoice-customer-panel]')?.remove();const invoices=invoicesForCustomer(customerId),section=document.createElement('section');section.className='detail-card invoice-customer-panel';section.dataset.invoiceCustomerPanel=customerId;section.innerHTML=`<div class="invoice-head"><div><span class="eyebrow">Finanzen</span><h3>Rechnungen</h3><p class="muted">Alle Rechnungen dieses Kunden.</p></div></div><div class="invoice-list">${invoices.length?invoices.map(rowHtml).join(''):'<div class="invoice-empty">Noch keine Rechnung vorhanden.</div>'}</div>`;root.appendChild(section);
  }

  function renderFinanceInvoices(){
    const root=document.getElementById('financeView');if(!root)return;root.querySelector('[data-invoice-finance-panel]')?.remove();
    const invoices=[...(state.invoices||[])].sort(sortNewest),month=today().slice(0,7),regular=invoices.filter(i=>i.type==='invoice'&&i.status!=='cancelled'),monthGross=regular.filter(i=>String(i.invoiceDate||'').startsWith(month)).reduce((sum,i)=>sum+Number(i.gross||0),0),open=regular.reduce((sum,i)=>sum+currentBalance(i),0),cancelled=invoices.filter(i=>i.type==='cancellation').length,section=document.createElement('section');section.className='panel invoice-finance-panel';section.dataset.invoiceFinancePanel='true';section.innerHTML=`<div class="panel-head"><div><span class="eyebrow">Rechnungen</span><h3>Rechnungsübersicht</h3></div></div><div class="invoice-finance-stats"><div class="invoice-finance-stat"><span>Fakturiert diesen Monat</span><strong>${esc(money(monthGross))}</strong></div><div class="invoice-finance-stat"><span>Aktuell offen</span><strong>${esc(money(open))}</strong></div><div class="invoice-finance-stat"><span>Stornorechnungen</span><strong>${cancelled}</strong></div></div><div class="invoice-list">${invoices.slice(0,12).map(rowHtml).join('')||'<div class="invoice-empty">Noch keine Rechnungen vorhanden.</div>'}</div>`;root.appendChild(section);
  }

  function renderAll(){
    const projectId=document.getElementById('projectDetail')?.dataset.projectId||'';if(projectId)renderProjectInvoices(projectId);
    const customerId=document.getElementById('customerDetail')?.dataset.customerId||'';if(customerId)renderCustomerInvoices(customerId);
    if(document.getElementById('financeView'))renderFinanceInvoices();
  }

  document.addEventListener('click',event=>{
    const create=event.target.closest('[data-create-invoice]');if(create){event.preventDefault();openCreate(create.dataset.createInvoice);return;}
    const view=event.target.closest('[data-view-invoice]');if(view){event.preventDefault();openView(view.dataset.viewInvoice);return;}
    const finance=event.target.closest('[data-view="finance"]');if(finance)setTimeout(()=>{try{window.renderFinance?.();}catch(_error){}renderFinanceInvoices();},0);
  });
  document.addEventListener('tatnera:project-opened',event=>requestAnimationFrame(()=>renderProjectInvoices(event.detail?.projectId||'')));
  document.addEventListener('tatnera:customer-opened',event=>requestAnimationFrame(()=>renderCustomerInvoices(event.detail?.customerId||'')));
  document.addEventListener('tatnera:data-changed',()=>requestAnimationFrame(()=>{if(document.getElementById('finance')?.classList.contains('active-view'))try{window.renderFinance?.();}catch(_error){}renderAll();}));
  document.addEventListener('tatnera:runtime-refresh',()=>requestAnimationFrame(renderAll));
  document.addEventListener('tatnera:studio-changed',()=>requestAnimationFrame(renderAll));

  installStyle();installDialogs();requestAnimationFrame(renderAll);
  window.TatneraInvoices={getAll:()=>structuredClone(state.invoices||[]),openCreate,openView,printInvoice};
})();