/* TATNERA — final project tab controller
   One delegated handler, loaded last. No observers, no rerender loops. */
(function(){
  'use strict';

  const VALID=new Set(['overview','design','documents','payments','aftercare']);

  function detail(){return document.getElementById('projectDetail');}

  function activate(name,{emit=true}={}){
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
    if(emit){
      document.dispatchEvent(new CustomEvent('tatnera:project-tab',{detail:{projectId:root.dataset.projectId||'',tab:name}}));
    }
    return true;
  }

  function tabFromEvent(event){
    const target=event.target instanceof Element?event.target.closest('#projectDetail [data-project-tab]'):null;
    return target&&VALID.has(target.dataset.projectTab)?target:null;
  }

  document.addEventListener('click',event=>{
    const tab=tabFromEvent(event);if(!tab)return;
    event.preventDefault();
    event.stopPropagation();
    activate(tab.dataset.projectTab);
  },true);

  document.addEventListener('keydown',event=>{
    const tab=tabFromEvent(event);if(!tab)return;
    const tabs=[...detail().querySelectorAll('[data-project-tab]')].filter(item=>VALID.has(item.dataset.projectTab));
    if(event.key==='Enter'||event.key===' '){event.preventDefault();activate(tab.dataset.projectTab);return;}
    if(!['ArrowLeft','ArrowRight'].includes(event.key))return;
    event.preventDefault();
    const index=tabs.indexOf(tab),step=event.key==='ArrowRight'?1:-1,next=tabs[(index+step+tabs.length)%tabs.length];
    activate(next.dataset.projectTab);next.focus();
  },true);

  document.addEventListener('tatnera:project-opened',()=>{
    const root=detail();if(!root)return;
    const current=root.dataset.activeTab;
    requestAnimationFrame(()=>activate(VALID.has(current)?current:'overview',{emit:false}));
  });

  const style=document.createElement('style');
  style.id='projectTabsRuntimeStyle';
  style.textContent=`
    #projectDetail .project-tabs{position:relative!important;z-index:200!important;pointer-events:auto!important}
    #projectDetail .project-tab-btn{position:relative!important;z-index:201!important;pointer-events:auto!important;user-select:none!important}
    #projectDetail .project-tab-pane[hidden]{display:none!important}
    #projectDetail .project-tab-pane.active{display:block!important}
  `;
  document.head.appendChild(style);

  window.TatneraProjectTabs={activate};
})();