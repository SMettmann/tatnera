/* TATNERA — Piercing-aware archive and record management polish */
(function(){
  'use strict';
  if(window.__tatneraArchivePiercingInstalled)return;
  window.__tatneraArchivePiercingInstalled=true;

  const Core=window.TatneraCore;
  if(!Core)return;
  const esc=Core.esc;
  const ARCHIVE_KEY='tatnera_archive_v1';
  const nativeConfirm=window.confirm.bind(window);
  const nativeAlert=window.alert.bind(window);

  function isPiercing(project){return project?.serviceType==='piercing';}
  function labelFor(project){return isPiercing(project)?'Piercing':'Tattoo';}
  function loadArchive(){
    try{
      const parsed=JSON.parse(localStorage.getItem(ARCHIVE_KEY)||'null');
      return parsed&&typeof parsed==='object'?{
        customers:Array.isArray(parsed.customers)?parsed.customers:[],
        projects:Array.isArray(parsed.projects)?parsed.projects:[]
      }:{customers:[],projects:[]};
    }catch(_error){return {customers:[],projects:[]};}
  }
  function formatDate(value){
    if(!value)return '—';
    try{return new Intl.DateTimeFormat('de-DE',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));}
    catch(_error){return '—';}
  }
  function counts(projects){
    const list=projects||[];
    return {
      tattoos:list.filter(project=>!isPiercing(project)).length,
      piercings:list.filter(isPiercing).length
    };
  }
  function plural(count,singular,pluralForm){return `${count} ${count===1?singular:pluralForm}`;}

  function installStyle(){
    if(document.getElementById('archivePiercingStyle'))return;
    const style=document.createElement('style');
    style.id='archivePiercingStyle';
    style.textContent=`
      #recordArchiveDialog.record-dialog{width:min(96vw,1120px);max-width:1120px}
      #recordArchiveDialog .record-archive-sections{grid-template-columns:repeat(3,minmax(0,1fr));align-items:start}
      #recordArchiveDialog .record-archive-section h3{display:flex;align-items:center;justify-content:space-between;gap:8px}
      #recordArchiveDialog .archive-section-count{display:inline-grid;place-items:center;min-width:24px;height:24px;padding:0 7px;border-radius:999px;background:var(--panel);border:1px solid var(--line);font-size:10px;color:var(--muted)}
      #recordArchiveDialog .record-archive-row{align-items:flex-start}
      #recordArchiveDialog .record-archive-row-actions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
      #recordArchiveDialog .archive-record-type{display:inline-block!important;width:max-content;margin:0 0 5px!important;padding:2px 6px;border:1px solid var(--line);border-radius:999px;font-size:8px!important;font-weight:850;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
      #recordArchiveDialog .archive-record-type.piercing{border-color:#75668a;color:#8b78a8}
      #recordArchiveDialog .record-permanent-delete{border-color:#9a3535!important;color:#b95e5e!important}
      @media(max-width:980px){#recordArchiveDialog .record-archive-sections{grid-template-columns:1fr 1fr}}
      @media(max-width:680px){#recordArchiveDialog .record-archive-sections{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function ensureArchiveStructure(){
    const dialog=document.getElementById('recordArchiveDialog');
    if(!dialog)return null;
    const sections=dialog.querySelector('.record-archive-sections');
    if(!sections)return dialog;

    let customerSection=dialog.querySelector('[data-archive-customers]')?.closest('.record-archive-section');
    let tattooSection=dialog.querySelector('[data-archive-projects]')?.closest('.record-archive-section');
    if(customerSection){
      const h3=customerSection.querySelector('h3');
      if(h3)h3.innerHTML='Kunden <span class="archive-section-count" data-archive-customer-count>0</span>';
    }
    if(tattooSection){
      const h3=tattooSection.querySelector('h3');
      if(h3)h3.innerHTML='Tattoo-Akten <span class="archive-section-count" data-archive-tattoo-count>0</span>';
    }
    let piercingSection=dialog.querySelector('[data-archive-piercings]')?.closest('.record-archive-section');
    if(!piercingSection){
      piercingSection=document.createElement('section');
      piercingSection.className='record-archive-section';
      piercingSection.innerHTML='<h3>Piercing-Akten <span class="archive-section-count" data-archive-piercing-count>0</span></h3><div class="record-archive-list" data-archive-piercings></div>';
      sections.appendChild(piercingSection);
    }
    return dialog;
  }

  function customerRow(entry,index){
    const projectCounts=counts(entry.projects||[]);
    const summary=[
      projectCounts.tattoos?plural(projectCounts.tattoos,'Tattoo','Tattoos'):'',
      projectCounts.piercings?plural(projectCounts.piercings,'Piercing','Piercings'):''
    ].filter(Boolean).join(' · ')||'Keine Akten';
    return `<div class="record-archive-row"><div><strong>${esc(entry.customer?.firstName||'')} ${esc(entry.customer?.lastName||'')}</strong><span>${esc(summary)} · archiviert ${esc(formatDate(entry.archivedAt))}</span></div><div class="record-archive-row-actions"><button type="button" class="btn ghost" data-restore-customer="${index}">Wiederherstellen</button><button type="button" class="btn ghost record-permanent-delete" data-purge-archive-customer="${index}">Löschen</button></div></div>`;
  }

  function projectRow(entry,index){
    const project=entry.project||{};
    const piercing=isPiercing(project);
    const detail=piercing
      ? [project.placement,project.piercing?.jewelryType,project.piercing?.material].filter(Boolean).join(' · ')
      : [project.placement,project.artist].filter(Boolean).join(' · ');
    return `<div class="record-archive-row"><div><span class="archive-record-type ${piercing?'piercing':''}">${piercing?'Piercing':'Tattoo'}</span><strong>${esc(project.title||labelFor(project))}</strong><span>${esc(entry.customerSnapshot||'Kunde')}${detail?` · ${esc(detail)}`:''} · archiviert ${esc(formatDate(entry.archivedAt))}</span></div><div class="record-archive-row-actions"><button type="button" class="btn ghost" data-restore-project="${index}">Wiederherstellen</button><button type="button" class="btn ghost record-permanent-delete" data-purge-archive-project="${index}">Löschen</button></div></div>`;
  }

  function renderArchive(){
    const dialog=ensureArchiveStructure();
    if(!dialog)return;
    const archive=loadArchive();
    const tattooEntries=[],piercingEntries=[];
    archive.projects.forEach((entry,index)=>{
      (isPiercing(entry?.project)?piercingEntries:tattooEntries).push({entry,index});
    });

    const customers=dialog.querySelector('[data-archive-customers]');
    const tattoos=dialog.querySelector('[data-archive-projects]');
    const piercings=dialog.querySelector('[data-archive-piercings]');
    if(customers)customers.innerHTML=archive.customers.length?archive.customers.map(customerRow).join(''):'<div class="record-empty">Keine archivierten Kunden.</div>';
    if(tattoos)tattoos.innerHTML=tattooEntries.length?tattooEntries.map(item=>projectRow(item.entry,item.index)).join(''):'<div class="record-empty">Keine archivierten Tattoo-Akten.</div>';
    if(piercings)piercings.innerHTML=piercingEntries.length?piercingEntries.map(item=>projectRow(item.entry,item.index)).join(''):'<div class="record-empty">Keine archivierten Piercing-Akten.</div>';

    dialog.querySelector('[data-archive-customer-count]')?.replaceChildren(document.createTextNode(String(archive.customers.length)));
    dialog.querySelector('[data-archive-tattoo-count]')?.replaceChildren(document.createTextNode(String(tattooEntries.length)));
    dialog.querySelector('[data-archive-piercing-count]')?.replaceChildren(document.createTextNode(String(piercingEntries.length)));
    const total=archive.customers.length+archive.projects.length;
    document.querySelectorAll('[data-archive-count]').forEach(node=>node.textContent=total?`(${total})`:'');
  }

  function patchProjectEdit(project){
    const form=document.getElementById('projectEditForm');
    if(!form||!project)return;
    const piercing=isPiercing(project);
    const head=form.closest('dialog')?.querySelector('.dialog-head');
    const eyebrow=head?.querySelector('.eyebrow');
    const title=head?.querySelector('h2');
    if(eyebrow)eyebrow.textContent=piercing?'Piercing-Akte':'Tattoo-Akte';
    if(title)title.textContent=piercing?'Piercing bearbeiten':'Tattoo bearbeiten';
    const setLabel=(name,text)=>{const input=form.elements[name];const label=input?.closest('label');if(label&&label.firstChild)label.firstChild.textContent=text;};
    setLabel('title',piercing?'Piercing':'Motiv');
    setLabel('placement','Körperstelle');
    setLabel('size',piercing?'Schmuckgröße / Maße':'Größe');
    setLabel('artist',piercing?'Artist / Piercer':'Artist');
  }

  function patchProjectAction(projectId){
    const project=Core.getProject(projectId);
    if(!project)return;
    const button=document.querySelector(`#projectDetail [data-edit-project="${CSS.escape(projectId)}"]`);
    if(button)button.textContent=isPiercing(project)?'Piercing bearbeiten':'Tattoo bearbeiten';
  }

  function temporaryCopyForProject(project){
    if(!isPiercing(project))return;
    window.alert=message=>nativeAlert(String(message)
      .replaceAll('Dieses Tattoo','Dieses Piercing')
      .replaceAll('Tattoo-Akte','Piercing-Akte')
      .replaceAll('Tattoo-ID','Piercing-ID')
      .replaceAll('Tattoo','Piercing'));
    window.confirm=message=>nativeConfirm(String(message)
      .replaceAll('Die Tattoo-Akte','Die Piercing-Akte')
      .replaceAll('Tattoo-Akte','Piercing-Akte')
      .replaceAll('Farben','Schmuckdaten')
      .replaceAll('Tattoo','Piercing'));
    setTimeout(()=>{window.alert=nativeAlert;window.confirm=nativeConfirm;},0);
  }

  function temporaryCustomerArchiveCopy(customerId,mode){
    const customer=Core.getCustomer(customerId);
    if(!customer)return;
    const projects=(state.projects||[]).filter(project=>project.customerId===customerId);
    const projectCounts=counts(projects);
    const summary=[plural(projectCounts.tattoos,'Tattoo-Akte','Tattoo-Akten'),plural(projectCounts.piercings,'Piercing-Akte','Piercing-Akten')].join(' und ');
    const originalConfirm=window.confirm;
    window.confirm=message=>{
      const text=String(message||'');
      if(mode==='archive'&&text.includes('archivieren?'))return nativeConfirm(`${customer.firstName} ${customer.lastName} archivieren?\n\n${summary} und die zugehörige Historie werden gemeinsam ins Archiv verschoben.`);
      if(mode==='delete'&&text.includes('endgültig löschen?')){
        const eventCount=(state.calendarEvents||[]).filter(event=>event.customerId===customerId||projects.some(project=>project.id===event.projectId)).length;
        return nativeConfirm(`${customer.firstName} ${customer.lastName} endgültig löschen?\n\nDas kann nicht rückgängig gemacht werden. ${summary} und ${eventCount} zugehörige${eventCount===1?'r Termin':' Termine'} werden ebenfalls dauerhaft entfernt. Verknüpfte Anfragen bleiben erhalten, werden aber vom Kunden getrennt.`);
      }
      return originalConfirm(text);
    };
    setTimeout(()=>{window.confirm=nativeConfirm;},0);
  }

  function archiveFingerprint(){return localStorage.getItem(ARCHIVE_KEY)||'';}

  window.addEventListener('click',event=>{
    const target=event.target instanceof Element?event.target:null;
    if(!target)return;

    const archiveProject=target.closest('[data-archive-project]');
    if(archiveProject){temporaryCopyForProject(Core.getProject(archiveProject.dataset.archiveProject));return;}
    const deleteProject=target.closest('[data-delete-project]');
    if(deleteProject){temporaryCopyForProject(Core.getProject(deleteProject.dataset.deleteProject));return;}
    const archiveCustomer=target.closest('[data-archive-customer]');
    if(archiveCustomer){temporaryCustomerArchiveCopy(archiveCustomer.dataset.archiveCustomer,'archive');return;}
    const deleteCustomer=target.closest('[data-delete-customer]');
    if(deleteCustomer){temporaryCustomerArchiveCopy(deleteCustomer.dataset.deleteCustomer,'delete');return;}

    const edit=target.closest('[data-edit-project]');
    if(edit){const project=Core.getProject(edit.dataset.editProject);setTimeout(()=>patchProjectEdit(project),0);return;}

    if(target.closest('[data-open-record-archive]')){
      setTimeout(renderArchive,20);
      return;
    }

    const purge=target.closest('[data-purge-archive-customer],[data-purge-archive-project]');
    if(purge){
      const before=archiveFingerprint();
      setTimeout(()=>{
        const after=archiveFingerprint();
        if(before!==after){
          renderArchive();
          /* records-management keeps an in-memory archive copy; reload after a permanent purge
             so a later archive action can never reintroduce a deleted record. */
          setTimeout(()=>window.location.reload(),80);
        }
      },30);
    }
  },true);

  document.addEventListener('tatnera:project-opened',event=>requestAnimationFrame(()=>patchProjectAction(event.detail?.projectId||'')));
  document.addEventListener('tatnera:runtime-refresh',()=>{
    const id=document.getElementById('projectDetail')?.dataset.projectId||'';
    if(id)requestAnimationFrame(()=>patchProjectAction(id));
    if(document.getElementById('recordArchiveDialog')?.open)setTimeout(renderArchive,20);
  });
  document.addEventListener('tatnera:data-changed',event=>{
    if(event.detail?.type?.startsWith?.('archive-'))setTimeout(renderArchive,20);
  });

  installStyle();
  ensureArchiveStructure();
})();