/* TATNERA — global image preview
   Any real content image in the app can be opened directly in a full-screen preview.
   Works on phone, tablet and desktop without changing the surrounding workflow. */
(function(){
  'use strict';

  const EXCLUDED_SELECTOR=[
    '[data-no-lightbox]',
    '.brand-mark img',
    '.logo img',
    '.avatar img',
    '.tiny-avatar img'
  ].join(',');

  let dialog=null;
  let preview=null;
  let caption=null;
  let previousFocus=null;

  function installStyle(){
    if(document.getElementById('tatneraImageLightboxStyle'))return;
    const style=document.createElement('style');
    style.id='tatneraImageLightboxStyle';
    style.textContent=`
      img:not(${EXCLUDED_SELECTOR}){cursor:zoom-in}
      #tatneraImageLightbox{
        box-sizing:border-box;
        width:100vw!important;
        max-width:none!important;
        height:100dvh!important;
        max-height:none!important;
        margin:0!important;
        padding:0!important;
        border:0!important;
        border-radius:0!important;
        background:rgba(8,8,10,.96)!important;
        color:#fff!important;
        overflow:hidden!important;
      }
      #tatneraImageLightbox::backdrop{background:rgba(0,0,0,.82)}
      .tatnera-lightbox-shell{
        position:relative;
        box-sizing:border-box;
        width:100%;
        height:100%;
        display:grid;
        grid-template-rows:auto minmax(0,1fr) auto;
        gap:0;
        overflow:hidden;
      }
      .tatnera-lightbox-top{
        display:flex;
        align-items:center;
        justify-content:flex-end;
        min-height:58px;
        padding:8px max(12px,env(safe-area-inset-right)) 8px max(12px,env(safe-area-inset-left));
        z-index:2;
      }
      .tatnera-lightbox-close{
        appearance:none;
        width:44px;
        height:44px;
        border:1px solid rgba(255,255,255,.22);
        border-radius:50%;
        background:rgba(255,255,255,.08);
        color:#fff;
        font-size:28px;
        line-height:1;
        display:grid;
        place-items:center;
        cursor:pointer;
      }
      .tatnera-lightbox-stage{
        min-width:0;
        min-height:0;
        overflow:auto;
        display:flex;
        align-items:center;
        justify-content:center;
        padding:8px 18px 16px;
        overscroll-behavior:contain;
        -webkit-overflow-scrolling:touch;
        touch-action:pan-x pan-y pinch-zoom;
      }
      .tatnera-lightbox-stage img{
        display:block;
        width:auto!important;
        height:auto!important;
        max-width:100%!important;
        max-height:100%!important;
        object-fit:contain!important;
        border-radius:10px;
        box-shadow:0 20px 70px rgba(0,0,0,.5);
        cursor:default!important;
        user-select:none;
        -webkit-user-drag:none;
      }
      .tatnera-lightbox-caption{
        min-height:0;
        padding:0 18px calc(14px + env(safe-area-inset-bottom));
        text-align:center;
        color:rgba(255,255,255,.72);
        font-size:13px;
        line-height:1.35;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
      }
      @media(max-width:760px){
        .tatnera-lightbox-top{min-height:52px;padding-top:max(7px,env(safe-area-inset-top))}
        .tatnera-lightbox-close{width:42px;height:42px}
        .tatnera-lightbox-stage{padding:4px 8px 12px}
        .tatnera-lightbox-stage img{border-radius:6px}
        .tatnera-lightbox-caption{font-size:12px;padding-inline:12px}
      }
    `;
    document.head.appendChild(style);
  }

  function installDialog(){
    if(document.getElementById('tatneraImageLightbox')){
      dialog=document.getElementById('tatneraImageLightbox');
      preview=dialog.querySelector('img');
      caption=dialog.querySelector('.tatnera-lightbox-caption');
      return;
    }
    dialog=document.createElement('dialog');
    dialog.id='tatneraImageLightbox';
    dialog.setAttribute('aria-label','Bildvorschau');
    dialog.innerHTML=`<div class="tatnera-lightbox-shell">
      <div class="tatnera-lightbox-top"><button type="button" class="tatnera-lightbox-close" aria-label="Bild schließen">×</button></div>
      <div class="tatnera-lightbox-stage"><img alt=""></div>
      <div class="tatnera-lightbox-caption" aria-live="polite"></div>
    </div>`;
    document.body.appendChild(dialog);
    preview=dialog.querySelector('img');
    caption=dialog.querySelector('.tatnera-lightbox-caption');
    dialog.querySelector('.tatnera-lightbox-close').addEventListener('click',close);
    dialog.addEventListener('click',event=>{
      if(event.target===dialog||event.target.classList.contains('tatnera-lightbox-stage'))close();
    });
    dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
    dialog.addEventListener('close',()=>{
      preview.removeAttribute('src');
      caption.textContent='';
      if(previousFocus?.focus)previousFocus.focus({preventScroll:true});
      previousFocus=null;
    });
  }

  function canOpen(img){
    if(!(img instanceof HTMLImageElement))return false;
    if(img.closest('#tatneraImageLightbox'))return false;
    if(img.matches(EXCLUDED_SELECTOR)||img.closest(EXCLUDED_SELECTOR))return false;
    const src=img.currentSrc||img.src||'';
    if(!src)return false;
    if(img.width<48&&img.height<48)return false;
    return true;
  }

  function open(img){
    installDialog();
    if(!canOpen(img))return;
    previousFocus=document.activeElement;
    const src=img.currentSrc||img.src;
    preview.src=src;
    preview.alt=img.alt||'Bildvorschau';
    const label=img.dataset.lightboxTitle||img.alt||img.closest('figure')?.querySelector('figcaption')?.textContent?.trim()||'';
    caption.textContent=label;
    caption.hidden=!label;
    if(!dialog.open)dialog.showModal();
  }

  function close(){
    if(dialog?.open)dialog.close();
  }

  document.addEventListener('click',event=>{
    const img=event.target.closest?.('img');
    if(!canOpen(img))return;
    event.preventDefault();
    event.stopPropagation();
    open(img);
  },true);

  document.addEventListener('keydown',event=>{
    if(event.key!=='Enter'&&event.key!==' ')return;
    const img=event.target instanceof HTMLImageElement?event.target:null;
    if(!canOpen(img))return;
    event.preventDefault();
    open(img);
  });

  installStyle();
  installDialog();
  window.TatneraImagePreview={open,close};
})();
