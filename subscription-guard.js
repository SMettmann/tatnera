/* TATNERA — studio trial status & expiry UI */
(function(){
  'use strict';

  const DAY=24*60*60*1000;
  const MIN_RECHECK_MS=60000;
  let running=false;
  let lastCheck=0;

  function installStyles(){
    if(document.getElementById('tatneraSubscriptionStyles'))return;
    const style=document.createElement('style');
    style.id='tatneraSubscriptionStyles';
    style.textContent=`
      .tatnera-trial-badge{display:inline-flex;align-items:center;gap:7px;border:1px solid #3c4327;background:#1a1d13;color:#d8ff63;border-radius:999px;padding:8px 10px;font-size:11px;font-weight:850;white-space:nowrap}
      .tatnera-trial-badge:before{content:'';width:7px;height:7px;border-radius:50%;background:#d8ff63;box-shadow:0 0 12px rgba(216,255,99,.55)}
      .tatnera-subscription-overlay{position:fixed;inset:0;z-index:100000;background:rgba(9,9,10,.94);backdrop-filter:blur(14px);display:grid;place-items:center;padding:22px}
      .tatnera-subscription-card{width:min(590px,100%);border:1px solid #34343a;background:#151518;color:#f6f3ef;border-radius:24px;padding:30px;box-shadow:0 34px 110px rgba(0,0,0,.6)}
      .tatnera-subscription-mark{width:48px;height:48px;border-radius:14px;background:#d8ff63;color:#11120c;display:grid;place-items:center;font-size:23px;font-weight:950;margin-bottom:22px}
      .tatnera-subscription-card .eyebrow{color:#99999f;font-size:10px;font-weight:850;text-transform:uppercase;letter-spacing:.13em}
      .tatnera-subscription-card h1{font-size:32px;line-height:1.08;margin:8px 0 12px}
      .tatnera-subscription-card p{color:#aaaab0;line-height:1.65;margin:0}
      .tatnera-subscription-info{margin:20px 0;border:1px solid #2e2e33;background:#101012;border-radius:14px;padding:15px;color:#c8c8cc;font-size:13px;line-height:1.55}
      .tatnera-subscription-info strong{color:#f3f3f4}
      .tatnera-subscription-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:22px}
      .tatnera-subscription-actions a,.tatnera-subscription-actions button{border:0;border-radius:11px;padding:12px 15px;font:inherit;font-weight:850;cursor:pointer;text-decoration:none}
      .tatnera-subscription-actions .primary{background:#d8ff63;color:#11120c}.tatnera-subscription-actions .secondary{background:#222226;color:#f1f1f3;border:1px solid #34343a}
      @media(max-width:760px){.tatnera-trial-badge{font-size:9px;padding:7px 8px}.tatnera-subscription-card{padding:24px}.tatnera-subscription-card h1{font-size:27px}}
    `;
    document.head.appendChild(style);
  }

  function formatDate(value){
    try{return new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(value));}
    catch(_error){return '';}
  }

  function showBadge(trialEndsAt){
    const actions=document.querySelector('.top-actions');
    if(!actions)return;
    let badge=document.getElementById('tatneraTrialBadge');
    if(!badge){
      badge=document.createElement('span');
      badge.id='tatneraTrialBadge';
      badge.className='tatnera-trial-badge';
      actions.prepend(badge);
    }
    const remaining=Math.max(0,new Date(trialEndsAt).getTime()-Date.now());
    const days=Math.max(1,Math.ceil(remaining/DAY));
    badge.textContent=days===1?'Test · letzter Tag':`Test · ${days} Tage`;
    badge.title=`Kostenlose Testphase bis ${formatDate(trialEndsAt)} · keine automatische Verlängerung`;
  }

  function hideBadge(){document.getElementById('tatneraTrialBadge')?.remove();}

  function showLock(status,trialEndsAt){
    if(document.getElementById('tatneraSubscriptionOverlay'))return;
    hideBadge();
    const expired=status==='trial';
    const overlay=document.createElement('div');
    overlay.id='tatneraSubscriptionOverlay';
    overlay.className='tatnera-subscription-overlay';
    overlay.innerHTML=`<section class="tatnera-subscription-card" role="dialog" aria-modal="true">
      <div class="tatnera-subscription-mark">T</div>
      <span class="eyebrow">TATNERA Studio Software</span>
      <h1>${expired?'Deine Testphase ist beendet.':'Dein Studio-Zugang ist derzeit nicht aktiv.'}</h1>
      <p>${expired?'Die 14 Tage sind abgelaufen. Es wurde nichts automatisch verlängert und es entstehen keine Kosten.':'Der aktuelle Studio-Status erlaubt im Moment keinen Zugriff auf das Dashboard.'}</p>
      <div class="tatnera-subscription-info">${expired?`Testzeit beendet am <strong>${formatDate(trialEndsAt)}</strong>.<br>Deine Studio-Daten bleiben bestehen.`:'Deine Studio-Daten bleiben bestehen. Sobald der Zugang wieder aktiviert ist, kannst du an derselben Stelle weiterarbeiten.'}</div>
      <div class="tatnera-subscription-actions">
        <a class="primary" href="index.html">Zur TATNERA-Startseite</a>
        <button class="secondary" type="button" data-trial-logout>Abmelden</button>
      </div>
    </section>`;
    overlay.querySelector('[data-trial-logout]')?.addEventListener('click',()=>window.TatneraAuth?.logout?.());
    document.body.appendChild(overlay);
  }

  async function checkSubscription(force=false){
    if(running)return;
    const auth=window.TatneraAuth;
    const studioId=auth?.studioId?.();
    const client=auth?.client;
    if(!studioId||!client)return;
    const now=Date.now();
    if(!force&&now-lastCheck<MIN_RECHECK_MS)return;
    running=true;
    lastCheck=now;
    try{
      installStyles();
      const {data,error}=await client.from('studios')
        .select('subscription_status,trial_started_at,trial_ends_at')
        .eq('id',studioId)
        .single();
      if(error)throw error;

      const status=String(data?.subscription_status||'trial');
      const trialEndsAt=data?.trial_ends_at;
      const isExpired=status==='trial'&&trialEndsAt&&new Date(trialEndsAt).getTime()<=Date.now();

      if(status==='active'){
        hideBadge();
        document.getElementById('tatneraSubscriptionOverlay')?.remove();
        return;
      }
      if(status==='trial'&&!isExpired){
        showBadge(trialEndsAt);
        document.getElementById('tatneraSubscriptionOverlay')?.remove();
        return;
      }
      if(isExpired||status==='paused'||status==='cancelled')showLock(status,trialEndsAt);
    }catch(error){
      console.warn('TATNERA subscription status could not be loaded.',error);
    }finally{
      running=false;
    }
  }

  document.addEventListener('tatnera:auth-ready',()=>checkSubscription(true));
  window.addEventListener('focus',()=>checkSubscription(false));

  /* One lightweight fallback in case auth-ready happened before this script loaded. */
  setTimeout(()=>checkSubscription(true),700);
})();