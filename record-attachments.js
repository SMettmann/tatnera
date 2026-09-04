/* TATNERA — shared cloud attachments for customers, Tattoo/Piercing records and inquiries */
(function(){
  'use strict';
  if(window.__tatneraRecordAttachmentsInstalled)return;window.__tatneraRecordAttachmentsInstalled=true;
  const Core=window.TatneraCore;
  const esc=Core?.esc||((value)=>String(value??''));
  let currentRequestId='';

  function files(){return window.TatneraFiles;}
  function normalize(record){if(!Array.isArray(record.attachments))record.attachments=[];return record.attachments;}
  function requestById(id){return (state.requests||[]).find(item=>item.id===id)||null;}
  function recordOf(type,id){if(type==='customer')return Core?.getCustomer?.(id)||null;if(type==='project')return Core?.getProject?.(id)||null;if(type==='request')return requestById(id);return null;}
  function persistRecord(type,id){
    if(type==='request')localStorage.setItem('tatnera_requests',JSON.stringify(state.requests||[]));
    else if(typeof persist==='function')persist();
    document.dispatchEvent(new CustomEvent('tatnera:data-changed',{detail:{type:'attachment',customerId:type==='customer'?id:'',projectId:type==='project'?id:'',requestId:type==='request'?id:''}}));
  }
  function kindFor(type,record){if(type==='customer')return 'customers';if(type==='request')return 'requests';return record?.serviceType==='piercing'?'piercings':'tattoos';}
  function labelFor(type,record){if(type==='customer')return 'Kundendateien';if(type==='request')return 'Referenzen & Dateien';return record?.serviceType==='piercing'?'Piercing-Fotos & Dateien':'Tattoo-Fotos & Dateien';}
  function descriptionFor(type,record){if(type==='request')return 'Referenzbilder, Vorlagen oder PDF direkt sicher in der Studio-Cloud speichern.';if(type==='customer')return 'Allgemeine Unterlagen und Bilder, die zum Kunden gehören.';return record?.serviceType==='piercing'?'Fotos, Schmuck-/Materialunterlagen und weitere Dokumente zur Piercing-Akte.':'Fotos, Vorlagen und weitere Dokumente zur Tattoo-Akte.';}

  function installStyle(){
    if(document.getElementById('recordAttachmentStyle'))return;
    const style=document.createElement('style');style.id='recordAttachmentStyle';style.textContent=`
      .cloud-attachments{margin-top:14px;border:1px solid var(--line);border-radius:15px;background:var(--panel);padding:15px}
      .cloud-attachments-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:12px}.cloud-attachments-head h3{margin:3px 0 4px}.cloud-attachments-head p{margin:0;max-width:620px}.cloud-upload-btn{position:relative;overflow:hidden;white-space:nowrap}.cloud-upload-btn input{position:absolute;inset:0;opacity:0;cursor:pointer}
      .cloud-attachment-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.cloud-attachment-row{display:flex;align-items:center;gap:10px;border:1px solid var(--line);border-radius:12px;padding:9px;background:var(--panel-2);min-width:0}.cloud-attachment-preview{width:48px;height:48px;border-radius:9px;border:1px solid var(--line);background:#111;display:grid;place-items:center;object-fit:cover;flex:0 0 48px;font-size:10px;font-weight:900;color:var(--muted)}.cloud-attachment-meta{min-width:0;flex:1}.cloud-attachment-meta strong,.cloud-attachment-meta span{display:block}.cloud-attachment-meta strong{font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cloud-attachment-meta span{font-size:9px;color:var(--muted);margin-top:3px}.cloud-attachment-actions{display:flex;gap:5px;flex:0 0 auto}.cloud-attachment-actions a,.cloud-attachment-actions button{border:1px solid var(--line);background:transparent;color:var(--text);border-radius:8px;padding:6px 8px;font-size:9px;font-weight:800;text-decoration:none;cursor:pointer}.cloud-attachment-actions button{color:#ff9292}.cloud-attachment-empty{grid-column:1/-1;border:1px dashed var(--line);border-radius:11px;padding:14px;color:var(--muted);text-align:center;font-size:10px}.cloud-attachment-status{font-size:10px;color:var(--muted);margin-top:9px}.cloud-attachment-status.error{color:#df8585}
      @media(max-width:720px){.cloud-attachment-list{grid-template-columns:1fr}.cloud-attachments-head{flex-direction:column}.cloud-upload-btn{width:100%;text-align:center}}
    `;document.head.appendChild(style);
  }

  function cardHtml(type,id,record){
    const attachments=normalize(record);
    return `<section class="cloud-attachments" data-cloud-attachments="${esc(type)}:${esc(id)}"><div class="cloud-attachments-head"><div><span class="eyebrow">Cloud-Dateien</span><h3>${esc(labelFor(type,record))}</h3><p class="muted">${esc(descriptionFor(type,record))}</p></div><label class="btn ghost cloud-upload-btn">+ Datei / Foto<input type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" data-cloud-upload="${esc(type)}:${esc(id)}"></label></div><div class="cloud-attachment-list">${attachments.length?attachments.map(item=>rowHtml(type,id,item)).join(''):'<div class="cloud-attachment-empty">Noch keine Dateien hinterlegt.</div>'}</div><div class="cloud-attachment-status" data-cloud-file-status></div></section>`;
  }
  function rowHtml(type,id,item){
    const isImage=String(item.mime||'').startsWith('image/');
    return `<div class="cloud-attachment-row" data-cloud-file-id="${esc(item.id||'')}">${isImage?`<img class="cloud-attachment-preview" alt="" data-cloud-preview="${esc(item.path||'')}">`:'<div class="cloud-attachment-preview">PDF</div>'}<div class="cloud-attachment-meta"><strong title="${esc(item.name||'Datei')}">${esc(item.name||'Datei')}</strong><span>${esc(files()?.formatSize?.(item.size)||'')} · ${esc(new Intl.DateTimeFormat('de-DE').format(new Date(item.createdAt||Date.now())))}</span></div><div class="cloud-attachment-actions"><a href="#" target="_blank" rel="noopener" data-cloud-open="${esc(item.path||'')}">Öffnen</a><button type="button" data-cloud-delete="${esc(type)}:${esc(id)}:${esc(item.id||'')}">Löschen</button></div></div>`;
  }

  async function hydrateLinks(root){
    const api=files();if(!api?.ready?.())return;
    const paths=[...root.querySelectorAll('[data-cloud-open]')].map(node=>node.dataset.cloudOpen).filter(Boolean);
    const unique=[...new Set(paths)];
    await Promise.all(unique.map(async path=>{
      try{
        const url=await api.signedUrl(path,3600);if(!url)return;
        root.querySelectorAll('[data-cloud-open]').forEach(node=>{if(node.dataset.cloudOpen===path)node.href=url;});
        root.querySelectorAll('[data-cloud-preview]').forEach(node=>{if(node.dataset.cloudPreview===path)node.src=url;});
      }catch(error){console.warn('Datei-Link konnte nicht erzeugt werden',error);}
    }));
  }

  function mount(type,id,container){
    const record=recordOf(type,id);if(!record||!container)return;
    container.querySelector(`[data-cloud-attachments="${CSS.escape(type+':'+id)}"]`)?.remove();
    container.insertAdjacentHTML('beforeend',cardHtml(type,id,record));
    const root=container.querySelector(`[data-cloud-attachments="${CSS.escape(type+':'+id)}"]`);if(root)hydrateLinks(root);
  }
  function mountCustomer(id){const root=document.getElementById('customerDetail');if(root)mount('customer',id,root);}
  function mountProject(id){
    const root=document.getElementById('projectDetail');if(!root)return;
    const pane=root.querySelector('[data-project-pane="documents"]')||root;
    mount('project',id,pane);
  }
  function mountRequest(id){const body=document.getElementById('requestDetailBody');if(body&&id)mount('request',id,body);}

  async function uploadFiles(input){
    const [type,id]=String(input.dataset.cloudUpload||'').split(':');const record=recordOf(type,id),api=files();if(!record||!api)return;
    const selected=[...(input.files||[])];if(!selected.length)return;
    const card=input.closest('.cloud-attachments'),status=card?.querySelector('[data-cloud-file-status]');
    if(!api.ready?.()){if(status){status.textContent='Cloud-Dateispeicher ist noch nicht verbunden.';status.classList.add('error');}input.value='';return;}
    if(status){status.classList.remove('error');status.textContent=`${selected.length} Datei${selected.length===1?'':'en'} wird/werden hochgeladen …`;}
    const added=[];
    try{
      for(const file of selected){api.validate(file);const meta=await api.upload(file,{kind:kindFor(type,record),recordId:id});added.push(meta);normalize(record).push(meta);}
      persistRecord(type,id);
      if(status)status.textContent=`${added.length} Datei${added.length===1?'':'en'} sicher in der Cloud gespeichert.`;
      if(type==='customer')mountCustomer(id);else if(type==='project')mountProject(id);else mountRequest(id);
    }catch(error){
      for(const meta of added){try{await api.remove(meta.path);}catch(_error){}const index=normalize(record).findIndex(item=>item.id===meta.id);if(index>=0)record.attachments.splice(index,1);}
      if(status){status.textContent=error?.message||'Upload fehlgeschlagen.';status.classList.add('error');}
    }finally{input.value='';}
  }

  async function deleteFile(spec,button){
    const [type,id,fileId]=String(spec||'').split(':');const record=recordOf(type,id);if(!record)return;const list=normalize(record),index=list.findIndex(item=>item.id===fileId),item=list[index];if(!item)return;
    if(!confirm(`„${item.name||'Datei'}“ wirklich löschen?\n\nDie Datei wird auch aus der Studio-Cloud entfernt.`))return;
    button.disabled=true;
    try{await files()?.remove?.(item.path);list.splice(index,1);persistRecord(type,id);if(type==='customer')mountCustomer(id);else if(type==='project')mountProject(id);else mountRequest(id);}catch(error){alert('Datei konnte nicht gelöscht werden: '+(error?.message||error));button.disabled=false;}
  }

  document.addEventListener('change',event=>{const input=event.target.closest?.('[data-cloud-upload]');if(input)uploadFiles(input);});
  document.addEventListener('click',event=>{
    const openRequest=event.target.closest?.('[data-open-request]');if(openRequest){currentRequestId=openRequest.dataset.openRequest||'';setTimeout(()=>mountRequest(currentRequestId),20);return;}
    const del=event.target.closest?.('[data-cloud-delete]');if(del){event.preventDefault();deleteFile(del.dataset.cloudDelete,del);}
  },true);
  document.addEventListener('tatnera:customer-opened',event=>requestAnimationFrame(()=>mountCustomer(event.detail?.customerId||'')));
  document.addEventListener('tatnera:project-opened',event=>requestAnimationFrame(()=>requestAnimationFrame(()=>mountProject(event.detail?.projectId||''))));
  document.addEventListener('tatnera:project-tab',event=>{if(event.detail?.tab==='documents')requestAnimationFrame(()=>mountProject(event.detail?.projectId||Core?.projectIdFromDetail?.()||''));});

  const observer=new MutationObserver(()=>{const dialog=document.getElementById('requestDetailDialog');if(dialog?.open&&currentRequestId){clearTimeout(observer._timer);observer._timer=setTimeout(()=>mountRequest(currentRequestId),25);}});
  const startObserver=()=>{const body=document.getElementById('requestDetailBody');if(body)observer.observe(body,{childList:true,subtree:false});};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startObserver,{once:true});else startObserver();
  installStyle();
})();