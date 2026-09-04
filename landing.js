/* TATNERA — marketing page interactions */
(function(){
  'use strict';

  const nav=document.querySelector('.nav-links');
  if(nav&&!nav.querySelector('a[href="#preise"]')){
    const priceLink=document.createElement('a');
    priceLink.href='#preise';
    priceLink.textContent='Preise';
    const faqLink=nav.querySelector('a[href="#faq"]');
    nav.insertBefore(priceLink,faqLink||null);
  }

  const trialNote=document.querySelector('.hero-copy .trial-note');
  if(trialNote&&!document.querySelector('.hero-price')){
    const heroPrice=document.createElement('div');
    heroPrice.className='hero-price';
    heroPrice.innerHTML='<span>Nach dem Test:</span><strong>19,99 € / Monat</strong><span>· nur bei aktiver Buchung</span>';
    trialNote.parentNode.insertBefore(heroPrice,trialNote);
  }

  const logoStrip=document.querySelector('.logo-strip');
  if(logoStrip&&!document.querySelector('.ink-identity')){
    const identity=document.createElement('section');
    identity.className='ink-identity';
    identity.innerHTML=`<div class="wrap ink-identity-inner">
      <div class="ink-identity-copy">
        <small>Studio Software mit Charakter</small>
        <strong>Nicht irgendeine Verwaltungssoftware.</strong>
        <p>TATNERA ist für Tattoo- und Piercing-Studios gebaut – vom Look bis zum Ablauf. Klar genug für den Alltag, aber mit genug Persönlichkeit, dass es sich nicht wie Buchhaltungssoftware anfühlt.</p>
      </div>
      <div class="ink-tools" aria-label="TATNERA Personalisierung">
        <div class="ink-tool"><em>◐</em><b>Layout wählen</b><span>Dunkel · Hell · Pink</span></div>
        <div class="ink-tool"><em>↖</em><b>Cursor wählen</b><span>Nadel · Standard · Rock Hand</span></div>
        <div class="ink-tool"><em>✦</em><b>Studio-Look</b><span>Persönlich statt austauschbar</span></div>
      </div>
    </div>`;
    logoStrip.insertAdjacentElement('afterend',identity);
  }

  const trialSection=document.querySelector('.trial-box')?.closest('.section');
  if(trialSection&&!document.getElementById('preise')){
    const pricing=document.createElement('section');
    pricing.className='section pricing-section';
    pricing.id='preise';
    pricing.innerHTML=`
      <div class="wrap">
        <div class="pricing-card reveal">
          <div>
            <span class="eyebrow">Klare Kosten nach dem Test</span>
            <h2>Erst 14 Tage kostenlos. Danach 19,99 € im Monat.</h2>
            <p>Wenn TATNERA zu deinem Studio passt, entscheidest du dich nach der Testphase aktiv für die weitere Nutzung. Ohne automatische Verlängerung und ohne versteckte Preisstaffelung.</p>
            <div class="price-facts">
              <span>14 Tage kostenlos testen</span>
              <span>keine Zahlungsdaten zum Start</span>
              <span>keine automatische Verlängerung</span>
            </div>
            <div class="pricing-action">
              <a class="btn primary large" href="app.html?mode=signup">14 Tage kostenlos testen →</a>
              <span class="price-hint">Kostenpflichtig erst nach deiner aktiven Entscheidung.</span>
            </div>
          </div>
          <div class="price-display">
            <span class="price-label">Danach monatlich</span>
            <strong>19,99 €</strong>
            <small>pro Studio</small>
          </div>
        </div>
      </div>`;
    trialSection.parentNode.insertBefore(pricing,trialSection);
  }

  const faq=document.querySelector('.faq');
  if(faq&&!faq.querySelector('[data-price-faq]')){
    const item=document.createElement('details');
    item.dataset.priceFaq='true';
    item.innerHTML='<summary>Was kostet TATNERA nach den 14 Tagen?</summary><p>Nach der kostenlosen Testphase kostet TATNERA 19,99 € pro Monat. Eine kostenpflichtige Nutzung startet nur, wenn du dich aktiv dafür entscheidest.</p>';
    const second=faq.children[1];
    faq.insertBefore(item,second?second.nextSibling:null);
  }

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