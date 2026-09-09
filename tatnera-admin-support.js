/* TATNERA admin support/control loader */
(function(){
  'use strict';
  if(document.querySelector('script[data-tatnera-admin-controls]'))return;
  const script=document.createElement('script');
  script.src='tatnera-admin-controls.js?v=20260909-1';
  script.dataset.tatneraAdminControls='1';
  document.head.appendChild(script);
})();
