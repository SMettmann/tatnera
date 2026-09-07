/* TATNERA — keep the customer search input focused while filtering */
(function(){
  'use strict';
  if(window.__tatneraCustomerSearchFocusFix)return;
  window.__tatneraCustomerSearchFocusFix=true;

  let token=0;
  function restore(input,start,end){
    if(!input||!input.isConnected||document.getElementById('customers')?.classList.contains('active-view')!==true)return;
    if(document.activeElement!==input)input.focus({preventScroll:true});
    try{input.setSelectionRange(start,end);}catch(_error){}
  }

  document.addEventListener('input',event=>{
    const input=event.target;
    if(!(input instanceof HTMLInputElement)||input.id!=='customerSearch')return;
    const current=++token;
    const start=input.selectionStart??input.value.length;
    const end=input.selectionEnd??start;
    queueMicrotask(()=>{if(current===token)restore(input,start,end);});
    requestAnimationFrame(()=>{if(current===token)restore(input,start,end);});
    setTimeout(()=>{if(current===token)restore(input,start,end);},40);
  },true);
})();
