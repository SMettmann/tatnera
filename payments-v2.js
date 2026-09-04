/* TATNERA — payments v2, project-ID based */
(function(){
  'use strict';
  const Core=window.TatneraCore;let activeProjectId='';const esc=Core.esc;
  const euro=value=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:2}).format(Number(value)||0);
  const today=()=>new Date().toISOString().slice(0,10);
  const dateLabel=value=>value?new Intl.DateTimeFormat('de-DE').format(new Date(value+'T12:00:00')):'—';
  const list=p=>Array.isArray(p?.payments)?p.payments:[];
  const signed=tx=>tx.type==='Erstattung'?-Math.abs(Number(tx.amount)||0):Math.abs(Number(tx.amount)||0);
  const paid=p=>Math.max(0,list(p).reduce((sum,tx)=>sum+signed(tx),0));
  const price=p=>Math.max(0,Number(p?.price)||0);
  const deposit=p=>Math.max(0,Number(p?.deposit)||0);
  const remaining=p=>Math.max(0,price(p)-paid(p));
  const depositRemaining=p=>Math.max(0,deposit(p)-Math.min(paid(p),deposit(p)));
  const status=p=>price(p)>0&&paid(p)>=price(p)?['paid','Bezahlt']:paid(p)>0?['partial','Teilbezahlt']:['open','Offen'];

  function install(){
    if(!document.querySelector('link[href="payments.css"]')){const link=document.createElement('link');link.rel='stylesheet';link.href='payments.css';document.head.appendChild(link);}
    buildDialogs();
    let changed=false;(state.projects||[]).forEach(p=>{if(!Array.isArray(p.payments)){p.payments=[];changed=true;}});if(changed)persist();
    document.addEventListener('tatnera:project-opened',inject);
    document.addEventListener('tatnera:runtime-refresh',inject);
    inject();
  }

  function buildDialogs(){
    if(document.getElementById('paymentDialog'))return;
    const payment=document.createElement('dialog');payment.id='paymentDialog';payment.className='dialog';payment.innerHTML=`<form id="paymentForm" style="padding:22px"><div class="dialog-head"><div><span class="eyebrow">Zahlung</span><h2>Zahlung erfassen</h2><p class="muted" id="paymentDialogMeta"></p></div><button type="button" class="close-btn" data-close-payment>×</button></div><div class="form-grid"><label>Buchungstyp<select name="type" required><option>Anzahlung</option><option>Teilzahlung</option><option>Restzahlung</option><option>Erstattung</option></select></label><label>Betrag (€)<input name="amount" type="number" min="0.01" step="0.01" required></label><label>Datum<input name="date" type="date" required></label><label>Zahlungsmethode<select name="method" required><option>Bar</option><option>Karte</option><option>Überweisung</option><option>PayPal</option><option>Sonstiges</option></select></label><label class="full">Notiz<textarea name="note" rows="2"></textarea></label></div><div class="payment-dialog-note" id="paymentDialogHint"></div><div class="dialog-actions"><button type="button" class="btn ghost" data-close-payment>Abbrechen</button><button type="submit" class="btn primary">Zahlung speichern</button></div></form>`;document.body.appendChild(payment);
    const priceDialog=document.createElement('dialog');priceDialog.id='priceDialog';priceDialog.className='dialog';priceDialog.innerHTML=`<form id="priceForm" style="padding:22px"><div class="dialog-head"><div><span class="eyebrow">Tattoo-Akte</span><h2>Preis & Anzahlung</h2><p class="muted" id="priceDialogMeta"></p></div><button type="button" class="close-btn" data-close-price>×</button></div><div class="form-grid"><label>Gesamtpreis (€)<input required min="0" step="0.01" type="number" name="price"></label><label>Vereinbarte Anzahlung (€)<input required min="0" step="0.01" type="number" name="deposit"></label></div><div class="payment-dialog-note">Bereits erfasste Zahlungen bleiben erhalten.</div><div class="dialog-actions"><button type="button" class="btn ghost" data-close-price>Abbrechen</button><button type="submit" class="btn primary">Speichern</button></div></form>`;document.body.appendChild(priceDialog);
    document.querySelectorAll('[data-close-payment]').forEach(btn=>btn.addEventListener('click',()=>payment.close()));document.querySelectorAll('[data-close-price]').forEach(btn=>btn.addEventListener('click',()=>priceDialog.close()));
    document.getElementById('paymentForm').addEventListener('submit',savePayment);document.getElementById('priceForm').addEventListener('submit',savePrice);
  }

  function inject(){
    const id=Core.projectIdFromDetail(),p=Core.getProject(id),detail=document.getElementById('projectDetail');if(!id||!p||!detail)return;
    let card=detail.querySelector(`.payment-card[data-payment-project="${CSS.escape(id)}"]`);
    if(!card){card=document.createElement('section');card.className='payment-card';card.dataset.paymentProject=id;const pane=detail.querySelector('[data-project-pane="payments"]');if(pane){pane.innerHTML='';pane.append(card);}else detail.append(card);}renderCard(card,p);
  }

  function renderCard(card,p){
    const total=paid(p),cost=price(p),due=remaining(p),dep=deposit(p),depDue=depositRemaining(p),[key,label]=status(p),rows=[...list(p)].sort((a,b)=>(b.date||'').localeCompare(a.date||''));const depPaid=Math.min(total,dep),pct=dep>0?Math.min(100,depPaid/dep*100):0;
    card.innerHTML=`<div class="payment-head"><div><span class="eyebrow">Finanzen</span><h3>Zahlungen & Anzahlungen</h3><p class="muted">Alle Buchungen eindeutig mit dieser Tattoo-Akte verknüpft.</p></div><span class="payment-status ${key}">${label}</span></div><div class="payment-summary"><div><span>Gesamtpreis</span><strong>${euro(cost)}</strong><small>Projektpreis</small></div><div><span>Anzahlung</span><strong>${euro(dep)}</strong><small>${depDue>0?euro(depDue)+' offen':'erledigt'}</small></div><div class="done"><span>Bezahlt</span><strong>${euro(total)}</strong><small>${rows.length} Buchung${rows.length===1?'':'en'}</small></div><div class="${due>0?'due':'done'}"><span>Restbetrag</span><strong>${euro(due)}</strong><small>${due>0?'noch offen':'vollständig bezahlt'}</small></div></div><div class="deposit-progress"><div class="deposit-progress-top"><span>Anzahlungsstatus</span><strong>${dep>0?`${euro(depPaid)} / ${euro(dep)}`:'Keine Anzahlung vereinbart'}</strong></div><div class="deposit-track"><div class="deposit-fill" style="width:${pct}%"></div></div></div><div class="payment-actions"><button type="button" class="btn primary" data-add-payment="${esc(p.id)}">+ Zahlung erfassen</button><button type="button" class="payment-quick" data-pay-deposit="${esc(p.id)}" ${depDue<=0?'disabled':''}>Anzahlung ${depDue>0?euro(depDue):'bezahlt'}</button><button type="button" class="btn ghost" data-edit-price="${esc(p.id)}">Preis / Anzahlung bearbeiten</button></div><div class="payment-history"><div class="payment-history-head"><h4>Zahlungshistorie</h4><span class="muted">${rows.length?`${rows.length} Vorgänge`:'Noch leer'}</span></div>${rows.length?rows.map(rowHtml).join(''):'<div class="payment-empty">Noch keine Zahlung erfasst.</div>'}</div>`;
  }

  function rowHtml(tx){const refund=tx.type==='Erstattung';return `<div class="payment-row"><div class="payment-date"><strong>${dateLabel(tx.date)}</strong><small>${esc(tx.type)}</small></div><div><span class="payment-type">${esc(tx.type)}</span><small>${esc(tx.note||'Keine Notiz')}</small></div><div class="payment-method"><strong>${esc(tx.method)}</strong><small>Zahlungsmethode</small></div><div class="amount ${refund?'refund':''}">${refund?'−':'+'}${euro(tx.amount)}</div><button type="button" class="payment-delete" data-delete-payment="${esc(tx.id)}">×</button></div>`;}

  function openPayment(id,mode=''){
    activeProjectId=String(id||'');
    const p=Core.getProject(activeProjectId),form=document.getElementById('paymentForm'),dialog=document.getElementById('paymentDialog');
    if(!p||!form||!dialog)return false;
    form.reset();form.elements.date.value=today();form.elements.method.value='Bar';
    if(mode==='deposit'){form.elements.type.value='Anzahlung';form.elements.amount.value=depositRemaining(p).toFixed(2);}else{const due=remaining(p);form.elements.type.value=due>0&&paid(p)>0?'Restzahlung':'Anzahlung';form.elements.amount.value=due>0?due.toFixed(2):'';}
    document.getElementById('paymentDialogMeta').textContent=`${customerName(p.customerId)} · ${p.title}`;
    document.getElementById('paymentDialogHint').textContent=`Bezahlt: ${euro(paid(p))} · Rest: ${euro(remaining(p))} · Anzahlung offen: ${euro(depositRemaining(p))}`;
    if(!dialog.open)dialog.showModal();
    return true;
  }

  function hasActiveInvoice(projectId){
    return (state.invoices||[]).some(invoice=>invoice.projectId===projectId&&invoice.type==='invoice'&&invoice.status!=='cancelled');
  }
  function offerInvoiceAfterFinalPayment(project){
    if(!project||remaining(project)>0||price(project)<=0||hasActiveInvoice(project.id))return;
    setTimeout(()=>{
      if(!window.TatneraInvoices?.openCreate)return;
      if(confirm(`Zahlung vollständig (${euro(paid(project))}). Jetzt Rechnung für ${project.title} erstellen?`))window.TatneraInvoices.openCreate(project.id);
    },80);
  }

  function savePayment(event){
    event.preventDefault();const p=Core.getProject(activeProjectId);if(!p)return;
    const d=Object.fromEntries(new FormData(event.currentTarget).entries()),amount=Math.abs(Number(d.amount)||0);if(amount<=0)return;
    if(d.type==='Erstattung'&&amount>paid(p)){alert('Die Erstattung kann nicht höher als der bisher bezahlte Betrag sein.');return;}
    if(d.type!=='Erstattung'&&amount>remaining(p)&&remaining(p)>0&&!confirm(`Der Betrag ist höher als der offene Restbetrag von ${euro(remaining(p))}. Trotzdem buchen?`))return;
    p.payments.push({id:'pay'+Date.now(),type:d.type,amount,date:d.date,method:d.method,note:String(d.note||'').trim(),createdAt:new Date().toISOString()});
    persist();document.getElementById('paymentDialog').close();inject();document.dispatchEvent(new CustomEvent('tatnera:data-changed',{detail:{type:'payment',projectId:p.id}}));
    if(d.type!=='Erstattung')offerInvoiceAfterFinalPayment(p);
  }
  function savePrice(event){event.preventDefault();const p=Core.getProject(activeProjectId);if(!p)return;const nextPrice=Math.max(0,Number(event.currentTarget.elements.price.value)||0),nextDeposit=Math.max(0,Number(event.currentTarget.elements.deposit.value)||0);if(nextDeposit>nextPrice&&nextPrice>0&&!confirm('Die Anzahlung ist höher als der Gesamtpreis. Trotzdem speichern?'))return;if(nextPrice<paid(p)&&!confirm(`Es wurden bereits ${euro(paid(p))} bezahlt. Der neue Gesamtpreis liegt darunter. Trotzdem speichern?`))return;p.price=nextPrice;p.deposit=nextDeposit;persist();document.getElementById('priceDialog').close();inject();document.dispatchEvent(new CustomEvent('tatnera:data-changed',{detail:{type:'payment',projectId:p.id}}));}

  window.TatneraPayments={
    open:(id,mode='')=>openPayment(id,mode),
    openDeposit:id=>openPayment(id,'deposit'),
    paid:id=>{const p=Core.getProject(id);return p?paid(p):0;},
    remaining:id=>{const p=Core.getProject(id);return p?remaining(p):0;},
    depositRemaining:id=>{const p=Core.getProject(id);return p?depositRemaining(p):0;}
  };

  document.addEventListener('click',event=>{
    const target=event.target instanceof Element?event.target:null;if(!target)return;
    const add=target.closest('[data-add-payment]');if(add){event.preventDefault();event.stopPropagation();openPayment(add.dataset.addPayment);return;}
    const quick=target.closest('[data-pay-deposit]');if(quick){event.preventDefault();event.stopPropagation();openPayment(quick.dataset.payDeposit,'deposit');return;}
    const edit=target.closest('[data-edit-price]');if(edit){event.preventDefault();event.stopPropagation();activeProjectId=edit.dataset.editPrice;const p=Core.getProject(activeProjectId),form=document.getElementById('priceForm');if(p&&form){form.elements.price.value=price(p);form.elements.deposit.value=deposit(p);document.getElementById('priceDialogMeta').textContent=`${customerName(p.customerId)} · ${p.title}`;const dialog=document.getElementById('priceDialog');if(!dialog.open)dialog.showModal();}return;}
    const del=target.closest('[data-delete-payment]');if(del){event.preventDefault();event.stopPropagation();const id=Core.projectIdFromDetail(),p=Core.getProject(id),tx=p?.payments?.find(item=>item.id===del.dataset.deletePayment);if(!p||!tx)return;if(confirm(`${tx.type} über ${euro(tx.amount)} wirklich löschen?`)){p.payments=p.payments.filter(item=>item.id!==tx.id);persist();inject();document.dispatchEvent(new CustomEvent('tatnera:data-changed',{detail:{type:'payment',projectId:p.id}}));}}
  },true);
  install();
})();