/* TATNERA — Zahlungen & Anzahlungen
   MVP: Zahlungsvorgänge werden lokal in der jeweiligen Tattoo-Akte gespeichert. */
(function(){
  let activeProjectId='';

  function esc(v){return String(v??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));}
  function projectById(id){return state.projects.find(p=>p.id===id);}
  function currentProject(){
    const detail=document.getElementById('projectDetail');
    const title=detail?.querySelector('h2')?.textContent?.trim();
    return title?state.projects.find(p=>p.title===title)||null:null;
  }
  function euro(v){return new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:2}).format(Number(v)||0);}
  function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function dateLabel(v){if(!v)return'—';return new Intl.DateTimeFormat('de-DE').format(new Date(v+'T12:00:00'));}
  function payments(p){return Array.isArray(p.payments)?p.payments:[];}
  function signedAmount(tx){return tx.type==='Erstattung'?-Math.abs(Number(tx.amount)||0):Math.abs(Number(tx.amount)||0);}
  function paidTotal(p){return Math.max(0,payments(p).reduce((sum,tx)=>sum+signedAmount(tx),0));}
  function projectPrice(p){return Math.max(0,Number(p.price)||0);}
  function requiredDeposit(p){return Math.max(0,Number(p.deposit)||0);}
  function remaining(p){return Math.max(0,projectPrice(p)-paidTotal(p));}
  function depositRemaining(p){return Math.max(0,requiredDeposit(p)-Math.min(paidTotal(p),requiredDeposit(p)));}
  function paymentState(p){
    const paid=paidTotal(p), price=projectPrice(p);
    if(price>0&&paid>=price)return{key:'paid',label:'Bezahlt'};
    if(paid>0)return{key:'partial',label:'Teilbezahlt'};
    return{key:'open',label:'Offen'};
  }

  function install(){
    if(!document.querySelector('link[href="payments.css"]')){
      const link=document.createElement('link');link.rel='stylesheet';link.href='payments.css';document.head.appendChild(link);
    }
    buildDialogs();
    migrateProjects();
    injectPaymentCard();
    updateDashboardPayments();
    const detail=document.getElementById('projectDetail');
    if(detail)new MutationObserver(()=>{if(!detail.querySelector('.payment-card'))injectPaymentCard();}).observe(detail,{childList:true,subtree:true});
  }

  function migrateProjects(){
    let changed=false;
    state.projects.forEach(p=>{if(!Array.isArray(p.payments)){p.payments=[];changed=true;}});
    if(changed)persist();
  }

  function buildDialogs(){
    if(document.getElementById('paymentDialog'))return;
    const dialog=document.createElement('dialog');dialog.id='paymentDialog';dialog.className='dialog';
    dialog.innerHTML=`<form id="paymentForm" style="padding:22px">
      <div class="dialog-head"><div><span class="eyebrow">Zahlung</span><h2 id="paymentDialogTitle">Zahlung erfassen</h2><p class="muted" id="paymentDialogMeta"></p></div><button type="button" class="close-btn" data-close-payment>×</button></div>
      <div class="form-grid">
        <label>Buchungstyp<select name="type" required><option>Anzahlung</option><option>Teilzahlung</option><option>Restzahlung</option><option>Erstattung</option></select></label>
        <label>Betrag (€)<input name="amount" type="number" min="0.01" step="0.01" required></label>
        <label>Datum<input name="date" type="date" required></label>
        <label>Zahlungsmethode<select name="method" required><option>Bar</option><option>Karte</option><option>Überweisung</option><option>PayPal</option><option>Sonstiges</option></select></label>
        <label class="full">Notiz<textarea name="note" rows="2" placeholder="optional, z. B. Anzahlung bei Terminvereinbarung"></textarea></label>
      </div>
      <div class="payment-dialog-note" id="paymentDialogHint"></div>
      <div class="dialog-actions"><button type="button" class="btn ghost" data-close-payment>Abbrechen</button><button type="submit" class="btn primary">Zahlung speichern</button></div>
    </form>`;
    document.body.appendChild(dialog);

    const price=document.createElement('dialog');price.id='priceDialog';price.className='dialog';
    price.innerHTML=`<form id="priceForm" style="padding:22px">
      <div class="dialog-head"><div><span class="eyebrow">Tattoo-Akte</span><h2>Preis & Anzahlung</h2><p class="muted" id="priceDialogMeta"></p></div><button type="button" class="close-btn" data-close-price>×</button></div>
      <div class="form-grid"><label>Gesamtpreis (€)<input required min="0" step="0.01" type="number" name="price"></label><label>Vereinbarte Anzahlung (€)<input required min="0" step="0.01" type="number" name="deposit"></label></div>
      <div class="payment-dialog-note">Bereits erfasste Zahlungsvorgänge bleiben erhalten. TATNERA berechnet Restbetrag und Anzahlungsstatus anschließend neu.</div>
      <div class="dialog-actions"><button type="button" class="btn ghost" data-close-price>Abbrechen</button><button type="submit" class="btn primary">Speichern</button></div>
    </form>`;
    document.body.appendChild(price);

    document.querySelectorAll('[data-close-payment]').forEach(b=>b.addEventListener('click',()=>dialog.close()));
    document.querySelectorAll('[data-close-price]').forEach(b=>b.addEventListener('click',()=>price.close()));
    document.getElementById('paymentForm').addEventListener('submit',savePayment);
    document.getElementById('priceForm').addEventListener('submit',savePrice);
  }

  function injectPaymentCard(){
    const p=currentProject();const detail=document.getElementById('projectDetail');if(!p||!detail||detail.querySelector('.payment-card'))return;
    const card=document.createElement('section');card.className='payment-card';card.dataset.paymentProject=p.id;
    renderCard(card,p);
    const consent=detail.querySelector('.consent-card');
    if(consent)consent.insertAdjacentElement('afterend',card);
    else{
      const hero=detail.querySelector('.detail-hero');if(hero)hero.insertAdjacentElement('afterend',card);else detail.prepend(card);
    }
  }

  function refreshCurrentCard(projectId){
    const card=document.querySelector(`.payment-card[data-payment-project="${projectId}"]`);const p=projectById(projectId);
    if(card&&p)renderCard(card,p);
    updateDashboardPayments();
  }

  function renderCard(card,p){
    const paid=paidTotal(p), price=projectPrice(p), due=remaining(p), deposit=requiredDeposit(p), depDue=depositRemaining(p), st=paymentState(p);
    const depPaid=Math.min(paid,deposit);const depPct=deposit>0?Math.min(100,(depPaid/deposit)*100):(paid>0?100:0);
    const rows=[...payments(p)].sort((a,b)=>(b.date||'').localeCompare(a.date||'')||String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
    card.innerHTML=`<div class="payment-head"><div><span class="eyebrow">Finanzen</span><h3>Zahlungen & Anzahlungen</h3><p class="muted">Zahlungsvorgänge direkt mit dieser Tattoo-Akte dokumentieren.</p></div><span class="payment-status ${st.key}">${st.label}</span></div>
      <div class="payment-summary">
        <div><span>Gesamtpreis</span><strong>${euro(price)}</strong><small>vereinbarter Projektpreis</small></div>
        <div><span>Anzahlung</span><strong>${euro(deposit)}</strong><small>${depDue>0?euro(depDue)+' noch offen':'erledigt'}</small></div>
        <div class="done"><span>Bezahlt</span><strong>${euro(paid)}</strong><small>${rows.length} Buchung${rows.length===1?'':'en'}</small></div>
        <div class="${due>0?'due':'done'}"><span>Restbetrag</span><strong>${euro(due)}</strong><small>${due>0?'noch offen':'vollständig bezahlt'}</small></div>
      </div>
      <div class="deposit-progress"><div class="deposit-progress-top"><span>Anzahlungsstatus</span><strong>${deposit>0?`${euro(depPaid)} / ${euro(deposit)}`:'Keine Anzahlung vereinbart'}</strong></div><div class="deposit-track"><div class="deposit-fill" style="width:${depPct}%"></div></div></div>
      <div class="payment-actions"><button class="btn primary" data-add-payment="${p.id}">+ Zahlung erfassen</button><button class="payment-quick" data-pay-deposit="${p.id}" ${depDue<=0?'disabled':''}>Anzahlung ${depDue>0?euro(depDue):'bezahlt'}</button><button class="btn ghost" data-edit-price="${p.id}">Preis / Anzahlung bearbeiten</button></div>
      <div class="payment-history"><div class="payment-history-head"><h4>Zahlungshistorie</h4><span class="muted">${rows.length?`${rows.length} Vorgänge`:'Noch leer'}</span></div>${rows.length?rows.map(tx=>paymentRow(tx)).join(''):'<div class="payment-empty">Noch keine Zahlung erfasst.</div>'}</div>`;
    card.querySelector('[data-add-payment]')?.addEventListener('click',()=>openPaymentDialog(p.id));
    card.querySelector('[data-pay-deposit]')?.addEventListener('click',()=>openPaymentDialog(p.id,'deposit'));
    card.querySelector('[data-edit-price]')?.addEventListener('click',()=>openPriceDialog(p.id));
    card.querySelectorAll('[data-delete-payment]').forEach(b=>b.addEventListener('click',()=>deletePayment(p.id,b.dataset.deletePayment)));
  }

  function paymentRow(tx){
    const refund=tx.type==='Erstattung';
    return `<div class="payment-row"><div class="payment-date"><strong>${dateLabel(tx.date)}</strong><small>${esc(tx.type)}</small></div><div><span class="payment-type">${esc(tx.type)}</span><small>${esc(tx.note||'Keine Notiz')}</small></div><div class="payment-method"><strong>${esc(tx.method)}</strong><small>Zahlungsmethode</small></div><div class="amount ${refund?'refund':''}">${refund?'−':'+'}${euro(tx.amount)}</div><button class="payment-delete" title="Buchung löschen" data-delete-payment="${tx.id}">×</button></div>`;
  }

  function openPaymentDialog(projectId,mode=''){
    activeProjectId=projectId;const p=projectById(projectId);if(!p)return;const form=document.getElementById('paymentForm');form.reset();
    form.elements.date.value=today();form.elements.method.value='Bar';
    if(mode==='deposit'){
      form.elements.type.value='Anzahlung';form.elements.amount.value=depositRemaining(p).toFixed(2);
    }else{
      const due=remaining(p);form.elements.type.value=due>0&&paidTotal(p)>0?'Restzahlung':'Anzahlung';form.elements.amount.value=due>0?due.toFixed(2):'';
    }
    document.getElementById('paymentDialogMeta').textContent=`${customerName(p.customerId)} · ${p.title}`;
    updatePaymentHint();
    form.elements.type.addEventListener('change',updatePaymentHint,{once:true});
    document.getElementById('paymentDialog').showModal();
  }

  function updatePaymentHint(){
    const p=projectById(activeProjectId);if(!p)return;
    document.getElementById('paymentDialogHint').textContent=`Aktuell bezahlt: ${euro(paidTotal(p))} · Restbetrag: ${euro(remaining(p))} · Anzahlung offen: ${euro(depositRemaining(p))}`;
  }

  function savePayment(e){
    e.preventDefault();const p=projectById(activeProjectId);if(!p)return;const d=Object.fromEntries(new FormData(e.currentTarget).entries());const amount=Math.abs(Number(d.amount)||0);if(amount<=0)return;
    if(d.type==='Erstattung'&&amount>paidTotal(p)){alert('Die Erstattung kann nicht höher sein als der bisher bezahlte Betrag.');return;}
    if(d.type!=='Erstattung'&&amount>remaining(p)&&remaining(p)>0&&!confirm(`Der Betrag ist höher als der offene Restbetrag von ${euro(remaining(p))}. Trotzdem buchen?`))return;
    p.payments=p.payments||[];p.payments.push({id:'pay'+Date.now(),type:d.type,amount,date:d.date,method:d.method,note:d.note?.trim()||'',createdAt:new Date().toISOString()});
    persist();document.getElementById('paymentDialog').close();refreshCurrentCard(p.id);renderProjects();
  }

  function deletePayment(projectId,paymentId){
    const p=projectById(projectId);const tx=p?.payments?.find(x=>x.id===paymentId);if(!p||!tx)return;if(!confirm(`${tx.type} über ${euro(tx.amount)} wirklich aus der Historie löschen?`))return;
    p.payments=p.payments.filter(x=>x.id!==paymentId);persist();refreshCurrentCard(projectId);
  }

  function openPriceDialog(projectId){
    activeProjectId=projectId;const p=projectById(projectId);if(!p)return;const form=document.getElementById('priceForm');form.elements.price.value=projectPrice(p);form.elements.deposit.value=requiredDeposit(p);document.getElementById('priceDialogMeta').textContent=`${customerName(p.customerId)} · ${p.title}`;document.getElementById('priceDialog').showModal();
  }

  function savePrice(e){
    e.preventDefault();const p=projectById(activeProjectId);if(!p)return;const price=Math.max(0,Number(e.currentTarget.elements.price.value)||0);const deposit=Math.max(0,Number(e.currentTarget.elements.deposit.value)||0);
    if(deposit>price&&price>0&&!confirm('Die Anzahlung ist höher als der Gesamtpreis. Trotzdem speichern?'))return;
    p.price=price;p.deposit=deposit;persist();document.getElementById('priceDialog').close();refreshCurrentCard(p.id);renderProjects();
  }

  function updateDashboardPayments(){
    const openDeposits=state.projects.reduce((sum,p)=>sum+depositRemaining(p),0);
    const cards=[...document.querySelectorAll('.metric-card')];const card=cards.find(c=>c.textContent.includes('Offene Anzahlungen'));if(card){const strong=card.querySelector('strong');const small=card.querySelector('small');if(strong)strong.textContent=euro(openDeposits);const count=state.projects.filter(p=>depositRemaining(p)>0).length;if(small)small.textContent=`${count} Projekt${count===1?'':'e'}`;}
  }

  install();
})();
