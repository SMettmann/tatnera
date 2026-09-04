/* TATNERA — dedicated account setup for studio invitation links */
(function(){
  'use strict';

  const SUPABASE_URL='https://ayxvspeufbsoxtccaqap.supabase.co';
  const SUPABASE_KEY='sb_publishable_g8Z9qVH3GSJHHkbuT-ne5A_0IfhKJz1';
  const PUBLIC_APP_URL='https://smettmann.github.io/tatnera/app.html';
  const PENDING_INVITE_KEY='tatnera_pending_studio_invite_v1';
  const GATE_TOKEN_KEY='tatnera_invite_gate_token_v1';
  const params=new URLSearchParams(location.search);
  const token=String(params.get('invite')||'');
  const isUuid=value=>/^[0-9a-f-]{36}$/i.test(String(value||''));

  if(!isUuid(token))return;
  window.__tatneraInviteAccountSetupActive=true;
  try{localStorage.setItem(PENDING_INVITE_KEY,token);}catch(_error){}

  function installStyle(){
    if(document.getElementById('tatneraInviteAccountStyle'))return;
    const style=document.createElement('style');
    style.id='tatneraInviteAccountStyle';
    style.textContent=`
      .tatnera-invite-account{position:fixed;inset:0;z-index:100500;display:grid;place-items:center;padding:18px;background:#f1f2f3;color:#17191c;font-family:inherit}
      .tatnera-invite-account-card{width:min(490px,100%);max-height:calc(100dvh - 36px);overflow:auto;background:#fff;border:1px solid #d7dadd;border-radius:20px;padding:26px;box-shadow:0 28px 80px rgba(0,0,0,.16)}
      .tatnera-invite-account-brand{display:flex;align-items:center;gap:10px;margin-bottom:18px}.tatnera-invite-account-mark{display:grid;place-items:center;width:42px;height:42px;border-radius:12px;background:#202822;color:#fff;font-size:20px;font-weight:900}.tatnera-invite-account-brand strong{display:block;font-size:16px;letter-spacing:.08em}.tatnera-invite-account-brand span{display:block;margin-top:2px;color:#747a80;font-size:12px}
      .tatnera-invite-account-card h1{margin:0 0 8px;font-size:28px;line-height:1.15}.tatnera-invite-account-card>p{margin:0 0 20px;color:#656b70;font-size:14px;line-height:1.5}
      .tatnera-invite-account-form{display:flex;flex-direction:column;gap:13px}.tatnera-invite-account-form label{display:flex;flex-direction:column;gap:6px;color:#353a3e;font-size:13px;font-weight:750}.tatnera-invite-account-form input{width:100%;min-height:49px;border:1px solid #ccd1d5;border-radius:11px;background:#fff;color:#17191c;padding:0 12px;font:inherit;font-size:16px;box-sizing:border-box}.tatnera-invite-account-form input:focus{outline:2px solid rgba(32,40,34,.18);border-color:#7b867e}
      .tatnera-invite-account-help{margin-top:-5px;color:#7a8085;font-size:12px;line-height:1.4}.tatnera-invite-account-submit{min-height:50px;margin-top:3px;border:0;border-radius:11px;background:#202822;color:#fff;font:800 15px/1 inherit;cursor:pointer}.tatnera-invite-account-submit:disabled{opacity:.58;cursor:wait}
      .tatnera-invite-account-message{min-height:20px;margin-top:12px;font-size:13px;line-height:1.45}.tatnera-invite-account-message.error{color:#a12f2f}.tatnera-invite-account-message.success{color:#2d6a38}
      @media(max-width:520px){.tatnera-invite-account{padding:10px}.tatnera-invite-account-card{max-height:calc(100dvh - 20px);border-radius:16px;padding:20px}.tatnera-invite-account-card h1{font-size:24px}}
    `;
    document.head.appendChild(style);
  }

  function ensureScreen(){
    let root=document.getElementById('tatneraInviteAccountSetup');
    if(root)return root;
    installStyle();
    root=document.createElement('div');
    root.id='tatneraInviteAccountSetup';
    root.className='tatnera-invite-account';
    const presetEmail=String(params.get('email')||'');
    root.innerHTML=`<section class="tatnera-invite-account-card" aria-live="polite"><div class="tatnera-invite-account-brand"><div class="tatnera-invite-account-mark">T</div><div><strong>TATNERA</strong><span>Studio-Einladung</span></div></div><h1>Deinen Zugang anlegen</h1><p>Du wurdest zu einem TATNERA-Studio eingeladen. Lege jetzt deine Zugangsdaten fest – danach öffnet sich das Studio direkt.</p><form id="tatneraInviteAccountForm" class="tatnera-invite-account-form"><label>E-Mail-Adresse<input type="email" name="email" autocomplete="email" required value="${escapeHtml(presetEmail)}"></label><div class="tatnera-invite-account-help">Verwende genau die E-Mail-Adresse, an die die Einladung geschickt wurde.</div><label>Dein Name<input name="displayName" autocomplete="name" required></label><label>Passwort<input type="password" name="password" minlength="8" autocomplete="new-password" required></label><label>Passwort wiederholen<input type="password" name="password2" minlength="8" autocomplete="new-password" required></label><button type="submit" class="tatnera-invite-account-submit">Zugang anlegen & Studio öffnen</button></form><div id="tatneraInviteAccountMessage" class="tatnera-invite-account-message"></div></section>`;
    document.body.appendChild(root);
    root.querySelector('form')?.addEventListener('submit',submitSetup);
    return root;
  }

  function escapeHtml(value){
    return String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  }
  function setMessage(text,type=''){
    const node=document.getElementById('tatneraInviteAccountMessage');if(!node)return;
    node.textContent=text||'';node.className=`tatnera-invite-account-message${type?' '+type:''}`;
  }
  function waitForAuthClient(timeout=10000){
    return new Promise(resolve=>{
      const started=Date.now();
      const timer=setInterval(()=>{
        const client=window.TatneraAuth?.client;
        if(client||Date.now()-started>=timeout){clearInterval(timer);resolve(client||null);}
      },50);
    });
  }

  async function submitSetup(event){
    event.preventDefault();
    const form=event.currentTarget,button=form.querySelector('[type="submit"]');
    const email=String(form.elements.email.value||'').trim().toLowerCase();
    const displayName=String(form.elements.displayName.value||'').trim();
    const password=String(form.elements.password.value||'');
    const password2=String(form.elements.password2.value||'');
    if(!email){setMessage('Bitte deine E-Mail-Adresse eingeben.','error');return;}
    if(!displayName){setMessage('Bitte deinen Namen eingeben.','error');return;}
    if(password.length<8){setMessage('Das Passwort muss mindestens 8 Zeichen lang sein.','error');return;}
    if(password!==password2){setMessage('Die beiden Passwörter stimmen nicht überein.','error');return;}

    button.disabled=true;button.textContent='Zugang wird angelegt …';setMessage('Einladung wird geprüft …');
    try{
      const response=await fetch(`${SUPABASE_URL}/functions/v1/accept-studio-invite`,{
        method:'POST',
        headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY},
        body:JSON.stringify({token,email,displayName,password})
      });
      const result=await response.json().catch(()=>({}));
      if(!response.ok||result?.ok!==true)throw new Error(result?.error||'Der Zugang konnte nicht angelegt werden.');

      setMessage('Zugang angelegt. Du wirst angemeldet …','success');
      const client=await waitForAuthClient();
      if(!client)throw new Error('Die Anmeldung konnte nicht gestartet werden. Bitte die Seite neu laden und dich mit deinen neuen Zugangsdaten anmelden.');
      const {error:signInError}=await client.auth.signInWithPassword({email,password});
      if(signInError)throw signInError;

      try{localStorage.removeItem(PENDING_INVITE_KEY);sessionStorage.removeItem(GATE_TOKEN_KEY);}catch(_error){}
      location.replace(PUBLIC_APP_URL);
    }catch(error){
      setMessage(String(error?.message||error),'error');
      button.disabled=false;button.textContent='Zugang anlegen & Studio öffnen';
    }
  }

  function mount(){
    if(!document.body){requestAnimationFrame(mount);return;}
    ensureScreen();
    document.getElementById('tatneraAuthBoot')?.remove();
  }
  mount();
})();