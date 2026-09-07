/* TATNERA first-start tutorial */
(function(){
  'use strict';
  if(window.__tatneraOnboardingInstalled)return;
  window.__tatneraOnboardingInstalled=true;

  let active=false,index=0,userKey='guest',overlay=null,card=null,highlighted=null;
  const steps=[
    {view:'dashboard',title:'Willkommen bei TATNERA 👋',text:'In rund 2 Minuten zeigen wir dir die wichtigsten Bereiche. Du kannst die Einführung jederzeit überspringen und später erneut starten.',target:'.tatnera-logo-img'},
    {view:'settings',title:'1. Studio einrichten',text:'Hier hinterlegst du Studio-Daten, Artists, Erscheinungsbild und alles, was zu deinem Studio gehört.',target:'[data-view="settings"]'},
    {view:'customers',title:'2. Kunden verwalten',text:'Lege Kunden an und öffne ihre komplette Historie mit Tattoo-Akten, Terminen und weiteren Informationen.',target:'[data-view="customers"]'},
    {view:'projects',title:'3. Tattoo-Akten',text:'Für jedes Tattoo entsteht eine eigene Akte. Motiv, Körperstelle, Sessions, Bilder, Einwilligungen und Zahlungen bleiben sauber zusammen.',target:'[data-view="projects"]'},
    {view:'calendar',title:'4. Termine & Kalender',text:'Plane Beratungen, Tattoo-Sessions und weitere Termine direkt im Kalender und behalte den Studioalltag im Blick.',target:'[data-view="calendar"]'},
    {view:'requests',title:'5. Anfragen',text:'Neue Kundenanfragen landen hier und können Schritt für Schritt bis zum Termin weitergeführt werden.',target:'[data-view="requests"]'},
    {view:'invoices',title:'6. Rechnungen & Zahlungen',text:'Hier findest du Rechnungen, Zahlungen und offene Beträge. Die Finanzfunktionen bauen direkt auf deinen Kunden und Tattoo-Akten auf.',target:'[data-view="invoices"]'},
    {view:'dashboard',title:'Fertig – du kannst loslegen ✦',text:'Auf dem Dashboard siehst du anschließend nur das, was für den Studioalltag wichtig ist. Am besten startest du jetzt mit deinem Studio und dem ersten Kunden.',target:'#dashboard'}
  ];

  function key(){return `tatnera_onboarding_done_${userKey}`;}
  function done(){try{return localStorage.getItem(key())==='1';}catch(_){return false;}}
  function markDone(){try{localStorage.setItem(key(),'1');}catch(_){}}

  function installStyle(){
    if(document.getElementById('tatneraOnboardingStyle'))return;
    const s=document.createElement('style');s.id='tatneraOnboardingStyle';s.textContent=`
      .tatnera-onboarding-overlay{position:fixed;inset:0;background:rgba(8,8,10,.62);z-index:2147483000;pointer-events:auto}.tatnera-onboarding-card{position:fixed;z-index:2147483002;width:min(430px,calc(100vw - 28px));background:var(--panel,#18181b);color:var(--text,#fff);border:1px solid rgba(255,255,255,.13);border-radius:18px;padding:20px;box-shadow:0 24px 70px rgba(0,0,0,.45)}.tatnera-onboarding-card h3{font-size:21px;margin:0 0 8px}.tatnera-onboarding-card p{margin:0;color:var(--muted,#aaa);line-height:1.55}.tatnera-onboarding-progress{display:flex;gap:6px;margin:15px 0}.tatnera-onboarding-progress i{height:4px;flex:1;border-radius:999px;background:rgba(255,255,255,.14)}.tatnera-onboarding-progress i.on{background:#c59a54}.tatnera-onboarding-actions{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-top:17px}.tatnera-onboarding-actions-right{display:flex;gap:8px}.tatnera-onboarding-card button{cursor:pointer}.tatnera-onboarding-skip{border:0;background:transparent;color:var(--muted,#aaa);padding:8px 2px}.tatnera-onboarding-highlight{position:relative!important;z-index:2147483001!important;box-shadow:0 0 0 4px rgba(197,154,84,.95),0 0 0 10px rgba(197,154,84,.22)!important;border-radius:12px!important}.tatnera-onboarding-restart{margin-top:14px}@media(max-width:760px){.tatnera-onboarding-card{left:14px!important;right:14px!important;bottom:86px!important;top:auto!important;width:auto}.tatnera-onboarding-highlight{z-index:2147483001!important}}
    `;document.head.appendChild(s);
  }

  function navigate(view){
    if(!view)return;
    try{if(typeof window.navigate==='function')window.navigate(view);}catch(_){}
    const section=document.getElementById(view);
    if(section&&!section.classList.contains('active-view')){
      document.querySelectorAll('.view').forEach(v=>v.classList.remove('active-view'));
      section.classList.add('active-view');
    }
    document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.view===view));
    const title=document.getElementById('pageTitle');
    const labels={dashboard:'Dashboard',settings:'Einstellungen',customers:'Kunden',projects:'Tattoo-Akten',calendar:'Kalender',requests:'Anfragen',invoices:'Rechnungen'};
    if(title&&labels[view])title.textContent=labels[view];
  }

  function clearHighlight(){if(highlighted){highlighted.classList.remove('tatnera-onboarding-highlight');highlighted=null;}}

  function positionCard(target){
    if(!card)return;
    if(matchMedia('(max-width:760px)').matches){card.style.left='14px';card.style.top='auto';card.style.bottom='86px';return;}
    const w=430,gap=18,margin=18;
    if(!target){card.style.left=`calc(50% - ${w/2}px)`;card.style.top='24%';return;}
    const r=target.getBoundingClientRect();
    let left=r.right+gap,top=Math.max(margin,Math.min(r.top,innerHeight-card.offsetHeight-margin));
    if(left+w>innerWidth-margin)left=Math.max(margin,r.left-w-gap);
    if(r.width>innerWidth*.55||r.height>innerHeight*.45){left=Math.max(margin,(innerWidth-w)/2);top=Math.max(margin,innerHeight-card.offsetHeight-margin-24);}
    card.style.left=`${left}px`;card.style.top=`${top}px`;card.style.bottom='auto';
  }

  function render(){
    if(!active)return;
    clearHighlight();
    const step=steps[index];navigate(step.view);
    setTimeout(()=>{
      let target=document.querySelector(step.target);
      if(target&&target.offsetParent!==null){highlighted=target;target.classList.add('tatnera-onboarding-highlight');try{target.scrollIntoView({block:'center',behavior:'smooth'});}catch(_){}}
      card.innerHTML=`<h3>${step.title}</h3><p>${step.text}</p><div class="tatnera-onboarding-progress">${steps.map((_,i)=>`<i class="${i<=index?'on':''}"></i>`).join('')}</div><div class="tatnera-onboarding-actions"><button type="button" class="tatnera-onboarding-skip" data-onboarding-skip>Überspringen</button><div class="tatnera-onboarding-actions-right">${index>0?'<button type="button" class="btn ghost" data-onboarding-back>Zurück</button>':''}<button type="button" class="btn primary" data-onboarding-next>${index===steps.length-1?'Loslegen':'Weiter'}</button></div></div>`;
      positionCard(target);
    },90);
  }

  function start(force){
    if(active||(!force&&done())||document.body.classList.contains('tatnera-auth-locked'))return;
    active=true;index=0;
    overlay=document.createElement('div');overlay.className='tatnera-onboarding-overlay';overlay.id='tatneraOnboardingOverlay';
    card=document.createElement('div');card.className='tatnera-onboarding-card';card.id='tatneraOnboardingCard';
    document.body.append(overlay,card);
    card.addEventListener('click',e=>{if(e.target.closest('[data-onboarding-skip]'))finish();if(e.target.closest('[data-onboarding-back]')){index=Math.max(0,index-1);render();}if(e.target.closest('[data-onboarding-next]')){if(index>=steps.length-1)finish();else{index++;render();}}});
    render();
  }

  function finish(){markDone();active=false;clearHighlight();overlay?.remove();card?.remove();overlay=card=null;navigate('dashboard');}

  function addRestart(){
    const settings=document.getElementById('settings');if(!settings||settings.querySelector('[data-onboarding-restart]'))return;
    const host=settings.querySelector('.placeholder-page')||settings;
    const b=document.createElement('button');b.type='button';b.className='btn ghost tatnera-onboarding-restart';b.dataset.onboardingRestart='1';b.textContent='Einführung erneut starten';b.addEventListener('click',()=>start(true));host.appendChild(b);
  }

  async function authReady(){
    try{const api=window.supabase?.createClient?.('https://ayxvspeufbsoxtccaqap.supabase.co','sb_publishable_g8Z9qVH3GSJHHkbuT-ne5A_0IfhKJz1');const {data:{user}}=api?await api.auth.getUser():{data:{user:null}};if(user?.id)userKey=user.id;}catch(_){}
    addRestart();setTimeout(()=>start(false),650);
  }

  installStyle();window.TatneraOnboarding={start:()=>start(true),finish};
  document.addEventListener('tatnera:auth-ready',authReady);
  document.addEventListener('tatnera:runtime-refresh',addRestart);
  addEventListener('resize',()=>{if(active)positionCard(highlighted);});
  if(document.readyState!=='loading')setTimeout(()=>{addRestart();if(!document.body.classList.contains('tatnera-auth-locked'))authReady();},700);else document.addEventListener('DOMContentLoaded',()=>setTimeout(addRestart,500),{once:true});
})();
