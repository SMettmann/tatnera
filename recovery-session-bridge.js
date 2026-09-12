/* TATNERA — recovery session bridge */
(function(){
  'use strict';
  if(window.__tatneraRecoverySessionBridgeInstalled)return;
  window.__tatneraRecoverySessionBridgeInstalled=true;

  const K={pending:'tatnera_password_recovery_v1',access:'tatnera_recovery_access_token_v1',refresh:'tatnera_recovery_refresh_token_v1',code:'tatnera_recovery_code_v1',tokenHash:'tatnera_recovery_token_hash_v1',type:'tatnera_recovery_type_v1'};
  const get=k=>{try{return sessionStorage.getItem(k)||'';}catch(_){return '';}};
  const del=k=>{try{sessionStorage.removeItem(k);}catch(_){}};
  const qp=()=>{try{return new URLSearchParams(location.search);}catch(_){return new URLSearchParams();}};
  const hp=()=>{try{return new URLSearchParams(location.hash.replace(/^#/,''));}catch(_){return new URLSearchParams();}};
  function requested(){const q=qp(),h=hp();return get(K.pending)==='1'||q.get('mode')==='recovery'||q.get('type')==='recovery'||h.get('type')==='recovery';}
  function message(text,type='error'){const n=document.getElementById('tatneraAuthMessage');if(n){n.textContent=text;n.className=`tatnera-auth-message ${type}`;}}
  function cleanup(){[K.access,K.refresh,K.code,K.tokenHash,K.type].forEach(del);try{const u=new URL(location.href);['code','token_hash','type','access_token','refresh_token'].forEach(k=>u.searchParams.delete(k));u.hash='';history.replaceState(history.state,document.title,u.pathname+u.search);}catch(_){}}

  async function ensure(client){
    if(!client?.auth||!requested())return null;
    try{const {data}=await client.auth.getSession();if(data?.session?.user)return data.session;}catch(_){}
    const q=qp(),h=hp();
    const tokenHash=q.get('token_hash')||h.get('token_hash')||get(K.tokenHash);
    if(tokenHash){try{const {data,error}=await client.auth.verifyOtp({type:'recovery',token_hash:tokenHash});if(!error&&data?.session?.user){cleanup();return data.session;}}catch(_){}}
    const code=q.get('code')||h.get('code')||get(K.code);
    if(code){try{const {data,error}=await client.auth.exchangeCodeForSession(code);if(!error&&data?.session?.user){cleanup();return data.session;}}catch(_){}}
    const access=q.get('access_token')||h.get('access_token')||get(K.access);
    const refresh=q.get('refresh_token')||h.get('refresh_token')||get(K.refresh);
    if(access&&refresh){try{const {data,error}=await client.auth.setSession({access_token:access,refresh_token:refresh});if(!error&&data?.session?.user){cleanup();return data.session;}}catch(_){}}
    try{const {data}=await client.auth.getSession();return data?.session?.user?data.session:null;}catch(_){return null;}
  }

  function install(){
    const client=window.TatneraAuth?.client;if(!client?.auth)return false;
    if(client.auth.__tatneraRecoverySessionBridge)return true;
    client.auth.__tatneraRecoverySessionBridge=true;
    const original=client.auth.updateUser.bind(client.auth);
    client.auth.updateUser=async attrs=>{if(requested()){const s=await ensure(client);if(!s)return {data:{user:null},error:new Error('Der Passwort-Link ist nicht mehr aktiv. Bitte fordere einen neuen Reset-Link an.')};}return original(attrs);};
    if(requested())ensure(client).then(s=>message(s?'Der Link wurde bestätigt. Du kannst jetzt dein neues Passwort setzen.':'Der Reset-Link konnte nicht vollständig bestätigt werden. Bitte fordere einen neuen Reset-Link an.',s?'success':'error'));
    return true;
  }
  if(!install()){let tries=0;const t=setInterval(()=>{tries++;if(install()||tries>160)clearInterval(t);},50);}
  document.addEventListener('tatnera:auth-ready',install);
})();
