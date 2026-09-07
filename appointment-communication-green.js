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
        background:#e3f5e8!important;
        border:2px solid #4f9d68!important;
        box-shadow:0 0 0 1px rgba(47,125,73,.05)!important;
      }
      .appointment-communication-item.tatnera-communication-sent>strong{
        color:#1f5d35!important;
      }
      .appointment-communication-item.tatnera-communication-sent>small{
        display:inline-flex!important;
        align-items:center!important;
        width:max-content!important;
        margin-top:7px!important;
        padding:6px 10px!important;
        border-radius:8px!important;
        background:#2f7d49!important;
        color:#fff!important;
        font-weight:900!important;
        line-height:1.2!important;
      }
      :root[data-theme="dark"] .appointment-communication-item.tatnera-communication-sent,
      :root[data-theme="pink"] .appointment-communication-item.tatnera-communication-sent{
        background:rgba(47,125,73,.24)!important;
        border-color:#5bb576!important;
      }
      :root[data-theme="dark"] .appointment-communication-item.tatnera-communication-sent>strong,
      :root[data-theme="pink"] .appointment-communication-item.tatnera-communication-sent>strong{
        color:#a7e8ba!important;
      }
      :root[data-theme="dark"] .appointment-communication-item.tatnera-communication-sent>small,
      :root[data-theme="pink"] .appointment-communication-item.tatnera-communication-sent>small{
        background:#3a9458!important;
        color:#fff!important;
      }
    `;
    document.head.appendChild(style);
  }

  function sync(){
    document.querySelectorAll('.appointment-communication-item').forEach(item=>{
      const small=item.querySelector('small');
      const raw=String(small?.textContent||'').trim();
      const status=raw.replace(/^✓\s*/,'').trim().toLowerCase();
      const sent=status.startsWith('gesendet');
      item.classList.toggle('tatnera-communication-sent',sent);
      if(sent&&small&&!raw.startsWith('✓'))small.textContent='✓ '+raw;
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
