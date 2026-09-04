/* TATNERA — late-load premium studio design so it wins over dynamic theme CSS */
(function(){
  'use strict';

  const LOGO_SRC='assets/tatnera-brand.png?v=20260904-1';
  const styles=[
    {id:'tatneraDesignPassCss',href:'design-pass.css?v=20260904-2'},
    {id:'tatneraTattooIdentityCss',href:'tattoo-identity.css?v=20260904-1'},
    {id:'tatneraSidebarFullheightCss',href:'sidebar-fullheight.css?v=20260904-1'},
    {id:'tatneraTattooPaletteCss',href:'tattoo-palette.css?v=20260904-2'},
    {id:'tatneraBrandLogoCss',href:'brand-logo.css?v=20260904-5'}
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

  function makeLogo(){
    const img=document.createElement('img');
    img.className='tatnera-logo-img';
    img.src=LOGO_SRC;
    img.alt='TATNERA Studio Software';
    img.width=220;
    img.height=101;
    img.loading='eager';
    img.decoding='sync';
    try{img.fetchPriority='high';}catch(_error){}
    return img;
  }

  function replaceWithLogo(node){
    if(!node)return;
    let img=node.querySelector('.tatnera-logo-img');
    if(!img){node.replaceChildren(makeLogo());return;}
    if(img.getAttribute('src')!==LOGO_SRC)img.setAttribute('src',LOGO_SRC);
  }

  function installLogos(){
    replaceWithLogo(document.querySelector('.sidebar .brand-wrap'));
    replaceWithLogo(document.querySelector('.tatnera-auth-brand'));
    replaceWithLogo(document.querySelector('.tatnera-auth-boot-mark'));
  }

  function load(){styles.forEach(ensureStyle);installLogos();}

  load();
  document.addEventListener('DOMContentLoaded',load,{once:true});
  document.addEventListener('tatnera:runtime-refresh',load);
  document.addEventListener('tatnera:auth-ready',installLogos);

  const observer=new MutationObserver(()=>installLogos());
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();
