/* TATNERA — final project tab controller
   Single source of truth for project-detail tabs.
   Keeps the active tab stable across payments, consent, ink and aftercare updates. */
(function(){
  'use strict';

  const VALID=new Set(['overview','design','documents','payments','aftercare']);
  const STORAGE_KEY='tatnera_project_tabs_v1';
  let remembered={};

  try{remembered=JSON.parse(sessionStorage.getItem(STORAGE_KEY)||'{}')||{};}catch(_error){remembered={};}

  function detail(){return document.getElementById('projectDetail');}
  function projectId(root=detail()){return root?.dataset.projectId||'';}
  function save(){try{sessionStorage.setItem(STORAGE_KEY,JSON.stringify(remembered));}catch(_error){}}
  function remember(id,tab){if(id&&VALID.has(tab)){remembered[id]=tab;save();}}
  function rememberedTab(id){return VALID.has(remembered[id])?remembered[id]:'overview';}

  function activate(name,{emit=true,rememberTab=true}={}){
    if(!VALID.has(name))return false;
    const root=detail();if(!root)return false;
    const button=[...root.querySelectorAll('[data-project-tab]')].find(item=>item.dataset.projectTab===name);
    const pane=[...root.querySelectorAll('[data-project-pane]')].find(item=>item.dataset.projectPane===name);
    if(!button||!pane)return false;

    root.querySelectorAll('[data-project-tab]').forEach(item=>{
      const active=item.dataset.projectTab===name;
      item.type='button';
      item.classList.toggle('active',active);
      item.setAttribute('aria-selected',active?'true':'false');
      item.tabIndex=active?0:-1;
    });

    root.querySelectorAll('[data-project-pane]').forEach(item=>{
      const active=item.dataset.projectPane===name;
      item.classList.toggle('active',active);
      if(active)item.removeAttribute('hidden');
      else item.setAttribute('hidden','');
    });

    root.dataset.activeTab=name;
    const id=projectId(root);
    /* Internal initialisation/restores use emit:false and must not overwrite the last
       tab the user actually selected. */
    if(rememberTab&&emit)remember(id,name);

    if(emit){
      document.dispatchEvent(new CustomEvent('tatnera:project-tab',{detail:{projectId:id,tab:name}}));
    }
    return true;
  }

  function tabFromEvent(event){
    const target=event.target instanceof Element?event.target.closest('#projectDetail [data-project-tab]'):null;
    return target&&VALID.has(target.dataset.projectTab)?target:null;
  }

  /* Capture on window so older document-level tab handlers never see tab clicks. */
  window.addEventListener('click',event=>{
    const tab=tabFromEvent(event);if(!tab)return;
    event.preventDefault();
    event.stopPropagation();
    activate(tab.dataset.projectTab);
  },true);

  window.addEventListener('keydown',event=>{
    const tab=tabFromEvent(event);if(!tab)return;
    const root=detail();if(!root)return;
    const tabs=[...root.querySelectorAll('[data-project-tab]')].filter(item=>VALID.has(item.dataset.projectTab));
    if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();activate(tab.dataset.projectTab);return;}
    if(!['ArrowLeft','ArrowRight'].includes(event.key))return;
    event.preventDefault();event.stopPropagation();
    const index=tabs.indexOf(tab),step=event.key==='ArrowRight'?1:-1,next=tabs[(index+step+tabs.length)%tabs.length];
    activate(next.dataset.projectTab);next.focus();
  },true);

  function restoreCurrent(preferred=''){
    const root=detail();if(!root||state?.currentView!=='project-detail')return;
    const id=projectId(root);if(!id)return;
    const desired=VALID.has(preferred)?preferred:rememberedTab(id);
    activate(desired,{emit:false,rememberTab:false});
  }

  document.addEventListener('tatnera:project-opened',event=>{
    const id=event.detail?.projectId||projectId();
    const desired=rememberedTab(id);
    requestAnimationFrame(()=>restoreCurrent(desired));
  });

  /* Data changes must never throw the user back to Overview. Runtime refresh runs first;
     then we re-assert the tab the user was actually working in. */
  document.addEventListener('tatnera:data-changed',event=>{
    const root=detail();if(!root||state?.currentView!=='project-detail')return;
    const id=projectId(root);if(!id)return;
    if(event.detail?.projectId&&event.detail.projectId!==id)return;
    const desired=rememberedTab(id);
    requestAnimationFrame(()=>requestAnimationFrame(()=>restoreCurrent(desired)));
  });

  document.addEventListener('tatnera:runtime-refresh',()=>{
    const root=detail();if(!root||state?.currentView!=='project-detail')return;
    const desired=rememberedTab(projectId(root));
    requestAnimationFrame(()=>restoreCurrent(desired));
  });

  const style=document.createElement('style');
  style.id='projectTabsRuntimeStyle';
  style.textContent=`
    #projectDetail .project-tabs{position:relative!important;z-index:10000!important;pointer-events:auto!important;isolation:isolate}
    #projectDetail .project-tab-btn{position:relative!important;z-index:10001!important;pointer-events:auto!important;user-select:none!important}
    #projectDetail .project-tab-pane{position:relative;z-index:1}
    #projectDetail .project-tab-pane[hidden]{display:none!important}
    #projectDetail .project-tab-pane.active{display:block!important}
  `;
  document.getElementById('projectTabsRuntimeStyle')?.remove();
  document.head.appendChild(style);

  window.TatneraProjectTabs={activate,restoreCurrent};
})();

/* Late UI extensions are loaded here so they can safely wrap the consolidated runtime. */
(function(){
  function load(src,guard){
    if((guard&&window[guard])||document.querySelector(`script[src="${src}"]`))return;
    const script=document.createElement('script');
    script.src=src;
    document.body.appendChild(script);
  }
  load('calendar-month-view.js','__tatneraMonthCalendarInstalled');
  load('calendar-appointment-ux.js','__tatneraCalendarAppointmentUxInstalled');
  load('customer-service-tabs.js','__tatneraCustomerServiceTabsInstalled');
  load('archive-piercing.js','__tatneraArchivePiercingInstalled');
  load('cloud-files.js','TatneraFiles');
  load('record-attachments.js','__tatneraRecordAttachmentsInstalled');
  load('dashboard-upcoming.js','__tatneraDashboardUpcomingInstalled');
  load('dashboard-fixes.js','__tatneraDashboardFixesInstalled');
})();