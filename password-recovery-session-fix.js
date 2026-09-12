/* TATNERA — robust password recovery session bootstrap */
(function(){
  'use strict';
  if(window.__tatneraPasswordRecoverySessionFixInstalled)return;
  window.__tatneraPasswordRecoverySessionFixInstalled=true;

  const RECOVERY_KEY='tatnera_password_recovery_v1';
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

  function params(){
    try{
      return {
        query:new URLSearchParams(location.search),
        hash:new URLSearchParams(location.hash.replace(/^#/,''))
      };
    }catch(_error){return {query:new URLSearchParams(),hash:new URLSearchParams()};}
  }

  function recoveryContext(){
    const {query,hash}=params();
    let pending=false;
    try{pending=sessionStorage.getItem(RECOVERY_KEY)==='1';}catch(_error){}
    return pending||query.get('mode')==='recovery'||query.get('type')==='recovery'||hash.get('type')==='recovery';
  }

  async function ensureRecoverySession(client){
    if(!client?.auth)return false;

    for(let i=0;i<6;i++){
      try{
        const {data}=await client.auth.getSession();
        if(data?.session?.user)return true;
      }catch(_error){}
      if(i<5)await sleep(180);
    }

    const {query,hash}=params();
    const accessToken=hash.get('access_token')||query.get('access_token');
    const refreshToken=hash.get('refresh_token')||query.get('refresh_token');
    if(accessToken&&refreshToken){
      try{
        const {data,error}=await client.auth.setSession({access_token:accessToken,refresh_token:refreshToken});
        if(!error&&data?.session?.user)return true;
      }catch(_error){}
    }

    const code=query.get('code');
    if(code&&typeof client.auth.exchangeCodeForSession==='function'){
      try{
        const {data,error}=await client.auth.exchangeCodeForSession(code);
        if(!error&&data?.session?.user)return true;
      }catch(_error){}
    }

    const tokenHash=query.get('token_hash')||hash.get('token_hash');
    const type=query.get('type')||hash.get('type');
    if(tokenHash&&type==='recovery'&&typeof client.auth.verifyOtp==='function'){
      try{
        const {data,error}=await client.auth.verifyOtp({token_hash:tokenHash,type:'recovery'});
        if(!error&&data?.session?.user)return true;
      }catch(_error){}
    }

    try{
      const {data}=await client.auth.getSession();
      return !!data?.session?.user;
    }catch(_error){return false;}
  }

  function setMessage(text,type='error'){
    const node=document.getElementById('tatneraAuthMessage');
    if(!node)return;
    node.textContent=text;
    node.className=`tatnera-auth-message ${type}`;
  }

  function cleanupRecoveryUrl(){
    try{
      sessionStorage.removeItem(RECOVERY_KEY);
      const url=new URL(location.href);
      url.searchParams.delete('mode');
      url.searchParams.delete('type');
      url.searchParams.delete('code');
      url.searchParams.delete('token_hash');
      url.hash='';
      history.replaceState(history.state,'',url.pathname+url.search);
    }catch(_error){}
  }

  document.addEventListener('submit',async event=>{
    const form=event.target;
    if(!(form instanceof HTMLFormElement)||form.id!=='tatneraRecoveryForm'||!recoveryContext())return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const button=form.querySelector('[type="submit"]');
    if(button)button.disabled=true;
    setMessage('Reset-Link wird geprüft …','');

    try{
      const client=window.TatneraAuth?.client;
      const ready=await ensureRecoverySession(client);
      if(!ready){
        setMessage('Der Reset-Link konnte keine gültige Sitzung öffnen. Bitte fordere einen neuen Passwort-Link an und öffne genau die neueste E-Mail.','error');
        return;
      }

      const password=String(form.elements.password?.value||'');
      if(password.length<8){setMessage('Bitte mindestens 8 Zeichen verwenden.','error');return;}

      const {error}=await client.auth.updateUser({password});
      if(error)throw error;

      cleanupRecoveryUrl();
      setMessage('Passwort gespeichert. Du wirst jetzt angemeldet.','success');
      await sleep(350);
      location.replace(new URL('app.html',location.href).toString());
    }catch(error){
      setMessage(String(error?.message||error||'Passwort konnte nicht gespeichert werden.'),'error');
    }finally{
      if(button)button.disabled=false;
    }
  },true);
})();