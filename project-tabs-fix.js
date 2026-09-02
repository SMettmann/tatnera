/* TATNERA — robust project tab navigation */
(function(){
  function activate(detail,name){
    if(!detail||!name)return;
    detail.querySelectorAll('[data-project-tab]').forEach(button=>{
      const active=button.dataset.projectTab===name;
      button.classList.toggle('active',active);
      button.setAttribute('aria-selected',active?'true':'false');
      button.type='button';
    });
    detail.querySelectorAll('[data-project-pane]').forEach(pane=>{
      const active=pane.dataset.projectPane===name;
      pane.classList.toggle('active',active);
      pane.hidden=!active;
    });
  }

  function normalize(detail){
    if(!detail)return;
    const buttons=[...detail.querySelectorAll('[data-project-tab]')];
    if(!buttons.length)return;
    buttons.forEach(button=>button.type='button');
    const current=buttons.find(button=>button.classList.contains('active'))?.dataset.projectTab||'overview';
    activate(detail,current);
  }

  document.addEventListener('click',event=>{
    const button=event.target.closest?.('#projectDetail [data-project-tab]');
    if(!button)return;
    event.preventDefault();
    event.stopPropagation();
    activate(document.getElementById('projectDetail'),button.dataset.projectTab);
  },true);

  document.addEventListener('keydown',event=>{
    const button=event.target.closest?.('#projectDetail [data-project-tab]');
    if(!button||!['Enter',' '].includes(event.key))return;
    event.preventDefault();
    activate(document.getElementById('projectDetail'),button.dataset.projectTab);
  });

  const detail=document.getElementById('projectDetail');
  if(detail){
    new MutationObserver(()=>normalize(detail)).observe(detail,{childList:true,subtree:true});
    normalize(detail);
  }

  const style=document.createElement('style');
  style.textContent=`
    #projectDetail .project-tabs{position:relative;z-index:30;pointer-events:auto!important}
    #projectDetail .project-tab-btn{position:relative;z-index:31;pointer-events:auto!important;cursor:pointer!important}
    #projectDetail .project-tab-pane{position:relative;z-index:1}
    #projectDetail .project-tab-pane[hidden]{display:none!important}
    #projectDetail .project-tab-pane.active{display:block!important}
  `;
  document.head.appendChild(style);
})();
