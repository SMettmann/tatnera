/* TATNERA — late-load premium studio design so it wins over dynamic theme CSS */
(function(){
  'use strict';
  const id='tatneraDesignPassCss';
  const href='design-pass.css?v=20260904-1';
  function load(){
    const old=document.getElementById(id);
    if(old&&old.getAttribute('href')===href)return;
    if(old)old.remove();
    const link=document.createElement('link');
    link.id=id;
    link.rel='stylesheet';
    link.href=href;
    document.head.appendChild(link);
  }
  load();
  document.addEventListener('tatnera:runtime-refresh',load);
})();
