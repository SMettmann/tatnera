/* TATNERA — lightweight presence heartbeat */
(function(){
  'use strict';
  if(window.__tatneraPresenceInstalled)return;
  window.__tatneraPresenceInstalled=true;

  const HEARTBEAT_MS=120000;
  const MIN_TOUCH_GAP_MS=60000;
  let timer=null,lastTouch=0,studioId='';

  function auth(){return window.TatneraAuth||null;}

  async function touch(force=false){
    const a=auth(),client=a?.client,currentStudio=studioId||a?.studioId?.()||'';
    if(!client||!currentStudio||!a?.user?.())return false;
    if(document.visibilityState==='hidden'&&!force)return false;
    const now=Date.now();
    if(!force&&now-lastTouch<MIN_TOUCH_GAP_MS)return false;
    lastTouch=now;
    try{
      const {error}=await client.rpc('touch_studio_presence',{p_studio_id:currentStudio});
      if(error)throw error;
      return true;
    }catch(error){
      console.warn('TATNERA presence heartbeat failed',error);
      return false;
    }
  }

  function stop(){
    clearInterval(timer);timer=null;studioId='';lastTouch=0;
  }

  function start(nextStudioId){
    const next=String(nextStudioId||auth()?.studioId?.()||'');
    if(!next)return;
    if(studioId!==next){studioId=next;lastTouch=0;}
    clearInterval(timer);
    touch(true);
    timer=setInterval(()=>touch(false),HEARTBEAT_MS);
  }

  document.addEventListener('tatnera:auth-ready',event=>start(event?.detail?.studioId));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')touch(true);});
  window.addEventListener('focus',()=>touch(false));
  window.addEventListener('pageshow',()=>touch(false));

  setTimeout(()=>{
    const a=auth();
    if(a?.user?.()&&a?.studioId?.())start(a.studioId());
  },1200);

  window.TatneraPresence={touch:()=>touch(true),stop};
})();