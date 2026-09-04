/* TATNERA — Supabase authentication & studio onboarding */
(function(){
  'use strict';

  const SUPABASE_URL='https://ayxvspeufbsoxtccaqap.supabase.co';
  const SUPABASE_KEY='sb_publishable_g8Z9qVH3GSJHHkbuT-ne5A_0IfhKJz1';
  const NAV_KEY='tatnera_navigation_v1';
  let client=null,currentUser=null,currentStudio=null,currentMembership=null,authBusy=false;

  const esc=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));

  function friendlyError(error){
    const text=String(error?.message||error||'Unbekannter Fehler');
    const map=[
      ['Invalid login credentials','E-Mail oder Passwort ist falsch.'],
      ['Email not confirmed','Bitte bestätige zuerst deine E-Mail-Adresse.'],
      ['User already registered','Für diese E-Mail-Adresse gibt es bereits ein Konto.'],
      ['Password should be at least','Das Passwort ist zu kurz. Bitte mindestens 8 Zeichen verwenden.'],
      ['Unable to validate email address','Bitte eine gültige E-Mail-Adresse eingeben.'],
      ['Email rate limit exceeded','Zu viele E-Mails in kurzer Zeit. Bitte kurz warten und erneut versuchen.']
    ];
    return map.find(([needle])=>text.includes(needle))?.[1]||text;
  }

  function installAuthBoot(){
    if(!document.getElementById('tatneraAuthBootStyle')){
      const style=document.createElement('style');
      style.id='tatneraAuthBootStyle';
      style.textContent=`
        .tatnera-auth-boot{position:fixed;inset:0;z-index:100001;display:grid;place-items:center;background:radial-gradient(circle at 20% 10%,rgba(122,83,255,.12),transparent 34%),#111115;color:#f7f7f8;font-family:inherit}
        .tatnera-auth-boot-inner{display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center}
        .tatnera-auth-boot-mark{display:grid;place-items:center;width:52px;height:52px;border-radius:16px;background:#f4f1ff;color:#17131f;font-size:23px;font-weight:900;box-shadow:0 12px 34px rgba(0,0,0,.25)}
        .tatnera-auth-boot strong{font-size:15px;letter-spacing:.14em}
        .tatnera-auth-boot span{font-size:12px;color:#92929d}
        .tatnera-auth-boot-dot{width:5px;height:5px;border-radius:50%;background:#f4f1ff;animation:tatneraAuthPulse .9s ease-in-out infinite alternate}
        @keyframes tatneraAuthPulse{from{opacity:.25;transform:scale(.8)}to{opacity:1;transform:scale(1.2)}}
      `;
      document.head.appendChild(style);
    }
    if(document.getElementById('tatneraAuthBoot'))return;
    const boot=document.createElement('div');
    boot.id='tatneraAuthBoot';boot.className='tatnera-auth-boot';boot.setAttribute('aria-label','TATNERA wird geladen');
    boot.innerHTML='<div class="tatnera-auth-boot-inner"><div class="tatnera-auth-boot-mark">T</div><strong>TATNERA</strong><span>Studio wird geladen</span><i class="tatnera-auth-boot-dot"></i></div>';
    document.body.appendChild(boot);
  }

  function finishAuthCheck(){
    document.getElementById('tatneraAuthBoot')?.remove();
  }

  function resetNavigationToDashboard(navigateNow=true){
    try{localStorage.setItem(NAV_KEY,JSON.stringify({view:'dashboard'}));}catch(_error){}
    if(navigateNow&&typeof window.navigate==='function'){
      try{window.navigate('dashboard');}catch(_error){}
    }
  }

  function buildAuthShell(){
    if(document.getElementById('tatneraAuthShell'))return;
    const root=document.createElement('div');
    root.id='tatneraAuthShell';root.className='tatnera-auth-shell';root.hidden=true;
    root.innerHTML=`<section class="tatnera-auth-card" aria-live="polite">
      <div class="tatnera-auth-brand"><div class="tatnera-auth-mark">T</div><div><strong>TATNERA</strong><span>Studio Software</span></div></div>
      <div data-auth-login-area>
        <div class="tatnera-auth-head"><h1>Willkommen</h1><p>Melde dich in deinem Studio an oder erstelle dein TATNERA-Konto.</p></div>
        <div class="tatnera-auth-tabs"><button type="button" class="tatnera-auth-tab active" data-auth-mode="login">Einloggen</button><button type="button" class="tatnera-auth-tab" data-auth-mode="signup">Registrieren</button></div>
        <form class="tatnera-auth-form" id="tatneraLoginForm">
          <label>E-Mail<input type="email" name="email" autocomplete="email" required></label>
          <label>Passwort<input type="password" name="password" autocomplete="current-password" required></label>
          <button type="submit" class="tatnera-auth-submit">Einloggen</button>
          <button type="button" class="tatnera-auth-secondary" data-reset-password>Passwort vergessen?</button>
        </form>
        <form class="tatnera-auth-form" id="tatneraSignupForm" hidden>
          <label>Dein Name<input name="displayName" autocomplete="name" required></label>
          <label>E-Mail<input type="email" name="email" autocomplete="email" required></label>
          <label>Passwort<input type="password" name="password" autocomplete="new-password" minlength="8" required></label>
          <button type="submit" class="tatnera-auth-submit">Konto erstellen</button>
        </form>
      </div>
      <div data-auth-studio-area hidden>
        <div class="tatnera-auth-head"><h1>Dein Studio einrichten</h1><p>Einmal den Studionamen anlegen. Danach gehören Kunden, Tattoos und Termine eindeutig zu diesem Studio.</p></div>
        <div class="tatnera-auth-user" id="tatneraAuthUser"></div>
        <form class="tatnera-auth-form" id="tatneraStudioForm">
          <label>Studio-Name<input name="name" maxlength="120" placeholder="z. B. Blackline Tattoo" required></label>
          <button type="submit" class="tatnera-auth-submit">Studio anlegen</button>
        </form>
        <button type="button" class="tatnera-auth-secondary" data-auth-logout style="margin-top:14px">Mit anderem Konto anmelden</button>
      </div>
      <div data-auth-recovery-area hidden>
        <div class="tatnera-auth-head"><h1>Neues Passwort</h1><p>Vergib jetzt ein neues Passwort für dein TATNERA-Konto.</p></div>
        <form class="tatnera-auth-form" id="tatneraRecoveryForm">
          <label>Neues Passwort<input type="password" name="password" minlength="8" autocomplete="new-password" required></label>
          <button type="submit" class="tatnera-auth-submit">Passwort speichern</button>
        </form>
      </div>
      <div class="tatnera-auth-message" id="tatneraAuthMessage"></div>
      <div class="tatnera-auth-foot">TATNERA trennt die Daten jedes Studios technisch voneinander. Zugang nur nach Anmeldung.</div>
    </section>`;
    document.body.appendChild(root);

    root.querySelectorAll('[data-auth-mode]').forEach(button=>button.addEventListener('click',()=>switchMode(button.dataset.authMode)));
    root.querySelector('#tatneraLoginForm')?.addEventListener('submit',login);
    root.querySelector('#tatneraSignupForm')?.addEventListener('submit',signup);
    root.querySelector('#tatneraStudioForm')?.addEventListener('submit',createStudio);
    root.querySelector('#tatneraRecoveryForm')?.addEventListener('submit',updatePassword);
    root.querySelector('[data-reset-password]')?.addEventListener('click',resetPassword);
    root.querySelector('[data-auth-logout]')?.addEventListener('click',logout);
  }

  function switchMode(mode){
    document.querySelectorAll('[data-auth-mode]').forEach(button=>button.classList.toggle('active',button.dataset.authMode===mode));
    const login=document.getElementById('tatneraLoginForm'),signup=document.getElementById('tatneraSignupForm');
    if(login)login.hidden=mode!=='login';if(signup)signup.hidden=mode!=='signup';clearMessage();
  }

  function setMessage(text,type=''){
    const node=document.getElementById('tatneraAuthMessage');if(!node)return;
    node.textContent=text||'';node.className=`tatnera-auth-message${type?' '+type:''}`;
  }
  function clearMessage(){setMessage('');}
  function setBusy(form,busy){
    authBusy=busy;const button=form?.querySelector('[type="submit"]');if(button)button.disabled=busy;
  }

  function showAuth(){
    finishAuthCheck();
    document.body.classList.add('tatnera-auth-locked');
    const shell=document.getElementById('tatneraAuthShell');if(shell)shell.hidden=false;
    document.querySelector('[data-auth-login-area]')?.removeAttribute('hidden');
    document.querySelector('[data-auth-studio-area]')?.setAttribute('hidden','');
    document.querySelector('[data-auth-recovery-area]')?.setAttribute('hidden','');
    switchMode('login');
  }

  function showStudioOnboarding(user){
    finishAuthCheck();
    document.body.classList.add('tatnera-auth-locked');
    const shell=document.getElementById('tatneraAuthShell');if(shell)shell.hidden=false;
    document.querySelector('[data-auth-login-area]')?.setAttribute('hidden','');
    document.querySelector('[data-auth-recovery-area]')?.setAttribute('hidden','');
    document.querySelector('[data-auth-studio-area]')?.removeAttribute('hidden');
    const meta=document.getElementById('tatneraAuthUser');
    if(meta)meta.innerHTML=`Angemeldet als <strong>${esc(user?.email||'')}</strong>`;
    clearMessage();
  }

  function showRecovery(){
    finishAuthCheck();
    document.body.classList.add('tatnera-auth-locked');
    const shell=document.getElementById('tatneraAuthShell');if(shell)shell.hidden=false;
    document.querySelector('[data-auth-login-area]')?.setAttribute('hidden','');
    document.querySelector('[data-auth-studio-area]')?.setAttribute('hidden','');
    document.querySelector('[data-auth-recovery-area]')?.removeAttribute('hidden');
    setMessage('Der Link wurde bestätigt. Du kannst jetzt dein neues Passwort setzen.','success');
  }

  function unlockApp(forceDashboard=false){
    finishAuthCheck();
    document.getElementById('tatneraAuthShell')?.setAttribute('hidden','');
    document.body.classList.remove('tatnera-auth-locked');
    syncStudioUi();injectLogout();
    if(forceDashboard)resetNavigationToDashboard(true);
    document.dispatchEvent(new CustomEvent('tatnera:auth-ready',{detail:{userId:currentUser?.id||'',studioId:currentStudio?.id||'',role:currentMembership?.role||''}}));
  }

  async function login(event){
    event.preventDefault();if(authBusy)return;const form=event.currentTarget;setBusy(form,true);clearMessage();
    try{
      const data=Object.fromEntries(new FormData(form).entries());
      const {data:result,error}=await client.auth.signInWithPassword({email:String(data.email||'').trim(),password:String(data.password||'')});
      if(error)throw error;if(result?.user)await enterUser(result.user,{forceDashboard:true});
    }catch(error){setMessage(friendlyError(error),'error');}finally{setBusy(form,false);}
  }

  async function signup(event){
    event.preventDefault();if(authBusy)return;const form=event.currentTarget;setBusy(form,true);clearMessage();
    try{
      const data=Object.fromEntries(new FormData(form).entries()),email=String(data.email||'').trim(),password=String(data.password||''),displayName=String(data.displayName||'').trim();
      if(password.length<8)throw new Error('Bitte mindestens 8 Zeichen für das Passwort verwenden.');
      const redirectTo=location.origin+location.pathname;
      const {data:result,error}=await client.auth.signUp({email,password,options:{data:{display_name:displayName},emailRedirectTo:redirectTo}});
      if(error)throw error;
      if(result?.session&&result?.user){await enterUser(result.user,{forceDashboard:true});return;}
      switchMode('login');
      document.getElementById('tatneraLoginForm').elements.email.value=email;
      setMessage('Konto angelegt. Bitte bestätige jetzt die E-Mail von TATNERA und logge dich danach ein.','success');
    }catch(error){setMessage(friendlyError(error),'error');}finally{setBusy(form,false);}
  }

  async function resetPassword(){
    const form=document.getElementById('tatneraLoginForm'),email=String(form?.elements.email?.value||'').trim();
    if(!email){setMessage('Bitte zuerst deine E-Mail-Adresse eintragen.','error');form?.elements.email?.focus();return;}
    try{
      const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});if(error)throw error;
      setMessage('Wir haben dir einen Link zum Zurücksetzen des Passworts geschickt.','success');
    }catch(error){setMessage(friendlyError(error),'error');}
  }

  async function updatePassword(event){
    event.preventDefault();const form=event.currentTarget;setBusy(form,true);
    try{
      const password=String(form.elements.password.value||'');if(password.length<8)throw new Error('Bitte mindestens 8 Zeichen verwenden.');
      const {error}=await client.auth.updateUser({password});if(error)throw error;
      setMessage('Passwort gespeichert.','success');
      const {data:{user}}=await client.auth.getUser();if(user)setTimeout(()=>enterUser(user,{forceDashboard:true}),350);
    }catch(error){setMessage(friendlyError(error),'error');}finally{setBusy(form,false);}
  }

  async function createStudio(event){
    event.preventDefault();if(authBusy||!currentUser)return;const form=event.currentTarget;setBusy(form,true);clearMessage();
    try{
      const name=String(form.elements.name.value||'').trim();if(!name)throw new Error('Bitte einen Studio-Namen eingeben.');
      const {data:studio,error}=await client.from('studios').insert({name,created_by:currentUser.id}).select('*').single();if(error)throw error;
      await new Promise(resolve=>setTimeout(resolve,80));
      const found=await loadStudio(currentUser.id);
      if(!found){currentStudio=studio;currentMembership={studio_id:studio.id,user_id:currentUser.id,role:'owner',is_active:true};}
      unlockApp(true);
    }catch(error){setMessage(friendlyError(error),'error');}finally{setBusy(form,false);}
  }

  async function logout(){
    resetNavigationToDashboard(false);
    try{await client.auth.signOut();}catch(_error){}
    currentUser=null;currentStudio=null;currentMembership=null;showAuth();
  }

  async function loadStudio(userId){
    const {data,error}=await client.from('studio_members')
      .select('id,studio_id,user_id,role,is_active,studios(id,name,street,postal_code,city,country,email,phone)')
      .eq('user_id',userId).eq('is_active',true).order('created_at',{ascending:true}).limit(1).maybeSingle();
    if(error)throw error;
    if(!data)return false;
    const studio=Array.isArray(data.studios)?data.studios[0]:data.studios;
    if(!studio)return false;
    currentMembership=data;currentStudio=studio;return true;
  }

  async function enterUser(user,{forceDashboard=false}={}){
    currentUser=user;clearMessage();
    try{
      if(await loadStudio(user.id)){unlockApp(forceDashboard);return;}
      showStudioOnboarding(user);
    }catch(error){
      showAuth();setMessage('Dein Konto ist angemeldet, aber das Studio konnte nicht geladen werden: '+friendlyError(error),'error');
    }
  }

  function studioInitials(name){return String(name||'Studio').trim().split(/\s+/).slice(0,2).map(part=>part[0]?.toUpperCase()||'').join('')||'ST';}
  function syncStudioUi(){
    if(!currentStudio)return;
    const card=document.querySelector('.studio-card'),avatar=card?.querySelector('.avatar'),strong=card?.querySelector('strong'),span=card?.querySelector('span');
    if(avatar)avatar.textContent=studioInitials(currentStudio.name);if(strong)strong.textContent=currentStudio.name;if(span)span.textContent=currentMembership?.role==='owner'?'Inhaber':currentMembership?.role==='admin'?'Admin':currentMembership?.role==='staff'?'Mitarbeiter':'Tätowierer';
    try{if(window.TatneraStudio?.setName&&window.TatneraStudio?.getName?.()!==currentStudio.name)window.TatneraStudio.setName(currentStudio.name);}catch(_error){}
  }

  function injectLogout(){
    const bottom=document.querySelector('.sidebar-bottom');if(!bottom||bottom.querySelector('[data-tatnera-logout]'))return;
    const button=document.createElement('button');button.type='button';button.className='tatnera-logout-btn';button.dataset.tatneraLogout='true';button.textContent='Abmelden';button.addEventListener('click',logout);bottom.appendChild(button);
  }

  async function init(){
    installAuthBoot();
    buildAuthShell();
    if(!window.supabase?.createClient){showAuth();setMessage('Die Verbindung zu Supabase konnte nicht geladen werden. Bitte die Seite neu laden.','error');return;}
    client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    window.TatneraAuth={
      client,
      user:()=>currentUser,
      studio:()=>currentStudio,
      membership:()=>currentMembership,
      studioId:()=>currentStudio?.id||'',
      logout
    };

    client.auth.onAuthStateChange((event,session)=>{
      if(event==='PASSWORD_RECOVERY'){currentUser=session?.user||null;showRecovery();return;}
      if(event==='SIGNED_OUT'){currentUser=null;currentStudio=null;currentMembership=null;showAuth();}
    });

    try{
      const {data:{session},error}=await client.auth.getSession();if(error)throw error;
      if(session?.user)await enterUser(session.user);else showAuth();
    }catch(error){showAuth();setMessage(friendlyError(error),'error');}
  }

  init();
})();
