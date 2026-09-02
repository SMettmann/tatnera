/* TATNERA — customer detail navigation
   Owns the stable list -> customer record interaction.
   The actual customer renderer stays in tatnera-runtime; this module guarantees
   that rerendered customer rows always open the customer record. */
(function(){
  'use strict';

  function openRecord(id){
    if(!id||typeof window.openCustomer!=='function')return false;
    const customer=window.TatneraCore?.getCustomer?.(id);
    if(!customer)return false;
    const view=document.getElementById('customer-detail');
    const root=document.getElementById('customerDetail');
    if(!view||!root)return false;
    window.openCustomer(id);
    return true;
  }

  document.addEventListener('click',event=>{
    const row=event.target instanceof Element?event.target.closest('#customerTableBody [data-customer-id]'):null;
    if(!row)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openRecord(row.dataset.customerId);
  },true);

  /* Keep keyboard access reliable as well. */
  document.addEventListener('keydown',event=>{
    if(!['Enter',' '].includes(event.key))return;
    const row=event.target instanceof Element?event.target.closest('#customerTableBody [data-customer-id]'):null;
    if(!row)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openRecord(row.dataset.customerId);
  },true);

  function prepareRows(){
    document.querySelectorAll('#customerTableBody [data-customer-id]').forEach(row=>{
      row.setAttribute('role','button');
      row.tabIndex=0;
      row.setAttribute('aria-label',`Kundenakte ${row.querySelector('.customer-cell strong')?.textContent?.trim()||'öffnen'}`);
    });
  }

  document.addEventListener('tatnera:data-changed',()=>requestAnimationFrame(prepareRows));
  document.addEventListener('tatnera:runtime-refresh',()=>requestAnimationFrame(prepareRows));
  requestAnimationFrame(prepareRows);

  window.TatneraCustomerDetail={open:openRecord,prepareRows};
})();