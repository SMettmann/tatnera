/* TATNERA — functional local design uploads for the MVP */
(function(){
  function esc(value){return String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));}

  function installStyle(){
    const style=document.createElement('style');
    style.textContent='.design-tile .design-preview{width:100%;height:130px;object-fit:cover;border-radius:9px;margin-bottom:9px;border:1px solid var(--line);background:#111}.design-file-meta{font-size:10px;color:var(--muted);margin-top:4px}';
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
    requestAnimationFrame(()=>{document.querySelector('[data-project-tab="design"]')?.click();enhanceDesignPane();});
  }

  document.addEventListener('change',event=>{
    const input=event.target.closest?.('[data-design-upload]');if(!input)return;
    const file=input.files?.[0];if(!file)return;
    event.stopImmediatePropagation();
    handleUpload(input,file);
  },true);

  const previousOpenProject=openProject;
  openProject=function(id){previousOpenProject(id);requestAnimationFrame(enhanceDesignPane);};

  installStyle();
  enhanceDesignPane();
})();