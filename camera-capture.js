/* TATNERA — prefer the device camera for session photos on mobile devices. */
(function(){
  'use strict';

  function patchSessionPhotoInput(){
    const input=document.getElementById('sessionPhotoInput');
    if(!input)return false;
    input.setAttribute('accept','image/*');
    input.setAttribute('capture','environment');
    input.setAttribute('aria-label','Foto nach der Sitzung aufnehmen');
    return true;
  }

  if(!patchSessionPhotoInput()){
    const observer=new MutationObserver(()=>{
      if(patchSessionPhotoInput())observer.disconnect();
    });
    observer.observe(document.documentElement,{childList:true,subtree:true});
  }

  document.addEventListener('tatnera:data-changed',patchSessionPhotoInput);
})();
