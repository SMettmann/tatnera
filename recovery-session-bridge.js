/* TATNERA — recovery session bridge */
(function(){
  'use strict';
  if(window.__tatneraRecoverySessionBridgeInstalled)return;
  window.__tatneraRecoverySessionBridgeInstalled=true;

  const RECOVERY_KEY='tatnera_password_recovery_v1';
  const RECOVERY_ACCESS_KEY='tatnera_recovery_access_token_v1';
  const RECOVERY_REFRESH_KEY='tatnera_recovery_refresh_token_v1';

  function queryParams(){
    try{return new URLSearchParams(location.search);}catch(_error){return new URLSearchParams();}
  }
  function hashParams(){
    try{return new URLSearchParams(location.hash.replace(/^#/,''));}catch(_error){return new URLSearchParams();}
  }
  function recoveryRequested(){
    try{
      return sessionStorage.getItem(RECOVERY_KEY)==='1'||queryParams().get('mode')==='recovery'||queryParams().get('type')==='recovery'||hashParams().get('type')==='recovery';
    }catch(_error){return false;}
  }
  function setMessage(text,type='error'){
    const node=document.getElementById('tatneraAuthMessage');
    if(!node)return;
    node.textContent=text||'';
    node.className=`tatnera-auth-message${type?' '+type:''}`;
  }
  function clearStoredRecoveryTokens(){
    try{
      sessionStorage.removeItem(RECOVERY_ACCESS_KEY);
      sessionStorage.removeItem(RECOVERY_REFRESH_KEY);
    }catch(_error){}
  }
  function cleanAuthParams(){
    clearStoredRecoveryTokens();
    try{
      const url=new URL(location.href);
      ['code','token_hash','type','access_token','refresh_token'].forEach(key=>url.searchParams.delete(key));
      const cleanHash=new URLSearchParams(url.hash.replace(/^#/,''));
      ['access_token','refresh_token','expires_in','expires_at','token_type','type'].forEach(key=>cleanHash.delete(key));
      const hashText=cleanHash.toString();
      url.hash=hashText?`#${hashText}`:'';
      history.replaceState(history.state,document.title,url.pathname+url.search+url.hash);
    }catch(_error){}
  }

  async function ensureRecoverySession(client){
    if(!client?.auth||!recoveryRequested())return null;

    try{
      const {data:{session}}=await client.auth.getSession();
      if(session){cleanAuthParams();return session;}
    }catch(_error){}

    const query=queryParams();
    const hash=hashParams();

    const tokenHash=query.get('token_hash')||'';
    if(tokenHash){
      try{
        const {data,error}=await client.auth.verifyOtp({type:'recovery',token_hash:tokenHash});
        if(!error&&data?.session){cleanAuthParams();return data.session;}
      }catch(_error){}
    }

    const code=query.get('code')||'';
    if(code){
      try{
        const {data,error}=await client.auth.exchangeCodeForSession(code);
        if(!error&&data?.session){cleanAuthParams();return data.session;}
      }catch(_error){}
    }

    let storedAccess='',storedRefresh='';
    try{
      storedAccess=sessionStorage.getItem(RECOVERY_ACCESS_KEY)||'';
      storedRefresh=sessionStorage.getItem(RECOVERY_REFRESH_KEY)||'';
    }catch(_error){}

    const accessToken=hash.get('access_token')||query.get('access_token')||storedAccess;
    const refreshToken=hash.get('refresh_token')||query.get('refresh_token')||storedRefresh;
    if(accessToken&&refreshToken){
      try{
        const {data,error}=await client.auth.setSession({access_token:accessToken,refresh_token:refreshToken});
        if(!error&&data?.session){cleanAuthParams();return data.session;}
      }catch(_error){}
    }

    try{
      const {data:{session}}=await client.auth.getSession();
      if(session){cleanAuthParams();return session;}
      return null;
    }catch(_error){return null;}
  }

  function install(){
    const client=window.TatneraAuth?.client;
    if(!client?.auth)return false;
    if(client.auth.__tatneraRecoverySessionBridge)return true;
    client.auth.__tatneraRecoverySessionBridge=true;

    const originalUpdateUser=client.auth.updateUser.bind(client.auth);
    client.auth.updateUser=async attributes=>{
      if(recoveryRequested()){
        const session=await ensureRecoverySession(client);
        if(!session){
          return {data:{user:null},error:new Error('Der Passwort-Link ist nicht mehr aktiv. Bitte fordere einen neuen Reset-Link an.')};
        }
      }
      return originalUpdateUser(attributes);
    };

    if(recoveryRequested()){
      ensureRecoverySession(client).then(session=>{
        if(session){
          setMessage('Der Link wurde bestätigt. Du kannst jetzt dein neues Passwort setzen.','success');
        }else{
          setMessage('Der Reset-Link konnte nicht vollständig bestätigt werden. Bitte fordere einen neuen Reset-Link an.','error');
        }
      });
    }
    return true;
  }

  if(!install()){
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      if(install()||tries>160)clearInterval(timer);
    },50);
  }

  document.addEventListener('tatnera:auth-ready',install);
})();
