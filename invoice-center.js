/* TATNERA — dedicated invoice center
   Main navigation view for searching, filtering and opening invoices. */
(function(){
  'use strict';
  const Core=window.TatneraCore;if(!Core)return;
  const esc=Core.esc;
  let query='',filter='all';

  function money(value){return new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(value)||0);}
  function dateLabel(value){return value?new Intl.DateTimeFormat('de-DE').format(new Date(value+'T12:00:00')):'—';}
  function signedPayment(tx){return tx.type==='Erstattung'?-Math.abs(Number(tx.amount)||0):Math.abs(Number(tx.amount)||0);}
  function projectPaid(project){return Math.max(0,(project?.payments||[]).reduce((sum,tx)=>sum+signedPayment(tx),0));}
  function balance(invoice){
    if(invoice?.type==='cancellation'||invoice?.status==='cancelled')return 0;
    const project=Core.getProject(invoice?.projectId);if(!project)return Math.max(0,Number(invoice?.balanceAtIssue)||0);
    return Math.max(0,Math.round((Number(invoice?.gross||0)-projectPaid(project))*100)/100);
  }
  function status(invoice){
    if(invoice?.type==='cancellation')return ['cancelled','Stornorechnung'];
    if(invoice?.status==='cancelled')return ['cancelled','Storniert'];
    return balance(invoice)<=0?['paid','Bezahlt']:['open','Offen'];
  }
  function allInvoices(){return window.TatneraInvoices?.getAll?.()||[];}
  function sortNewest(a,b){return String(b.invoiceDate||b.createdAt||'').localeCompare(String(a.invoiceDate||a.createdAt||''))||String(b.number||'').localeCompare(String(a.number||''));}

  function orderNavigation(){
    const nav=document.querySelector('.nav');if(!nav)return;
    ['dashboard','calendar','customers','projects','requests','invoices'].forEach(view=>{
      const item=nav.querySelector(`.nav-item[data-view="${view}"]`);if(item)nav.appendChild(item);
    });
  }

  function installStyle(){
    if(document.getElementById('invoiceCenterStyle'))return;
    const style=document.createElement('style');style.id='invoiceCenterStyle';style.textContent=`
      .invoice-center{display:flex;flex-direction:column;gap:14px}
      .invoice-center-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}.invoice-center-head h2{margin:3px 0 5px}.invoice-center-head p{margin:0}
      .invoice-center-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.invoice-center-stat{padding:14px;border:1px solid var(--line);border-radius:12px;background:var(--panel)}.invoice-center-stat span,.invoice-center-stat strong,.invoice-center-stat small{display:block}.invoice-center-stat span{font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}.invoice-center-stat strong{font-size:18px;margin-top:5px}.invoice-center-stat small{font-size:9px;color:var(--muted);margin-top:4px}
      .invoice-center-toolbar{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap}.invoice-center-search{display:flex;align-items:center;gap:8px;min-width:min(360px,100%);padding:0 11px;border:1px solid var(--line);border-radius:10px;background:var(--panel-2)}.invoice-center-search input{width:100%;min-height:40px;border:0;background:transparent;color:var(--text);font:inherit;outline:0}.invoice-center-filters{display:flex;gap:6px;flex-wrap:wrap}.invoice-center-filter{border:1px solid var(--line);background:var(--panel-2);color:var(--muted);border-radius:999px;padding:7px 10px;font-size:10px;font-weight:800;cursor:pointer}.invoice-center-filter.active{background:var(--text);color:var(--panel);border-color:var(--text)}
      .invoice-center-table{overflow:hidden}.invoice-center-table-head,.invoice-center-entry{display:grid;grid-template-columns:125px minmax(0,1fr) 140px 130px 110px;gap:12px;align-items:center}.invoice-center-table-head{padding:9px 12px;color:var(--muted);font-size:9px;text-transform:uppercase;letter-spacing:.06em}.invoice-center-entry{width:100%;padding:12px;border:0;border-top:1px solid var(--line);background:transparent;color:var(--text);text-align:left;cursor:pointer}.invoice-center-entry:hover{background:var(--panel-2)}.invoice-center-entry strong,.invoice-center-entry span,.invoice-center-entry small{display:block}.invoice-center-entry small{font-size:9px;color:var(--muted);margin-top:3px}.invoice-center-amount{text-align:right}.invoice-center-status{justify-self:end;display:inline-flex;border:1px solid var(--line);border-radius:999px;padding:5px 8px;font-size:9px;font-weight:800}.invoice-center-status.paid{background:#eef7e8;color:#315b20;border-color:#a8c79a}.invoice-center-status.open{background:#fff5e7;color:#85531a;border-color:#d5b27c}.invoice-center-status.cancelled{background:#f6eded;color:#843939;border-color:#d6aaaa}.invoice-center-empty{padding:28px;text-align:center;color:var(--muted);font-size:11px;border-top:1px solid var(--line)}
      .invoice-picker-list{display:flex;flex-direction:column;gap:7px;margin-top:14px;max-height:48vh;overflow:auto}.invoice-picker-row{display:flex;justify-content:space-between;align-items:center;gap:12px;width:100%;padding:11px 12px;border:1px solid var(--line);border-radius:10px;background:var(--panel-2);color:var(--text);text-align:left;cursor:pointer}.invoice-picker-row strong,.invoice-picker-row span{display:block}.invoice-picker-row span{font-size:10px;color:var(--muted);margin-top:3px}
      @media(max-width:900px){.invoice-center-stats{grid-template-columns:1fr 1fr}.invoice-center-table-head{display:none}.invoice-center-entry{grid-template-columns:1fr auto}.invoice-center-entry>div:nth-child(3),.invoice-center-entry>div:nth-child(4){display:none}.invoice-center-status{grid-column:2;grid-row:1;align-self:start}.invoice-center-amount{grid-column:2;grid-row:2}}
      @media(max-width:600px){.invoice-center-head{flex-direction:column}.invoice-center-head .btn{width:100%}.invoice-center-stats{grid-template-columns:1fr}.invoice-center-search{min-width:100%}.invoice-center-toolbar{align-items:stretch;flex-direction:column}}
    `;document.head.appendChild(style);
  }

  function installPicker(){
    if(document.getElementById('invoiceProjectPickerDialog'))return;
    const dialog=document.createElement('dialog');dialog.id='invoiceProjectPickerDialog';dialog.className='dialog';dialog.innerHTML=`<div style="padding:22px"><div class="dialog-head"><div><span class="eyebrow">Rechnung</span><h2>Tattoo auswählen</h2><p class="muted">Für welches Tattoo soll eine Rechnung erstellt werden?</p></div><button type="button" class="close-btn" data-close-invoice-picker>×</button></div><div class="invoice-picker-list" id="invoiceProjectPickerList"></div><div class="dialog-actions"><button type="button" class="btn ghost" data-close-invoice-picker>Abbrechen</button></div></div>`;document.body.appendChild(dialog);
    dialog.querySelectorAll('[data-close-invoice-picker]').forEach(btn=>btn.addEventListener('click',()=>dialog.close()));
  }

  function openPicker(){
    const list=document.getElementById('invoiceProjectPickerList');if(!list)return;
    const projects=[...(state.projects||[])].sort((a,b)=>String(a.title||'').localeCompare(String(b.title||''),'de'));
    list.innerHTML=projects.length?projects.map(project=>`<button type="button" class="invoice-picker-row" data-invoice-picker-project="${esc(project.id)}"><div><strong>${esc(project.title||'Tattoo')}</strong><span>${esc(customerName(project.customerId))} · ${esc(project.placement||'—')}</span></div><strong>${esc(money(project.price||0))}</strong></button>`).join(''):'<div class="invoice-center-empty">Noch keine Tattoo-Akte vorhanden.</div>';
    document.getElementById('invoiceProjectPickerDialog').showModal();
  }

  function matches(invoice){
    const [key]=status(invoice);if(filter!=='all'&&key!==filter)return false;
    if(!query)return true;
    const haystack=[invoice.number,invoice.customerSnapshot?.name,invoice.customerSnapshot?.email,invoice.description,invoice.invoiceDate].join(' ').toLowerCase();
    return haystack.includes(query.toLowerCase());
  }

  function render(){
    const root=document.getElementById('invoiceCenter');if(!root)return;
    const invoices=allInvoices().sort(sortNewest),visible=invoices.filter(matches),month=new Date().toISOString().slice(0,7),regular=invoices.filter(i=>i.type==='invoice'&&i.status!=='cancelled'),monthGross=regular.filter(i=>String(i.invoiceDate||'').startsWith(month)).reduce((sum,i)=>sum+Number(i.gross||0),0),openTotal=regular.reduce((sum,i)=>sum+balance(i),0),paidCount=regular.filter(i=>status(i)[0]==='paid').length,cancelCount=invoices.filter(i=>status(i)[0]==='cancelled').length;
    root.innerHTML=`<div class="invoice-center"><div class="invoice-center-head"><div><span class="eyebrow">Fakturierung</span><h2>Rechnungen</h2><p class="muted">Alle Rechnungen, Zahlstände und Stornierungen an einem Ort.</p></div><button type="button" class="btn primary" data-invoice-center-new>+ Rechnung erstellen</button></div><div class="invoice-center-stats"><article class="invoice-center-stat"><span>Fakturiert diesen Monat</span><strong>${esc(money(monthGross))}</strong><small>${regular.filter(i=>String(i.invoiceDate||'').startsWith(month)).length} Rechnungen</small></article><article class="invoice-center-stat"><span>Offener Rechnungsbetrag</span><strong>${esc(money(openTotal))}</strong><small>über alle offenen Rechnungen</small></article><article class="invoice-center-stat"><span>Bezahlt</span><strong>${paidCount}</strong><small>aktive Rechnungen vollständig bezahlt</small></article><article class="invoice-center-stat"><span>Storniert / Storno</span><strong>${cancelCount}</strong><small>bleiben nachvollziehbar erhalten</small></article></div><section class="panel invoice-center-table"><div class="invoice-center-toolbar" style="padding:14px"><label class="invoice-center-search"><span>⌕</span><input id="invoiceCenterSearch" placeholder="Rechnungsnummer, Kunde oder Leistung …" value="${esc(query)}"></label><div class="invoice-center-filters"><button type="button" class="invoice-center-filter ${filter==='all'?'active':''}" data-invoice-center-filter="all">Alle</button><button type="button" class="invoice-center-filter ${filter==='open'?'active':''}" data-invoice-center-filter="open">Offen</button><button type="button" class="invoice-center-filter ${filter==='paid'?'active':''}" data-invoice-center-filter="paid">Bezahlt</button><button type="button" class="invoice-center-filter ${filter==='cancelled'?'active':''}" data-invoice-center-filter="cancelled">Storniert</button></div></div><div class="invoice-center-table-head"><span>Nummer</span><span>Kunde / Leistung</span><span>Datum</span><span style="text-align:right">Betrag</span><span style="text-align:right">Status</span></div><div id="invoiceCenterRows">${visible.length?visible.map(invoice=>{const [key,label]=status(invoice);return `<button type="button" class="invoice-center-entry" data-invoice-center-open="${esc(invoice.id)}"><div><strong>${invoice.type==='cancellation'?'Storno ':''}${esc(invoice.number||'—')}</strong><small>${esc(invoice.type==='cancellation'?'Stornorechnung':'Rechnung')}</small></div><div><strong>${esc(invoice.customerSnapshot?.name||'—')}</strong><small>${esc(invoice.description||'—')}</small></div><div><strong>${esc(dateLabel(invoice.invoiceDate))}</strong><small>Leistung ${esc(dateLabel(invoice.serviceDate))}</small></div><div class="invoice-center-amount"><strong>${esc(money(invoice.gross||0))}</strong><small>${key==='open'?'offen '+esc(money(balance(invoice))):' '}</small></div><span class="invoice-center-status ${key}">${esc(label)}</span></button>`;}).join(''):'<div class="invoice-center-empty">Keine Rechnungen für diese Auswahl gefunden.</div>'}</div></section></div>`;
    document.getElementById('invoiceCenterSearch')?.addEventListener('input',event=>{query=event.currentTarget.value;render();const input=document.getElementById('invoiceCenterSearch');input?.focus();if(input)input.setSelectionRange(input.value.length,input.value.length);});
  }

  function renderWhenVisible(){if(document.getElementById('invoices')?.classList.contains('active-view'))render();}

  document.addEventListener('click',event=>{
    const nav=event.target.closest('[data-view="invoices"]');if(nav)setTimeout(render,0);
    const filterButton=event.target.closest('[data-invoice-center-filter]');if(filterButton){filter=filterButton.dataset.invoiceCenterFilter||'all';render();return;}
    const create=event.target.closest('[data-invoice-center-new]');if(create){event.preventDefault();openPicker();return;}
    const project=event.target.closest('[data-invoice-picker-project]');if(project){event.preventDefault();document.getElementById('invoiceProjectPickerDialog')?.close();window.TatneraInvoices?.openCreate?.(project.dataset.invoicePickerProject);return;}
    const invoice=event.target.closest('[data-invoice-center-open]');if(invoice){event.preventDefault();window.TatneraInvoices?.openView?.(invoice.dataset.invoiceCenterOpen);}
  });
  document.addEventListener('tatnera:data-changed',()=>requestAnimationFrame(renderWhenVisible));
  document.addEventListener('tatnera:runtime-refresh',()=>requestAnimationFrame(()=>{orderNavigation();renderWhenVisible();}));

  try{pageTitles.invoices='Rechnungen';}catch(_error){}
  installStyle();installPicker();orderNavigation();requestAnimationFrame(render);
  window.TatneraInvoiceCenter={render,openPicker};
})();