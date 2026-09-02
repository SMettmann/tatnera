/* TATNERA — project detail observer guard
   Legacy v2 modules still register MutationObservers on #projectDetail.
   The consolidated runtime is event-driven, so project-detail observers are intentionally ignored
   to prevent self-triggering render loops (inject -> DOM mutation -> inject -> ...).
*/
(function(){
  'use strict';
  const NativeMutationObserver=window.MutationObserver;
  if(!NativeMutationObserver||window.__tatneraProjectObserverGuard)return;
  window.__tatneraProjectObserverGuard=true;

  window.MutationObserver=class TatneraMutationObserver extends NativeMutationObserver{
    observe(target,options){
      if(target?.id==='projectDetail')return;
      return super.observe(target,options);
    }
  };
})();
