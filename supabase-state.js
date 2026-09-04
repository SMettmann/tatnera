/* TATNERA — cloud bridge for studio-wide browser state
   Keeps the remaining MVP modules in sync across devices until they get dedicated tables. */
(function(){
  'use strict';

  const CLOUD_KEYS=[
    'tatnera_artists',
    'tatnera_requests',
    'tatnera_studio_profile_v1',
    'tatnera_invoices_v1',
    'tatnera_sessions_v1',
    'tatnera_archive_v1',
    'tatnera_appointment_history',
    'tatnera_inks'
  ];
  const CLOUD_KEY_SET=new Set(CLOUD_KEYS);
  const originalSetItem=Storage.prototype.setItem;
  const originalRemoveItem=Storage.prototype.removeItem;
  let client=null,studioId='',userId='',ready=false,booting=false,applyingCloud=false;
  let pushTimer=null,pendingKeys=new Set();

  function safeParse(raw){
    if(raw===null||raw===undefined)return null;
    try{return JSON.parse(raw);}catch(_error){return raw;}
  }
  function stable(value){
    try{return JSON.stringify(value);}catch(_error){return String(value);}
  }
  function localValue(key){
    const raw=localStorage.getItem(key);
    return raw===null?undefined:safeParse(raw);
  }
  function rowFor(key,value){
    return {studio_id:studioId,state_key:key,value:value===undefined?null:value,updated_by:userId,updated_at:new Date().toISOString()};
  }

  async function upsertValues(entries){
    if(!client||!studioId||!userId||!entries.length)return;
    const rows=entries.map(([key,value])=>rowFor(key,value));
    const {error}=await client.from('studio_state').upsert(rows,{onConflict:'studio_id,state_key'});
    if(error)throw error;
  }

  async function pushKeys(keys){
    if(!ready||!client||!studioId||!userId)return;
    const entries=[];
    for(const key of keys){
      if(!CLOUD_KEY_SET.has(key))continue;
      const value=localValue(key);
      if(value!==undefined)entries.push([key,value]);
    }
    if(!entries.length)return;
    try{
      await upsertValues(entries);
      document.dispatchEvent(new CustomEvent('tatnera:studio-state-saved',{detail:{keys:entries.map(item=>item[0]),studioId}}));
    }catch(error){
      console.error('TATNERA studio state sync failed',error);
    }
  }

  function schedulePush(key){
    if(!ready||applyingCloud||!CLOUD_KEY_SET.has(key))return;
    pendingKeys.add(key);clearTimeout(pushTimer);
    pushTimer=setTimeout(async()=>{
      const keys=[...pendingKeys];pendingKeys.clear();
      await pushKeys(keys);
    },120);
  }

  function installStorageHooks(){
    if(window.__tatneraStudioStateHooksInstalled)return;
    window.__tatneraStudioStateHooksInstalled=true;
    Storage.prototype.setItem=function(key,value){
      const result=originalSetItem.apply(this,arguments);
      try{if(this===window.localStorage)schedulePush(String(key));}catch(_error){}
      return result;
    };
    Storage.prototype.removeItem=function(key){
      const result=originalRemoveItem.apply(this,arguments);
      try{
        if(this===window.localStorage&&ready&&!applyingCloud&&CLOUD_KEY_SET.has(String(key))){
          const stateKey=String(key);
          client.from('studio_state').delete().eq('studio_id',studioId).eq('state_key',stateKey).then(({error})=>{if(error)console.error('TATNERA studio state delete failed',error);});
        }
      }catch(_error){}
      return result;
    };
  }

  async function bootstrap(event){
    if(booting)return;
    const auth=window.TatneraAuth;
    const nextClient=auth?.client||null;
    const nextStudioId=event?.detail?.studioId||auth?.studioId?.()||'';
    const nextUserId=event?.detail?.userId||auth?.user?.()?.id||'';
    if(!nextClient||!nextStudioId||!nextUserId)return;

    booting=true;ready=false;client=nextClient;studioId=nextStudioId;userId=nextUserId;
    try{
      const {data,error}=await client.from('studio_state').select('state_key,value,updated_at').eq('studio_id',studioId).in('state_key',CLOUD_KEYS);
      if(error)throw error;
      const cloud=new Map((data||[]).map(row=>[row.state_key,row.value]));

      if(!cloud.size){
        const entries=CLOUD_KEYS.map(key=>[key,localValue(key)]).filter(([,value])=>value!==undefined);
        if(entries.length)await upsertValues(entries);
        ready=true;installStorageHooks();
        document.dispatchEvent(new CustomEvent('tatnera:studio-state-ready',{detail:{studioId,imported:true}}));
        return;
      }

      let needsReload=false;
      applyingCloud=true;
      try{
        for(const key of CLOUD_KEYS){
          if(!cloud.has(key))continue;
          const cloudValue=cloud.get(key),local=localValue(key);
          if(stable(local)!==stable(cloudValue)){
            originalSetItem.call(localStorage,key,JSON.stringify(cloudValue));
            if(key!=='tatnera_artists')needsReload=true;
          }
        }
      }finally{applyingCloud=false;}

      const missing=CLOUD_KEYS.filter(key=>!cloud.has(key)).map(key=>[key,localValue(key)]).filter(([,value])=>value!==undefined);
      if(missing.length)await upsertValues(missing);

      ready=true;installStorageHooks();
      document.dispatchEvent(new CustomEvent('tatnera:studio-state-ready',{detail:{studioId,imported:false}}));

      if(needsReload){
        const marker=`tatnera_studio_state_reload_${studioId}`;
        if(sessionStorage.getItem(marker)!=='1'){
          sessionStorage.setItem(marker,'1');
          location.reload();
          return;
        }
      }else{
        sessionStorage.removeItem(`tatnera_studio_state_reload_${studioId}`);
      }
    }catch(error){
      console.error('TATNERA studio state load failed',error);
    }finally{booting=false;}
  }

  function syncAll(){return pushKeys(CLOUD_KEYS);}

  document.addEventListener('tatnera:auth-ready',bootstrap);
  document.addEventListener('tatnera:data-changed',()=>{for(const key of CLOUD_KEYS)schedulePush(key);});
  window.addEventListener('pagehide',()=>{if(ready&&pendingKeys.size)pushKeys([...pendingKeys]);});
  window.TatneraStudioState={isReady:()=>ready,syncAll,keys:()=>[...CLOUD_KEYS]};
})();
