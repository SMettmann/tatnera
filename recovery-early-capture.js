/* TATNERA — capture recovery credentials before Supabase consumes the URL */
(function(){
  'use strict';
  const KEYS={
    pending:'tatnera_password_recovery_v1',
    access:'tatnera_recovery_access_token_v1',
    refresh:'tatnera_recovery_refresh_token_v1',
    code:'tatnera_recovery_code_v1',
    tokenHash:'tatnera_recovery_token_hash_v1',
    type:'tatnera_recovery_type_v1'
  };
  try{
    const query=new URLSearchParams(location.search);
    const hash=new URLSearchParams(location.hash.replace(/^#/,''));
    const type=query.get('type')||hash.get('type')||'';
    const isRecovery=query.get('mode')==='recovery'||type==='recovery';
    if(!isRecovery)return;
    sessionStorage.setItem(KEYS.pending,'1');
    const access=hash.get('access_token')||query.get('access_token')||'';
    const refresh=hash.get('refresh_token')||query.get('refresh_token')||'';
    const code=query.get('code')||hash.get('code')||'';
    const tokenHash=query.get('token_hash')||hash.get('token_hash')||'';
    if(access)sessionStorage.setItem(KEYS.access,access);
    if(refresh)sessionStorage.setItem(KEYS.refresh,refresh);
    if(code)sessionStorage.setItem(KEYS.code,code);
    if(tokenHash)sessionStorage.setItem(KEYS.tokenHash,tokenHash);
    sessionStorage.setItem(KEYS.type,'recovery');
  }catch(_error){}
})();
