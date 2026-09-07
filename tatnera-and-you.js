/* TATNERA & Du — feedback and referral area */
(function(){
  'use strict';
  if(window.__tatneraAndYouInstalled)return;
  window.__tatneraAndYouInstalled=true;

  function installStyles(){
    if(document.getElementById('tatneraAndYouStyle'))return;
    const style=document.createElement('style');style.id='tatneraAndYouStyle';style.textContent=`
      .tatnera-you-nav{margin-top:8px}.tatnera-you-view{max-width:980px}.tatnera-you-head{margin-bottom:22px}.tatnera-you-head h2{margin:4px 0 6px}.tatnera-you-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.tatnera-you-card{padding:22px;border:1px solid var(--line);border-radius:16px;background:var(--panel);box-shadow:var(--shadow-sm)}.tatnera-you-icon{font-size:25px;margin-bottom:10px}.tatnera-you-card h3{margin:0 0 7px;font-size:18px}.tatnera-you-card p{margin:0 0 16px;color:var(--muted);line-height:1.5}.tatnera-you-form{display:grid;gap:10px}.tatnera-you-form input,.tatnera-you-form textarea{width:100%;border:1px solid var(--line);border-radius:10px;background:var(--panel-2);color:var(--text);padding:11px;font:inherit}.tatnera-you-form textarea{min-height:110px;resize:vertical}.tatnera-you-note{font-size:10px;color:var(--muted);margin-top:10px!important}.tatnera-you-success{display:none;margin-top:10px;padding:9px 11px;border-radius:10px;background:#e8f6ec;color:#245f39;font-weight:800}.tatnera-you-success.show{display:block}.tatnera-you-referral{display:flex;gap:8px}.tatnera-you-referral input{flex:1}.tatnera-you-status{margin-top:15px;padding:12px;border-radius:12px;background:var(--panel-2)}.tatnera-you-status strong,.tatnera-you-status span{display:block}.tatnera-you-status span{margin-top:3px;color:var(--muted);font-size:11px}@media(max-width:760px){.tatnera-you-grid{grid-template-columns:1fr}.tatnera-you-referral{flex-direction:column}}
    `;document.head.appendChild(style);
  }

  function referralCode(){
    try{let code=localStorage.getItem('tatnera_referral_code');if(code)return code;code='TAT-'+Math.random().toString(36).slice(2,8).toUpperCase();localStorage.setItem('tatnera_referral_code',code);return code;}catch(_e){return 'TATNERA';}
  }

  function build(){
    if(document.getElementById('tatnera-you'))return;
    const settings=document.getElementById('settings');if(!settings)return;
    const section=document.createElement('section');section.id='tatnera-you';section.className='view tatnera-you-view';section.innerHTML=`
      <div class="tatnera-you-head"><span class="eyebrow">TATNERA & DU</span><h2>Gemeinsam besser</h2><p class="muted">Deine Ideen helfen uns, TATNERA weiterzuentwickeln. Und wenn du TATNERA weiterempfiehlst, soll sich das für dich lohnen.</p></div>
      <div class="tatnera-you-grid">
        <article class="tatnera-you-card"><div class="tatnera-you-icon">💡</div><h3>Verbesserung vorschlagen</h3><p>Fehlt dir etwas im Studioalltag oder hast du eine Idee, die TATNERA besser machen würde? Schick sie uns direkt.</p><form class="tatnera-you-form" id="tatneraSuggestionForm"><input name="title" required maxlength="100" placeholder="Kurzer Titel deiner Idee"><textarea name="details" required maxlength="1500" placeholder="Was sollten wir verbessern oder ergänzen?"></textarea><button class="btn primary" type="submit">Vorschlag senden</button></form><div class="tatnera-you-success" id="tatneraSuggestionSuccess">✓ Vorschlag gespeichert – danke fürs Mitgestalten.</div><p class="tatnera-you-note">Später siehst du hier auch den Status: Eingegangen → Wird geprüft → Geplant → Umgesetzt.</p></article>
        <article class="tatnera-you-card"><div class="tatnera-you-icon">🤝</div><h3>Freund werben</h3><p>Empfiehl TATNERA einem anderen Studio. Sobald daraus ein zahlender Kunde wird, können wir dir den Bonus gutschreiben.</p><label class="tatnera-you-form"><span>Dein Empfehlungscode</span><div class="tatnera-you-referral"><input id="tatneraReferralCode" readonly value="${referralCode()}"><button type="button" class="btn ghost" id="tatneraCopyReferral">Kopieren</button></div></label><div class="tatnera-you-status"><strong>0 erfolgreiche Empfehlungen</strong><span>Bonus-System wird mit dem Zahlungsbereich aktiviert.</span></div><p class="tatnera-you-note">Die automatische Zuordnung und Gratismonate koppeln wir später an Stripe. Der Bereich ist dafür bereits vorbereitet.</p></article>
      </div>`;
    settings.insertAdjacentElement('afterend',section);

    const nav=document.querySelector('.sidebar-bottom');if(nav&&!nav.querySelector('[data-view="tatnera-you"]')){
      const button=document.createElement('button');button.type='button';button.className='nav-item tatnera-you-nav';button.dataset.view='tatnera-you';button.innerHTML='<span>♡</span> TATNERA & Du';nav.insertBefore(button,nav.firstChild);
    }

    section.querySelector('#tatneraSuggestionForm')?.addEventListener('submit',event=>{
      event.preventDefault();const form=event.currentTarget,data=new FormData(form),item={id:'idea-'+Date.now(),title:String(data.get('title')||''),details:String(data.get('details')||''),status:'Eingegangen',createdAt:new Date().toISOString()};
      try{const items=JSON.parse(localStorage.getItem('tatnera_suggestions')||'[]');items.unshift(item);localStorage.setItem('tatnera_suggestions',JSON.stringify(items));}catch(_e){}
      form.reset();section.querySelector('#tatneraSuggestionSuccess')?.classList.add('show');
    });
    section.querySelector('#tatneraCopyReferral')?.addEventListener('click',async event=>{const code=section.querySelector('#tatneraReferralCode')?.value||'';try{await navigator.clipboard.writeText(code);event.currentTarget.textContent='Kopiert ✓';setTimeout(()=>event.currentTarget.textContent='Kopieren',1300);}catch(_e){}});
  }

  installStyles();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build,{once:true});else build();
})();
