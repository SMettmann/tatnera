/* TATNERA — Tattoo design files with secure cloud storage */
(function(){
  'use strict';
  const Core=window.TatneraCore;
  const esc=Core?.esc||((value)=>String(value??''));

  function installStyle(){
    if(document.getElementById('designStorageStyle'))return;
    const style=document.createElement('style');style.id='designStorageStyle';style.textContent=`
      .design-tile .design-preview{width:100%;height:130px;object-fit:cover;border-radius:9px;margin-bottom:9px;border:1px solid var(--line);background:#111}
      .design-file-meta{font-size:10px;color:var(--muted);margin-top:4px}
      .design-cloud-link{display:inline-flex;margin-top:7px;font-size:10px;font-weight:800;color:var(--accent);text-decoration:none}
    `;document.head.appendChild(style);
  }

  async function hydrateCloudPreviews(pane){
    const api=window.TatneraFiles;if(!api?.ready?.())return;
    const nodes=[...pane.querySelectorAll('[data-design-cloud-path]')];
    await Promise.all(nodes.map(async node=>{
      try{
        const url=await api.signedUrl(node.dataset.designCloudPath,3600);if(!url)return;
        if(node.tagName==='IMG')node.src=url;else if(node.tagName==='A')node.href=url;
      }catch(error){console.warn('Design-Datei konnte nicht geladen werden',error);}
    }));
  }

  function enhanceDesignPane(){
    const detail=document.getElementById('projectDetail'),project=Core?.currentProject();if(!detail||!project)return;
    const pane=detail.querySelector('[data-project-pane="design"]');if(!pane)return;
    const tiles=[...pane.querySelectorAll('.design-tile')].filter(tile=>!tile.matches('label'));
    (project.versions||[]).forEach((version,index)=>{
      const tile=tiles[index];if(!tile)return;
      if(version.cloudPath&&String(version.mime||'').startsWith('image/')&&!tile.querySelector('.design-preview'))tile.insertAdjacentHTML('afterbegin',`<img class="design-preview" data-design-cloud-path="${esc(version.cloudPath)}" alt="${esc(version.name)}">`);
      else if(version.data&&!tile.querySelector('.design-preview'))tile.insertAdjacentHTML('afterbegin',`<img class="design-preview" src="${version.data}" alt="${esc(version.name)}">`);
      const muted=tile.querySelector('.muted');if(muted)muted.textContent=version.cloudPath?'Sicher in der Studio-Cloud gespeichert':version.data?'Älteres Bild aus lokalem Browserspeicher':version.type==='file'?'Dateieintrag vorhanden':'Version vermerkt';
      if(version.mime&&!tile.querySelector('.design-file-meta'))tile.insertAdjacentHTML('beforeend',`<div class="design-file-meta">${esc(version.mime||'Datei')} · ${window.TatneraFiles?.formatSize?.(version.size)||Math.max(1,Math.round(Number(version.size||0)/1024))+' KB'}</div>`);
      if(version.cloudPath&&!tile.querySelector('.design-cloud-link'))tile.insertAdjacentHTML('beforeend',`<a class="design-cloud-link" href="#" target="_blank" rel="noopener" data-design-cloud-path="${esc(version.cloudPath)}">Datei öffnen →</a>`);
    });
    const upload=pane.querySelector('label.design-tile .muted');if(upload)upload.textContent='JPG, PNG, WEBP oder PDF bis 10 MB · sicher in der Studio-Cloud.';
    hydrateCloudPreviews(pane);
  }

  async function handleUpload(input,file){
    const project=Core?.getProject(input.dataset.designUpload);if(!project||!file)return;
    const api=window.TatneraFiles;
    if(!api?.ready?.()){alert('Der Cloud-Dateispeicher ist noch nicht verbunden. Bitte kurz warten und erneut versuchen.');input.value='';return;}
    try{
      api.validate(file);
      input.disabled=true;
      const meta=await api.upload(file,{kind:project.serviceType==='piercing'?'piercing-files':'tattoo-designs',recordId:project.id});
      const version={name:meta.name,type:String(meta.mime||'').startsWith('image/')?'image':'file',mime:meta.mime,size:meta.size,data:'',cloudPath:meta.path,cloudId:meta.id,createdAt:meta.createdAt};
      project.versions=project.versions||[];project.versions.push(version);
      try{persist();}catch(error){project.versions.pop();try{await api.remove(meta.path);}catch(_error){}throw error;}
      document.dispatchEvent(new CustomEvent('tatnera:data-changed',{detail:{type:'design',projectId:project.id}}));
      openProject(project.id);
      requestAnimationFrame(()=>{Core?.activateProjectTab('design');enhanceDesignPane();});
    }catch(error){alert('Datei konnte nicht gespeichert werden: '+(error?.message||error));}
    finally{input.disabled=false;input.value='';}
  }

  document.addEventListener('change',event=>{
    const input=event.target.closest?.('[data-design-upload]');if(!input)return;
    const file=input.files?.[0];if(!file)return;
    event.stopImmediatePropagation();handleUpload(input,file);
  },true);
  document.addEventListener('tatnera:project-opened',()=>requestAnimationFrame(enhanceDesignPane));
  document.addEventListener('tatnera:project-tab',event=>{if(event.detail?.tab==='design')requestAnimationFrame(enhanceDesignPane);});

  installStyle();enhanceDesignPane();
})();