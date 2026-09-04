/* TATNERA — late-load premium studio design so it wins over dynamic theme CSS */
(function(){
  'use strict';
  const styles=[
    {id:'tatneraDesignPassCss',href:'design-pass.css?v=20260904-2'},
    {id:'tatneraTattooIdentityCss',href:'tattoo-identity.css?v=20260904-1'},
    {id:'tatneraSidebarFullheightCss',href:'sidebar-fullheight.css?v=20260904-1'},
    {id:'tatneraTattooPaletteCss',href:'tattoo-palette.css?v=20260904-1'}
  ];

  function ensureStyle(item){
    const old=document.getElementById(item.id);
    if(old&&old.getAttribute('href')===item.href)return;
    if(old)old.remove();
    const link=document.createElement('link');
    link.id=item.id;
    link.rel='stylesheet';
    link.href=item.href;
    document.head.appendChild(link);
  }

  function load(){styles.forEach(ensureStyle);}
  load();
  document.addEventListener('tatnera:runtime-refresh',load);
})();
