/* TATNERA — functional local design uploads for the MVP */
(function(){
  function esc(value){return String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));}

  function installStyle(){
    const style=document.createElement('style');
    style.textContent=`
      .design-tile .design-preview{width:100%;height:130px;object-fit:cover;border-radius:9px;margin-bottom:9px;border:1px solid var(--line);background:#111}
      .design-file-meta{font-size:10px;color:var(--muted);margin-top:4px}
      #projectDetail .project-tabs{position:relative;z-index:30;pointer-events:auto!important}
      #projectDetail .project-tab-btn{position:relative;z-index:31;pointer-events:auto!important;cursor:pointer!important}
      #projectDetail .project-tab-pane{position:relative;z-index:1}
      #projectDetail .project-tab-pane[hidden]{display:none!important}
      #projectDetail .project-tab-pane.active{display:block!important}
    `;
    document.head.appendChild(style);
  }

  function compressImage(file){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();reader.onerror=reject;
      reader.onload=()=>{
        const image=new Image();image.onerror=reject;
        image.onload=()=>{
          const max=900,scale=Math.min(1,max/Math.max(image.width,image.height));
          const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
          canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
          resolve(canvas.toDataURL('image/jpeg',.72));
        };
        image.src=reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function activateProjectTab(detail,name){
    if(!detail||!name)return;
    detail.querySelectorAll('[data-project-tab]').forEach(button=>{
      const active=button.dataset.projectTab===name;
      button.type='button';
      button.classList.toggle('active',active);
      button.setAttribute('aria-selected',active?'true':'false');
    });
    detail.querySelectorAll('[data-project-pane]').forEach(pane=>{
      const active=pane.dataset.projectPane===name;
      pane.classList.toggle('active',active);
      pane.hidden=!active;
    });
  }

  function normalizeProjectTabs(){
    const detail=document.getElementById('projectDetail');if(!detail)return;
    const buttons=[...detail.querySelectorAll('[data-project-tab]')];if(!buttons.length)return;
    buttons.forEach(button=>button.type='button');
    const active=buttons.find(button=>button.classList.contains('active'))?.dataset.projectTab||'overview';
    activateProjectTab(detail,active);
  }

  function installRobustProjectTabs(){
    document.addEventListener('click',event=>{
      const button=event.target.closest?.('#projectDetail [data-project-tab]');
      if(!button)return;
      event.preventDefault();
      event.stopPropagation();
      activateProjectTab(document.getElementById('projectDetail'),button.dataset.projectTab);
    },true);

    document.addEventListener('keydown',event=>{
      const button=event.target.closest?.('#projectDetail [data-project-tab]');
      if(!button||!['Enter',' '].includes(event.key))return;
      event.preventDefault();
      activateProjectTab(document.getElementById('projectDetail'),button.dataset.projectTab);
    });

    const detail=document.getElementById('projectDetail');
    if(detail)new MutationObserver(()=>normalizeProjectTabs()).observe(detail,{childList:true,subtree:true});
    normalizeProjectTabs();
  }

  function enhanceDesignPane(){
    const detail=document.getElementById('projectDetail');const project=state.projects.find(item=>item.id===detail?.dataset.projectId);if(!project)return;
    const pane=detail.querySelector('[data-project-pane="design"]');if(!pane)return;
    const tiles=[...pane.querySelectorAll('.design-tile')].filter(tile=>!tile.matches('label'));
    (project.versions||[]).forEach((version,index)=>{
      const tile=tiles[index];if(!tile)return;
      if(version.data&&!tile.querySelector('.design-preview'))tile.insertAdjacentHTML('afterbegin',`<img class="design-preview" src="${version.data}" alt="${esc(version.name)}">`);
      const muted=tile.querySelector('.muted');
      if(muted){
        if(version.data)muted.textContent='Bild lokal in dieser Tattoo-Akte gespeichert';
        else if(version.type==='file')muted.textContent='Dateieintrag im MVP gespeichert';
        else muted.textContent='Version im MVP vermerkt';
      }
      if(version.mime&&!tile.querySelector('.design-file-meta'))tile.insertAdjacentHTML('beforeend',`<div class="design-file-meta">${esc(version.mime||'Datei')} · ${Math.max(1,Math.round(Number(version.size||0)/1024))} KB</div>`);
    });
    const upload=pane.querySelector('label.design-tile .muted');
    if(upload)upload.textContent='Bilder werden lokal gespeichert; PSD/PDF/Procreate zunächst als Dateieintrag.';
  }

  async function handleUpload(input,file){
    const project=state.projects.find(item=>item.id===input.dataset.designUpload);if(!project||!file)return;
    const version={name:file.name,type:file.type.startsWith('image/')?'image':'file',mime:file.type||'Datei',size:file.size,data:''};
    if(version.type==='image'){
      try{version.data=await compressImage(file);}catch(_error){alert('Das Bild konnte nicht verarbeitet werden.');input.value='';return;}
    }
    project.versions=project.versions||[];project.versions.push(version);
    try{persist();}catch(_error){project.versions.pop();alert('Der lokale Browserspeicher ist voll. Für größere Dateien benötigen wir den späteren Cloud-Dateispeicher.');input.value='';return;}
    renderProjects();openProject(project.id);
    requestAnimationFrame(()=>{activateProjectTab(document.getElementById('projectDetail'),'design');enhanceDesignPane();});
  }

  document.addEventListener('change',event=>{
    const input=event.target.closest?.('[data-design-upload]');if(!input)return;
    const file=input.files?.[0];if(!file)return;
    event.stopImmediatePropagation();
    handleUpload(input,file);
  },true);

  const previousOpenProject=openProject;
  openProject=function(id){
    previousOpenProject(id);
    requestAnimationFrame(()=>{normalizeProjectTabs();enhanceDesignPane();});
  };

  installStyle();
  installRobustProjectTabs();
  enhanceDesignPane();

  if(!document.querySelector('script[src="workflow-ux.js"]')){
    const script=document.createElement('script');
    script.src='workflow-ux.js';
    document.body.appendChild(script);
  }
  if(!document.querySelector('script[src="theme-switcher.js"]')){
    const script=document.createElement('script');
    script.src='theme-switcher.js';
    document.body.appendChild(script);
  }
})();
