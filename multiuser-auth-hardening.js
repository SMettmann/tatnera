/* TATNERA — multi-user auth hardening
   - Never sends real users back to localhost from auth mails.
   - Preserves studio invitation tokens through signup/reset flows.
   - Invited users create their password before joining the studio. */
(function(){
  'use strict';
  if(window.__tatneraMultiuserAuthHardeningInstalled)return;
  window.__tatneraMultiuserAuthHardeningInstalled=true;

  const PUBLIC_APP_URL='https://smettmann.github.io/tatnera/app.html';
  const PENDING_INVITE_KEY='tatnera_pending_studio_invite_v1';
  const GATE_TOKEN_KEY='tatnera_invite_gate_token_v1';
  const isUuid=value=>/^[0-9a-f-]{36}$/i.test(String(value||''));

  function queryParams(){
    try{return new URLSearchParams(location.search);}catch(_error){return new URLSearchParams();}
  }
  function hashParams(){
    try{return new URLSearchParams(location.hash.replace(/^#/,''));}catch(_error){return new URLSearchParams();}
  }
  function pendingToken(){
    const gated=sessionStorage.getItem(GATE_TOKEN_KEY)||'';
    if(isUuid(gated))return gated;
    const saved=localStorage.getItem(PENDING_INVITE_KEY)||'';
    if(isUuid(saved))return saved;
    const query=queryParams().get('invite')||'';
    return isUuid(query)?query:'';
  }
  function publicRedirect(includeInvite=true){
    const url=new URL(PUBLIC_APP_URL);
    const token=pendingToken();
    if(includeInvite&&token)url.searchParams.set('invite',token);
    return url.toString();
  }

  function saveMetadataInviteToken(user){
    const token=String(user?.user_metadata?.tatnera_invite_token||'');
    if(!isUuid(token))return '';
    sessionStorage.setItem(GATE_TOKEN_KEY,token);
    localStorage.removeItem(PENDING_INVITE_KEY);
    return token;
  }

  /* Capture every studio invite URL immediately. The verified Supabase link
     later establishes the invited user's session; TATNERA then shows only the
     account-setup screen instead of the normal login. */
  (function captureInviteToken(){
    const token=queryParams().get('invite')||'';
    if(isUuid(token))localStorage.setItem(PENDING_INVITE_KEY,token);
  })();

  (function gateDirectInviteCallback(){
    const type=hashParams().get('type')||queryParams().get('type')||'';
    const token=queryParams().get('invite')||'';
    const studioEntryTypes=new Set(['invite','recovery','magiclink','signup','email']);
    if(!studioEntryTypes.has(type)||!isUuid(token))return;
    sessionStorage.setItem(GATE_TOKEN_KEY,token);
    localStorage.removeItem(PENDING_INVITE_KEY);
    const url=new URL(location.href);url.searchParams.delete('invite');url.searchParams.delete('type');
    history.replaceState(history.state,'',url.pathname+url.search+url.hash);
  })();

  function installClientWrappers(){
    const auth=window.TatneraAuth,client=auth?.client;
    if(!client?.auth||client.auth.__tatneraRedirectWrapped)return false;
    client.auth.__tatneraRedirectWrapped=true;

    const originalSignUp=client.auth.signUp.bind(client.auth);
    client.auth.signUp=credentials=>{
      const next={...(credentials||{}),options:{...(credentials?.options||{})}};
      next.options.emailRedirectTo=publicRedirect(true);
      return originalSignUp(next);
    };

    const originalReset=client.auth.resetPasswordForEmail.bind(client.auth);
    client.auth.resetPasswordForEmail=(email,options={})=>originalReset(email,{...options,redirectTo:publicRedirect(false)});
    return true;
  }

  function installInviteAuthWatcher(){
    const client=window.TatneraAuth?.client;
    if(!client?.auth||client.auth.__tatneraInviteSetupWatcher)return false;
    client.auth.__tatneraInviteSetupWatcher=true;
    client.auth.onAuthStateChange((_event,session)=>{
      const user=session?.user;
      if(!user)return;
      saveMetadataInviteToken(user);
      setTimeout(maybeShowInviteGate,0);
    });
    return true;
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
      .tatnera-invite-message{min-height:20px;margin-top:12px;font-size:13px;line-height:1.4}.tatnera-invite-message.error{color:#a12f2f}.tatnera-invite-message.success{color:#2d6a38}
    `;document.head.appendChild(style);
  }

  function ensureGate(){
    let root=document.getElementById('tatneraInviteGate');if(root)return root;
    ensureGateStyle();root=document.createElement('div');root.id='tatneraInviteGate';root.className='tatnera-invite-gate';root.hidden=true;
    root.innerHTML=`<section class="tatnera-invite-card"><span class="eyebrow">Studio-Einladung</span><h1>Deinen TATNERA-Zugang anlegen</h1><p>Die Einladung ist bestätigt. Lege jetzt dein persönliches Passwort fest. Danach öffnet sich das Studio direkt.</p><form id="tatneraInviteSetupForm" class="tatnera-invite-form"><label>E-Mail-Adresse<input name="email" type="email" autocomplete="email" readonly></label><label>Dein Name<input name="displayName" autocomplete="name" required></label><label>Passwort<input name="password" type="password" minlength="8" autocomplete="new-password" required></label><label>Passwort wiederholen<input name="password2" type="password" minlength="8" autocomplete="new-password" required></label><button class="tatnera-invite-submit" type="submit">Zugang anlegen & Studio öffnen</button></form><div id="tatneraInviteSetupMessage" class="tatnera-invite-message"></div></section>`;
    document.body.appendChild(root);root.querySelector('form').addEventListener('submit',finishInviteSetup);return root;
  }

  function gateMessage(text,type=''){
    const node=document.getElementById('tatneraInviteSetupMessage');if(!node)return;
    node.textContent=text||'';node.className=`tatnera-invite-message${type?' '+type:''}`;
  }

  async function finishInviteSetup(event){
    event.preventDefault();const form=event.currentTarget,button=form.querySelector('[type="submit"]'),token=pendingToken();
    const auth=window.TatneraAuth,client=auth?.client;
    let user=auth?.user?.()||null;
    if(!user&&client){
      try{const {data:{user:sessionUser}}=await client.auth.getUser();user=sessionUser||null;}catch(_error){}
    }
    if(!client||!user||!isUuid(token)){gateMessage('Die Einladungssitzung ist nicht mehr vollständig. Bitte den Einladungslink erneut öffnen.','error');return;}
    const email=String(form.elements.email.value||'').trim().toLowerCase();
    const userEmail=String(user.email||'').trim().toLowerCase();
    const name=String(form.elements.displayName.value||'').trim(),password=String(form.elements.password.value||''),password2=String(form.elements.password2.value||'');
    if(!email||email!==userEmail){gateMessage('Diese Einladung gehört zu einer anderen E-Mail-Adresse. Bitte den Link aus der Einladung erneut öffnen.','error');return;}
    if(!name){gateMessage('Bitte deinen Namen eintragen.','error');return;}
    if(password.length<8){gateMessage('Bitte mindestens 8 Zeichen für das Passwort verwenden.','error');return;}
    if(password!==password2){gateMessage('Die beiden Passwörter stimmen nicht überein.','error');return;}
    button.disabled=true;gateMessage('Zugang wird eingerichtet …');
    try{
      const {data:invite,error:inviteError}=await client.from('studio_invites').select('id,studio_id,email,role,expires_at').eq('token',token).maybeSingle();if(inviteError)throw inviteError;
      if(!invite)throw new Error('Diese Einladung ist abgelaufen, wurde bereits verwendet oder gehört zu einer anderen E-Mail-Adresse.');
      if(String(invite.email||'').trim().toLowerCase()!==userEmail)throw new Error('Diese Einladung gehört zu einer anderen E-Mail-Adresse.');

      const {error:passwordError}=await client.auth.updateUser({password,data:{display_name:name,tatnera_invite_token:null,tatnera_invite_role:null}});if(passwordError)throw passwordError;
      const {error:profileError}=await client.from('profiles').update({display_name:name,email:user.email||''}).eq('id',user.id);if(profileError)throw profileError;
      const {error:memberError}=await client.from('studio_members').insert({studio_id:invite.studio_id,user_id:user.id,role:invite.role,is_active:true});
      if(memberError&&memberError.code!=='23505')throw memberError;
      try{await client.from('studio_invites').update({accepted_at:new Date().toISOString()}).eq('id',invite.id);}catch(_error){}

      sessionStorage.removeItem(GATE_TOKEN_KEY);localStorage.removeItem(PENDING_INVITE_KEY);
      gateMessage('Fertig. Studio wird geöffnet …','success');
      setTimeout(()=>location.replace(PUBLIC_APP_URL),300);
    }catch(error){gateMessage(String(error?.message||error),'error');button.disabled=false;}
  }

  async function maybeShowInviteGate(){
    const auth=window.TatneraAuth,client=auth?.client;if(!client)return;
    try{
      const {data:{session}}=await client.auth.getSession();const user=session?.user;if(!user)return;
      let token=pendingToken();
      if(!isUuid(token))token=saveMetadataInviteToken(user);
      if(!isUuid(token))return;
      const root=ensureGate();root.hidden=false;
      const email=root.querySelector('[name="email"]');if(email)email.value=String(user.email||'');
      const name=root.querySelector('[name="displayName"]');if(name&&!name.value)name.value=String(user.user_metadata?.display_name||'');
      document.getElementById('tatneraAuthShell')?.setAttribute('hidden','');
    }catch(_error){}
  }

  let tries=0;const timer=setInterval(()=>{
    tries++;
    const wrapped=installClientWrappers();
    const watched=installInviteAuthWatcher();
    if(wrapped||watched||isUuid(pendingToken()))maybeShowInviteGate();
    if(tries>100)clearInterval(timer);
  },100);
  document.addEventListener('tatnera:auth-ready',()=>{installClientWrappers();installInviteAuthWatcher();maybeShowInviteGate();});

  window.TatneraInviteSetup={
    required:()=>isUuid(pendingToken()),
    open:()=>maybeShowInviteGate()
  };
})();
