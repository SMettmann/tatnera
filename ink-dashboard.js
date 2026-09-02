/* TATNERA — ink styling + dashboard expiry warning */
(function(){
  function ensureCss(href){if(document.querySelector(`link[href="${href}"]`))return;const link=document.createElement('link');link.rel='stylesheet';link.href=href;document.head.appendChild(link);}
  ensureCss('ink.css');
  ensureCss('ink-dashboard.css');

  function esc(value){return String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));}
  function daysUntil(value){if(!value)return Infinity;const now=new Date();now.setHours(0,0,0,0);const date=new Date(value+'T23:59:59');return Math.ceil((date-now)/86400000);}
  function formatDate(value){if(!value)return'—';return new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(value+'T12:00:00'));}
  function label(ink){return `${ink.manufacturer||''} ${ink.name||''}`.trim()||'Farbe';}

  function inkData(){
    const inks=Array.isArray(state.inks)?state.inks:[];
    const withExpiry=inks.filter(ink=>ink.expiryDate).map(ink=>({...ink,_days:daysUntil(ink.expiryDate)}));
    const expired=withExpiry.filter(ink=>ink._days<0).sort((a,b)=>a._days-b._days);
    const upcoming=withExpiry.filter(ink=>ink._days>=0).sort((a,b)=>a._days-b._days);
    const soon=upcoming.filter(ink=>ink._days<=60);
    return {inks,expired,upcoming,soon,next:upcoming[0]||null};
  }

  function ensureCard(){
    const grid=document.querySelector('#dashboard .cockpit-grid');if(!grid)return null;
    let card=document.getElementById('dashboardInkAlert');
    if(!card){card=document.createElement('section');card.id='dashboardInkAlert';card.className='panel cockpit-ink-alert';grid.prepend(card);}
    return card;
  }

  function nextHtml(next){
    if(!next)return `<span>Nächster Ablauf</span><strong>Kein Ablaufdatum hinterlegt</strong><small>Unter Farben & Chargen ergänzen</small>`;
    const dayText=next._days===0?'heute':next._days===1?'morgen':`in ${next._days} Tagen`;
    return `<span>Nächster Ablauf</span><strong>${esc(label(next))} · ${esc(next.batch||'ohne Charge')}</strong><small>${esc(formatDate(next.expiryDate))} · ${esc(dayText)}</small>`;
  }

  function render(){
    const card=ensureCard();if(!card)return;
    const data=inkData();
    if(!data.inks.length){card.hidden=true;return;}
    card.hidden=false;

    let severity='ok',title='Farben & Chargen im Blick',text='Keine Charge läuft innerhalb der nächsten 60 Tage ab.',icon='✓';
    if(data.expired.length){
      severity='expired';icon='!';
      const first=data.expired[0];
      title=`${data.expired.length} Charge${data.expired.length===1?' ist':'n sind'} abgelaufen`;
      text=`${label(first)} · Charge ${first.batch||'—'} · abgelaufen am ${formatDate(first.expiryDate)}${data.expired.length>1?` · plus ${data.expired.length-1} weitere`:''}`;
    }else if(data.soon.length){
      severity='soon';icon='!';
      const first=data.soon[0];
      title=`${data.soon.length} Charge${data.soon.length===1?' läuft':'n laufen'} bald ab`;
      text=`${label(first)} · Charge ${first.batch||'—'} · Ablauf ${formatDate(first.expiryDate)} · in ${first._days} Tagen`;
    }

    card.className=`panel cockpit-ink-alert ${severity}`;
    card.innerHTML=`<div class="ink-alert-inner"><div class="ink-alert-main"><div class="ink-alert-copy"><div class="ink-alert-icon">${icon}</div><div><span class="eyebrow">Farben & Chargen</span><h3>${esc(title)}</h3><p>${esc(text)}</p></div></div><button type="button" class="ink-alert-action" data-open-ink-settings>Chargen prüfen →</button></div><div class="ink-alert-next">${nextHtml(data.next)}</div></div>`;
    card.querySelector('[data-open-ink-settings]')?.addEventListener('click',()=>{
      navigate('settings');
      setTimeout(()=>document.querySelector('.ink-settings')?.scrollIntoView({behavior:'smooth',block:'start'}),30);
    });
  }

  const previousPersist=persist;
  persist=function(){previousPersist();queueMicrotask(render);};
  const previousNavigate=navigate;
  navigate=function(view){previousNavigate(view);if(view==='dashboard')queueMicrotask(render);};

  render();
})();
