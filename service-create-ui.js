/* TATNERA — separate Tattoo / Piercing entry points + dashboard service split */
(function(){
  'use strict';

  const Core=window.TatneraCore;
  if(!Core)return;

  function installStyle(){
    if(document.getElementById('serviceCreateUiStyle'))return;
    const style=document.createElement('style');
    style.id='serviceCreateUiStyle';
    style.textContent=`
      .service-type-picker{display:none!important}
      .service-create-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
      .service-create-piercing{white-space:nowrap}
      .today-service-split{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:2px 0 14px}
      .today-service-card{appearance:none;width:100%;text-align:left;border:1px solid var(--line);border-radius:11px;background:var(--panel-2);color:var(--text);padding:11px 12px;cursor:pointer}
      .today-service-card:hover{border-color:rgba(115,130,90,.48)}
      .today-service-card span,.today-service-card strong,.today-service-card small{display:block}
      .today-service-card span{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:var(--muted)}
      .today-service-card strong{font-size:20px;line-height:1;margin-top:6px}
      .today-service-card small{font-size:9px;color:var(--muted);margin-top:4px}
      .today-service-card.piercing strong{font-size:20px}
      @media(max-width:760px){.service-create-actions{width:100%}.service-create-actions .btn{flex:1}.today-service-split{grid-template-columns:1fr 1fr}}
    `;
    document.head.appendChild(style);
  }

  function selectService(serviceType){
    const form=document.getElementById('projectForm');
    if(!form)return;
    const target=form.querySelector(`[name="serviceType"][value="${serviceType==='piercing'?'piercing':'tattoo'}"]`);
    if(!target)return;
    target.checked=true;
    target.dispatchEvent(new Event('change',{bubbles:true}));
  }

  function wrapProjectDialog(){
    if(window.__tatneraServiceDialogWrapped||typeof openProjectDialog!=='function')return;
    window.__tatneraServiceDialogWrapped=true;
    const previous=openProjectDialog;
    openProjectDialog=function(customerId='',serviceType='tattoo'){
      previous(customerId);
      requestAnimationFrame(()=>selectService(serviceType));
    };
  }

  function ensureCreateButtons(){
    const quick=document.getElementById('quickProjectBtn');
    if(quick){
      quick.textContent='+ Neues Tattoo';
      if(!document.getElementById('quickPiercingBtn')){
        const piercing=document.createElement('button');
        piercing.type='button';piercing.id='quickPiercingBtn';piercing.className='btn primary service-create-piercing';piercing.textContent='+ Neues Piercing';
        quick.insertAdjacentElement('afterend',piercing);
        piercing.addEventListener('click',()=>openProjectDialog('','piercing'));
      }
    }

    const add=document.getElementById('addProjectBtn');
    if(add){
      add.textContent='+ Neues Tattoo';
      let actions=add.closest('.service-create-actions');
      if(!actions){
        actions=document.createElement('div');actions.className='service-create-actions';
        add.parentElement?.insertBefore(actions,add);actions.appendChild(add);
      }
      if(!document.getElementById('addPiercingBtn')){
        const piercing=document.createElement('button');
        piercing.type='button';piercing.id='addPiercingBtn';piercing.className='btn primary service-create-piercing';piercing.textContent='+ Neues Piercing';
        actions.appendChild(piercing);
        piercing.addEventListener('click',()=>openProjectDialog('','piercing'));
      }
    }
  }

  function ensureCustomerButtons(){
    document.querySelectorAll('[data-customer-new-tattoo]').forEach(tattoo=>{
      tattoo.textContent='+ Neues Tattoo';
      const actions=tattoo.closest('.customer-primary-actions');if(!actions)return;
      const customerId=tattoo.dataset.customerNewTattoo||document.getElementById('customerDetail')?.dataset.customerId||'';
      if(actions.querySelector('[data-customer-new-piercing]'))return;
      const piercing=document.createElement('button');
      piercing.type='button';piercing.className='btn ghost';piercing.dataset.customerNewPiercing=customerId;piercing.textContent='+ Neues Piercing';
      tattoo.insertAdjacentElement('afterend',piercing);
      piercing.addEventListener('click',()=>openProjectDialog(customerId,'piercing'));
    });
  }

  function uniqueCustomers(events){
    return new Set(events.map(event=>event.customerId).filter(Boolean)).size;
  }

  function renderTodaySplit(){
    const panel=document.querySelector('#dashboard .cockpit-today');
    const timeline=panel?.querySelector('#todayAppointments');
    if(!panel||!timeline)return;
    let split=panel.querySelector('.today-service-split');
    if(!split){split=document.createElement('div');split.className='today-service-split';timeline.insertAdjacentElement('beforebegin',split);}
    const today=typeof todayISO==='function'?todayISO():new Date().toISOString().slice(0,10);
    const events=(state.calendarEvents||[]).filter(event=>event.date===today);
    const tattooCount=uniqueCustomers(events.filter(event=>['tattoo','touchup'].includes(event.type)));
    const piercingCount=uniqueCustomers(events.filter(event=>event.type==='piercing'));
    split.innerHTML=`<button type="button" class="today-service-card tattoo" data-today-service="tattoo"><span>Tattoo heute</span><strong>${tattooCount}</strong><small>${tattooCount===1?'Kunde':'Kunden'}</small></button><button type="button" class="today-service-card piercing" data-today-service="piercing"><span>Piercing heute</span><strong>${piercingCount}</strong><small>${piercingCount===1?'Kunde':'Kunden'}</small></button>`;
    split.querySelectorAll('[data-today-service]').forEach(button=>button.addEventListener('click',()=>{if(typeof navigate==='function')navigate('calendar');}));
  }

  function refresh(){
    installStyle();
    wrapProjectDialog();
    ensureCreateButtons();
    ensureCustomerButtons();
    renderTodaySplit();
  }

  refresh();
  document.addEventListener('tatnera:runtime-refresh',()=>setTimeout(refresh,0));
  document.addEventListener('tatnera:customer-opened',()=>setTimeout(ensureCustomerButtons,0));
  document.addEventListener('tatnera:data-changed',()=>setTimeout(()=>{ensureCreateButtons();ensureCustomerButtons();renderTodaySplit();},0));
  document.addEventListener('tatnera:auth-ready',()=>setTimeout(refresh,300));
})();
