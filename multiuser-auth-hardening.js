/* TATNERA — multi-user auth hardening */
(function(){
  'use strict';
  if(window.__tatneraMultiuserAuthHardeningInstalled)return;
  window.__tatneraMultiuserAuthHardeningInstalled=true;

  const PUBLIC_APP_URL=new URL('app.html',location.href).toString();
  const PENDING_INVITE_KEY='tatnera_pending_studio_invite_v1';
  const GATE_TOKEN_KEY='tatnera_invite_gate_token_v1';
  const INVITE_EMAIL_KEY='tatnera_invite_email_v1';
  const RECOVERY_KEY='tatnera_password_recovery_v1';
  const RECOVERY_ACCESS_KEY='tatnera_recovery_access_token_v1';
  const RECOVERY_REFRESH_KEY='tatnera_recovery_refresh_token_v1';
  const ACCEPT_INVITE_URL='https://ayxvspeufbsoxtccaqap.supabase.co/functions/v1/accept-studio-invite';
  const isUuid=value=>/^[0-9a-f-]{36}$/i.test(String(value||''));
  let gateSeedToken='';

  function queryParams(){try{return new URLSearchParams(location.search);}catch(_){return new URLSearchParams();}}
  function hashParams(){try{return new URLSearchParams(location.hash.replace(/^#/,''));}catch(_){return new URLSearchParams();}}
  function pendingToken(){
    const gated=sessionStorage.getItem(GATE_TOKEN_KEY)||'';if(isUuid(gated))return gated;
    const saved=localStorage.getItem(PENDING_INVITE_KEY)||'';if(isUuid(saved))return saved;
    const query=queryParams().get('invite')||'';return isUuid(query)?query:'';
  }
  function invitedEmail(){
    const query=String(queryParams().get('email')||'').trim().toLowerCase();
    if(query&&query.includes('@')){try{sessionStorage.setItem(INVITE_EMAIL_KEY,query);}catch(_){}return query;}
    try{return String(sessionStorage.getItem(INVITE_EMAIL_KEY)||'').trim().toLowerCase();}catch(_){return '';}
  }
  function publicRedirect(includeInvite=true,mode=''){
    const url=new URL(PUBLIC_APP_URL);const token=pendingToken();
    if(includeInvite&&token)url.searchParams.set('invite',token);if(mode)url.searchParams.set('mode',mode);return url.toString();
  }
  function saveMetadataInviteToken(user){
    const token=String(user?.user_metadata?.tatnera_invite_token||'');if(!isUuid(token))return '';
    sessionStorage.setItem(GATE_TOKEN_KEY,token);localStorage.removeItem(PENDING_INVITE_KEY);return token;
  }

  (function captureRecovery(){
    const hash=hashParams(),query=queryParams(),type=hash.get('type')||query.get('type')||'',mode=query.get('mode')||'';
    if(type==='recovery'||mode==='recovery')try{
      sessionStorage.setItem(RECOVERY_KEY,'1');
      const accessToken=hash.get('access_token')||query.get('access_token')||'',refreshToken=hash.get('refresh_token')||query.get('refresh_token')||'';
      if(accessToken&&refreshToken){sessionStorage.setItem(RECOVERY_ACCESS_KEY,accessToken);sessionStorage.setItem(RECOVERY_REFRESH_KEY,refreshToken);}
    }catch(_){}
  })();

  (function captureInvite(){
    const q=queryParams(),token=q.get('invite')||'',email=String(q.get('email')||'').trim().toLowerCase();
    if(isUuid(token))localStorage.setItem(PENDING_INVITE_KEY,token);
    if(email&&email.includes('@'))try{sessionStorage.setItem(INVITE_EMAIL_KEY,email);}catch(_){}
  })();

  (function gateDirectInviteCallback(){
    const q=queryParams(),type=hashParams().get('type')||q.get('type')||'',token=q.get('invite')||'',email=String(q.get('email')||'').trim().toLowerCase();
    const studioEntryTypes=new Set(['invite','recovery','magiclink','signup','email']);
    if(!studioEntryTypes.has(type)||!isUuid(token))return;
    sessionStorage.setItem(GATE_TOKEN_KEY,token);if(email&&email.includes('@'))sessionStorage.setItem(INVITE_EMAIL_KEY,email);localStorage.removeItem(PENDING_INVITE_KEY);
    const url=new URL(location.href);url.searchParams.delete('invite');url.searchParams.delete('type');url.searchParams.delete('email');history.replaceState(history.state,'',url.pathname+url.search+url.hash);
  })();

  function installClientWrappers(){
    const client=window.TatneraAuth?.client;if(!client?.auth||client.auth.__tatneraRedirectWrapped)return false;client.auth.__tatneraRedirectWrapped=true;
    const originalSignUp=client.auth.signUp.bind(client.auth);client.auth.signUp=credentials=>{const next={...(credentials||{}),options:{...(credentials?.options||{})}};next.options.emailRedirectTo=publicRedirect(true);return originalSignUp(next);};
    const originalReset=client.auth.resetPasswordForEmail.bind(client.auth);client.auth.resetPasswordForEmail=(email,options={})=>originalReset(email,{...options,redirectTo:publicRedirect(false,'recovery')});return true;
  }
  function installInviteAuthWatcher(){
    const client=window.TatneraAuth?.client;if(!client?.auth||client.auth.__tatneraInviteSetupWatcher)return false;client.auth.__tatneraInviteSetupWatcher=true;
    client.auth.onAuthStateChange((_event,session)=>{const user=session?.user;if(user)saveMetadataInviteToken(user);setTimeout(maybeShowInviteGate,0);});return true;
  }

  function ensureGateStyle(){
    if(document.getElementById('tatneraInviteGateStyle'))return;
    const style=document.createElement('style');style.id='tatneraInviteGateStyle';style.textContent=`
      .tatnera-invite-gate{position:fixed;inset:0;z-index:100200;display:grid;place-items:center;padding:18px;background:rgba(240,241,243,.98)}
      .tatnera-invite-gate[hidden]{display:none}.tatnera-invite-card{width:min(480px,100%);max-height:calc(100dvh - 36px);overflow:auto;background:#fff;border:1px solid #d9dde1;border-radius:18px;padding:24px;box-shadow:0 24px 70px rgba(0,0,0,.16);color:#17191c}
      .tatnera-invite-card h1{margin:4px 0 8px;font-size:27px;line-height:1.15}.tatnera-invite-card p{margin:0 0 18px;color:#676d73;line-height:1.5;font-size:14px}
      .tatnera-invite-form{display:flex;flex-direction:column;gap:13px}.tatnera-invite-form label{display:flex;flex-direction:column;gap:6px;font-weight:750;font-size:13px;color:#33383d}
      .tatnera-invite-form input{width:100%;min-height:48px;border:1px solid #cfd4d9;border-radius:11px;padding:0 12px;font:inherit;font-size:16px;background:#fff;color:#17191c}
      .tatnera-invite-form input[readonly]{background:#f3f4f5;color:#5f656a}.tatnera-invite-submit{min-height:49px;border:0;border-radius:11px;background:#202822;color:#fff;font:800 15px/1 inherit;cursor:pointer}.tatnera-invite-submit:disabled{opacity:.55;cursor:wait}
      .tatnera-invite-message{min-height:20px;margin-top:12px;font-size:13px;line-height:1.4}.tatnera-invite-message.error{color:#a12f2f}.tatnera-invite-message.success{color:#2d6a38}`;document.head.appendChild(style);
  }
  function ensureGate(){
    let root=document.getElementById('tatneraInviteGate');if(root)return root;ensureGateStyle();root=document.createElement('div');root.id='tatneraInviteGate';root.className='tatnera-invite-gate';root.hidden=true;
    root.innerHTML=`<section class="tatnera-invite-card"><span class="eyebrow">Studio-Einladung</span><h1>Deinen TATNERA-Zugang anlegen</h1><p>Die Einladung ist bestätigt. Lege jetzt dein persönliches Passwort fest. Danach öffnet sich das Studio direkt.</p><form id="tatneraInviteSetupForm" class="tatnera-invite-form"><label>E-Mail-Adresse<input name="email" type="email" autocomplete="email" readonly></label><label>Dein Name<input name="displayName" autocomplete="name" required></label><label>Passwort<input name="password" type="password" minlength="8" autocomplete="new-password" required></label><label>Passwort wiederholen<input name="password2" type="password" minlength="8" autocomplete="new-password" required></label><button class="tatnera-invite-submit" type="submit">Zugang anlegen & Studio öffnen</button></form><div id="tatneraInviteSetupMessage" class="tatnera-invite-message"></div></section>`;
    document.body.appendChild(root);root.querySelector('form').addEventListener('submit',finishInviteSetup);return root;
  }
  function gateMessage(text,type=''){const node=document.getElementById('tatneraInviteSetupMessage');if(node){node.textContent=text||'';node.className=`tatnera-invite-message${type?' '+type:''}`;}}

  async function finishInviteSetup(event){
    event.preventDefault();const form=event.currentTarget,button=form.querySelector('[type="submit"]'),token=pendingToken(),client=window.TatneraAuth?.client;
    const email=String(form.elements.email.value||'').trim().toLowerCase(),name=String(form.elements.displayName.value||'').trim(),password=String(form.elements.password.value||''),password2=String(form.elements.password2.value||'');
    if(!client||!isUuid(token)){gateMessage('Die Einladung ist nicht mehr vollständig. Bitte den Einladungslink erneut öffnen.','error');return;}
    if(!email||!email.includes('@')){gateMessage('Die E-Mail-Adresse der Einladung fehlt. Bitte den Einladungslink erneut öffnen.','error');return;}
    if(!name){gateMessage('Bitte deinen Namen eintragen.','error');return;}
    if(password.length<8){gateMessage('Bitte mindestens 8 Zeichen für das Passwort verwenden.','error');return;}
    if(password!==password2){gateMessage('Die beiden Passwörter stimmen nicht überein.','error');return;}
    button.disabled=true;gateMessage('Zugang wird eingerichtet …');
    try{
      const response=await fetch(ACCEPT_INVITE_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,email,password,displayName:name})});
      const data=await response.json().catch(()=>({}));if(!response.ok||!data.ok)throw new Error(data.error||'Zugang konnte nicht erstellt werden.');
      try{await client.auth.signOut();}catch(_){}
      const {error:loginError}=await client.auth.signInWithPassword({email,password});if(loginError)throw loginError;
      sessionStorage.removeItem(GATE_TOKEN_KEY);sessionStorage.removeItem(INVITE_EMAIL_KEY);localStorage.removeItem(PENDING_INVITE_KEY);
      gateSeedToken='';
      gateMessage('Fertig. Studio wird geöffnet …','success');setTimeout(()=>location.replace(PUBLIC_APP_URL),300);
    }catch(error){gateMessage(String(error?.message||error),'error');button.disabled=false;}
  }

  async function maybeShowInviteGate(){
    const client=window.TatneraAuth?.client;if(!client)return;
    try{
      let token=pendingToken();
      if(!isUuid(token)){
        const {data:{session}}=await client.auth.getSession();token=saveMetadataInviteToken(session?.user||null);
      }
      if(!isUuid(token))return;
      const emailValue=invitedEmail();
      const root=ensureGate();root.hidden=false;
      const email=root.querySelector('[name="email"]');
      const name=root.querySelector('[name="displayName"]');
      if(gateSeedToken!==token){
        if(email)email.value=emailValue;
        if(name)name.value='';
        gateSeedToken=token;
        if(!emailValue)gateMessage('Die Ziel-E-Mail fehlt im Einladungslink. Bitte eine neue Einladung erstellen.','error');else gateMessage('');
      }else if(email&&!email.value&&emailValue){
        email.value=emailValue;
      }
      document.getElementById('tatneraAuthShell')?.setAttribute('hidden','');
    }catch(_){}
  }

  let tries=0;const timer=setInterval(()=>{tries++;const wrapped=installClientWrappers(),watched=installInviteAuthWatcher();if(wrapped||watched||isUuid(pendingToken()))maybeShowInviteGate();if(tries>100)clearInterval(timer);},100);
  document.addEventListener('tatnera:auth-ready',()=>{installClientWrappers();installInviteAuthWatcher();maybeShowInviteGate();});
  window.TatneraInviteSetup={required:()=>isUuid(pendingToken()),open:()=>maybeShowInviteGate()};
})();
