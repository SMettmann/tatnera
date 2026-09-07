/* TATNERA — visually highlight sent appointment communication */
(function(){
  'use strict';
  if(window.__tatneraCommunicationGreenInstalled)return;
  window.__tatneraCommunicationGreenInstalled=true;

  function installStyle(){
    if(document.getElementById('tatneraCommunicationGreenStyle'))return;
    const style=document.createElement('style');
    style.id='tatneraCommunicationGreenStyle';
    style.textContent=`
      .appointment-communication-item.tatnera-communication-sent{
        background:#e8f6ec!important;
        border-color:#7fbc91!important;
        box-shadow:inset 0 0 0 1px rgba(53,108,75,.08)!important;
      }
      .appointment-communication-item.tatnera-communication-sent>strong{
        color:#245f39!important;
      }
      .appointment-communication-item.tatnera-communication-sent>small{
        display:inline-flex!important;
        align-items:center!important;
        width:max-content!important;
        margin-top:6px!important;
        padding:5px 8px!important;
        border-radius:999px!important;
        background:#2f7d49!important;
        color:#fff!important;
        font-weight:800!important;
      }
      :root[data-theme="dark"] .appointment-communication-item.tatnera-communication-sent,
      :root[data-theme="pink"] .appointment-communication-item.tatnera-communication-sent{
        background:rgba(47,125,73,.20)!important;
        border-color:#4f9d68!important;
      }
      :root[data-theme="dark"] .appointment-communication-item.tatnera-communication-sent>strong,
      :root[data-theme="pink"] .appointment-communication-item.tatnera-communication-sent>strong{
        color:#9ae0ae!important;
      }
    `;
    document.head.appendChild(style);
  }

  function sync(){
    document.querySelectorAll('.appointment-communication-item').forEach(item=>{
      const status=String(item.querySelector('small')?.textContent||'').trim().toLowerCase();
      const sent=status.startsWith('gesendet');
      item.classList.toggle('tatnera-communication-sent',sent);
      if(sent){
        const small=item.querySelector('small');
        if(small&&!small.textContent.trim().startsWith('✓'))small.textContent='✓ '+small.textContent.trim();
      }
    });
  }

  installStyle();
  const observer=new MutationObserver(()=>queueMicrotask(sync));
  observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
  document.addEventListener('tatnera:data-changed',()=>setTimeout(sync,0));
  document.addEventListener('tatnera:runtime-refresh',()=>setTimeout(sync,0));
  setTimeout(sync,0);
  setTimeout(sync,500);
})();
