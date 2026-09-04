/* TATNERA — marketing page interactions */
(function(){
  'use strict';

  const tabs=[...document.querySelectorAll('[data-showcase-tab]')];
  const screens=[...document.querySelectorAll('[data-showcase-screen]')];

  tabs.forEach(tab=>tab.addEventListener('click',()=>{
    const target=tab.dataset.showcaseTab;
    tabs.forEach(item=>item.classList.toggle('active',item===tab));
    screens.forEach(screen=>screen.classList.toggle('active',screen.dataset.showcaseScreen===target));
  }));

  const revealItems=[...document.querySelectorAll('.reveal')];
  if('IntersectionObserver' in window){
    const observer=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(!entry.isIntersecting)return;
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      });
    },{threshold:.12});
    revealItems.forEach(item=>observer.observe(item));
  }else{
    revealItems.forEach(item=>item.classList.add('visible'));
  }

  document.querySelectorAll('a[href^="#"]').forEach(link=>link.addEventListener('click',event=>{
    const id=link.getAttribute('href');
    if(id==='#')return;
    const target=document.querySelector(id);
    if(!target)return;
    event.preventDefault();
    target.scrollIntoView({behavior:'smooth',block:'start'});
  }));
})();